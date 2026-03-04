import type {LoaderFunctionArgs} from "react-router";
import {Link, useFetcher, useLoaderData, useNavigation as useReactNavigation, useSearchParams} from "react-router";
import React, {useCallback, useEffect, useRef, useState} from "react";
import {prisma} from "~/db.server";
import {useAuth} from "~/context/AuthContext";
import {ArrowLeft, CheckCircle, Loader2, Search} from "lucide-react";
import ResolutionCard from "~/components/moderation/ResolutionCard";

export async function loader({request, params}: LoaderFunctionArgs) {
    const {id: barrierId} = params;
    if (!barrierId) throw new Response("ID mancante", {status: 400});

    const url = new URL(request.url);
    const q = (url.searchParams.get("q") ?? "").trim();
    const pageParam = url.searchParams.get("page");
    const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);
    const PAGE_SIZE = 10;

    const barrier = await prisma.barrier.findUnique({
        where: {id: barrierId},
        select: {title: true}
    });

    if (!barrier) throw new Response("Barriera non trovata", {status: 404});

    const where: any = {barrierId};

    // Ricerca per Commento o per Nome/Cognome dell'autore
    if (q) {
        where.OR = [
            {comment: {contains: q, mode: 'insensitive'}},
            {user: {firstName: {contains: q, mode: 'insensitive'}}},
            {user: {lastName: {contains: q, mode: 'insensitive'}}}
        ];
    }

    const skip = (page - 1) * PAGE_SIZE;

    const [resolutions, totalCount] = await Promise.all([
        prisma.resolution.findMany({
            where,
            orderBy: {createdAt: 'desc'},
            skip,
            take: PAGE_SIZE,
            include: {user: {select: {id: true, firstName: true, lastName: true}}}
        }),
        prisma.resolution.count({where})
    ]);

    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

    return {barrier, resolutions, totalCount, totalPages, page, q, barrierId};
}

export default function ResolutionsListPage() {
    const {
        barrier,
        resolutions: initialResolutions,
        totalCount,
        totalPages,
        page,
        q,
        barrierId
    } = useLoaderData<typeof loader>();
    const {profile} = useAuth();

    const [searchParams, setSearchParams] = useSearchParams();
    const navigation = useReactNavigation();
    const fetcher = useFetcher<typeof loader>();

    const isLoadingFilters = navigation.state === "loading";

    const [items, setItems] = useState(initialResolutions);
    const [activePage, setActivePage] = useState(page);
    const [searchQuery, setSearchQuery] = useState(q);

    // Sync iniziale
    useEffect(() => {
        setItems(initialResolutions);
        setActivePage(page);
        setSearchQuery(q);
    }, [initialResolutions, page, q]);

    // Aggiunta Items (Infinite Scroll)
    useEffect(() => {
        if (!fetcher.data || fetcher.state !== "idle" || fetcher.data.page <= activePage || fetcher.data.q !== q) {
            return;
        }

        const fetchedResolutions = fetcher.data.resolutions;
        const nextPage = fetcher.data.page;

        setItems((prev) => {
            const existingIds = new Set(prev.map(item => item.id));

            const newItems = fetchedResolutions.filter(item => !existingIds.has(item.id));

            return [...prev, ...newItems];
        });

        setActivePage(nextPage);
    }, [fetcher.data, fetcher.state, activePage, q]);

    // Observer Infinite Scroll
    const observer = useRef<IntersectionObserver | null>(null);
    const loadMoreRef = useCallback((node: HTMLDivElement | null) => {
        if (fetcher.state === "loading" || navigation.state === "loading") return;
        if (observer.current) observer.current.disconnect();

        observer.current = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && activePage < totalPages) {
                const sp = new URLSearchParams(searchParams);
                sp.set("page", String(activePage + 1));
                fetcher.load(`/app/barriers/${barrierId}/resolutions?${sp.toString()}`);
            }
        }, {rootMargin: "200px"});

        if (node) observer.current.observe(node);
    }, [fetcher, activePage, totalPages, searchParams, navigation.state, barrierId]);

    // Update Filtri
    const updateFilters = (value: string) => {
        const sp = new URLSearchParams(searchParams);
        sp.set("q", value);
        sp.set("page", "1");
        setSearchParams(sp, {replace: true});
    };

    // Debounce
    useEffect(() => {
        const timeout = setTimeout(() => {
            if (searchQuery !== q) {
                updateFilters(searchQuery);
            }
        }, 500);
        return () => clearTimeout(timeout);
    }, [searchQuery, q]);

    return (
        <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto pb-24 animate-in fade-in duration-300">

            {/* HEADER */}
            <div className="flex items-center gap-4">
                <Link to={`/app/barriers/${barrierId}`}
                      className="p-3 bg-surface border border-border rounded-full hover:bg-background transition-colors shadow-sm">
                    <ArrowLeft className="w-5 h-5 text-text"/>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-text">Tutte le Prove</h1>
                    <p className="text-sm text-text-muted mt-1 truncate max-w-62.5 sm:max-w-md">Per: {barrier.title}</p>
                </div>
            </div>

            {/* SEARCH BAR */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted"/>
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cerca per autore o commento..."
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-border bg-surface outline-none focus:ring-2 focus:ring-primary shadow-sm text-text transition-all"
                />
            </div>

            {/* CONTATORE */}
            <div className="text-sm font-semibold text-text-muted flex items-center gap-2">
                {isLoadingFilters ?
                    <Loader2 className="w-4 h-4 animate-spin text-primary"/> : `${totalCount} prove trovate`}
            </div>

            {/* EMPTY STATE */}
            {!isLoadingFilters && items.length === 0 && (
                <div
                    className="bg-surface border-2 border-dashed border-border p-12 rounded-3xl text-center flex flex-col items-center justify-center text-text-muted space-y-3">
                    <CheckCircle className="w-12 h-12 opacity-20"/>
                    <p className="font-medium text-lg">Nessuna prova trovata.</p>
                    <button onClick={() => updateFilters("")}
                            className="text-primary font-bold hover:underline mt-2">Azzera ricerca
                    </button>
                </div>
            )}

            {/* LISTA */}
            <div className="space-y-4">
                {items.map(res => (
                    <ResolutionCard
                        key={res.id}
                        userFullName={`${res.user.firstName} ${res.user.lastName || ""}`}
                        status={res.status}
                        evidenceUrl={res.evidenceUrl}
                        comment={res.comment}
                        createdAt={res.createdAt}
                        isOwn={res.user.id === profile?.id}
                    />
                ))}
            </div>

            {/* LOADER INFINITE SCROLL */}
            {activePage < totalPages && (
                <div ref={loadMoreRef} className="flex justify-center items-center py-6">
                    <Loader2 className="w-8 h-8 animate-spin text-primary"/>
                </div>
            )}

            {items.length > 0 && activePage >= totalPages && (
                <div className="text-center pb-8 pt-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-text-muted/50">
                        Hai raggiunto la fine
                    </p>
                </div>
            )}

        </div>
    );
}