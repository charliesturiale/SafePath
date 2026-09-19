interface Incident {
  id: string
  type: 'encampment' | 'aggressive' | 'crime' | 'suspicious'
  severity: 'low' | 'medium' | 'high'
  location: {
    lat: number
    lng: number
  }
  datetime: Date
  description: string
  status: string
}

interface SafetyMetrics {
  safetyScore: number
  crimeScore: number
  socialScore: number
  pedestrianScore: number
  incidents: Incident[]
}

// Cache configuration
const CACHE_DURATION = 15 * 60 * 1000 // 15 minutes
const cache = new Map<string, { data: any; timestamp: number }>()

/**
 * Fetch 311 service requests for encampments and aggressive/threatening incidents
 */
async function fetch311Incidents(): Promise<Incident[]> {
  const cacheKey = '311_incidents'
  const cached = cache.get(cacheKey)
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data
  }
  
  try {
    // Get date filter for last 30 days
    const dateFilter = new Date()
    dateFilter.setDate(dateFilter.getDate() - 30)
    const dateString = dateFilter.toISOString().split('T')[0]
    
    const url = `https://data.sfgov.org/resource/vw6y-z8j6.json?$where=(service_name like '%25Aggressive%25' OR service_name like '%25Threatening%25' OR service_name like '%25Encampment%25') AND requested_datetime >= '${dateString}'&$order=requested_datetime DESC&$limit=1000`
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json'
        // DataSF API key is optional, the API works without it
      }
    })
    
    if (!response.ok) {
      throw new Error(`311 API error: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    const incidents: Incident[] = data
      .filter((item: any) => item.lat && item.long)
      .map((item: any) => ({
        id: item.service_request_id,
        type: item.service_name?.toLowerCase().includes('encampment') ? 'encampment' : 'aggressive',
        severity: item.service_name?.toLowerCase().includes('aggressive') ? 'high' : 'medium',
        location: {
          lat: parseFloat(item.lat),
          lng: parseFloat(item.long)
        },
        datetime: new Date(item.requested_datetime),
        description: `${item.service_name}: ${item.service_subtype || ''}`,
        status: item.status_description
      }))
    
    cache.set(cacheKey, { data: incidents, timestamp: Date.now() })
    return incidents
  } catch (error) {
    console.error('Error fetching 311 data:', error)
    return []
  }
}

/**
 * Fetch SFPD dispatch reports for serious crimes
 */
async function fetchDispatchIncidents(): Promise<Incident[]> {
  const cacheKey = 'dispatch_incidents'
  const cached = cache.get(cacheKey)
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data
  }
  
  try {
    const highSeverityTypes = [
      'Explosive Device Found',
      'Mentally Disturbed Person',
      'Threats / Harassment', 
      'Robbery',
      'Assault / Battery',
      'Burglary'
    ]
    
    const typeFilter = highSeverityTypes.map(type => 
      `call_type_original_desc='${type}'`
    ).join(' OR ')
    
    const url = `https://data.sfgov.org/resource/nwbb-fxkq.json?$where=(${typeFilter})&$order=entry_datetime DESC&$limit=500`
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json'
        // DataSF API key is optional, the API works without it
      }
    })
    
    if (!response.ok) {
      throw new Error(`Dispatch API error: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    const incidents: Incident[] = data
      .filter((item: any) => item.location)
      .map((item: any) => {
        const isHighSeverity = [
          'Explosive Device Found',
          'Robbery',
          'Assault / Battery',
          'Threats / Harassment'
        ].includes(item.call_type_original_desc)
        
        return {
          id: item.cadid,
          type: item.call_type_original_desc?.includes('Suspicious') ? 'suspicious' : 'crime',
          severity: isHighSeverity ? 'high' : 'medium',
          location: {
            lat: parseFloat(item.location.latitude),
            lng: parseFloat(item.location.longitude)
          },
          datetime: new Date(item.entry_datetime),
          description: item.call_type_original_desc,
          status: item.disposition || 'Active'
        }
      })
    
    cache.set(cacheKey, { data: incidents, timestamp: Date.now() })
    return incidents
  } catch (error) {
    console.error('Error fetching dispatch data:', error)
    return []
  }
}

/**
 * Calculate distance between two coordinates in meters
 */
export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3 // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180
  const φ2 = lat2 * Math.PI / 180
  const Δφ = (lat2 - lat1) * Math.PI / 180
  const Δλ = (lng2 - lng1) * Math.PI / 180

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

/**
 * Get safety data for a specific location or route
 */
export async function getSafetyDataForLocation(
  lat: number,
  lng: number,
  radiusMeters: number = 500
): Promise<SafetyMetrics> {
  // Use mock incidents instead of API calls
  const allIncidents = await getRecentIncidents()
  
  // Filter incidents within radius
  const nearbyIncidents = allIncidents.filter(incident => {
    const distance = calculateDistance(lat, lng, incident.location.lat, incident.location.lng)
    return distance <= radiusMeters
  })
  
  // Calculate safety scores based on incident proximity and severity
  const highSeverity = nearbyIncidents.filter(i => i.severity === 'high').length
  const mediumSeverity = nearbyIncidents.filter(i => i.severity === 'medium').length
  const lowSeverity = nearbyIncidents.filter(i => i.severity === 'low').length
  
  // Base score starts at 100 and decreases based on incidents
  let safetyScore = 100
  safetyScore -= highSeverity * 15 // High severity incidents have major impact
  safetyScore -= mediumSeverity * 8
  safetyScore -= lowSeverity * 3
  safetyScore = Math.max(0, Math.min(100, safetyScore))
  
  // Crime score specifically for crime-related incidents
  const crimeIncidents = nearbyIncidents.filter(i => i.type === 'crime').length
  let crimeScore = 100 - (crimeIncidents * 10)
  crimeScore = Math.max(0, Math.min(100, crimeScore))
  
  // Social score based on encampments and aggressive behavior
  const socialIncidents = nearbyIncidents.filter(i => 
    i.type === 'encampment' || i.type === 'aggressive'
  ).length
  let socialScore = 100 - (socialIncidents * 12)
  socialScore = Math.max(0, Math.min(100, socialScore))
  
  // Pedestrian score based on all incidents but weighted less
  let pedestrianScore = 100 - (nearbyIncidents.length * 5)
  pedestrianScore = Math.max(0, Math.min(100, pedestrianScore))
  
  return {
    safetyScore,
    crimeScore, 
    socialScore,
    pedestrianScore,
    incidents: nearbyIncidents
  }
}

/**
 * Calculate safety score for an entire route
 */
export async function getRouteSafetyScore(
  coordinates: Array<{ lat: number; lng: number }>
): Promise<SafetyMetrics> {
  try {
    // Sample points along the route (every 5th coordinate to reduce API calls)
    const samplePoints = coordinates.filter((_, index) => index % 5 === 0)
    
    // Ensure we have at least one sample point
    if (samplePoints.length === 0 && coordinates.length > 0) {
      samplePoints.push(coordinates[0])
    }
    
    // Get safety data for each sample point
    const safetyDataPromises = samplePoints.map(coord => 
      getSafetyDataForLocation(coord.lat, coord.lng, 250) // 250m radius for route points
    )
    
    const safetyDataArray = await Promise.all(safetyDataPromises)
    
    // Handle empty data array
    if (safetyDataArray.length === 0) {
      return {
        safetyScore: 85,
        crimeScore: 85,
        socialScore: 85,
        pedestrianScore: 85,
        incidents: []
      }
    }
    
    // Average the scores across all sample points
    const avgSafetyScore = Math.round(
      safetyDataArray.reduce((acc, data) => acc + data.safetyScore, 0) / safetyDataArray.length
    )
    const avgCrimeScore = Math.round(
      safetyDataArray.reduce((acc, data) => acc + data.crimeScore, 0) / safetyDataArray.length
    )
    const avgSocialScore = Math.round(
      safetyDataArray.reduce((acc, data) => acc + data.socialScore, 0) / safetyDataArray.length
    )
    const avgPedestrianScore = Math.round(
      safetyDataArray.reduce((acc, data) => acc + data.pedestrianScore, 0) / safetyDataArray.length
    )
    
    // Collect all unique incidents along the route
    const allIncidents = new Map<string, Incident>()
    safetyDataArray.forEach(data => {
      data.incidents.forEach(incident => {
        allIncidents.set(incident.id, incident)
      })
    })
    
    return {
      safetyScore: avgSafetyScore,
      crimeScore: avgCrimeScore,
      socialScore: avgSocialScore,
      pedestrianScore: avgPedestrianScore,
      incidents: Array.from(allIncidents.values())
    }
  } catch (error) {
    console.error('Error calculating route safety score:', error)
    // Return default scores if there's an error
    return {
      safetyScore: 85,
      crimeScore: 85,
      socialScore: 85,
      pedestrianScore: 85,
      incidents: []
    }
  }
}

/**
 * Get recent high-severity incidents for display on map
 */
export async function getRecentIncidents(): Promise<Incident[]> {
  // Try to fetch real incidents first, fall back to mock data
  try {
    const [incidents311, incidentsDispatch] = await Promise.all([
      fetch311Incidents(),
      fetchDispatchIncidents()
    ])
    
    // Combine and return real incidents if available
    const allIncidents = [...incidents311, ...incidentsDispatch]
    if (allIncidents.length > 0) {
      return allIncidents
    }
  } catch (error) {
    console.warn('Failed to fetch real incidents, using mock data:', error)
  }
  
  // Fallback to mock data if real API calls fail
  try {
    // @ts-ignore - Mock data file may not exist, handled gracefully
    const { allMockIncidents } = await import('@/data/parsedIncidents')
    return allMockIncidents || []
  } catch (error) {
    console.warn('Mock incidents not available, returning empty array')
    return []
  }
}

export type { Incident, SafetyMetrics }
