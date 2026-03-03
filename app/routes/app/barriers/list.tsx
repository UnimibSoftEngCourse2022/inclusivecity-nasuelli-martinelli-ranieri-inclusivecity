import type {LoaderFunctionArgs} from "react-router";
import {Link, useFetcher, useLoaderData, useNavigation as useReactNavigation, useSearchParams} from "react-router";
import React, {useCallback, useEffect, useRef, useState} from "react";
import {prisma} from "~/db.server";
import {BarrierState} from "@prisma/client";
import {useAuth} from "~/context/AuthContext";
import {ListFilter, Loader2, MapPin, Plus, Search} from "lucide-react";
import {getDynamicIcon} from "~/utils/icons";

export async function loader({request}: LoaderFunctionArgs) {
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") ?? "").trim();
    const sortParam = url.searchParams.get("sort") ?? "new";
    const viewParam = url.searchParams.get("view") ?? "all";
    const userId = url.searchParams.get("userId");
    const pageParam = url.searchParams.get("page");

    const defaultState = viewParam === "me" ? "ALL" : "ACTIVE";
    const stateParam = url.searchParams.get("state") ?? defaultState;

    const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
    const PAGE_SIZE = 10;

    const where: any = {};

    if (stateParam !== "ALL") {
        if (Object.values(BarrierState).includes(stateParam as BarrierState)) {
            where.state = stateParam as BarrierState;
        }
    }

    if (q) {
        where.OR = [
            {title: {contains: q, mode: 'insensitive'}},
            {description: {contains: q, mode: 'insensitive'}},
            {address: {contains: q, mode: 'insensitive'}}
        ];
    }

    if (viewParam === "me" && userId) {
        where.userId = userId;
    }

    const orderBy: any = sortParam === "rating"
        ? [{averageRating: 'desc'}, {createdAt: 'desc'}]
        : {createdAt: 'desc'};

    const skip = (page - 1) * PAGE_SIZE;

    const [barriers, totalCount] = await Promise.all([
        prisma.barrier.findMany({
            where,
            orderBy,
            skip,
            take: PAGE_SIZE,
            select: {
                id: true, title: true, description: true, address: true,
                photoUrls: true, difficulty: true, state: true,
                averageRating: true, totalRatings: true, createdAt: true,
                type: {select: {id: true, label: true, iconKey: true, colorHex: true}},
                creator: {select: {id: true, firstName: true, lastName: true}}
            }
        }),
        prisma.barrier.count({where})
    ]);

    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

    return {barriers, totalCount, totalPages, page, q, stateParam, sortParam, viewParam};
}

function formatDate(value: string | Date) {
    const d = typeof value === "string" ? new Date(value) : value;
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("it-IT", {year: "numeric", month: "short", day: "numeric"});
}

