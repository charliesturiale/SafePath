"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MapPin, Navigation, Shield, ChevronRight, Settings, Loader2, AlertCircle, Clock, Sparkles } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import RouteMap from "@/components/route-map"
import LocationInput from "@/components/location-input"
import { calculateRoutes } from "@/services/graphhopper"
import { saveLocation } from "@/services/savedLocations"

export interface Route {
  id: number
  name: string
  distance: string
  time: string
  safetyScore: number
  crimeScore: number
  timeScore: number
  socialScore: number
  pedestrianScore: number
  coordinates: Array<{ lat: number; lng: number }>
  waypoints: Array<{ name: string; type: string; safe: boolean }>
  color: string
}

export default function SafePathApp() {
  const [origin, setOrigin] = useState("")
  const [destination, setDestination] = useState("")
  const [routeCalculated, setRouteCalculated] = useState(false)
  const [routes, setRoutes] = useState<Route[]>([])
  const [selectedRouteId, setSelectedRouteId] = useState<number>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCalculateRoute = async () => {
    if (!origin || !destination) return

    // API key is now hardcoded, no need to check

    setLoading(true)
    setError(null)
    setRouteCalculated(false)

    try {
      const result = await calculateRoutes(origin, destination)

      // Result is always valid now, no need to check for null
      setRoutes(result.routes)
      setSelectedRouteId(1)
      setRouteCalculated(true)

      // Save locations to localStorage for future use
      saveLocation(origin)
      saveLocation(destination)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred while calculating routes")
      console.error("Route calculation error:", err)
    } finally {
      setLoading(false)
    }
  }

  const selectedRoute = routes.find((r) => r.id === selectedRouteId)

  return (
    <div className="min-h-screen gradient-bg">
      {/* Header */}
      <header className="border-b border-border/50 bg-white/80 backdrop-blur-lg shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl gradient-primary shadow-glow">
                <Shield className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-display font-bold text-gradient">SafePath</h1>
                <p className="text-xs text-muted-foreground font-medium">San Francisco, CA</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="hover:bg-primary/10">
              <Settings className="h-5 w-5 text-foreground/70" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Top Section - Route Input/Options and Map */}
        <div className="grid gap-6 lg:grid-cols-3 mb-6">
          {/* Left Column - Route Input & Options */}
          <div className="space-y-6 lg:col-span-1">
            {/* Route Input Card - Compact */}
            <Card className="p-4 shadow-lg border-2 border-border/50 bg-white/90 backdrop-blur">
              <h2 className="mb-3 text-lg font-display font-bold text-foreground">Plan Your Route</h2>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">From</label>
                  <LocationInput
                    value={origin}
                    onChange={setOrigin}
                    placeholder="Starting point"
                    icon={<MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />}
                    className="focus:border-primary focus:ring-2 focus:ring-primary/20 h-10"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">To</label>
                  <LocationInput
                    value={destination}
                    onChange={setDestination}
                    placeholder="Destination"
                    icon={<Navigation className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-accent" />}
                    className="focus:border-accent focus:ring-2 focus:ring-accent/20 h-10"
                  />
                </div>

                <Button
                  onClick={handleCalculateRoute}
                  className="w-full h-10 text-sm font-semibold gradient-primary shadow-glow-hover transition-all"
                  disabled={!origin || !destination || loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Calculating...
                    </>
                  ) : (
                    <>
                      Find Routes
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </>
                  )}
                </Button>

                {/* Error Display - Compact */}
                {error && (
                  <Alert variant="destructive" className="mt-2">
                    <AlertCircle className="h-3 w-3" />
                    <AlertDescription className="text-xs">{error}</AlertDescription>
                  </Alert>
                )}
              </div>
            </Card>

            {/* Demo Suggestions - Longer routes with clear differentiation */}
            {!routeCalculated && (
              <Card className="p-3 shadow-lg border-2 border-border/50 bg-gradient-to-br from-primary/5 to-accent/5 backdrop-blur">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <h3 className="text-xs font-display font-bold text-foreground">Demo Routes</h3>
                </div>
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setOrigin("Tenderloin, San Francisco, CA")
                      setDestination("Ferry Building, San Francisco, CA")
                    }}
                    className="w-full p-2 text-left rounded-lg border border-border/50 hover:border-primary/50 hover:bg-white/50 transition-all"
                  >
                    <div className="font-semibold text-xs text-foreground">Tenderloin → Ferry Building</div>
                    <div className="text-xs text-muted-foreground">~1.5 miles • Shows all 3 route types</div>
                  </button>
                  <button
                    onClick={() => {
                      setOrigin("Golden Gate Park, San Francisco, CA")
                      setDestination("Fisherman's Wharf, San Francisco, CA")
                    }}
                    className="w-full p-2 text-left rounded-lg border border-border/50 hover:border-primary/50 hover:bg-white/50 transition-all"
                  >
                    <div className="font-semibold text-xs text-foreground">Park → Wharf</div>
                    <div className="text-xs text-muted-foreground">~3 miles • Tourist corridor</div>
                  </button>
                </div>
              </Card>
            )}

            {routeCalculated && routes.length > 0 && (
              <Card className="p-4 shadow-lg border-2 border-border/50 bg-white/90 backdrop-blur">
                <h2 className="mb-3 text-lg font-display font-bold text-foreground">Route Options</h2>
                <div className="space-y-3">
                  {routes.map((route) => (
                    <button
                      key={route.id}
                      onClick={() => setSelectedRouteId(route.id)}
                      className={`relative w-full rounded-xl border-2 text-left transition-all duration-200 overflow-hidden ${
                        selectedRouteId === route.id
                          ? "border-primary shadow-lg scale-[1.02]"
                          : "border-border/50 hover:border-primary/50 hover:shadow-md"
                      }`}
                    >
                      {/* Color indicator bar */}
                      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: route.color }}></div>
                      
                      <div className="p-3 pl-4">
                        <div className="mb-2 flex items-start justify-between">
                          <div>
                            <h3 className="font-display font-bold text-foreground text-sm">{route.name}</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {route.id === 1 && "Safest • Well-lit"}
                              {route.id === 2 && "Balanced • Mixed"}
                              {route.id === 3 && "Fastest • Quickest time"}
                            </p>
                          </div>
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                              route.safetyScore >= 85
                                ? "bg-green-100 text-green-700"
                                : route.safetyScore >= 70
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-orange-100 text-orange-700"
                            }`}
                          >
                            {route.safetyScore}%
                          </span>
                        </div>
                        
                        {/* Time and Distance - Compact */}
                        <div className="flex gap-4 text-xs mb-2">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" style={{ color: route.color }} />
                            <span className="font-semibold">{route.time}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Navigation className="h-3 w-3" style={{ color: route.color }} />
                            <span className="font-semibold">{route.distance}</span>
                          </div>
                        </div>
                        
                        {/* Score bars - Visual only, no percentages */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-muted-foreground">Safety Level</span>
                            </div>
                            <div className="h-1 bg-gray-200 rounded-full overflow-hidden mt-0.5">
                              <div 
                                className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full"
                                style={{ width: `${route.crimeScore}%` }}
                              ></div>
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-muted-foreground">Route Speed</span>
                            </div>
                            <div className="h-1 bg-gray-200 rounded-full overflow-hidden mt-0.5">
                              <div 
                                className="h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-full"
                                style={{ width: `${route.timeScore}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Right Column - Map */}
          <div className="lg:col-span-2">
            <RouteMap
              routeCalculated={routeCalculated}
              origin={origin}
              destination={destination}
              routes={routes}
              selectedRouteId={selectedRouteId}
            />
          </div>
        </div>

      </div>
    </div>
  )
}
