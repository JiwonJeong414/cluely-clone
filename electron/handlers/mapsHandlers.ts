import { ipcMain } from 'electron'
import { MapsService } from '../../src/services/maps/MapsService'

export function setupMapsHandlers(mapsService: MapsService) {
  // Search nearby places
  ipcMain.handle('maps-search', async (event, query: string, options?: any) => {
    try {
      console.log(`🗺️ Searching maps for: "${query}"`)
      
      // Get location from renderer process if not provided
      let location = options?.location
      if (!location) {
        try {
          console.log('Requesting location from renderer process...')
          const locationResult = await event.sender.executeJavaScript(`
            new Promise((resolve, reject) => {
              console.log('Checking geolocation support...');
              
              if (!navigator.geolocation) {
                console.error('Geolocation not supported');
                reject(new Error('Geolocation not supported'));
                return;
              }
              
              console.log('[✓] Geolocation supported, requesting position...');
              
              navigator.geolocation.getCurrentPosition(
                (position) => {
                  console.log('[✓] Location obtained:', position.coords);
                  resolve({ 
                    lat: position.coords.latitude, 
                    lng: position.coords.longitude 
                  });
                },
                (error) => {
                  console.error('Geolocation error:', error);
                  console.error('Error code:', error.code);
                  console.error('Error message:', error.message);
                  
                  let errorMessage = 'Failed to get location: ';
                  switch(error.code) {
                    case 1:
                      errorMessage += 'Location permission denied. Please enable location access in your browser settings.';
                      break;
                    case 2:
                      errorMessage += 'Location unavailable. Please check your GPS or internet connection.';
                      break;
                    case 3:
                      errorMessage += 'Location request timed out. Please try again.';
                      break;
                    default:
                      errorMessage += error.message;
                  }
                  
                  reject(new Error(errorMessage));
                },
                { 
                  enableHighAccuracy: true, 
                  timeout: 15000,
                  maximumAge: 300000
                }
              );
            });
          `)
          
          location = locationResult
          console.log('[✓] Got location from renderer:', location)
        } catch (locationError) {
          console.error('Failed to get location:', locationError)
          
          return { 
            success: false, 
            error: `Location access required for maps search. ${locationError instanceof Error ? locationError.message : 'Please enable location access and try again.'}` 
          }
        }
      }
      
      if (!location || !location.lat || !location.lng) {
        return {
          success: false,
          error: 'Valid location coordinates are required for maps search'
        }
      }
      
      const searchOptions = { ...options, location }
      const places = await mapsService.searchNearby(query, searchOptions)
      
      console.log(`[✓] Found ${places.length} places`)
      return { success: true, places }
    } catch (error) {
      console.error('Maps search error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Maps search failed' 
      }
    }
  })

  // Get location from renderer
  ipcMain.handle('maps-get-location', async (event) => {
    try {
      console.log('Getting location from renderer process...')
      
      const location = await event.sender.executeJavaScript(`
        new Promise((resolve, reject) => {
          console.log('Checking geolocation in renderer process...');
          
          if (!navigator.geolocation) {
            console.error('Geolocation not supported in this context');
            reject(new Error('Geolocation not supported'));
            return;
          }
          
          console.log('[✓] Requesting geolocation...');
          
          navigator.geolocation.getCurrentPosition(
            (position) => {
              console.log('[✓] Got location successfully:', {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                accuracy: position.coords.accuracy
              });
              resolve({ 
                lat: position.coords.latitude, 
                lng: position.coords.longitude,
                accuracy: position.coords.accuracy
              });
            },
            (error) => {
              console.error('Geolocation failed in renderer:', {
                code: error.code,
                message: error.message
              });
              
              let errorMessage = 'Location access failed: ';
              switch(error.code) {
                case 1:
                  errorMessage += 'Permission denied. Please allow location access and try again.';
                  break;
                case 2:
                  errorMessage += 'Position unavailable. Check GPS/internet connection.';
                  break;
                case 3:
                  errorMessage += 'Request timed out. Please try again.';
                  break;
                default:
                  errorMessage += error.message || 'Unknown error';
              }
              
              reject(new Error(errorMessage));
            },
            { 
              enableHighAccuracy: false,
              timeout: 10000,
              maximumAge: 600000
            }
          );
        });
      `)
      
      console.log('[✓] Got location:', location)
      return { success: true, location }
    } catch (error) {
      console.error('Get location error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get location' 
      }
    }
  })

  // Get place details
  ipcMain.handle('maps-get-place-details', async (event, placeId: string) => {
    try {
      const place = await mapsService.getPlaceDetails(placeId)
      return { success: true, place }
    } catch (error) {
      console.error('Get place details error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get place details' 
      }
    }
  })

  // Get travel time
  ipcMain.handle('maps-get-travel-time', async (event, origin: any, destination: any, mode?: 'driving' | 'walking' | 'transit') => {
    try {
      const travelInfo = await mapsService.getTravelTime(origin, destination, mode)
      return { success: true, travelInfo }
    } catch (error) {
      console.error('Get travel time error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get travel time' 
      }
    }
  })
}