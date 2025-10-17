import { useState, useEffect } from "react";
import { MapPin, Star, Clock, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface Location {
  id: string;
  name: string;
  full_address: string | null;
  usage_count: number;
  isRecent?: boolean;
  isFavorite?: boolean;
  recencyLabel?: string | null;
}

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string, details?: string) => void;
  placeholder?: string;
  error?: string;
}

export function LocationAutocomplete({ 
  value, 
  onChange, 
  placeholder = "Digite o nome do local...",
  error 
}: LocationAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<Location[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length >= 2) {
        fetchSuggestions(query);
      } else if (query.length === 0) {
        fetchSuggestions(''); // Mostrar locais recentes
      } else {
        setSuggestions([]);
        setIsOpen(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const fetchSuggestions = async (searchQuery: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('autocomplete-locations', {
        body: { query: searchQuery }
      });

      if (error) throw error;
      
      setSuggestions(data.locations || []);
      setIsOpen(true);
      setSelectedIndex(-1);
    } catch (error) {
      console.error('Error fetching location suggestions:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (location: Location) => {
    setQuery(location.name);
    onChange(location.name, location.full_address || '');
    setIsOpen(false);
    setSuggestions([]);
  };

  const handleAddNew = () => {
    onChange(query, '');
    setIsOpen(false);
    setSuggestions([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > -1 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex === -1 || selectedIndex === suggestions.length) {
          handleAddNew();
        } else if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelect(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  return (
    <div className="relative">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => query.length === 0 && fetchSuggestions('')}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn(error && "border-destructive")}
      />
      
      {error && (
        <p className="text-sm text-destructive mt-1">{error}</p>
      )}

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-[300px] overflow-y-auto">
          {isLoading ? (
            <div className="p-3 text-sm text-muted-foreground">
              Buscando locais...
            </div>
          ) : suggestions.length > 0 ? (
            <>
              {suggestions.map((location, index) => (
                <button
                  key={location.id}
                  onClick={() => handleSelect(location)}
                  className={cn(
                    "w-full p-3 text-left hover:bg-accent transition-colors flex items-start gap-3",
                    selectedIndex === index && "bg-accent"
                  )}
                >
                  <MapPin className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sm truncate">
                        {location.name}
                      </p>
                      {location.isFavorite && (
                        <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                      )}
                    </div>
                    {location.full_address && (
                      <p className="text-xs text-muted-foreground truncate">
                        {location.full_address}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        Usado {location.usage_count}x
                      </Badge>
                      {location.recencyLabel && (
                        <Badge variant="outline" className="text-xs flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {location.recencyLabel}
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              ))}
              {query.trim() && (
                <button
                  onClick={handleAddNew}
                  className={cn(
                    "w-full p-3 text-left hover:bg-accent transition-colors flex items-center gap-3 border-t",
                    selectedIndex === suggestions.length && "bg-accent"
                  )}
                >
                  <Plus className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">
                    Adicionar "{query}" como novo local
                  </span>
                </button>
              )}
            </>
          ) : query.trim() ? (
            <button
              onClick={handleAddNew}
              className="w-full p-3 text-left hover:bg-accent transition-colors flex items-center gap-3"
            >
              <Plus className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">
                Adicionar "{query}" como novo local
              </span>
            </button>
          ) : (
            <div className="p-3 text-sm text-muted-foreground">
              Nenhum local encontrado. Digite para adicionar um novo.
            </div>
          )}
        </div>
      )}
    </div>
  );
}