import type {LoaderFunctionArgs} from "react-router";
import {Await, Link, useLoaderData, useNavigation as useReactNavigation, useSearchParams} from "react-router";
import React, {Suspense, useEffect, useState} from "react";
import {ListFilter, Loader2, MapPin, Plus, Search} from "lucide-react";
import {prisma} from "../../../db.server";
import {useAuth} from "../../../context/AuthContext";
import PageWrapper from "../../../components/ui/PageWrapper";
import {useInfiniteList} from "../../../hooks/useInfiniteList";
import EmptyState from "../../../components/ui/EmptyState";
import {getDynamicIcon} from "../../../utils/icons";
import {formatDate} from "../../../utils/format";

export async function loader({request}: LoaderFunctionArgs) {
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") ?? "").trim();
    const sortParam = url.searchParams.get("sort") ?? "new";
    const viewParam = url.searchParams.get("view") ?? "all";
    const userId = url.searchParams.get("userId");
    const pageParam = url.searchParams.get("page");
    const isApi = url.searchParams.get("api") === "true";

    const defaultState = viewParam === "me" ? "ALL" : "ACTIVE";
    const stateParam = url.searchParams.get("state") ?? defaultState;
    const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);
    const PAGE_SIZE = 10;

    // Questa chiave unica dice all'Hook quando resettare le vecchie barriere visualizzate
    const filterKey = `${q}-${stateParam}-${sortParam}-${viewParam}-${userId || ""}`;

    const where: any = {};
    if (stateParam !== "ALL") where.state = stateParam;
    if (q) {
        where.OR = [
            {title: {contains: q, mode: 'insensitive'}},
            {description: {contains: q, mode: 'insensitive'}},
            {address: {contains: q, mode: 'insensitive'}}
        ];
    }
    if (viewParam === "me" && userId) where.userId = userId;

    const orderBy: any = sortParam === "rating" ? [{averageRating: 'desc'}, {createdAt: 'desc'}] : {createdAt: 'desc'};
    const skip = (page - 1) * PAGE_SIZE;

    const fetchData = async () => {
        const [barriers, totalCount] = await Promise.all([
            prisma.barrier.findMany({
                where, orderBy, skip, take: PAGE_SIZE,
                select: {
                    id: true,
                    title: true,
                    description: true,
                    address: true,
                    photoUrls: true,
                    difficulty: true,
                    state: true,
                    averageRating: true,
                    totalRatings: true,
                    createdAt: true,
                    type: {select: {id: true, label: true, iconKey: true, colorHex: true}},
                    creator: {select: {id: true, firstName: true, lastName: true}}
                }
            }),
            prisma.barrier.count({where})
        ]);
        const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
        return {barriers, totalCount, totalPages, page, filterKey};
    };

    if (isApi) return await fetchData();
    return {promise: fetchData(), q, stateParam, sortParam, viewParam};
}

