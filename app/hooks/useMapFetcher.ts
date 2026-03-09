import {useCallback, useEffect, useState} from "react";
import {useFetcher} from "react-router";
import type {loader} from "../routes/app/map";

export function useMapFetcher(initialBaseDifficulty: number, userId?: string) {
    const fetcher = useFetcher<typeof loader>();

    const [hasCustomized, setHasCustomized] = useState(false);

    const realBaseDifficulty = fetcher.data?.userBaseDifficulty ?? initialBaseDifficulty;

    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [activeFilters, setActiveFilters] = useState({minDifficulty: initialBaseDifficulty});
    const [draftFilters, setDraftFilters] = useState({minDifficulty: initialBaseDifficulty});

    useEffect(() => {
        if (!hasCustomized && fetcher.data?.userBaseDifficulty !== undefined) {
            const fetchedBase = fetcher.data.userBaseDifficulty;
            setActiveFilters(prev => prev.minDifficulty === fetchedBase ? prev : {minDifficulty: fetchedBase});
            setDraftFilters(prev => prev.minDifficulty === fetchedBase ? prev : {minDifficulty: fetchedBase});
        }
    }, [fetcher.data?.userBaseDifficulty, hasCustomized]);

    const fetchMapData = useCallback((bounds: any, filtersToUse = activeFilters, isCustom = hasCustomized) => {
        if (!bounds) return;

        const params = new URLSearchParams({
            minLng: bounds.getWest().toString(),
            minLat: bounds.getSouth().toString(),
            maxLng: bounds.getEast().toString(),
            maxLat: bounds.getNorth().toString(),
        });

        if (isCustom) {
            params.append("minDifficulty", filtersToUse.minDifficulty.toString());
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
        const defaultFilters = {minDifficulty: realBaseDifficulty};
        setDraftFilters(defaultFilters);
        setActiveFilters(defaultFilters);
        setIsFilterOpen(false);
        fetchMapData(bounds, defaultFilters, false);
    };

    const openFilterMenu = () => {
        setDraftFilters({...activeFilters});
        setIsFilterOpen(true);
    };

    const closeFilterMenu = () => setIsFilterOpen(false);

    const hasActiveCustomFilters = hasCustomized && activeFilters.minDifficulty !== realBaseDifficulty;

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