import type {LoaderFunctionArgs} from "react-router";
import {useLoaderData} from "react-router";
import {prisma} from "~/db.server";
import {useAuth} from "~/context/AuthContext";
import {CheckCircle, Loader2} from "lucide-react";
import FeedbackCard from "~/components/moderation/FeedbackCard";
import {useInfiniteList} from "~/hooks/useInfiniteList";
import PageWrapper from "~/components/ui/PageWrapper";
import PageHeader from "~/components/ui/PageHeader";
import SearchInput from "~/components/ui/SearchInput";
import EmptyState from "~/components/ui/EmptyState";

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
        select: {title: true, averageRating: true, totalRatings: true}
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

    const [feedbacks, totalCount] = await Promise.all([
        prisma.feedback.findMany({
            where, orderBy: {createdAt: 'desc'}, skip, take: PAGE_SIZE,
            include: {user: {select: {id: true, firstName: true, lastName: true}}}
        }),
        prisma.feedback.count({where})
    ]);

    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
    return {barrier, feedbacks, totalCount, totalPages, page, q, barrierId};
}

export default function FeedbacksListPage() {
    const {barrier, feedbacks, totalCount, totalPages, page, q, barrierId} = useLoaderData<typeof loader>();
    const {profile} = useAuth();
    const {
        items,
        activePage,
        searchQuery,
        setSearchQuery,
        isLoadingFilters,
        loadMoreRef,
        updateFilters
    } = useInfiniteList({
        initialItems: feedbacks,
        initialPage: page,
        initialQuery: q,
        totalPages,
        fetchUrl: `/app/barriers/${barrierId}/feedbacks`,
        dataKey: "feedbacks"
    });

    return (
        <PageWrapper>
            <PageHeader
                title={
                    <>
                        Valutazioni {barrier.totalRatings > 0 && (
                        <span className="text-xs ml-2 bg-warning/10 text-warning px-2 py-1 rounded-full">
                            ★ {Number(barrier.averageRating).toFixed(1)}
                        </span>
                    )}
                    </>}
                subtitle={`Per: ${barrier.title}`} backUrl={`/app/barriers/${barrierId}`}
            />
            <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Cerca per autore o commento..."
                         isLoading={isLoadingFilters} resultsCount={totalCount} resultsLabel="recensioni"/>

            {!isLoadingFilters && items.length === 0 ? (
                <EmptyState icon={CheckCircle} title="Nessuna recensione trovata." actionLabel="Azzera ricerca"
                            onAction={() => updateFilters("")}/>
            ) : (
                <div className="space-y-4">
                    {items.map((f: any) => <FeedbackCard key={f.id}
                                                         userFullName={`${f.user.firstName} ${f.user.lastName || ""}`}
                                                         rating={f.rating} comment={f.comment} createdAt={f.createdAt}
                                                         isOwn={f.user.id === profile?.id}/>)}
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