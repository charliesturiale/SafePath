"use client"

import { useState, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { MapPin, Star, X, Search } from "lucide-react"
import { getSavedLocations, searchLocations, deleteLocation, SF_LANDMARKS, type SavedLocation } from "@/services/savedLocations"
import { geocodeAddress } from "@/services/graphhopper"
import { cn } from "@/lib/utils"

interface LocationInputProps {
  value: string
  onChange: (value: string) => void
  placeholder: string
  icon: React.ReactNode
  className?: string
}

interface GeocodingSuggestion {
  id: string
  name: string
  address: string
  type: 'saved' | 'suggestion'
}

export default function LocationInput({ value, onChange, placeholder, icon, className }: LocationInputProps) {
  const [showDropdown, setShowDropdown] = useState(false)
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([])
  const [suggestions, setSuggestions] = useState<GeocodingSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceTimer = useRef<NodeJS.Timeout | null>(null)

  // Load saved locations
  useEffect(() => {
    const locations = getSavedLocations()
    setSavedLocations(locations)
  }, [])

  // Fetch geocoding suggestions and filter saved locations
  useEffect(() => {
    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }

    if (value.trim()) {
      // Debounce API calls
      debounceTimer.current = setTimeout(async () => {
        setIsLoading(true)
        
        // Get saved locations that match
        const savedMatches = searchLocations(value).map(loc => ({
          ...loc,
          type: 'saved' as const
        }))

        // Fetch geocoding suggestions from API
        try {
          const response = await fetch(
            `https://graphhopper.com/api/1/geocode?q=${encodeURIComponent(value + ', San Francisco, CA')}&key=ee6ac405-9a11-42e2-a0ac-dc333939f34b&locale=en&limit=5`
          )
          
          if (response.ok) {
            const data = await response.json()
            const apiSuggestions: GeocodingSuggestion[] = data.hits?.map((hit: any) => ({
              id: `suggestion-${hit.point.lat}-${hit.point.lng}`,
              name: hit.name || hit.street || 'Unknown Location',
              address: [
                hit.name,
                hit.street,
                hit.city || 'San Francisco',
                hit.state || 'CA',
                hit.country || 'USA'
              ].filter(Boolean).join(', '),
              type: 'suggestion' as const
            })) || []

            // Combine saved and API suggestions, prioritizing saved
            setSuggestions([...savedMatches, ...apiSuggestions].slice(0, 8))
          } else {
            // If API fails, just show saved locations
            setSuggestions(savedMatches)
          }
        } catch (error) {
          console.error('Geocoding error:', error)
          // Fallback to saved locations only
          setSuggestions(savedMatches)
        } finally {
          setIsLoading(false)
        }
      }, 300) // 300ms debounce
    } else {
      // Show recent saved locations and landmarks when input is empty
      const recentSaved = savedLocations.slice(0, 3).map(loc => ({
        ...loc,
        type: 'saved' as const
      }))
      const landmarks = SF_LANDMARKS.slice(0, 5).map(loc => ({
        ...loc,
        type: 'suggestion' as const
      }))
      setSuggestions([...recentSaved, ...landmarks])
      setIsLoading(false)
    }

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
    }
  }, [value, savedLocations])

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
    setShowDropdown(true)
  }

  const handleSelectLocation = (location: GeocodingSuggestion) => {
    onChange(location.address)
    setShowDropdown(false)
  }

  const handleDeleteLocation = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    deleteLocation(id)
    const updated = getSavedLocations()
    setSavedLocations(updated)
  }

  const handleFocus = () => {
    setShowDropdown(true)
  }

  return (
    <div className="relative">
      <div className="relative">
        {icon}
        <Input
          ref={inputRef}
          placeholder={placeholder}
          value={value}
          onChange={handleInputChange}
          onFocus={handleFocus}
          className={cn("pl-10 h-11 border-2", className)}
        />
      </div>

      {/* Dropdown */}
      {showDropdown && (suggestions.length > 0 || isLoading) && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-2 bg-white border-2 border-border rounded-xl shadow-lg max-h-72 overflow-y-auto"
        >
          <div className="py-2">
            {isLoading && (
              <div className="px-3 py-3 text-sm text-muted-foreground flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                Searching locations...
              </div>
            )}
            
            {!isLoading && suggestions.length > 0 && (
              <>
                {/* Group saved locations */}
                {suggestions.filter(s => s.type === 'saved').length > 0 && (
                  <>
                    <div className="px-3 py-2 text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                      <Star className="h-3 w-3" />
                      Saved Locations
                    </div>
                    {suggestions.filter(s => s.type === 'saved').map((location) => (
                      <button
                        key={location.id}
                        onClick={() => handleSelectLocation(location)}
                        className="w-full px-3 py-2.5 text-left hover:bg-primary/10 transition-colors flex items-start gap-3 group"
                      >
                        <Star className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-foreground truncate">{location.name}</div>
                          {location.name !== location.address && (
                            <div className="text-xs text-muted-foreground truncate">{location.address}</div>
                          )}
                        </div>
                        {location.type === 'saved' && (
                          <button
                            onClick={(e) => handleDeleteLocation(e, location.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/10 rounded"
                            title="Remove location"
                          >
                            <X className="h-3.5 w-3.5 text-destructive" />
                          </button>
                        )}
                      </button>
                    ))}
                  </>
                )}
                
                {/* Group suggestions */}
                {suggestions.filter(s => s.type === 'suggestion').length > 0 && (
                  <>
                    {suggestions.filter(s => s.type === 'saved').length > 0 && (
                      <div className="mx-3 my-2 border-t" />
                    )}
                    <div className="px-3 py-2 text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                      <Search className="h-3 w-3" />
                      Suggestions
                    </div>
                    {suggestions.filter(s => s.type === 'suggestion').map((location) => (
                      <button
                        key={location.id}
                        onClick={() => handleSelectLocation(location)}
                        className="w-full px-3 py-2.5 text-left hover:bg-primary/10 transition-colors flex items-start gap-3"
                      >
                        <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-foreground truncate">{location.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{location.address}</div>
                        </div>
                      </button>
                    ))}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
