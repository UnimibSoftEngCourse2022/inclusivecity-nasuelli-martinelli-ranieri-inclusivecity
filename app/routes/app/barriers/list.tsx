import {useEffect, useMemo, useState} from "react";
import {Link, useSearchParams} from "react-router";
import {supabase} from "~/services/supabase/supabase";
import type {Barrier, BarrierType, User} from "@prisma/client";
import {BarrierState} from "@prisma/client";

type BarrierListItem = Pick<
    Barrier,
    | "id"
    | "title"
    | "description"
    | "address"
    | "photoUrls"
    | "difficulty"
    | "state"
    | "averageRating"
    | "totalRatings"
    | "createdAt"
> & {
    type: Pick<BarrierType, "id" | "label" | "iconKey" | "colorHex"> | null;
    creator: Pick<User, "id" | "firstName" | "lastName"> | null;
};

const PAGE_SIZE = 10;

function formatDate(value: string | Date) {
    const d = typeof value === "string" ? new Date(value) : value;
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("it-IT", {
        year: "numeric",
        month: "short",
        day: "2-digit",
    });
}

function clampInt(value: string | null, fallback: number, min: number, max: number) {
    const n = Number.parseInt(value ?? "", 10);
    if (Number.isNaN(n)) return fallback;
    return Math.min(Math.max(n, min), max);
}

