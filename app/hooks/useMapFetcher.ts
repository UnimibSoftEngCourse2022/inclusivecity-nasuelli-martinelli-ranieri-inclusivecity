import { useCallback, useEffect, useState } from "react";
import { useFetcher } from "react-router";
import type { loader } from "~/routes/app/map";

export function useMapFetcher(initialBaseDifficulty: number, userId?: string) {
    const fetcher = useFetcher<typeof loader>();

    // Traccia se l'utente ha modificato manualmente lo slider
    const [hasCustomized, setHasCustomized] = useState(false);

    // Il VERO livello di mobilità (proveniente dal DB o dal default iniziale)
    const realBaseDifficulty = fetcher.data?.userBaseDifficulty ?? initialBaseDifficulty;

    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [activeFilters, setActiveFilters] = useState({ maxDifficulty: initialBaseDifficulty });
    const [draftFilters, setDraftFilters] = useState({ maxDifficulty: initialBaseDifficulty });

    // SINCRONIZZAZIONE INTELLIGENTE:
    // Se arriva un nuovo dato dal DB e l'utente non ha personalizzato i filtri, aggiorniamo gli stati.
    // L'uso di `prev` garantisce che React non faccia re-render se il valore è già corretto.
    useEffect(() => {
        if (!hasCustomized && fetcher.data?.userBaseDifficulty !== undefined) {
            const fetchedBase = fetcher.data.userBaseDifficulty;
            setActiveFilters(prev => prev.maxDifficulty === fetchedBase ? prev : { maxDifficulty: fetchedBase });
            setDraftFilters(prev => prev.maxDifficulty === fetchedBase ? prev : { maxDifficulty: fetchedBase });
        }
    }, [fetcher.data?.userBaseDifficulty, hasCustomized]);

    // Usiamo fetcher.load invece dell'intero fetcher per garantire la stabilità della funzione
    const fetchMapData = useCallback((bounds: any, filtersToUse = activeFilters, isCustom = hasCustomized) => {
        if (!bounds) return;

        const params = new URLSearchParams({
            minLng: bounds.getWest().toString(),
            minLat: bounds.getSouth().toString(),
            maxLng: bounds.getEast().toString(),
            maxLat: bounds.getNorth().toString(),
        });

        // Applica il filtro manuale SOLO se l'utente lo ha esplicitamente richiesto
        if (isCustom) {
            params.append("maxDifficulty", filtersToUse.maxDifficulty.toString());
        }

        if (userId) {
            params.append("userId", userId);
        }

        fetcher.load(`/app/map?${params.toString()}`);
    }, [fetcher.load, userId, activeFilters, hasCustomized]);

    const applyFilters = (bounds: any) => {
        setHasCustomized(true);
        setActiveFilters(draftFilters);
        setIsFilterOpen(false);
        fetchMapData(bounds, draftFilters, true);
    };

    const resetFilters = (bounds: any) => {
        setHasCustomized(false);
        const defaultFilters = { maxDifficulty: realBaseDifficulty };
        setDraftFilters(defaultFilters);
        setActiveFilters(defaultFilters);
        setIsFilterOpen(false);
        fetchMapData(bounds, defaultFilters, false);
    };

    const openFilterMenu = () => {
        setDraftFilters({ ...activeFilters });
        setIsFilterOpen(true);
    };

    const closeFilterMenu = () => setIsFilterOpen(false);

    // Mostra l'indicatore solo se il filtro attivo discosta dal VERO livello di mobilità
    const hasActiveCustomFilters = hasCustomized && activeFilters.maxDifficulty !== realBaseDifficulty;

    return {
        fetcher,
        isFilterOpen,
        draftFilters,
        setDraftFilters,
        openFilterMenu,
        closeFilterMenu,
        applyFilters,
        resetFilters,
        fetchMapData,
        hasActiveCustomFilters,
        userBaseDifficulty: realBaseDifficulty
    };
}