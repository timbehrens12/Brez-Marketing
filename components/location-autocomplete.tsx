"use client";

import React, { useState } from 'react';
import usePlacesAutocomplete, { getGeocode, getLatLng } from 'use-places-autocomplete';
import { Input } from '@/components/ui/input';
import { Command, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';

interface Location {
  city: string;
  state: string;
  lat: number;
  lng: number;
}

interface LocationAutocompleteProps {
  onLocationSelect: (location: Location) => void;
}

export function LocationAutocomplete({ onLocationSelect }: LocationAutocompleteProps) {
  const {
    ready,
    value,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: {
      types: ['(cities)'],
      componentRestrictions: { country: 'us' }, // Restrict to US for now
    },
    debounce: 300,
  });

  const [isFocused, setIsFocused] = useState(false);

  const handleSelect = async (address: string) => {
    setValue(address, false);
    clearSuggestions();

    try {
      const results = await getGeocode({ address });
      const { lat, lng } = await getLatLng(results[0]);
      
      const cityComponent = results[0].address_components.find((c: google.maps.GeocoderAddressComponent) => c.types.includes('locality'));
      const stateComponent = results[0].address_components.find((c: google.maps.GeocoderAddressComponent) => c.types.includes('administrative_area_level_1'));
      
      onLocationSelect({
        city: cityComponent?.long_name || '',
        state: stateComponent?.short_name || '',
        lat,
        lng,
      });
      setIsFocused(false);
    } catch (error) {
      console.error('Error: ', error);
    }
  };

  return (
    <Command shouldFilter={false} className="relative">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={!ready}
        placeholder="Enter a city..."
        onFocus={() => setIsFocused(true)}
        onBlur={() => setTimeout(() => setIsFocused(false), 200)} // Delay to allow click on suggestions
      />
      {isFocused && status === 'OK' && (
        <CommandList className="absolute z-10 w-full bg-white border rounded-md shadow-lg mt-1">
          <CommandGroup>
            {data.map(({ place_id, description }: { place_id: string; description: string }) => (
              <CommandItem key={place_id} onSelect={() => handleSelect(description)} value={description}>
                {description}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      )}
    </Command>
  );
} 