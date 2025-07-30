import { useState, useEffect, useRef } from "react";
import { Search, Loader2, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

interface OpenStreetMapSelectProps {
    value: string;
    onValueChange: (value: string, coordinates?: { lat: number; lng: number }) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
}

interface NominatimResult {
    place_id: number;
    display_name: string;
    lat: string;
    lon: string;
    address: {
        house_number?: string;
        road?: string;
        village?: string;
        city?: string;
        municipality?: string;
        county?: string;
        state?: string;
        country?: string;
        postcode?: string;
    };
    importance: number;
}

export function OpenStreetMapSearchableSelect({
    value,
    onValueChange,
    placeholder = "Search for barangay, city, or province in Philippines...",
    disabled = false,
    className,
}: OpenStreetMapSelectProps) {
    const [open, setOpen] = useState(false);
    const [searchValue, setSearchValue] = useState("");
    const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [lastRequestTime, setLastRequestTime] = useState(0);
    const debounceTimeoutRef = useRef<number>();

    // Rate limiting for Nominatim (1 request per second)
    const respectRateLimit = async () => {
        const now = Date.now();
        const timeSinceLastRequest = now - lastRequestTime;
        if (timeSinceLastRequest < 1000) {
            await new Promise(resolve => setTimeout(resolve, 1000 - timeSinceLastRequest));
        }
        setLastRequestTime(Date.now());
    };

    const searchNominatim = async (query: string) => {
        if (query.trim().length < 3) {
            setSearchResults([]);
            return;
        }

        try {
            setIsLoading(true);

            // Respect rate limiting
            await respectRateLimit();

            const encodedQuery = encodeURIComponent(query);
            const url = `https://nominatim.openstreetmap.org/search?` +
                `format=json` +
                `&q=${encodedQuery}` +
                `&countrycodes=ph` + // Philippines only
                `&addressdetails=1` +
                `&limit=50` +
                `&extratags=1` +
                `&namedetails=1`;

            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'WaterBase-App/1.0' // Required by Nominatim usage policy
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data: NominatimResult[] = await response.json();

            // Filter and sort results by importance and relevance
            const filteredResults = data
                .filter(result =>
                    result.address?.country === 'Philippines' ||
                    result.display_name.toLowerCase().includes('philippines')
                )
                .sort((a, b) => (b.importance || 0) - (a.importance || 0))
                .slice(0, 50);

            setSearchResults(filteredResults);
        } catch (error) {
            console.error('Error searching Nominatim:', error);
            setSearchResults([]);
        } finally {
            setIsLoading(false);
        }
    };

    // Debounced search
    useEffect(() => {
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }

        debounceTimeoutRef.current = setTimeout(() => {
            if (searchValue && open) {
                searchNominatim(searchValue);
            }
        }, 500); // 500ms debounce

        return () => {
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
            }
        };
    }, [searchValue, open]);

    const handleSelectResult = (result: NominatimResult) => {
        const coordinates = {
            lat: parseFloat(result.lat),
            lng: parseFloat(result.lon)
        };

        onValueChange(result.display_name, coordinates);
        setOpen(false);
        setSearchValue("");
    };

    const formatDisplayName = (result: NominatimResult): string => {
        // Try to create a more readable format
        const { address } = result;
        let parts: string[] = [];

        if (address?.village) parts.push(address.village);
        if (address?.city) parts.push(address.city);
        if (address?.municipality && !address?.city) parts.push(address.municipality);
        if (address?.county && !parts.includes(address.county)) parts.push(address.county);
        if (address?.state) parts.push(address.state);

        return parts.length > 0 ? parts.join(', ') : result.display_name;
    };

    const getLocationIcon = (result: NominatimResult): string => {
        const { address } = result;
        if (address?.village) return "🏘️";
        if (address?.city || address?.municipality) return "🏙️";
        if (address?.county) return "🗺️";
        if (address?.state) return "📍";
        return "📌";
    };

    return (
        <div className={cn("relative w-full overflow-hidden", className)}>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full min-h-[2.5rem] px-3 py-2 text-left text-sm font-normal 
                                    border border-input bg-background hover:bg-accent 
                                    hover:text-accent-foreground flex items-start"
                        disabled={disabled}
                    >
                        <MapPin className="mr-1 h-4 w-4 flex-shrink-0 opacity-50 mt-0.5" />
                        <div className="w-full truncate">
                            {value ? (
                                <span className="text-foreground break-words">{value}</span>
                            ) : (
                                <span className="text-muted-foreground">{placeholder}</span>
                            )}
                        </div>
                    </Button>
                </PopoverTrigger>
                <PopoverContent
                    className="p-0"
                    align="start"
                    style={{ width: 'var(--radix-popover-trigger-width)' }}
                >
                    <div className="border-b p-2 w-full">
                        <div className="relative w-full">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Type to search locations..."
                                value={searchValue}
                                onChange={(e) => setSearchValue(e.target.value)}
                                className="pl-8 w-full truncate"
                                autoFocus
                            />
                            {isLoading && (
                                <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-gray-400" />
                            )}
                        </div>
                    </div>

                    <div className="max-h-[200px] overflow-y-scroll border-0" style={{ scrollbarWidth: 'thin' }}>
                        {searchResults.length === 0 && searchValue.length >= 3 && !isLoading && (
                            <div className="p-4 text-center text-sm text-gray-500">
                                No locations found. Try different search terms.
                            </div>
                        )}

                        {searchValue.length > 0 && searchValue.length < 3 && (
                            <div className="p-4 text-center text-sm text-gray-500">
                                Type at least 3 characters to search...
                            </div>
                        )}

                        {searchResults.map((result) => (
                            <button
                                key={result.place_id}
                                className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0 transition-colors block"
                                onClick={() => handleSelectResult(result)}
                            >
                                <div className="flex items-start space-x-3 w-full">
                                    <span className="text-lg shrink-0 mt-0.5">{getLocationIcon(result)}</span>
                                    <div className="flex-1 min-w-0 overflow-hidden">
                                        <div className="font-medium text-gray-900 text-sm leading-5 truncate">
                                            {formatDisplayName(result)}
                                        </div>
                                        <div className="text-xs text-gray-500 leading-4 truncate mt-0.5">
                                            {result.display_name}
                                        </div>
                                        <div className="text-xs text-gray-400 leading-4 mt-0.5 font-mono">
                                            📍 {parseFloat(result.lat).toFixed(4)}, {parseFloat(result.lon).toFixed(4)}
                                        </div>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>

                    {searchResults.length > 0 && (
                        <div className="border-t p-2 text-xs text-gray-500 text-center">
                            Powered by OpenStreetMap • Select a location to auto-fill coordinates
                        </div>
                    )}
                </PopoverContent>
            </Popover>
        </div>
    );
}
