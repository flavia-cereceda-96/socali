import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { MapPin, Loader2, X } from 'lucide-react';

export interface LocationValue {
  address: string;
  latitude: number | null;
  longitude: number | null;
}

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  place_id: number;
}

interface LocationPickerProps {
  value: LocationValue;
  onChange: (value: LocationValue) => void;
  placeholder?: string;
}

export function LocationPicker({ value, onChange, placeholder }: LocationPickerProps) {
  const [query, setQuery] = useState(value.address);
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const debounceRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync external value changes (e.g. when editing existing event)
  useEffect(() => {
    setQuery(value.address);
  }, [value.address]);

  // Click outside to close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const search = (q: string) => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (q.trim().length < 3) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&addressdetails=0&limit=5&q=${encodeURIComponent(q)}`,
          { headers: { 'Accept-Language': navigator.language || 'en' } }
        );
        const data: NominatimResult[] = await res.json();
        setResults(data);
        setShowResults(true);
      } catch (err) {
        console.error('Location search failed', err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);
  };

  const handleInput = (val: string) => {
    setQuery(val);
    // Clear coords if user is typing freely (they'll re-pick or save without coords)
    if (val !== value.address) {
      onChange({ address: val, latitude: null, longitude: null });
    }
    search(val);
  };

  const handleSelect = (r: NominatimResult) => {
    const picked = {
      address: r.display_name,
      latitude: parseFloat(r.lat),
      longitude: parseFloat(r.lon),
    };
    setQuery(picked.address);
    onChange(picked);
    setShowResults(false);
    setResults([]);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    onChange({ address: '', latitude: null, longitude: null });
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={e => handleInput(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
          placeholder={placeholder || 'Search a place or address...'}
          className="pl-9 pr-9"
        />
        {loading ? (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : query ? (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="Clear location"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
      {showResults && results.length > 0 && (
        <div className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-border bg-card shadow-elevated">
          {results.map(r => (
            <button
              key={r.place_id}
              type="button"
              onClick={() => handleSelect(r)}
              className="flex w-full items-start gap-2 border-b border-border/50 px-3 py-2.5 text-left text-sm last:border-b-0 hover:bg-secondary/50"
            >
              <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" />
              <span className="line-clamp-2 text-foreground">{r.display_name}</span>
            </button>
          ))}
          <div className="border-t border-border/50 bg-secondary/30 px-3 py-1.5 text-[10px] text-muted-foreground">
            Powered by OpenStreetMap
          </div>
        </div>
      )}
    </div>
  );
}