export default function BarrierListPage() {
    const {
        barriers: initialBarriers,
        totalCount,
        totalPages,
        page,
        q,
        stateParam,
        sortParam,
        viewParam
    } = useLoaderData<typeof loader>();
    const {user} = useAuth();

    const [searchParams, setSearchParams] = useSearchParams();
    const navigation = useReactNavigation();
    const fetcher = useFetcher<typeof loader>();

    const isLoadingFilters = navigation.state === "loading" || navigation.state === "submitting";

    const currentView = searchParams.get("view") || "all";
    const currentState = searchParams.get("state") || (currentView === "me" ? "ALL" : "ACTIVE");
    const currentSort = searchParams.get("sort") || "new";

    const [items, setItems] = useState(initialBarriers);
    const [activePage, setActivePage] = useState(page);
    const [searchQuery, setSearchQuery] = useState(q);

    useEffect(() => {
        setItems(initialBarriers);
        setActivePage(page);
        setSearchQuery(q);
    }, [initialBarriers, page, q]);

    useEffect(() => {
        if (currentView === "me" && !searchParams.get("userId") && user?.id) {
            const sp = new URLSearchParams(searchParams);
            sp.set("userId", user.id);
            setSearchParams(sp, {replace: true});
        }
    }, [currentView, searchParams, user, setSearchParams]);

    useEffect(() => {
        if (fetcher.data && fetcher.state === "idle" && fetcher.data.page > activePage) {
            const isSameFilter =
                fetcher.data.q === q &&
                fetcher.data.stateParam === stateParam &&
                fetcher.data.viewParam === viewParam &&
                fetcher.data.sortParam === sortParam;

            if (isSameFilter) {
                setItems((prev) => {
                    const newItems = fetcher.data!.barriers.filter(b => !prev.some(p => p.id === b.id));
                    return [...prev, ...newItems];
                });
                setActivePage(fetcher.data.page);
            }
        }
    }, [fetcher.data, fetcher.state, activePage, q, stateParam, viewParam, sortParam]);

    const observer = useRef<IntersectionObserver | null>(null);
    const loadMoreRef = useCallback((node: HTMLDivElement | null) => {
        if (fetcher.state === "loading" || navigation.state === "loading") return;
        if (observer.current) observer.current.disconnect();

        observer.current = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && activePage < totalPages) {
                const sp = new URLSearchParams(searchParams);
                sp.set("page", String(activePage + 1));
                fetcher.load(`/app/barriers?${sp.toString()}`);
            }
        }, {rootMargin: "200px"});

        if (node) observer.current.observe(node);
    }, [fetcher, activePage, totalPages, searchParams, navigation.state]);

    const updateFilters = (key: string, value: string) => {
        const sp = new URLSearchParams(searchParams);
        sp.set(key, value);
        sp.set("page", "1");

        if (key === "view") {
            if (value === "me" && user) {
                sp.set("userId", user.id);
                sp.set("state", "ALL");
            } else {
                sp.delete("userId");
                sp.set("state", "ACTIVE");
            }
        }

        setSearchParams(sp, {replace: true});
    };

    useEffect(() => {
        const timeout = setTimeout(() => {
            if (searchQuery !== q) {
                updateFilters("q", searchQuery);
            }
        }, 500);
        return () => clearTimeout(timeout);
    }, [searchQuery, q]);

    return (
        <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto pb-24 animate-in fade-in duration-300">

            {/* HEADER E TASTO NUOVA */}
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-text">Elenco Barriere</h1>
                    <p className="text-sm text-text-muted mt-1">
                        Esplora le segnalazioni e aiuta la community.
                    </p>
                </div>
                <Link
                    to="/app/barriers/new"
                    className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl font-bold shadow-md hover:bg-primary/90 transition active:scale-95 shrink-0"
                >
                    <Plus className="w-5 h-5"/>
                    <span className="hidden sm:inline">Nuova</span>
                </Link>
            </div>

            {/* TABS (Tutte / Le mie) */}
            {user && (
                <div className="flex bg-surface p-1 rounded-xl border border-border shadow-sm">
                    <button
                        onClick={() => updateFilters("view", "all")}
                        className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${currentView === 'all' ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:text-text'}`}
                    >
                        Tutte le Barriere
                    </button>
                    <button
                        onClick={() => updateFilters("view", "me")}
                        className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${currentView === 'me' ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:text-text'}`}
                    >
                        Le mie Segnalazioni
                    </button>
                </div>
            )}

            {/* BARRA RICERCA E FILTRI AVANZATI */}
            <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted"/>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Cerca per titolo, indirizzo..."
                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-border bg-surface outline-none focus:ring-2 focus:ring-primary shadow-sm text-text transition-all"
                    />
                </div>

                <div className="flex gap-3">
                    <div className="relative flex-1 md:flex-none md:w-44">
                        <ListFilter
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none"/>
                        <select
                            value={currentState}
                            onChange={(e) => updateFilters("state", e.target.value)}
                            className="w-full pl-9 pr-4 py-3 rounded-xl border border-border bg-surface outline-none focus:ring-2 focus:ring-primary shadow-sm text-sm font-medium appearance-none cursor-pointer"
                        >
                            <option value="ALL">Tutti gli stati</option>
                            <option value={BarrierState.ACTIVE}>Solo Attive</option>
                            <option value={BarrierState.IN_REVIEW}>In Revisione</option>
                            <option value={BarrierState.RESOLVED}>Risolte</option>
                            <option value={BarrierState.HIDDEN}>Nascoste</option>
                        </select>
                    </div>

                    <select
                        value={currentSort}
                        onChange={(e) => updateFilters("sort", e.target.value)}
                        className="flex-1 md:flex-none md:w-40 px-4 py-3 rounded-xl border border-border bg-surface outline-none focus:ring-2 focus:ring-primary shadow-sm text-sm font-medium cursor-pointer"
                    >
                        <option value="new">Più Recenti</option>
                        <option value="rating">Miglior Voto</option>
                    </select>
                </div>
            </div>

            {/* CONTATORE */}
            <div className="text-sm font-semibold text-text-muted flex items-center gap-2">
                {isLoadingFilters ?
                    <Loader2 className="w-4 h-4 animate-spin text-primary"/> : `${totalCount} risultati trovati`}
            </div>

            {/* STATO VUOTO */}
            {!isLoadingFilters && items.length === 0 && (
                <div
                    className="bg-surface border-2 border-dashed border-border p-12 rounded-3xl text-center flex flex-col items-center justify-center text-text-muted space-y-3">
                    <Search className="w-12 h-12 opacity-20"/>
                    <p className="font-medium text-lg">Nessuna barriera trovata.</p>
                    <p className="text-sm">Prova a cambiare i filtri o la ricerca.</p>
                    <button onClick={() => {
                        updateFilters("q", "");
                        updateFilters("state", "ALL");
                    }} className="text-primary font-bold hover:underline mt-2">Resetta Filtri
                    </button>
                </div>
            )}

            {/* LISTA CARD */}
            <ul className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {items.map((b) => {
                    const title = b.title?.trim() || "Senza titolo";
                    const cover = b.photoUrls?.[0] || null;
                    const author = b.creator ? `${b.creator.firstName} ${b.creator.lastName || ""}` : "Sconosciuto";
                    const IconComp = getDynamicIcon(b.type?.iconKey);

                    const stateStyles = {
                        ACTIVE: "bg-error/10 text-error border-error/20",
                        RESOLVED: "bg-success/10 text-success border-success/20",
                        IN_REVIEW: "bg-warning/10 text-warning border-warning/20",
                        HIDDEN: "bg-background text-text-muted border-border"
                    }[b.state as string] || "bg-background text-text";

                    return (
                        <li key={b.id}>
                            <Link to={`/app/barriers/${b.id}`}
                                  className="block bg-surface border border-border rounded-2xl overflow-hidden hover:shadow-lg hover:border-primary/30 transition-all group">
                                <div className="flex p-4 gap-4">

                                    <div
                                        className="relative h-24 w-24 rounded-xl bg-background shrink-0 overflow-hidden border border-border shadow-inner">
                                        {cover ? (
                                            <img src={cover} alt={title}
                                                 className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                 loading="lazy"/>
                                        ) : (
                                            <div
                                                className="h-full w-full flex items-center justify-center bg-background/80">
                                                <IconComp className="w-8 h-8 text-text-muted/30"/>
                                            </div>
                                        )}
                                        <div
                                            className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"/>
                                    </div>

                                    <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                                        <div>
                                            <div className="flex items-start justify-between gap-2 mb-1">
                                                <h3 className="font-bold text-text truncate group-hover:text-primary transition-colors">{title}</h3>
                                                <span
                                                    className={`shrink-0 text-[9px] font-bold px-2 py-1 rounded-md border uppercase tracking-wider ${stateStyles}`}>
                                                    {b.state === 'IN_REVIEW' ? 'VERIFICA' : b.state}
                                                </span>
                                            </div>
                                            <p className="text-xs text-text-muted truncate flex items-center gap-1.5 mb-2">
                                                <MapPin className="w-3 h-3"/>
                                                {b.address || "Posizione mappa"}
                                            </p>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2">
                                            <span
                                                className="flex items-center gap-1 bg-background border border-border text-text-muted px-2 py-0.5 rounded text-xs font-medium">
                                                <IconComp className="w-3 h-3"/> {b.type?.label}
                                            </span>
                                            <span
                                                className="bg-error/10 text-error px-2 py-0.5 rounded border border-error/20 text-xs font-bold tracking-wide">
                                                LVL {b.difficulty}
                                            </span>
                                            {b.totalRatings > 0 && (
                                                <span
                                                    className="bg-warning/10 text-warning px-2 py-0.5 rounded border border-warning/20 text-xs font-bold flex items-center gap-1">
                                                    ★ {Number(b.averageRating).toFixed(1)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div
                                    className="px-4 py-2.5 border-t border-border bg-background/50 text-[11px] text-text-muted flex justify-between items-center">
                                    <span>Di: <span className="font-bold text-text">{author}</span></span>
                                    <span
                                        className="uppercase tracking-wider font-medium">{formatDate(b.createdAt as unknown as string)}</span>
                                </div>
                            </Link>
                        </li>
                    );
                })}
            </ul>

            {/* LOADER INFINITE SCROLL */}
            {activePage < totalPages && (
                <div ref={loadMoreRef} className="flex justify-center items-center py-6">
                    <Loader2 className="w-8 h-8 animate-spin text-primary"/>
                </div>
            )}

            {items.length > 0 && activePage >= totalPages && (
                <div className="text-center pb-8">
                    <p className="text-xs font-bold uppercase tracking-widest text-text-muted/50">
                        Hai raggiunto la fine dell'elenco
                    </p>
                </div>
            )}
        </div>
    );
}