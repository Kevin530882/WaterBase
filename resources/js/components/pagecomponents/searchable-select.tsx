import React, { useState, useEffect, useRef } from "react";
import { Check, ChevronDown, Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command } from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

interface SearchableSelectProps {
    value: string;
    onValueChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
}

interface AreaOption {
    value: string;
    label: string;
    type: 'Region' | 'Province' | 'Municipality/City' | 'Barangay';
}

interface PhilippineData {
    [regionCode: string]: {
        region_name: string;
        province_list: {
            [provinceName: string]: {
                municipality_list: {
                    [municipalityName: string]: {
                        barangay_list: string[];
                    };
                };
            };
        };
    };
}

export function SearchableSelect({
    value,
    onValueChange,
    placeholder = "Search for region, province, city, or barangay...",
    disabled = false,
    className,
}: SearchableSelectProps) {
    const [open, setOpen] = useState(false);
    const [searchValue, setSearchValue] = useState("");
    const [searchResults, setSearchResults] = useState<AreaOption[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [philippineData, setPhilippineData] = useState<PhilippineData | null>(null);
    const [dataLoaded, setDataLoaded] = useState(false);
    
    const searchTimeoutRef = useRef<NodeJS.Timeout>();

    // Load Philippine data once when component mounts
    useEffect(() => {
        const loadPhilippineData = async () => {
            try {
                const response = await fetch('/philippine_areas_of_responsibilities.json');
                if (!response.ok) {
                    throw new Error('Failed to load Philippine areas data');
                }
                const data: PhilippineData = await response.json();
                setPhilippineData(data);
                setDataLoaded(true);
            } catch (error) {
                console.error('Error loading Philippine data:', error);
                setDataLoaded(true); // Set to true even on error to stop loading state
            }
        };

        loadPhilippineData();
    }, []);

    // Function to search through the Philippine data
    const searchAreas = (query: string): AreaOption[] => {
        if (!philippineData || !query || query.length < 2) {
            return [];
        }

        const results: AreaOption[] = [];
        const lowerQuery = query.toLowerCase();
        const maxResults = 50; // Limit results for performance

        // Search through all levels
        Object.entries(philippineData).forEach(([regionCode, regionData]) => {
            if (results.length >= maxResults) return;

            // Search regions
            if (regionData.region_name.toLowerCase().includes(lowerQuery)) {
                results.push({
                    value: regionData.region_name,
                    label: regionData.region_name,
                    type: 'Region'
                });
            }

            // Search provinces
            Object.entries(regionData.province_list).forEach(([provinceName, provinceData]) => {
                if (results.length >= maxResults) return;

                if (provinceName.toLowerCase().includes(lowerQuery)) {
                    results.push({
                        value: `${provinceName}, ${regionData.region_name}`,
                        label: `${provinceName}`,
                        type: 'Province'
                    });
                }

                // Search municipalities/cities
                Object.entries(provinceData.municipality_list).forEach(([municipalityName, municipalityData]) => {
                    if (results.length >= maxResults) return;

                    if (municipalityName.toLowerCase().includes(lowerQuery)) {
                        results.push({
                            value: `${municipalityName}, ${provinceName}`,
                            label: `${municipalityName}`,
                            type: 'Municipality/City'
                        });
                    }

                    // Search barangays
                    municipalityData.barangay_list.forEach((barangayName) => {
                        if (results.length >= maxResults) return;

                        if (barangayName.toLowerCase().includes(lowerQuery)) {
                            results.push({
                                value: `${barangayName}, ${municipalityName}, ${provinceName}`,
                                label: `${barangayName}`,
                                type: 'Barangay'
                            });
                        }
                    });
                });
            });
        });

        // Sort results by relevance and type
        return results.sort((a, b) => {
            // Exact matches first
            const aExact = a.label.toLowerCase() === lowerQuery;
            const bExact = b.label.toLowerCase() === lowerQuery;
            if (aExact && !bExact) return -1;
            if (!aExact && bExact) return 1;

            // Then by type priority
            const typeOrder = { 'Region': 1, 'Province': 2, 'Municipality/City': 3, 'Barangay': 4 };
            const aOrder = typeOrder[a.type];
            const bOrder = typeOrder[b.type];
            if (aOrder !== bOrder) return aOrder - bOrder;

            // Finally by name
            return a.label.localeCompare(b.label);
        });
    };

    // Debounced search effect
    useEffect(() => {
        // Clear previous timeout
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        // Don't search if query is too short
        if (!searchValue || searchValue.length < 2) {
            setSearchResults([]);
            setIsSearching(false);
            return;
        }

        // Set searching state
        setIsSearching(true);

        // Set new timeout
        searchTimeoutRef.current = setTimeout(() => {
            if (philippineData) {
                const results = searchAreas(searchValue);
                setSearchResults(results);
            }
            setIsSearching(false);
        }, 1500); // 1.5 second delay

        // Cleanup timeout on component unmount
        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [searchValue, philippineData]);

    // Find selected option for display
    const selectedOption = searchResults.find((option) => option.value === value);
    const displayValue = value && !selectedOption ? 
        { label: value.split(',')[0], type: 'Selected', value } : 
        selectedOption;

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchValue(e.target.value);
    };

    const handleSelectOption = (optionValue: string) => {
        onValueChange(optionValue);
        setOpen(false);
        setSearchValue("");
        setSearchResults([]);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn(
                        "w-full justify-between",
                        !value && "text-muted-foreground",
                        className
                    )}
                    disabled={disabled || !dataLoaded}
                >
                    {displayValue ? (
                        <div className="flex items-center gap-2">
                            <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                                {displayValue.type}
                            </span>
                            <span className="truncate">{displayValue.label}</span>
                        </div>
                    ) : (
                        <span className="truncate">{placeholder}</span>
                    )}
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
                <Command>
                    <div className="flex items-center border-b px-3">
                        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                        <input
                            className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="Type at least 2 characters to search..."
                            value={searchValue}
                            onChange={handleInputChange}
                            disabled={!dataLoaded}
                        />
                        {isSearching && (
                            <Loader2 className="ml-2 h-4 w-4 animate-spin shrink-0" />
                        )}
                    </div>
                    <div className="max-h-[300px] overflow-y-auto">
                        {!dataLoaded ? (
                            <div className="py-6 text-center text-sm flex items-center justify-center">
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Loading Philippine areas...
                            </div>
                        ) : searchValue.length < 2 ? (
                            <div className="py-6 text-center text-sm text-gray-500">
                                Type at least 2 characters to start searching
                            </div>
                        ) : isSearching ? (
                            <div className="py-6 text-center text-sm flex items-center justify-center">
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Searching...
                            </div>
                        ) : searchResults.length === 0 ? (
                            <div className="py-6 text-center text-sm">
                                No areas found for "{searchValue}"
                            </div>
                        ) : (
                            <div className="p-1">
                                {searchResults.map((option, index) => (
                                    <div
                                        key={`${option.value}-${index}`}
                                        className={cn(
                                            "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground cursor-pointer",
                                            value === option.value && "bg-accent text-accent-foreground"
                                        )}
                                        onClick={() => handleSelectOption(option.value)}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                value === option.value ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <span className="text-xs bg-gray-100 px-2 py-1 rounded flex-shrink-0">
                                                {option.type}
                                            </span>
                                            <span className="truncate">{option.label}</span>
                                        </div>
                                    </div>
                                ))}
                                {searchResults.length === 50 && (
                                    <div className="py-2 px-2 text-xs text-gray-500 border-t">
                                        Showing first 50 results. Type more characters for better results.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </Command>
            </PopoverContent>
        </Popover>
    );
}