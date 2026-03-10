import {useCallback, useEffect, useRef, useState} from "react";
import {useFetcher, useNavigation, useSearchParams} from "react-router";

type InfiniteListProps<T> = {
    initialItems: T[];
    initialPage: number;
    totalPages: number;
    fetchUrl: string;
    dataKey: string;
    initialQuery?: string;
    filterKey?: string;
    extraFetchParams?: Record<string, string>;
};

export function useInfiniteList<T extends { id: string | number }>({
                                                                       initialItems,
                                                                       initialPage,
                                                                       initialQuery,
                                                                       totalPages,
                                                                       fetchUrl,
                                                                       dataKey,
                                                                       filterKey,
                                                                       extraFetchParams
                                                                   }: InfiniteListProps<T>) {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigation = useNavigation();
    const fetcher = useFetcher<any>();

    const isLoadingFilters = navigation.state === "loading" || fetcher.state === "loading";

    const [items, setItems] = useState<T[]>(initialItems);
    const [activePage, setActivePage] = useState(initialPage);
    const [searchQuery, setSearchQuery] = useState(initialQuery ?? "");

    // sincronizzazione al cambio dei filtri
    useEffect(() => {
        setItems(initialItems);
        setActivePage(initialPage);
        if (initialQuery !== undefined) setSearchQuery(initialQuery);
    }, [initialItems, initialPage, initialQuery, filterKey]);

    // aggiunta automatica items
    useEffect(() => {
        const isFetcherDataValid = (() => {
            // chiave filtro complessa
            if (filterKey && fetcher.data?.filterKey) {
                return fetcher.data.filterKey === filterKey;
            }

            // query testuale
            if (initialQuery !== undefined) {
                return fetcher.data?.q === initialQuery;
            }

            // nessun filtro
            return true;
        })();

        if (!fetcher.data || fetcher.state !== "idle" || fetcher.data.page <= activePage || !isFetcherDataValid) {
            return;
        }

        const fetchedItems = fetcher.data[dataKey];
        if (!fetchedItems) return;

        setItems((prev) => {
            const existingIds = new Set(prev.map(item => item.id));
            const newItems = fetchedItems.filter((item: T) => !existingIds.has(item.id));
            return [...prev, ...newItems];
        });
        setActivePage(fetcher.data.page);
    }, [fetcher.data, fetcher.state, activePage, initialQuery, filterKey, dataKey]);

    // observer per lo scroll a fine pagina
    const observer = useRef<IntersectionObserver | null>(null);
    const loadMoreRef = useCallback((node: HTMLDivElement | null) => {
        if (fetcher.state !== "idle" || navigation.state !== "idle") return;
        if (observer.current) observer.current.disconnect();

        observer.current = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && activePage < totalPages) {
                const sp = new URLSearchParams(searchParams);
                sp.set("page", String(activePage + 1));
                if (extraFetchParams) {
                    Object.entries(extraFetchParams).forEach(([k, v]) => sp.set(k, v));
                }
                fetcher.load(`${fetchUrl}?${sp.toString()}`);
            }
        }, {rootMargin: "200px"});

        if (node) observer.current.observe(node);
    }, [fetcher, activePage, totalPages, searchParams, navigation.state, fetchUrl, extraFetchParams]);

    // update Filtri e debounce automatico
    useEffect(() => {
        if (initialQuery === undefined) return;
        const timeout = setTimeout(() => {
            if (searchQuery !== initialQuery) {
                const sp = new URLSearchParams(searchParams);
                sp.set("q", searchQuery);
                sp.set("page", "1");
                setSearchParams(sp, {replace: true});
            }
        }, 500);
        return () => clearTimeout(timeout);
    }, [searchQuery, initialQuery, searchParams, setSearchParams]);

    return {
        items,
        activePage,
        searchQuery,
        setSearchQuery,
        isLoadingFilters,
        loadMoreRef,
        updateFilters: (query: string) => {
            setSearchQuery(query);
            const sp = new URLSearchParams(searchParams);
            sp.set("q", query);
            sp.set("page", "1");
            setSearchParams(sp, {replace: true});
        }
    };
}