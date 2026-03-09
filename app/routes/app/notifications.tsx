import type {ActionFunctionArgs, LoaderFunctionArgs} from "react-router";
import {useFetcher, useLoaderData, useNavigate} from "react-router";
import {
    AlertTriangle,
    Bell,
    BellRing,
    CheckCheck,
    CheckCircle,
    EyeOff,
    Info,
    Loader2,
    MessageSquare,
    ShieldCheck,
    Trash2
} from "lucide-react";
import {prisma} from "../../db.server";
import {useAuth} from "../../context/AuthContext";
import {useInfiniteList} from "../../hooks/useInfiniteList";
import PageWrapper from "../../components/ui/PageWrapper";
import EmptyState from "../../components/ui/EmptyState";
import PageHeader from "../../components/ui/PageHeader";
import {formatDate} from "../../utils/format";

export async function loader({request}: LoaderFunctionArgs) {
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");

    if (!userId) return {notifications: [], totalCount: 0, totalPages: 0, page: 1, userId: null};

    const pageParam = url.searchParams.get("page");
    const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);
    const PAGE_SIZE = 15;
    const skip = (page - 1) * PAGE_SIZE;

    const [notifications, totalCount] = await Promise.all([
        prisma.notification.findMany({
            where: {userId},
            orderBy: {createdAt: 'desc'},
            skip, take: PAGE_SIZE,
            include: {barrier: {select: {id: true, title: true}}}
        }),
        prisma.notification.count({where: {userId}})
    ]);

    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
    return {notifications, totalCount, totalPages, page, userId};
}

export async function action({request}: ActionFunctionArgs) {
    const formData = await request.formData();
    const intent = formData.get("intent");
    const userId = formData.get("userId") as string;
    const notificationId = formData.get("notificationId") as string;

    try {
        if (intent === "MARK_ALL_READ" && userId) {
            await prisma.notification.updateMany({where: {userId, isRead: false}, data: {isRead: true}});
        } else if (intent === "MARK_READ" && notificationId) {
            await prisma.notification.update({where: {id: notificationId}, data: {isRead: true}});
        } else if (intent === "DELETE" && notificationId) {
            await prisma.notification.delete({where: {id: notificationId}});
        }
        return {success: true};
    } catch {
        return {error: "Errore."};
    }
}

const getIconInfo = (type: string) => {
    switch (type) {
        case 'NEW_FEEDBACK':
            return {icon: MessageSquare, color: "text-primary", bg: "bg-primary/10"};
        case 'BARRIER_RESOLVED':
            return {icon: CheckCircle, color: "text-success", bg: "bg-success/10"};
        case 'BARRIER_HIDDEN':
            return {icon: EyeOff, color: "text-error", bg: "bg-error/10"};
        case 'RESOLUTION_APPROVED':
            return {icon: CheckCircle, color: "text-success", bg: "bg-success/10"};
        case 'RESOLUTION_REJECTED':
            return {icon: AlertTriangle, color: "text-error", bg: "bg-error/10"};
        case 'REPORT_REVIEWED':
            return {icon: ShieldCheck, color: "text-success", bg: "bg-success/10"};
        case 'REPORT_DISMISSED':
            return {icon: AlertTriangle, color: "text-warning", bg: "bg-warning/10"};
        case 'SYSTEM_ALERT':
            return {icon: Info, color: "text-primary", bg: "bg-primary/10"};
        default:
            return {icon: BellRing, color: "text-text-muted", bg: "bg-surface"};
    }
};

export default function NotificationsPage() {
    const {notifications, totalPages, page, userId} = useLoaderData<typeof loader>();
    const {profile} = useAuth();
    const fetcher = useFetcher();
    const navigate = useNavigate();

    const {items, activePage, loadMoreRef} = useInfiniteList({
        initialItems: notifications,
        initialPage: page,
        totalPages,
        fetchUrl: "/app/notifications",
        dataKey: "notifications",
        extraFetchParams: userId ? {userId} : undefined
    });

    const handleNotificationClick = (notif: any) => {
        if (!notif.isRead) fetcher.submit({intent: "MARK_READ", notificationId: notif.id}, {method: "post"});
        if (notif.barrierId) navigate(`/app/barriers/${notif.barrierId}`);
    };

    const hasUnread = items.some((n: any) => !n.isRead);

    if (profile?.id !== userId) {
        return <PageWrapper><EmptyState icon={EyeOff} title="Accesso Negato"/></PageWrapper>;
    }

    return (
        <PageWrapper>
            <PageHeader title="Centro Notifiche" backUrl="/app/profile"/>

            {hasUnread && (
                <div className="flex justify-end">
                    <button
                        onClick={() => fetcher.submit({intent: "MARK_ALL_READ", userId: profile.id}, {method: "post"})}
                        className="flex items-center gap-1.5 text-sm font-bold text-primary hover:text-primary/80 transition-colors bg-primary/10 px-4 py-2 rounded-xl active:scale-95">
                        <CheckCheck className="w-4 h-4"/> Segna tutte come lette
                    </button>
                </div>
            )}

            {items.length === 0 ? (
                <EmptyState icon={Bell} title="Nessuna notifica." description="Non hai ancora ricevuto avvisi."/>
            ) : (
                <div className="flex flex-col gap-3 w-full">
                    {items.map((notif: any) => {
                        const {icon: Icon, color, bg} = getIconInfo(notif.type);

                        return (
                            /* Aggiunto w-full e text-left qui sotto */
                            <button key={notif.id} onClick={() => handleNotificationClick(notif)}
                                    className={`w-full text-left relative p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer group flex items-start gap-4 ${notif.isRead ? "bg-surface border-border opacity-75 hover:opacity-100" : "bg-background border-primary/30 shadow-md ring-1 ring-primary/10"}`}>

                                {!notif.isRead && <div
                                    className="absolute top-4 right-4 w-2.5 h-2.5 bg-primary rounded-full animate-pulse"/>}

                                <div className={`p-3 rounded-full shrink-0 ${bg} ${color}`}>
                                    <Icon className="w-5 h-5 sm:w-6 sm:h-6"/>
                                </div>

                                <div className="flex-1 min-w-0 pr-6">
                                    <h4 className={`text-sm sm:text-base mb-1 ${notif.isRead ? "font-semibold text-text" : "font-extrabold text-primary"}`}>
                                        {notif.title}
                                    </h4>
                                    <p className="text-xs sm:text-sm text-text-muted leading-relaxed line-clamp-2">
                                        {notif.body}
                                    </p>
                                    <span
                                        className="block mt-2 text-[10px] sm:text-xs font-medium text-text-muted/70 uppercase tracking-wider">
                                        {formatDate(notif.createdAt)}
                                    </span>
                                </div>

                                {/* Tasto elimina */}
                                <button onClick={(e) => {
                                    e.stopPropagation();
                                    fetcher.submit({intent: "DELETE", notificationId: notif.id}, {method: "post"});
                                }}
                                        className="absolute bottom-3 right-3 p-2 bg-surface border border-border text-error opacity-0 group-hover:opacity-100 hover:bg-error/10 hover:border-error/20 rounded-full transition-all active:scale-90">
                                    <Trash2 className="w-4 h-4"/>
                                </button>
                            </button>
                        );
                    })}
                </div>
            )}

            {activePage < totalPages && <div ref={loadMoreRef} className="flex justify-center py-6"><Loader2
                className="w-8 h-8 animate-spin text-primary"/></div>}
        </PageWrapper>
    );
}