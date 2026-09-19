import { calculateDistance } from './SafetyDataService'
import type { Incident } from './SafetyDataService'

interface RouteSegment {
  start: { lat: number; lng: number }
  end: { lat: number; lng: number }
  coordinates: Array<{ lat: number; lng: number }>
  incidents: Incident[]
  isProblematic: boolean
  minDistanceToIncident: number
  depth: number
}

interface RerouteWaypoint {
  lat: number
  lng: number
  reason: string
  avoidedIncidents: Incident[]
}

const MIN_SAFE_DISTANCE = 50 // Minimum distance to maintain from incidents (meters)
const MAX_OPTIMAL_DISTANCE = 200 // Maximum distance we aim for (ideal scenario)
const MAX_RECURSION_DEPTH = 7
const MIN_SEGMENT_LENGTH = 10 // Minimum segment length in meters to continue recursion

/**
 * Calculate the midpoint between two coordinates
 */
function calculateMidpoint(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number }
): { lat: number; lng: number } {
  return {
    lat: (start.lat + end.lat) / 2,
    lng: (start.lng + end.lng) / 2
  }
}

/**
 * Find incidents near a route segment
 */
function findNearbyIncidents(
  segment: RouteSegment,
  allIncidents: Incident[],
  radiusMeters: number = 100
): Incident[] {
  const nearbyIncidents: Incident[] = []
  const segmentPoints = segment.coordinates.length > 0 
    ? segment.coordinates 
    : [segment.start, segment.end]
  
  // Check incidents against all points in the segment
  for (const point of segmentPoints) {
    for (const incident of allIncidents) {
      const distance = calculateDistance(
        point.lat,
        point.lng,
        incident.location.lat,
        incident.location.lng
      )
      
      if (distance <= radiusMeters) {
        // Avoid duplicates
        if (!nearbyIncidents.find(i => i.id === incident.id)) {
          nearbyIncidents.push(incident)
        }
      }
    }
  }
  
  return nearbyIncidents
}

/**
 * Calculate the minimum distance from any point in a segment to any incident
 */
function calculateMinDistanceToIncidents(
  segment: RouteSegment,
  incidents: Incident[]
): number {
  if (incidents.length === 0) return Infinity
  
  const segmentPoints = segment.coordinates.length > 0
    ? segment.coordinates
    : [segment.start, segment.end]
  
  let minDistance = Infinity
  
  for (const point of segmentPoints) {
    for (const incident of incidents) {
      const distance = calculateDistance(
        point.lat,
        point.lng,
        incident.location.lat,
        incident.location.lng
      )
      minDistance = Math.min(minDistance, distance)
    }
  }
  
  return minDistance
}

/**
 * Calculate optimal waypoint to avoid incidents
 * Uses a perpendicular offset algorithm to maximize distance from incidents
 */