export default function BarrierListPage() {
    const [searchParams, setSearchParams] = useSearchParams();

    // Parametri URL (così refresh/back funzionano bene)
    const q = (searchParams.get("q") ?? "").trim();
    const stateParam = (searchParams.get("state") ?? "ACTIVE").toUpperCase();
    const sortParam = (searchParams.get("sort") ?? "new").toLowerCase();
    const pageParam = searchParams.get("page");
    const page = clampInt(pageParam, 1, 1, 10_000);

    const selectedState: BarrierState | "ALL" = useMemo(() => {
        if (stateParam === "ALL") return "ALL";
        // se arriva una value strana da URL, fallback ad ACTIVE
        if (!Object.values(BarrierState).includes(stateParam as BarrierState)) return BarrierState.ACTIVE;
        return stateParam as BarrierState;
    }, [stateParam]);

    const [items, setItems] = useState<BarrierListItem[]>([]);
    const [total, setTotal] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const totalPages = useMemo(() => {
        return Math.max(1, Math.ceil(total / PAGE_SIZE));
    }, [total]);

    // Normalizza pagina se out of range
    useEffect(() => {
        if (page > totalPages) {
            const next = new URLSearchParams(searchParams);
            next.set("page", String(totalPages));
            setSearchParams(next, {replace: true});
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [totalPages]);

    useEffect(() => {
        let cancelled = false;

        async function fetchBarriers() {
            setLoading(true);
            setError(null);

            const from = (page - 1) * PAGE_SIZE;
            const to = from + PAGE_SIZE - 1;

            try {
                // select con join relazioni (type e creator)
                let query = supabase
                    .from("Barrier")
                    .select(
                        `
                        id,
                        title,
                        description,
                        address,
                        photoUrls,
                        difficulty,
                        state,
                        averageRating,
                        totalRatings,
                        createdAt,
                        type:BarrierType ( id, label, iconKey, colorHex ),
                        creator:User ( id, firstName, lastName )
                    `,
                        {count: "exact"}
                    );

                // Filtro stato
                if (selectedState !== "ALL") {
                    query = query.eq("state", selectedState);
                }

                // Ricerca testuale server-side (titolo o descrizione)
                if (q.length > 0) {
                    const escaped = q.replaceAll(",", " "); // evita rogne con or(...)
                    query = query.or(`title.ilike.%${escaped}%,description.ilike.%${escaped}%`);
                }

                // Ordinamento
                if (sortParam === "rating") {
                    query = query.order("averageRating", {ascending: false}).order("createdAt", {ascending: false});
                } else {
                    // default: newest
                    query = query.order("createdAt", {ascending: false});
                }

                // Paginazione
                query = query.range(from, to);

                const {data, error, count} = await query;

                if (error) throw error;

                if (cancelled) return;

                setItems((data ?? []) as unknown as BarrierListItem[]);
                setTotal(count ?? 0);
            } catch (e: unknown) {
                if (cancelled) return;
                const message = e instanceof Error ? e.message : "Errore sconosciuto nel caricamento barriere";
                setError(message);
                setItems([]);
                setTotal(0);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        fetchBarriers();

        return () => {
            cancelled = true;
        };
    }, [page, q, selectedState, sortParam]);

    function updateParam(key: string, value: string) {
        const next = new URLSearchParams(searchParams);
        if (value.trim().length === 0) next.delete(key);
        else next.set(key, value);

        // reset page quando cambi filtri/ricerca/sort
        if (key !== "page") next.set("page", "1");

        setSearchParams(next);
    }

    function goToPage(nextPage: number) {
        const safe = Math.min(Math.max(nextPage, 1), totalPages);
        const next = new URLSearchParams(searchParams);
        next.set("page", String(safe));
        setSearchParams(next);
    }

    return (
        <div className="p-4 space-y-4">
            <header className="space-y-1">
                <h1 className="text-xl font-semibold">Barriere</h1>
                <p className="text-sm opacity-80">
                    Elenco delle segnalazioni. Filtra per stato e cerca per titolo o descrizione.
                </p>
            </header>

            <section className="grid grid-cols-1 gap-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                    <div className="flex-1">
                        <label className="block text-sm font-medium mb-1" htmlFor="q">
                            Cerca
                        </label>
                        <input
                            id="q"
                            value={q}
                            onChange={(e) => updateParam("q", e.target.value)}
                            placeholder="Es. gradino, buca, scale..."
                            className="w-full rounded-md border px-3 py-2 text-sm bg-transparent"
                        />
                    </div>

                    <div className="w-full sm:w-48">
                        <label className="block text-sm font-medium mb-1" htmlFor="state">
                            Stato
                        </label>
                        <select
                            id="state"
                            value={selectedState}
                            onChange={(e) => updateParam("state", e.target.value)}
                            className="w-full rounded-md border px-3 py-2 text-sm bg-transparent"
                        >
                            <option value="ALL">Tutte</option>
                            <option value={BarrierState.ACTIVE}>Attive</option>
                            <option value={BarrierState.RESOLVED}>Risolte</option>
                            <option value={BarrierState.IN_REVIEW}>In revisione</option>
                            <option value={BarrierState.HIDDEN}>Nascoste</option>
                        </select>
                    </div>

                    <div className="w-full sm:w-48">
                        <label className="block text-sm font-medium mb-1" htmlFor="sort">
                            Ordina
                        </label>
                        <select
                            id="sort"
                            value={sortParam}
                            onChange={(e) => updateParam("sort", e.target.value)}
                            className="w-full rounded-md border px-3 py-2 text-sm bg-transparent"
                        >
                            <option value="new">Più recenti</option>
                            <option value="rating">Miglior valutazione</option>
                        </select>
                    </div>
                </div>
            </section>

            <section className="space-y-3">
                <div className="flex items-center justify-between">
                    <div className="text-sm opacity-80">
                        {loading ? "Caricamento..." : `${total} risultati`}
                    </div>

                    <Link
                        to="/app/barriers/new"
                        className="inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium"
                    >
                        Nuova barriera
                    </Link>
                </div>

                {error && (
                    <div className="rounded-md border p-3 text-sm">
                        <div className="font-medium">Errore</div>
                        <div className="opacity-80">{error}</div>
                        <button
                            className="mt-2 rounded-md border px-3 py-2 text-sm"
                            onClick={() => goToPage(page)}
                        >
                            Riprova
                        </button>
                    </div>
                )}

                {!error && !loading && items.length === 0 && (
                    <div className="rounded-md border p-3 text-sm opacity-80">
                        Nessuna barriera trovata con i filtri attuali.
                    </div>
                )}

                <ul className="space-y-3">
                    {items.map((b) => {
                        const title = b.title?.trim() || "Senza titolo";
                        const desc = b.description?.trim() || "";
                        const typeLabel = b.type?.label ?? "Tipo non specificato";
                        const author =
                            b.creator
                                ? `${b.creator.firstName}${b.creator.lastName ? ` ${b.creator.lastName}` : ""}`
                                : null;

                        const cover = Array.isArray(b.photoUrls) && b.photoUrls.length > 0 ? b.photoUrls[0] : null;

                        return (
                            <li key={b.id} className="rounded-md border overflow-hidden">
                                <Link to={`/app/barriers/${b.id}`} className="block">
                                    <div className="flex gap-3 p-3">
                                        <div className="h-16 w-16 rounded-md border shrink-0 overflow-hidden">
                                            {cover ? (
                                                // se state usando URL pubblici da Supabase Storage, qui funziona.
                                                // altrimenti sostituisci con un placeholder.
                                                <img
                                                    src={cover}
                                                    alt={title}
                                                    className="h-full w-full object-cover"
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <div className="h-full w-full flex items-center justify-center text-xs opacity-60">
                                                    No foto
                                                </div>
                                            )}
                                        </div>

                                        <div className="min-w-0 flex-1 space-y-1">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <div className="font-medium truncate">{title}</div>
                                                    <div className="text-xs opacity-70 truncate">
                                                        {typeLabel}
                                                        {b.address ? ` • ${b.address}` : ""}
                                                    </div>
                                                </div>

                                                <div className="text-right text-xs opacity-70 shrink-0">
                                                    <div>{formatDate(b.createdAt as unknown as string)}</div>
                                                    <div className="mt-1">
                                                        {b.state}
                                                    </div>
                                                </div>
                                            </div>

                                            {desc && (
                                                <div className="text-sm opacity-90 line-clamp-2">
                                                    {desc}
                                                </div>
                                            )}

                                            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs opacity-80">
                                                <span>Difficoltà: {b.difficulty}</span>
                                                <span>
                                                    Valutazione: {Number(b.averageRating ?? 0).toFixed(1)} ({b.totalRatings ?? 0})
                                                </span>
                                                {author && <span>Creatore: {author}</span>}
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            </li>
                        );
                    })}
                </ul>

                {!error && totalPages > 1 && (
                    <div className="flex items-center justify-between pt-2">
                        <button
                            className="rounded-md border px-3 py-2 text-sm disabled:opacity-50"
                            onClick={() => goToPage(page - 1)}
                            disabled={page <= 1 || loading}
                        >
                            Indietro
                        </button>

                        <div className="text-sm opacity-80">
                            Pagina {page} di {totalPages}
                        </div>

                        <button
                            className="rounded-md border px-3 py-2 text-sm disabled:opacity-50"
                            onClick={() => goToPage(page + 1)}
                            disabled={page >= totalPages || loading}
                        >
                            Avanti
                        </button>
                    </div>
                )}
            </section>
        </div>
    );
}