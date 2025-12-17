import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, Search, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface Location {
  id: string;
  name: string;
  address: string | null;
}

interface LocationPickerProps {
  value: Location | null;
  onChange: (location: Location | null) => void;
  className?: string;
}

const LocationPicker: React.FC<LocationPickerProps> = ({ value, onChange, className }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Location[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Search locations
  useEffect(() => {
    const searchLocations = async () => {
      if (searchQuery.length < 2) {
        setSuggestions([]);
        return;
      }

      setIsSearching(true);
      const { data } = await supabase
        .from('locations')
        .select('id, name, address')
        .ilike('name', `%${searchQuery}%`)
        .order('post_count', { ascending: false })
        .limit(5);

      setSuggestions(data || []);
      setIsSearching(false);
    };

    const debounce = setTimeout(searchLocations, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const handleSelect = (location: Location) => {
    onChange(location);
    setSearchQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleCreateNew = async () => {
    if (!searchQuery.trim()) return;

    const { data, error } = await supabase
      .from('locations')
      .insert({ name: searchQuery.trim() })
      .select('id, name, address')
      .single();

    if (data && !error) {
      handleSelect(data);
    }
  };

  if (value) {
    return (
      <div className={cn('flex items-center gap-2 p-2 bg-muted rounded-lg', className)}>
        <MapPin className="w-4 h-4 text-primary" />
        <span className="flex-1 text-sm">{value.name}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange(null)}
          className="h-6 px-2"
        >
          הסר
        </Button>
      </div>
    );
  }

  return (
    <div className={cn('relative', className)}>
      <div className="relative">
        <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder="חפש מיקום..."
          className="pr-10"
        />
        {isSearching && (
          <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin" />
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && (searchQuery.length >= 2) && (
        <div className="absolute z-10 w-full mt-1 bg-card border rounded-lg shadow-lg overflow-hidden">
          {suggestions.length > 0 ? (
            suggestions.map(location => (
              <button
                key={location.id}
                type="button"
                onClick={() => handleSelect(location)}
                className="w-full px-3 py-2 text-right hover:bg-muted flex items-center gap-2"
              >
                <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{location.name}</p>
                  {location.address && (
                    <p className="text-xs text-muted-foreground">{location.address}</p>
                  )}
                </div>
              </button>
            ))
          ) : (
            <div className="p-3 text-center">
              <p className="text-sm text-muted-foreground mb-2">לא נמצאו תוצאות</p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCreateNew}
              >
                <MapPin className="w-4 h-4 ml-2" />
                צור "{searchQuery}"
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LocationPicker;