function calculateOptimalWaypoint(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number },
  incidents: Incident[]
): RerouteWaypoint | null {
  if (incidents.length === 0) return null
  
  // Calculate segment vector
  const dLat = end.lat - start.lat
  const dLng = end.lng - start.lng
  const segmentLength = calculateDistance(start.lat, start.lng, end.lat, end.lng)
  
  if (segmentLength < 1) return null // Segment too short
  
  // Find the incident closest to the segment center
  const midpoint = calculateMidpoint(start, end)
  let closestIncident = incidents[0]
  let closestDistance = calculateDistance(
    midpoint.lat,
    midpoint.lng,
    incidents[0].location.lat,
    incidents[0].location.lng
  )
  
  for (const incident of incidents) {
    const distance = calculateDistance(
      midpoint.lat,
      midpoint.lng,
      incident.location.lat,
      incident.location.lng
    )
    if (distance < closestDistance) {
      closestDistance = distance
      closestIncident = incident
    }
  }
  
  // Calculate perpendicular offset to avoid the incident
  // Normalize segment direction
  const segmentBearing = Math.atan2(dLng, dLat)
  
  // Calculate vector from midpoint to incident
  const toIncidentLat = closestIncident.location.lat - midpoint.lat
  const toIncidentLng = closestIncident.location.lng - midpoint.lng
  
  // Calculate perpendicular direction (90 degrees from segment)
  // We want to go perpendicular to the segment, away from the incident
  const perpBearing = segmentBearing + Math.PI / 2
  
  // Determine which perpendicular direction moves away from incident
  const perpLat1 = Math.cos(perpBearing)
  const perpLng1 = Math.sin(perpBearing)
  const perpLat2 = -perpLat1
  const perpLng2 = -perpLng1
  
  // Calculate dot product to determine which direction is away from incident
  const dot1 = perpLat1 * toIncidentLat + perpLng1 * toIncidentLng
  const dot2 = perpLat2 * toIncidentLat + perpLng2 * toIncidentLng
  
  // Use direction with negative dot product (away from incident)
  const awayPerpLat = dot1 < dot2 ? perpLat1 : perpLat2
  const awayPerpLng = dot1 < dot2 ? perpLng1 : perpLng2
  
  // Calculate optimal offset distance (aim for MAX_OPTIMAL_DISTANCE, but at least MIN_SAFE_DISTANCE)
  const desiredDistance = Math.min(
    MAX_OPTIMAL_DISTANCE,
    Math.max(MIN_SAFE_DISTANCE, closestDistance * 0.8) // Try to get 80% further than current distance
  )
  
  // Convert distance to degrees (approximate: 1 degree ≈ 111km)
  const offsetInDegrees = desiredDistance / 111000
  
  // Calculate waypoint position
  const waypointLat = midpoint.lat + awayPerpLat * offsetInDegrees
  const waypointLng = midpoint.lng + awayPerpLng * offsetInDegrees
  
  // Verify the waypoint actually avoids all incidents by at least MIN_SAFE_DISTANCE
  const waypointAvoidsAll = incidents.every(incident => {
    const distance = calculateDistance(
      waypointLat,
      waypointLng,
      incident.location.lat,
      incident.location.lng
    )
    return distance >= MIN_SAFE_DISTANCE
  })
  
  if (!waypointAvoidsAll) {
    // If the calculated waypoint doesn't avoid all incidents, try a closer offset
    const minDistance = Math.max(
      MIN_SAFE_DISTANCE,
      ...incidents.map(inc => 
        calculateDistance(waypointLat, waypointLng, inc.location.lat, inc.location.lng)
      )
    )
    const safeOffsetInDegrees = (minDistance + 10) / 111000
    
    return {
      lat: midpoint.lat + awayPerpLat * safeOffsetInDegrees,
      lng: midpoint.lng + awayPerpLng * safeOffsetInDegrees,
      reason: `Rerouting to avoid ${incidents.length} incident(s)`,
      avoidedIncidents: incidents
    }
  }
  
  return {
    lat: waypointLat,
    lng: waypointLng,
    reason: `Rerouting to avoid ${incidents.length} incident(s) by ${Math.round(desiredDistance)}m`,
    avoidedIncidents: incidents
  }
}

/**
 * Recursively segment a route and identify problematic segments
 */