export default function BarrierListPage() {
    const {promise, q, stateParam, sortParam, viewParam} = useLoaderData<typeof loader>() as any;
    const {user} = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const navigation = useReactNavigation();
    const [searchQuery, setSearchQuery] = useState(q);

    useEffect(() => {
        setSearchQuery(q);
    }, [q]);

    useEffect(() => {
        if (viewParam === "me" && !searchParams.get("userId") && user?.id) {
            const sp = new URLSearchParams(searchParams);
            sp.set("userId", user.id);
            setSearchParams(sp, {replace: true});
        }
    }, [viewParam, searchParams, user, setSearchParams]);

    const updateFilters = (key: string, value: string) => {
        const sp = new URLSearchParams(searchParams);
        sp.set(key, value);
        sp.set("page", "1");
        sp.delete("api");
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

    const handleReset = () => {
        setSearchQuery("");
        const sp = new URLSearchParams(); // Resetta a parametri vuoti puliti
        setSearchParams(sp, {replace: true});
    };

    useEffect(() => {
        const timeout = setTimeout(() => {
            if (searchQuery !== q) updateFilters("q", searchQuery);
        }, 500);
        return () => clearTimeout(timeout);
    }, [searchQuery, q]);

    return (
        <PageWrapper>
            <div className="w-full flex items-center justify-between gap-4">
                <div className="min-w-0"><h1 className="text-2xl font-bold text-text truncate">Elenco Barriere</h1>
                </div>
                <Link to="/app/barriers/new"
                      className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl font-bold shadow-md hover:bg-primary/90 transition active:scale-95 shrink-0"><Plus
                    className="w-5 h-5"/>
                    <span className="hidden sm:inline">Nuova</span>
                </Link>
            </div>

            {user && (
                <div className="w-full flex bg-surface p-1 rounded-xl border border-border shadow-sm">
                    <button onClick={() => updateFilters("view", "all")}
                            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${viewParam === 'all' ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:text-text'}`}>
                        Tutte le Barriere
                    </button>
                    <button onClick={() => updateFilters("view", "me")}
                            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${viewParam === 'me' ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:text-text'}`}>
                        Le mie Segnalazioni
                    </button>
                </div>
            )}

            <div className="w-full flex flex-col md:flex-row gap-3">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted"/>
                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                           placeholder="Cerca per titolo, indirizzo..."
                           className="w-full pl-11 pr-4 py-3 rounded-xl border border-border bg-surface outline-none focus:ring-2 focus:ring-primary shadow-sm text-text transition-all"/>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:flex-none md:w-44">
                        <ListFilter
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none"/>
                        <select value={stateParam} onChange={(e) => updateFilters("state", e.target.value)}
                                className="w-full pl-9 pr-4 py-3 rounded-xl border border-border bg-surface outline-none focus:ring-2 focus:ring-primary shadow-sm text-sm font-medium appearance-none cursor-pointer">
                            <option value="ALL">Tutti gli stati</option>
                            <option value="ACTIVE">Solo Attive</option>
                            <option value="IN_REVIEW">In Revisione</option>
                            <option value="RESOLVED">Risolte</option>
                            <option value="HIDDEN">Nascoste</option>
                        </select>
                    </div>
                    <select value={sortParam} onChange={(e) => updateFilters("sort", e.target.value)}
                            className="flex-1 md:flex-none md:w-40 px-4 py-3 rounded-xl border border-border bg-surface outline-none focus:ring-2 focus:ring-primary shadow-sm text-sm font-medium cursor-pointer">
                        <option value="new">Più Recenti</option>
                        <option value="rating">Miglior Voto</option>
                    </select>
                </div>
            </div>

            <Suspense fallback={
                <div className="py-20 flex flex-col items-center gap-4 text-text-muted">
                    <Loader2 className="w-10 h-10 animate-spin text-primary"/>
                    <p className="font-medium">Caricamento in corso...</p>
                </div>}
            >
                <Await resolve={promise}>
                    {(resolvedData) => (
                        <BarrierListContent resolvedData={resolvedData} isNavigating={navigation.state === "loading"}
                                            onReset={handleReset}/>
                    )}
                </Await>
            </Suspense>
        </PageWrapper>
    );
}

function BarrierListContent({resolvedData, isNavigating, onReset}: any) {
    const {items, activePage, loadMoreRef} = useInfiniteList({
        initialItems: resolvedData.barriers,
        initialPage: resolvedData.page,
        totalPages: resolvedData.totalPages,
        fetchUrl: "/app/barriers",
        dataKey: "barriers",
        filterKey: resolvedData.filterKey,
        extraFetchParams: {api: "true"}
    });

    return (
        <div className="w-full space-y-6">
            <div className="w-full text-sm font-semibold text-text-muted flex items-center gap-2">
                {isNavigating ?
                    <Loader2 className="w-4 h-4 animate-spin text-primary"/> :
                    `${resolvedData.totalCount} risultati trovati`
                }
            </div>

            {!isNavigating && items.length === 0 && (
                <EmptyState icon={Search} title="Nessuna barriera trovata."
                            description="Prova a cambiare i filtri o la ricerca." actionLabel="Resetta Filtri"
                            onAction={onReset}/>
            )}

            <ul className="w-full grid grid-cols-1 lg:grid-cols-2 gap-4">
                {items.map((b: any) => {
                    const title = b.title?.trim() || "Senza titolo";
                    const IconComp = getDynamicIcon(b.type?.iconKey);
                    const stateStyles: Record<string, string> = {
                        ACTIVE: "bg-error/10 text-error border-error/20",
                        RESOLVED: "bg-success/10 text-success border-success/20",
                        IN_REVIEW: "bg-warning/10 text-warning border-warning/20",
                        HIDDEN: "bg-background text-text-muted border-border"
                    };

                    return (
                        <li key={b.id} className="w-full">
                            <Link to={`/app/barriers/${b.id}`}
                                  className="block w-full bg-surface border border-border rounded-2xl overflow-hidden hover:shadow-lg hover:border-primary/30 transition-all group">
                                <div className="flex p-4 gap-4">
                                    <div
                                        className="relative h-24 w-24 rounded-xl bg-background shrink-0 overflow-hidden border border-border shadow-inner">
                                        {b.photoUrls?.[0] ? (<img src={b.photoUrls[0]} alt={title}
                                                                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                                  loading="lazy"/>) : (<div
                                            className="h-full w-full flex items-center justify-center bg-background/80">
                                            <IconComp className="w-8 h-8 text-text-muted/30"/></div>)}
                                        <div
                                            className="absolute inset-0 bg-linear-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"/>
                                    </div>
                                    <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                                        <div>
                                            <div className="flex justify-between gap-2 mb-1"><h3
                                                className="font-bold text-text truncate group-hover:text-primary transition-colors">{title}</h3>
                                                <span
                                                    className={`shrink-0 text-[9px] font-bold px-2 py-1 rounded-md border uppercase tracking-wider ${stateStyles[b.state] || ""}`}>
                                                    {b.state === 'IN_REVIEW' ? 'VERIFICA' : b.state}
                                                </span>
                                            </div>
                                            <p className="text-xs text-text-muted truncate flex items-center gap-1.5 mb-2">
                                                <MapPin className="w-3 h-3 shrink-0"/> <span
                                                className="truncate">{b.address || "Mappa"}</span>
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span
                                                className="flex items-center gap-1 bg-background border border-border text-text-muted px-2 py-0.5 rounded text-xs font-medium">
                                                <IconComp className="w-3 h-3"/> {b.type?.label}
                                            </span>
                                            <span
                                                className="bg-error/10 text-error px-2 py-0.5 rounded border border-error/20 text-xs font-bold tracking-wide">LVL {b.difficulty}</span>
                                            {b.totalRatings > 0 && (
                                                <span
                                                    className="bg-warning/10 text-warning px-2 py-0.5 rounded border border-warning/20 text-xs font-bold">
                                                    ★ {Number(b.averageRating).toFixed(1)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div
                                    className="px-4 py-2.5 border-t border-border bg-background/50 text-[11px] text-text-muted flex justify-between items-center">
                                    <span className="truncate">
                                        Di: <span className="font-bold text-text">
                                        {b.creator ?
                                            `${b.creator.firstName} ${b.creator.lastName || ""}` :
                                            "Sconosciuto"}</span>
                                    </span>
                                    <span className="uppercase tracking-wider font-medium shrink-0 ml-2">
                                        {formatDate(b.createdAt)}
                                    </span>
                                </div>
                            </Link>
                        </li>
                    );
                })}
            </ul>

            {activePage < resolvedData.totalPages && (
                <div ref={loadMoreRef} className="flex justify-center py-6">
                    <Loader2 className="w-8 h-8 animate-spin text-primary"/>
                </div>
            )}
        </div>
    );
}