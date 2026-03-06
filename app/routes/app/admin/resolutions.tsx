import type {ActionFunctionArgs, LoaderFunctionArgs} from "react-router";
import {Link, useFetcher, useLoaderData, useLocation} from "react-router";
import {CheckCircle, Flag, Loader2, ShieldCheck, XCircle} from "lucide-react";
import {prisma} from "~/db.server";
import {useAuth} from "~/context/AuthContext";
import {formatDate} from "~/utils/format";
import PageWrapper from "~/components/ui/PageWrapper";
import SearchInput from "~/components/ui/SearchInput";
import EmptyState from "~/components/ui/EmptyState";
import {useInfiniteList} from "~/hooks/useInfiniteList";
import PageHeader from "~/components/ui/PageHeader";

export async function loader({request}: LoaderFunctionArgs) {
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") ?? "").trim();
    const pageParam = url.searchParams.get("page");
    const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);
    const PAGE_SIZE = 10;

    const where: any = {status: "PENDING"};
    if (q) {
        where.OR = [
            {barrier: {title: {contains: q, mode: 'insensitive'}}},
            {user: {firstName: {contains: q, mode: 'insensitive'}}},
            {user: {lastName: {contains: q, mode: 'insensitive'}}}
        ];
    }

    const skip = (page - 1) * PAGE_SIZE;

    const [resolutions, totalCount] = await Promise.all([
        prisma.resolution.findMany({
            where, orderBy: {createdAt: "desc"}, skip, take: PAGE_SIZE,
            include: {
                barrier: {select: {id: true, title: true, address: true, state: true}},
                user: {select: {firstName: true, lastName: true}}
            }
        }),
        prisma.resolution.count({where})
    ]);

    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
    return {resolutions, totalCount, totalPages, page, q};
}

export async function action({request}: ActionFunctionArgs) {
    const formData = await request.formData();
    const resolutionId = formData.get("resolutionId") as string;
    const intent = formData.get("intent") as "APPROVE" | "REJECT";
    const approverId = formData.get("approverId") as string;

    try {
        if (intent === "APPROVE") {
            await prisma.resolution.update({
                where: {id: resolutionId}, data: {status: "APPROVED", approverId, approvedAt: new Date()}
            });
        } else {
            await prisma.resolution.update({
                where: {id: resolutionId}, data: {status: "REJECTED", approverId, approvedAt: new Date()}
            });
        }
        return {success: true};
    } catch {
        return {error: "Impossibile aggiornare la risoluzione."};
    }
}

