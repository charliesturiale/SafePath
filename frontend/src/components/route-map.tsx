import { useEffect, useState } from "react"
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Route } from "./safe-path-app"
import { getRecentIncidents, type Incident } from "@/services/SafetyDataService"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

interface RouteMapProps {
  routeCalculated: boolean
  origin?: string
  destination?: string
  routes?: Route[]
  selectedRouteId?: number
}

// Fix for default marker icons in React-Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
})

// Custom icons for start and destination
const createCustomIcon = (color: string, text: string) => {
  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="
        background: ${color};
        width: 36px;
        height: 36px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 4px 6px rgba(0,0,0,0.2);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <span style="
          color: white;
          font-weight: bold;
          font-size: 16px;
          transform: rotate(45deg);
        ">${text}</span>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  })
}

const createWaypointIcon = (safe: boolean) => {
  const color = safe ? "#10b981" : "#f59e0b"
  const symbol = safe ? "✓" : "!"

  return L.divIcon({
    className: "waypoint-marker",
    html: `
      <div style="
        background: ${color};
        width: 28px;
        height: 28px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 14px;
      ">${symbol}</div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  })
}

// Create icon for incidents with high visibility
const createIncidentIcon = (incident: Incident) => {
  const colors = {
    encampment: "#9333ea",
    aggressive: "#dc2626",
    crime: "#ef4444",
    suspicious: "#f97316"
  }
  
  const symbols = {
    encampment: "⛺",
    aggressive: "⚠️",
    crime: "🚨",
    suspicious: "👁"
  }
  
  const severitySize = {
    high: 32,
    medium: 28,
    low: 24
  }
  
  const color = colors[incident.type]
  const symbol = symbols[incident.type]
  const size = severitySize[incident.severity]
  
  return L.divIcon({
    className: "incident-marker",
    html: `
      <div style="
        background: ${color};
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 3px 6px rgba(0,0,0,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: ${size * 0.55}px;
        cursor: pointer;
        z-index: ${incident.severity === 'high' ? 1000 : incident.severity === 'medium' ? 900 : 800};
      ">${symbol}</div>
    `,
    iconSize: [size, size],
    iconAnchor: [size/2, size/2],
    popupAnchor: [0, -size/2],
  })
}

// Component to handle map bounds updates
function MapBoundsUpdater({ routes, routeCalculated }: { routes?: Route[]; routeCalculated: boolean }) {
  const map = useMap()

  useEffect(() => {
    if (!routeCalculated || !routes || routes.length === 0) return

    const firstRoute = routes[0]
    const bounds = L.latLngBounds(
      firstRoute.coordinates.map((coord) => [coord.lat, coord.lng] as [number, number])
    )

    map.fitBounds(bounds, { padding: [50, 50] })
  }, [routes, routeCalculated, map])

  return null
}

export default function RouteMap({ routeCalculated, origin, destination, routes, selectedRouteId }: RouteMapProps) {
  // Default center on San Francisco
  const defaultCenter: [number, number] = [37.7749, -122.4194]
  const defaultZoom = 13
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [showIncidents, setShowIncidents] = useState(true)
  const [isLoadingIncidents, setIsLoadingIncidents] = useState(false)

  const startIcon = createCustomIcon("#8b5cf6", "S")
  const endIcon = createCustomIcon("#06b6d4", "D")
  
  // Load incidents when component mounts and refresh every 10 minutes
  useEffect(() => {
    async function loadIncidents() {
      setIsLoadingIncidents(true)
      try {
        const recentIncidents = await getRecentIncidents()
        setIncidents(recentIncidents)
        console.log(`Loaded ${recentIncidents.length} incidents from 311 and SFPD APIs`)
      } catch (error) {
        console.error("Failed to load incidents:", error)
      } finally {
        setIsLoadingIncidents(false)
      }
    }
    
    // Load immediately
    loadIncidents()
    
    // Set up refresh interval (10 minutes = 600000ms)
    const interval = setInterval(loadIncidents, 600000)
    
    return () => clearInterval(interval)
  }, [])

  return (
    <Card className="relative h-[calc(100vh-12rem)] overflow-hidden shadow-lg border-2 border-border/50">
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        style={{ height: "100%", width: "100%", zIndex: 0 }}
        zoomControl={true}
        scrollWheelZoom={true}
      >
        {/* OpenStreetMap Tiles */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Always render incident markers on the map */}
        {showIncidents && incidents.map((incident) => {
          const incidentDate = new Date(incident.datetime)
          const formattedDate = incidentDate.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
          })
          const formattedTime = incidentDate.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
          })
          
          // Extract main incident type from description
          const incidentTitle = incident.description.split(':')[0].trim()
          
          return (
            <Marker
              key={incident.id}
              position={[incident.location.lat, incident.location.lng]}
              icon={createIncidentIcon(incident)}
              zIndexOffset={incident.severity === 'high' ? 1000 : incident.severity === 'medium' ? 500 : 0}
            >
              <Popup className="incident-popup" maxWidth={250}>
                <div className="p-2">
                  <div className="font-bold text-base mb-1">
                    {incidentTitle}
                  </div>
                  <div className="text-sm text-gray-700 mb-2">
                    {formattedDate} at {formattedTime}
                  </div>
                  <div className="text-xs text-gray-600 mb-1">
                    <span className="font-semibold">Type:</span> 
                    {incident.type === 'encampment' && ' 311 Encampment Report'}
                    {incident.type === 'aggressive' && ' 311 Aggressive/Threatening'}
                    {incident.type === 'crime' && ' SFPD Crime Report'}
                    {incident.type === 'suspicious' && ' SFPD Suspicious Activity'}
                  </div>
                  <div className="text-xs mb-1">
                    <span className="font-semibold">Severity:</span>
                    <span className={`ml-1 font-bold ${
                      incident.severity === 'high' ? 'text-red-600' :
                      incident.severity === 'medium' ? 'text-orange-600' :
                      'text-yellow-600'
                    }`}>
                      {incident.severity.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600">
                    <span className="font-semibold">Status:</span> {incident.status}
                  </div>
                  {incident.description !== incidentTitle && (
                    <div className="text-xs text-gray-500 mt-2 pt-2 border-t">
                      {incident.description}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          )
        })}

        {/* Render routes if calculated */}
        {routeCalculated && routes && routes.length > 0 && (
          <>
            {/* Update map bounds */}
            <MapBoundsUpdater routes={routes} routeCalculated={routeCalculated} />

            {/* Draw all routes */}
            {routes.map((route) => {
              const isSelected = route.id === selectedRouteId
              const positions = route.coordinates.map((coord) => [coord.lat, coord.lng] as [number, number])

              return (
                <Polyline
                  key={route.id}
                  positions={positions}
                  pathOptions={{
                    color: route.color,
                    weight: isSelected ? 6 : 4,
                    opacity: isSelected ? 1 : 0.5,
                    lineCap: "round",
                    lineJoin: "round",
                  }}
                />
              )
            })}

            {/* Start and End markers */}
            {(() => {
              const firstRoute = routes[0]
              const startCoord = firstRoute.coordinates[0]
              const endCoord = firstRoute.coordinates[firstRoute.coordinates.length - 1]

              return (
                <>
                  <Marker position={[startCoord.lat, startCoord.lng]} icon={startIcon}>
                    <Popup>
                      <div className="font-semibold">Start</div>
                      <div className="text-sm text-muted-foreground">{origin || "Starting Point"}</div>
                    </Popup>
                  </Marker>

                  <Marker position={[endCoord.lat, endCoord.lng]} icon={endIcon}>
                    <Popup>
                      <div className="font-semibold">Destination</div>
                      <div className="text-sm text-muted-foreground">{destination || "Your Destination"}</div>
                    </Popup>
                  </Marker>
                </>
              )
            })()}

            {/* Remove waypoint markers - we're showing actual incidents instead */}
          </>
        )}
      </MapContainer>

      {/* Map Controls */}
      <div className="absolute bottom-4 left-4 z-[1000] space-y-2">
        {routeCalculated && (
          <Badge className="gradient-primary text-white shadow-glow px-3 py-1.5">
            <div className="mr-2 h-2 w-2 animate-pulse rounded-full bg-white" />
            Live Map
          </Badge>
        )}
        
        {/* Incident Toggle */}
        <button
          onClick={() => setShowIncidents(!showIncidents)}
          className="flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 text-sm font-medium shadow-lg border border-border/50 hover:bg-white transition-colors"
        >
          <span className="text-lg">{showIncidents ? '🚨' : '🔒'}</span>
          <span>{showIncidents ? 'Hide' : 'Show'} Incidents</span>
          {incidents.length > 0 && (
            <Badge variant="secondary" className="ml-1">
              {incidents.length}
            </Badge>
          )}
        </button>
      </div>
      
      {/* Incident Statistics */}
      {showIncidents && incidents.length > 0 && (
        <div className="absolute top-4 right-4 z-[1000] bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-border/50 max-w-xs">
          <div className="text-sm font-semibold mb-2">Recent Incidents</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1">
              <span>⛺</span>
              <span>Encampments: {incidents.filter(i => i.type === 'encampment').length}</span>
            </div>
            <div className="flex items-center gap-1">
              <span>⚠️</span>
              <span>Aggressive: {incidents.filter(i => i.type === 'aggressive').length}</span>
            </div>
            <div className="flex items-center gap-1">
              <span>🚨</span>
              <span>Crimes: {incidents.filter(i => i.type === 'crime').length}</span>
            </div>
            <div className="flex items-center gap-1">
              <span>👁</span>
              <span>Suspicious: {incidents.filter(i => i.type === 'suspicious').length}</span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
            Total: {incidents.length} incidents
          </div>
        </div>
      )}

      {/* Map Attribution */}
      {!routeCalculated && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-[1000]">
          <div className="text-center p-6">
            <div className="text-lg font-display font-bold text-foreground mb-2">
              Enter a route to get started
            </div>
            <p className="text-sm text-muted-foreground">
              Interactive map powered by OpenStreetMap
            </p>
          </div>
        </div>
      )}
    </Card>
  )
}