export async function recursivelySegmentRoute(
  coordinates: Array<{ lat: number; lng: number }>,
  allIncidents: Incident[],
  depth: number = 0
): Promise<{ segments: RouteSegment[]; waypoints: RerouteWaypoint[] }> {
  const waypoints: RerouteWaypoint[] = []
  const segments: RouteSegment[] = []
  
  if (coordinates.length < 2) {
    return { segments, waypoints }
  }
  
  // If we've reached max depth or have a very short segment, analyze what we have
  if (depth >= MAX_RECURSION_DEPTH) {
    const segmentLength = calculateDistance(
      coordinates[0].lat,
      coordinates[0].lng,
      coordinates[coordinates.length - 1].lat,
      coordinates[coordinates.length - 1].lng
    )
    
    if (segmentLength < MIN_SEGMENT_LENGTH) {
      const segment: RouteSegment = {
        start: coordinates[0],
        end: coordinates[coordinates.length - 1],
        coordinates,
        incidents: findNearbyIncidents(
          {
            start: coordinates[0],
            end: coordinates[coordinates.length - 1],
            coordinates,
            incidents: [],
            isProblematic: false,
            minDistanceToIncident: Infinity,
            depth
          },
          allIncidents,
          100
        ),
        isProblematic: false,
        minDistanceToIncident: Infinity,
        depth
      }
      
      segment.minDistanceToIncident = calculateMinDistanceToIncidents(segment, segment.incidents)
      segment.isProblematic = segment.minDistanceToIncident < MIN_SAFE_DISTANCE
      
      segments.push(segment)
      return { segments, waypoints }
    }
  }
  
  // Calculate segment length
  const start = coordinates[0]
  const end = coordinates[coordinates.length - 1]
  const segmentLength = calculateDistance(start.lat, start.lng, end.lat, end.lng)
  
  // If segment is short enough, analyze it directly
  if (segmentLength < MIN_SEGMENT_LENGTH || depth >= MAX_RECURSION_DEPTH) {
    const segment: RouteSegment = {
      start,
      end,
      coordinates,
      incidents: [],
      isProblematic: false,
      minDistanceToIncident: Infinity,
      depth
    }
    
    segment.incidents = findNearbyIncidents(segment, allIncidents, 100)
    segment.minDistanceToIncident = calculateMinDistanceToIncidents(segment, segment.incidents)
    segment.isProblematic = segment.minDistanceToIncident < MIN_SAFE_DISTANCE
    
    segments.push(segment)
    
    // If problematic, calculate reroute waypoint
    if (segment.isProblematic && segment.incidents.length > 0) {
      const waypoint = calculateOptimalWaypoint(start, end, segment.incidents)
      if (waypoint) {
        waypoints.push(waypoint)
      }
    }
    
    return { segments, waypoints }
  }
  
  // Split segment in half
  const midpointIndex = Math.floor(coordinates.length / 2)
  const midpoint = coordinates[midpointIndex]
  
  // Recursively process first half
  const firstHalf = coordinates.slice(0, midpointIndex + 1)
  const firstResult = await recursivelySegmentRoute(firstHalf, allIncidents, depth + 1)
  
  // Recursively process second half
  const secondHalf = coordinates.slice(midpointIndex)
  const secondResult = await recursivelySegmentRoute(secondHalf, allIncidents, depth + 1)
  
  // Combine results
  return {
    segments: [...firstResult.segments, ...secondResult.segments],
    waypoints: [...firstResult.waypoints, ...secondResult.waypoints]
  }
}

/**
 * Apply intelligent rerouting to a route by injecting waypoints
 */
export async function applyIntelligentRerouting(
  coordinates: Array<{ lat: number; lng: number }>,
  allIncidents: Incident[]
): Promise<Array<{ lat: number; lng: number }>> {
  // Perform recursive segmentation
  const { waypoints } = await recursivelySegmentRoute(coordinates, allIncidents)
  
  // If no waypoints needed, return original route
  if (waypoints.length === 0) {
    return coordinates
  }
  
  // Sort waypoints by their position along the route
  // For each waypoint, find its approximate position in the route
  const waypointsWithPosition = waypoints.map(waypoint => {
    let minDistance = Infinity
    let bestIndex = 0
    
    // Find the point in the route closest to where this waypoint should be inserted
    for (let i = 0; i < coordinates.length - 1; i++) {
      const segmentStart = coordinates[i]
      const segmentEnd = coordinates[i + 1]
      const midpoint = calculateMidpoint(segmentStart, segmentEnd)
      
      const distance = calculateDistance(
        waypoint.lat,
        waypoint.lng,
        midpoint.lat,
        midpoint.lng
      )
      
      if (distance < minDistance) {
        minDistance = distance
        bestIndex = i + 1
      }
    }
    
    return { waypoint, insertIndex: bestIndex }
  })
  
  // Sort by insert index
  waypointsWithPosition.sort((a, b) => a.insertIndex - b.insertIndex)
  
  // Insert waypoints into the route
  const optimizedRoute: Array<{ lat: number; lng: number }> = [...coordinates]
  
  // Insert waypoints from end to beginning to maintain correct indices
  for (let i = waypointsWithPosition.length - 1; i >= 0; i--) {
    const { waypoint, insertIndex } = waypointsWithPosition[i]
    optimizedRoute.splice(insertIndex, 0, { lat: waypoint.lat, lng: waypoint.lng })
  }
  
  return optimizedRoute
}

