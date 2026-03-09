import type {ActionFunctionArgs, LoaderFunctionArgs} from "react-router";
import {useFetcher, useLoaderData} from "react-router";
import {CheckCircle, Loader2, ShieldCheck, XCircle} from "lucide-react";
import {prisma} from "../../../db.server";
import {useAuth} from "../../../context/AuthContext";
import {useInfiniteList} from "../../../hooks/useInfiniteList";
import PageWrapper from "../../../components/ui/PageWrapper";
import PageHeader from "../../../components/ui/PageHeader";
import SearchInput from "../../../components/ui/SearchInput";
import EmptyState from "../../../components/ui/EmptyState";
import ResolutionCard from "../../../components/moderation/ResolutionCard";

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

    const where: any = {barrierId};
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
            where, orderBy: {createdAt: 'desc'}, skip, take: PAGE_SIZE,
            include: {user: {select: {id: true, firstName: true, lastName: true}}}
        }),
        prisma.resolution.count({where})
    ]);

    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
    return {barrier, resolutions, totalCount, totalPages, page, q, barrierId};
}

export async function action({request, params}: ActionFunctionArgs) {
    const formData = await request.formData();
    const intent = formData.get("intent");
    const {id: barrierId} = params;
    const resolutionId = formData.get("resolutionId") as string;
    const approverId = formData.get("approverId") as string;

    try {
        if (intent === "RESOLVE_BARRIER") {
            await prisma.barrier.update({where: {id: barrierId}, data: {state: "RESOLVED"}});
        } else if (intent === "REJECT_RESOLUTION") {
            await prisma.resolution.update({
                where: {id: resolutionId},
                data: {status: "REJECTED", approverId: approverId, approvedAt: new Date()}
            });
        }
        return {success: true};
    } catch {
        return {error: "Errore durante l'operazione."};
    }
}

export default function ResolutionsListPage() {
    const {barrier, resolutions, totalCount, totalPages, page, q, barrierId} = useLoaderData<typeof loader>();
    const {profile} = useAuth();
    const fetcher = useFetcher<typeof action>();
    const isAdmin = profile?.role === "ADMIN";

    const {
        items,
        activePage,
        searchQuery,
        setSearchQuery,
        isLoadingFilters,
        loadMoreRef,
        updateFilters
    } = useInfiniteList({
        initialItems: resolutions,
        initialPage: page,
        initialQuery: q,
        totalPages,
        fetchUrl: `/app/barriers/${barrierId}/resolutions`,
        dataKey: "resolutions"
    });

    return (
        <PageWrapper>
            <PageHeader title="Prove di Risoluzione" subtitle={`Per: ${barrier.title}`}
                        backUrl={`/app/barriers/${barrierId}`}/>

            {isAdmin && barrier.state !== "RESOLVED" && (
                <fetcher.Form method="post"
                              className="bg-success/10 border-2 border-success/30 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                        <h3 className="font-bold text-success flex items-center gap-2"><ShieldCheck
                            className="w-5 h-5"/> Azione Admin</h3>
                        <p className="text-xs text-success/80 mt-1">Approva in blocco la barriera per chiudere la
                            segnalazione.</p>
                    </div>
                    <button type="submit" name="intent" value="RESOLVE_BARRIER" disabled={fetcher.state !== "idle"}
                            className="w-full sm:w-auto shrink-0 bg-success text-white px-5 py-3 rounded-xl font-bold shadow-md hover:bg-success/90 transition active:scale-95 disabled:opacity-50">
                        {fetcher.state === "idle" ?
                            "Segna Barriera come Risolta" : <Loader2 className="w-5 h-5 animate-spin mx-auto"/>}
                    </button>
                </fetcher.Form>
            )}

            <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Cerca per autore o commento..."
                         isLoading={isLoadingFilters} resultsCount={totalCount} resultsLabel="prove"/>

            {!isLoadingFilters && items.length === 0 ? (
                <EmptyState icon={CheckCircle} title="Nessuna prova trovata." actionLabel="Azzera ricerca"
                            onAction={() => updateFilters("")}/>
            ) : (
                <div className="space-y-4">
                    {items.map((res: any) => (
                        <ResolutionCard key={res.id}
                                        userFullName={`${res.user.firstName} ${res.user.lastName || ""}`}
                                        status={res.status}
                                        evidenceUrl={res.evidenceUrl}
                                        comment={res.comment}
                                        createdAt={res.createdAt}
                                        isOwn={res.user.id === profile?.id}
                                        adminActions={isAdmin && res.status === "PENDING" && barrier.state !== "RESOLVED" ? (
                                            <fetcher.Form method="post">
                                                <input type="hidden" name="resolutionId" value={res.id}/><input
                                                type="hidden" name="approverId" value={profile?.id}/>
                                                <button type="submit" name="intent" value="REJECT_RESOLUTION"
                                                        disabled={fetcher.state !== "idle"}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-error/10 text-error hover:bg-error/20 border border-error/20 rounded-lg text-xs font-bold transition-colors disabled:opacity-50">
                                                    <XCircle className="w-3.5 h-3.5"/> Scarta
                                                </button>
                                            </fetcher.Form>
                                        ) : null}/>
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