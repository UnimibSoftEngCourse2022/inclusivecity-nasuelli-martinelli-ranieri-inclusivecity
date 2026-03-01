import {useEffect, useRef, useState} from "react";
import {Loader2, MapPin, Search, X} from "lucide-react";

type Suggestion = {
    id: string;
    place_name: string;
    center: [number, number];
};

type Props = {
    onSelect: (lng: number, lat: number) => void;
    mapboxToken: string;
    isMapLoading?: boolean;
};

export default function SearchBar({onSelect, mapboxToken, isMapLoading}: Readonly<Props>) {
    const [query, setQuery] = useState("");
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const [selectedPlace, setSelectedPlace] = useState<string | null>(null);

    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (!query.trim() || query.length < 3) {
            setSuggestions([]);
            setIsOpen(false);
            setIsLoading(false);
            return;
        }

        if (query === selectedPlace) {
            return;
        }

        const timeoutId = setTimeout(async () => {
            setIsLoading(true);
            try {
                const baseUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`;

                const params = new URLSearchParams({
                    access_token: mapboxToken,
                    autocomplete: "true",
                    limit: "5",
                    country: "it"
                });

                const endpoint = `${baseUrl}?${params.toString()}`;
                const response = await fetch(endpoint);
                const data = await response.json();

                if (data.features) {
                    setSuggestions(data.features.map((f: any) => ({
                        id: f.id,
                        place_name: f.place_name,
                        center: f.center
                    })));
                    setIsOpen(true);
                }
            } catch (error) {
                console.error("Errore Geocoding:", error);
            } finally {
                setIsLoading(false);
            }
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [query, mapboxToken, selectedPlace]);

    const handleSelect = (suggestion: Suggestion) => {
        setSelectedPlace(suggestion.place_name);
        setQuery(suggestion.place_name);
        setIsOpen(false);

        if (inputRef.current) {
            inputRef.current.blur();
        }

        onSelect(suggestion.center[0], suggestion.center[1]);
    };

    const handleClear = () => {
        setQuery("");
        setSelectedPlace(null);
        setSuggestions([]);
        setIsOpen(false);

        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    return (
        <div ref={wrapperRef} className="flex-1 relative pointer-events-auto">
            <div className="bg-surface border border-border shadow-md rounded-full px-4 py-3 flex items-center gap-3">
                <Search className="w-5 h-5 text-text-muted shrink-0"/>
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => {
                        setSelectedPlace(null);
                        setQuery(e.target.value);
                    }}
                    onFocus={() => {
                        if (suggestions.length > 0) setIsOpen(true);
                    }}
                    placeholder="Cerca un indirizzo o un luogo..."
                    className="bg-transparent border-none outline-none w-full text-text placeholder-text-muted text-base"
                />

                {isLoading && (
                    <Loader2 className="w-5 h-5 animate-spin text-primary shrink-0"/>
                )}

                {!isLoading && query && (
                    <button onClick={handleClear}
                            className="shrink-0 text-text-muted hover:text-text transition-colors">
                        <X className="w-5 h-5"/>
                    </button>
                )}

                {!isLoading && !query && isMapLoading && (
                    <span className="relative flex h-3 w-3 shrink-0 mr-1">
                        <span
                            className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                    </span>
                )}
            </div>

            <div
                className={`absolute top-full left-0 right-0 mt-2 bg-surface border border-border rounded-xl shadow-xl overflow-hidden z-50 transition-all duration-200 origin-top ${isOpen && suggestions.length > 0 ? "opacity-100 scale-y-100" : "opacity-0 scale-y-0 pointer-events-none"}`}
            >
                <ul className="max-h-60 overflow-y-auto">
                    {suggestions.map((s) => (
                        <li key={s.id}>
                            <button
                                onClick={() => handleSelect(s)}
                                className="w-full text-left px-4 py-3 hover:bg-background transition-colors flex items-start gap-3 border-b border-border/50 last:border-0"
                            >
                                <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5"/>
                                <span className="text-sm text-text leading-tight">{s.place_name}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}