import type {ActionFunctionArgs, LoaderFunctionArgs} from "react-router";
import {useFetcher, useLoaderData} from "react-router";
import React from "react";
import {AlertTriangle, EyeOff, Flag, Loader2, ShieldCheck, Undo2} from "lucide-react";
import {prisma} from "../../../db.server";
import {useAuth} from "../../../context/AuthContext";
import {useInfiniteList} from "../../../hooks/useInfiniteList";
import PageWrapper from "../../../components/ui/PageWrapper";
import PageHeader from "../../../components/ui/PageHeader";
import SearchInput from "../../../components/ui/SearchInput";
import EmptyState from "../../../components/ui/EmptyState";
import {formatDate} from "../../../utils/format";

const REPORT_REASONS: Record<string, string> = {
    DOES_NOT_EXIST: "L'ostacolo non esiste più",
    DUPLICATE: "Duplicato di un'altra barriera",
    WRONG_LOCATION: "Posizione errata",
    INAPPROPRIATE: "Inappropriato / Spam",
    OTHER: "Altro"
};

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
        select: {id: true, title: true, state: true}
    });

    if (!barrier) throw new Response("Barriera non trovata", {status: 404});

    if (barrier.state === 'RESOLVED' || barrier.state === 'HIDDEN') {
        throw new Response("Non è più possibile gestire segnalazioni per questa barriera", {status: 400});
    }

    const where: any = {barrierId, status: "PENDING"};

    if (q) {
        where.OR = [
            {user: {firstName: {contains: q, mode: 'insensitive'}}},
            {user: {lastName: {contains: q, mode: 'insensitive'}}}
        ];
    }

    const skip = (page - 1) * PAGE_SIZE;

    const [reports, totalCount] = await Promise.all([
        prisma.report.findMany({
            where,
            orderBy: {createdAt: 'desc'},
            skip,
            take: PAGE_SIZE,
            include: {user: {select: {id: true, firstName: true, lastName: true}}}
        }),
        prisma.report.count({where})
    ]);

    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

    return {barrier, reports, totalCount, totalPages, page, q, barrierId};
}

export async function action({request, params}: ActionFunctionArgs) {
    const formData = await request.formData();
    const intent = formData.get("intent");
    const {id: barrierId} = params;

    try {
        if (intent === "HIDE_BARRIER") {
            await prisma.barrier.update({
                where: {id: barrierId},
                data: {state: "HIDDEN"}
            });
        } else if (intent === "DISMISS_REPORTS") {
            await prisma.report.updateMany({
                where: {barrierId, status: "PENDING"},
                data: {status: "DISMISSED"}
            });
            await prisma.barrier.update({
                where: {id: barrierId},
                data: {state: "ACTIVE"}
            });
        }
        return {success: true};
    } catch {
        return {error: "Errore durante l'operazione."};
    }
}

export default function BarrierReportsPage() {
    const {barrier, reports, totalCount, totalPages, page, q, barrierId} = useLoaderData<typeof loader>();
    const {profile} = useAuth();
    const fetcher = useFetcher<typeof action>();

    const {
        items,
        activePage,
        searchQuery,
        setSearchQuery,
        isLoadingFilters,
        loadMoreRef,
        updateFilters
    } = useInfiniteList({
        initialItems: reports,
        initialPage: page,
        initialQuery: q,
        totalPages,
        fetchUrl: `/app/barriers/${barrierId}/reports`,
        dataKey: "reports"
    });

    if (profile?.role !== "ADMIN") {
        return (
            <div className="p-8 text-center text-error font-semibold mt-20">
                Accesso negato.
            </div>
        );
    }
    return (
        <PageWrapper>
            <PageHeader title="Segnalazioni in Sospeso" subtitle={`Per: ${barrier.title}`}
                        backUrl={`/app/barriers/${barrierId}`}/>

            {barrier.state !== "HIDDEN" && items.length > 0 && (
                <div className="bg-error/5 border-2 border-error/30 rounded-2xl p-5 shadow-sm space-y-4">
                    <div>
                        <h3 className="font-bold text-error flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5"/> Azioni di Moderazione
                        </h3>
                        <p className="text-xs text-error/80 mt-1">
                            Valuta i report. "Nascondi Barriera" premierà i segnalatori.
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <fetcher.Form method="post" className="flex-1">
                            <button type="submit" name="intent" value="DISMISS_REPORTS"
                                    disabled={fetcher.state !== "idle"}
                                    className="w-full flex justify-center gap-2 px-4 py-3 bg-surface border border-error/20 text-error hover:bg-error/5 rounded-xl font-bold transition-colors disabled:opacity-50">
                                <Undo2 className="w-5 h-5"/> Ignora e Ripristina
                            </button>
                        </fetcher.Form>
                        <fetcher.Form method="post" className="flex-1">
                            <button type="submit" name="intent" value="HIDE_BARRIER" disabled={fetcher.state !== "idle"}
                                    className="w-full flex justify-center gap-2 px-4 py-3 bg-error text-white hover:bg-error/90 shadow-md rounded-xl font-bold transition-colors disabled:opacity-50">{fetcher.state !== "idle" ?
                                <Loader2 className="w-5 h-5 animate-spin mx-auto"/> :
                                <EyeOff className="w-5 h-5"/>} Nascondi Barriera
                            </button>
                        </fetcher.Form>
                    </div>
                </div>
            )}

            <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Cerca per utente..."
                         isLoading={isLoadingFilters} resultsCount={totalCount} resultsLabel="segnalazioni"/>

            {!isLoadingFilters && items.length === 0 ? (
                <EmptyState icon={Flag} title="Nessuna segnalazione trovata." actionLabel="Azzera ricerca"
                            onAction={() => updateFilters("")}/>
            ) : (
                <div className="space-y-3">
                    {items.map((report: any) => (
                        <div key={report.id}
                             className="bg-surface border border-border p-4 rounded-xl flex items-center gap-4 shadow-sm">
                            <div className="bg-error/10 p-3 rounded-full text-error shrink-0"><AlertTriangle
                                className="w-6 h-6"/></div>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-text text-base">{REPORT_REASONS[report.reason] || report.reason}</p>
                                <p className="text-sm text-text-muted mt-0.5">Da: <span
                                    className="font-medium text-text">{report.user.firstName} {report.user.lastName || ""}</span>
                                </p>
                                <p className="text-xs text-text-muted/70 mt-1 uppercase tracking-wider font-semibold">
                                    {formatDate(report.createdAt)}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            {activePage < totalPages && (
                <div ref={loadMoreRef} className="flex justify-center py-6">
                    <Loader2 className="w-8 h-8 animate-spin text-primary"/>
                </div>
            )}
        </PageWrapper>
    );
}