export default function AdminResolutionsPage() {
    const {resolutions, totalCount, totalPages, page, q} = useLoaderData<typeof loader>();
    const {profile} = useAuth();
    const fetcher = useFetcher();
    const location = useLocation();

    if (profile?.role !== "ADMIN") {
        return <div className="p-8 text-center text-error font-semibold mt-20">Accesso negato.</div>;
    }

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
        fetchUrl: "/app/admin/resolutions",
        dataKey: "resolutions"
    });

    return (
        <PageWrapper>
            <div className="space-y-5">
                <PageHeader
                    title={
                        <span className="flex items-center gap-2">
                            <ShieldCheck className="w-8 h-8 text-primary"/> Pannello Admin
                        </span>}
                    subtitle="Gestisci la moderazione della community."
                    showBack={false}
                />
                <div className="flex bg-surface p-1 rounded-xl border border-border shadow-sm">
                    <Link to="/app/admin/reports"
                          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${location.pathname.includes('reports') ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:text-text'}`}>
                        <Flag className="w-4 h-4"/> Segnalazioni
                    </Link>
                    <Link to="/app/admin/resolutions"
                          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${location.pathname.includes('resolutions') ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:text-text'}`}>
                        <CheckCircle className="w-4 h-4"/> Risoluzioni
                    </Link>
                </div>
            </div>

            {fetcher.data?.error && (
                <div className="p-4 bg-error/10 text-error font-medium rounded-xl border border-error/20">
                    {fetcher.data.error}
                </div>
            )}

            <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Cerca per titolo o utente..."
                         isLoading={isLoadingFilters} resultsCount={totalCount} resultsLabel="da verificare"/>

            {!isLoadingFilters && items.length === 0 ? (
                <EmptyState icon={CheckCircle} title="Nessuna risoluzione in sospeso."
                            description="Ottimo lavoro, hai svuotato la coda!" actionLabel={q ? "Azzera ricerca" : ""}
                            onAction={() => updateFilters("")}/>
            ) : (
                <div className="space-y-4">
                    {items.map((res: any) => (
                        <div key={res.id}
                             className="bg-surface border border-border rounded-2xl p-5 shadow-sm flex flex-col md:flex-row gap-5">
                            {res.evidenceUrl ? (
                                <button
                                    className="w-full md:w-48 h-48 shrink-0 rounded-xl overflow-hidden bg-background border border-border cursor-pointer relative group"
                                    onClick={() => window.open(res.evidenceUrl, "_blank")}>
                                    <img src={res.evidenceUrl} alt="Foto"
                                         className="w-full h-full object-cover group-hover:scale-105 transition-transform"/>
                                    <div
                                        className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"/>
                                </button>
                            ) : (
                                <div
                                    className="w-full md:w-48 h-48 shrink-0 rounded-xl bg-background border border-border flex items-center justify-center text-text-muted text-xs">
                                    Nessuna foto
                                </div>
                            )}

                            <div className="flex-1 flex flex-col justify-between min-w-0">
                                <div>
                                    <Link to={`/app/barriers/${res.barrier.id}`}
                                          className="font-bold text-lg text-text leading-tight mb-1 hover:text-primary transition-colors truncate block">{res.barrier.title}</Link>
                                    <p className="text-xs text-text-muted mb-3 truncate">{res.barrier.address}</p>
                                    <div className="bg-background p-3 rounded-xl border border-border/50 mb-3">
                                        <p className="text-xs text-text-muted uppercase font-bold mb-1">Di {res.user.firstName}:</p>
                                        <p className="text-sm text-text italic leading-relaxed">"{res.comment || "Nessun commento."}"</p>
                                    </div>
                                </div>
                                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-2">
                                    <span
                                        className="text-[10px] text-text-muted uppercase tracking-wider font-semibold shrink-0">Il {formatDate(res.createdAt)}</span>
                                    <div className="flex gap-2 w-full sm:w-auto">
                                        <fetcher.Form method="post" className="flex-1 sm:flex-none">
                                            <input type="hidden" name="resolutionId" value={res.id}/>
                                            <input type="hidden" name="approverId" value={profile.id}/>

                                            <button type="submit" name="intent" value="REJECT"
                                                    disabled={fetcher.state !== "idle"}
                                                    className="w-full flex justify-center gap-2 px-4 py-2.5 bg-error/10 text-error hover:bg-error/20 border border-error/20 rounded-xl font-bold transition-colors disabled:opacity-50">
                                                <XCircle className="w-5 h-5"/> Rifiuta
                                            </button>
                                        </fetcher.Form>

                                        <fetcher.Form method="post" className="flex-1 sm:flex-none">
                                            <input type="hidden" name="resolutionId" value={res.id}/>
                                            <input type="hidden" name="approverId" value={profile.id}/>

                                            <button type="submit" name="intent" value="APPROVE"
                                                    disabled={fetcher.state !== "idle"}
                                                    className="w-full flex justify-center gap-2 px-4 py-2.5 bg-success text-white hover:bg-success/90 rounded-xl font-bold transition-colors disabled:opacity-50 shadow-md">
                                                {fetcher.state === "submitting" ?
                                                    <Loader2 className="w-5 h-5 animate-spin"/> :
                                                    <CheckCircle className="w-5 h-5"/>} Approva
                                            </button>
                                        </fetcher.Form>
                                    </div>
                                </div>
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