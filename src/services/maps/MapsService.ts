/**
 * Maps Service
 * 
 * Handles Google Maps integration for location-based services and place search.
 * Provides functionality for searching nearby places, getting travel times,
 * and retrieving place details. Supports location query parsing and intent detection.
 */

import type { Place, SearchOptions, GooglePlacesResponse, GoogleDistanceMatrixResponse, GooglePlaceDetailsResponse } from '../../types'

export class MapsService {
  private static instance: MapsService
  private apiKey: string

  private constructor() {
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY || ''
  }

  /**
   * Get the singleton instance of MapsService
   * @returns MapsService - The singleton instance
   */
  static getInstance(): MapsService {
    if (!MapsService.instance) {
      MapsService.instance = new MapsService()
    }
    return MapsService.instance
  }

  /**
   * Get user's current location
   * Note: This method should only be called from the renderer process
   * @returns Promise<{ lat: number; lng: number }> - Current location coordinates
   * @throws {Error} If called from main process or location access fails
   */
  async getCurrentLocation(): Promise<{ lat: number; lng: number }> {
    return new Promise((resolve, reject) => {
      // This method should only be called from the renderer process
      reject(new Error('getCurrentLocation should be called from renderer process'))
    })
  }

  /**
   * Search for places nearby a given location
   * @param query - Search query for places
   * @param options - Search options including location, radius, type, and filters
   * @returns Promise<Place[]> - Array of nearby places with travel information
   * @throws {Error} If location is not provided or API call fails
   */
  async searchNearby(query: string, options: SearchOptions = {}): Promise<Place[]> {
    try {
      // Location must be provided from renderer process
      if (!options.location) {
        throw new Error('Location is required for maps search. Please provide location from renderer process.')
      }
      
      const location = options.location
      const radius = options.radius || 5000
      
      // Use Google Places API Text Search
      const searchParams = new URLSearchParams({
        query,
        location: `${location.lat},${location.lng}`,
        radius: radius.toString(),
        key: this.apiKey
      })

      if (options.type) searchParams.append('type', options.type)
      if (options.minRating) searchParams.append('minprice', options.minRating.toString())
      if (options.openNow) searchParams.append('opennow', 'true')

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/textsearch/json?${searchParams}`
      )

      if (!response.ok) {
        throw new Error(`Maps API error: ${response.status}`)
      }

      const data = await response.json() as GooglePlacesResponse
      
      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        throw new Error(`Places API error: ${data.status}`)
      }

      // Convert to our Place format
      return await Promise.all(
        data.results.slice(0, 10).map(async (result) => {
          const place: Place = {
            placeId: result.place_id,
            name: result.name,
            address: result.formatted_address,
            rating: result.rating,
            priceLevel: result.price_level,
            types: result.types || [],
            location: {
              lat: result.geometry.location.lat,
              lng: result.geometry.location.lng
            }
          }

          // Get distance and duration
          const travelInfo = await this.getTravelTime(location, place.location)
          if (travelInfo) {
            place.distance = travelInfo.distance
            place.duration = travelInfo.duration
          }

          return place
        })
      )
    } catch (error) {
      console.error('Error searching places:', error)
      throw error
    }
  }

  /**
   * Get travel time and distance between two points
   * @param origin - Starting location coordinates
   * @param destination - Destination location coordinates
   * @param mode - Travel mode: driving, walking, or transit (default: driving)
   * @returns Promise<{ distance: string; duration: string } | null> - Travel information or null if unavailable
   */
  async getTravelTime(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    mode: 'driving' | 'walking' | 'transit' = 'driving'
  ): Promise<{ distance: string; duration: string } | null> {
    try {
      const params = new URLSearchParams({
        origins: `${origin.lat},${origin.lng}`,
        destinations: `${destination.lat},${destination.lng}`,
        mode,
        units: 'imperial',
        key: this.apiKey
      })

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/distancematrix/json?${params}`
      )

      const data = await response.json() as GoogleDistanceMatrixResponse
      
      if (data.status === 'OK' && data.rows[0]?.elements[0]?.status === 'OK') {
        const element = data.rows[0].elements[0]
        return {
          distance: element.distance?.text || '',
          duration: element.duration?.text || ''
        }
      }

      return null
    } catch (error) {
      console.error('Error getting travel time:', error)
      return null
    }
  }

  /**
   * Get detailed information about a specific place by its ID
   * @param placeId - Google Places place ID
   * @returns Promise<Place | null> - Detailed place information or null if not found
   */
  async getPlaceDetails(placeId: string): Promise<Place | null> {
    try {
      const params = new URLSearchParams({
        place_id: placeId,
        fields: 'name,formatted_address,formatted_phone_number,website,opening_hours,photos,rating,price_level,geometry',
        key: this.apiKey
      })

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?${params}`
      )

      const data = await response.json() as GooglePlaceDetailsResponse
      
      if (data.status === 'OK') {
        const result = data.result
        return {
          placeId: result.place_id,
          name: result.name,
          address: result.formatted_address,
          rating: result.rating,
          priceLevel: result.price_level,
          types: result.types || [],
          location: {
            lat: result.geometry.location.lat,
            lng: result.geometry.location.lng
          },
          phoneNumber: result.formatted_phone_number,
          website: result.website,
          openingHours: result.opening_hours?.weekday_text
        }
      }

      return null
    } catch (error) {
      console.error('Error getting place details:', error)
      return null
    }
  }

  /**
   * Check if a query is location-related
   * @param query - Query string to analyze
   * @returns boolean - True if the query appears to be location-related
   */
  isLocationQuery(query: string): boolean {
    const locationKeywords = [
      'near me', 'nearby', 'closest', 'nearest', 'around here',
      'restaurant', 'coffee', 'gas station', 'hospital', 'pharmacy',
      'store', 'shop', 'bank', 'atm', 'hotel', 'parking',
      'directions to', 'how to get to', 'drive to', 'walk to'
    ]
    
    const lowerQuery = query.toLowerCase()
    return locationKeywords.some(keyword => lowerQuery.includes(keyword))
  }

  /**
   * Parse a location query to extract search terms, place types, and modifiers
   * @param query - Raw location query string
   * @returns { searchTerm: string, type?: string, modifier?: string } - Parsed query components
   */
  parseLocationQuery(query: string): { 
    searchTerm: string
    type?: string
    modifier?: string 
  } {
    const lowerQuery = query.toLowerCase()
    
    // Common type mappings
    const typeMap: { [key: string]: string } = {
      'coffee': 'cafe',
      'restaurant': 'restaurant',
      'food': 'restaurant',
      'gas': 'gas_station',
      'hospital': 'hospital',
      'pharmacy': 'pharmacy',
      'bank': 'bank',
      'atm': 'atm',
      'hotel': 'lodging',
      'parking': 'parking'
    }

    // Extract type
    let detectedType: string | undefined
    for (const [keyword, type] of Object.entries(typeMap)) {
      if (lowerQuery.includes(keyword)) {
        detectedType = type
        break
      }
    }

    // Clean up search term
    let searchTerm = query
      .replace(/near me|nearby|closest|nearest|around here/gi, '')
      .trim()

    // Extract modifiers
    let modifier: string | undefined
    if (lowerQuery.includes('open now')) modifier = 'open_now'
    if (lowerQuery.includes('highly rated')) modifier = 'high_rating'

    return {
      searchTerm: searchTerm || query,
      type: detectedType,
      modifier
    }
  }
} 