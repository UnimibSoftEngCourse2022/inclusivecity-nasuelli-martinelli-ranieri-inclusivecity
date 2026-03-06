import type {ActionFunctionArgs, LoaderFunctionArgs} from "react-router";
import {Link, useFetcher, useLoaderData, useLocation} from "react-router";
import {AlertTriangle, CheckCircle, EyeOff, Flag, Loader2, ShieldCheck, Undo2} from "lucide-react";
import {prisma} from "~/db.server";
import {useAuth} from "~/context/AuthContext";
import {formatDate} from "~/utils/format";
import PageWrapper from "~/components/ui/PageWrapper";
import PageHeader from "~/components/ui/PageHeader";
import EmptyState from "~/components/ui/EmptyState";
import {REPORT_REASONS} from "~/utils/reportReason";

export async function loader({request}: LoaderFunctionArgs) {
    const barriersWithReports = await prisma.barrier.findMany({
        where: {reports: {some: {status: "PENDING"}}},
        include: {
            creator: {select: {firstName: true, lastName: true}},
            reports: {
                where: {status: "PENDING"},
                include: {user: {select: {firstName: true, lastName: true}}}
            }
        },
        orderBy: {reports: {_count: "desc"}}
    });

    return {barriers: barriersWithReports};
}

export async function action({request}: ActionFunctionArgs) {
    const formData = await request.formData();
    const barrierId = formData.get("barrierId") as string;
    const intent = formData.get("intent") as "HIDE_BARRIER" | "DISMISS_REPORTS";

    if (!barrierId || !intent) return {error: "Dati mancanti."};

    try {
        if (intent === "HIDE_BARRIER") {
            await prisma.barrier.update({where: {id: barrierId}, data: {state: "HIDDEN"}});
        } else if (intent === "DISMISS_REPORTS") {
            await prisma.report.updateMany({where: {barrierId, status: "PENDING"}, data: {status: "DISMISSED"}});
            await prisma.barrier.update({where: {id: barrierId}, data: {state: "ACTIVE"}});
        }
        return {success: true};
    } catch {
        return {error: "Impossibile processare i report."};
    }
}

export default function AdminReportsPage() {
    const {barriers} = useLoaderData<typeof loader>();
    const {profile} = useAuth();
    const fetcher = useFetcher();
    const location = useLocation();

    if (profile?.role !== "ADMIN") {
        return <div className="p-8 text-center text-error font-semibold mt-20">Accesso negato.</div>;
    }

    return (
        <PageWrapper>
            {/* HEADER E TABS ADMIN */}
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
                        <Flag className="w-4 h-4"/> Segnalazioni ({barriers.length})
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

            {barriers.length === 0 ? (
                <EmptyState icon={Flag} title="Nessun report in sospeso."
                            description="La community si sta comportando bene!"/>
            ) : (
                <div className="space-y-6">
                    {barriers.map((barrier) => (
                        <div key={barrier.id}
                             className="bg-surface border-2 border-error/10 rounded-2xl p-5 shadow-sm space-y-5">
                            <div className="flex justify-between items-start gap-4 border-b border-border pb-4">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-3 mb-1">
                                        <Link to={`/app/barriers/${barrier.id}`}
                                              className="font-bold text-lg text-text hover:text-primary transition-colors truncate">
                                            {barrier.title}
                                        </Link>
                                        <span
                                            className="shrink-0 bg-error/10 text-error text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border border-error/20">
                                            {barrier.reports.length} Report
                                        </span>
                                    </div>
                                    <p className="text-xs text-text-muted truncate">
                                        Creata da: {barrier.creator?.firstName}
                                    </p>
                                </div>
                            </div>

                            {/* LISTA REPORT */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider">
                                    Dettaglio Segnalazioni
                                </h4>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {barrier.reports.map((report) => (
                                        <div key={report.id}
                                             className="bg-background p-3 rounded-xl border border-border/50 flex items-center gap-3">
                                            <AlertTriangle className="w-4 h-4 text-warning shrink-0"/>
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-text truncate">{REPORT_REASONS[report.reason] || report.reason}</p>
                                                <p className="text-xs text-text-muted truncate">Da: {report.user.firstName} • {formatDate(report.createdAt)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* AZIONI ADMIN */}
                            <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                <fetcher.Form method="post" className="flex-1">
                                    <input type="hidden" name="barrierId" value={barrier.id}/>
                                    <button type="submit" name="intent" value="DISMISS_REPORTS"
                                            disabled={fetcher.state !== "idle"}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-surface border-2 border-border hover:bg-background text-text rounded-xl font-bold transition-colors disabled:opacity-50">
                                        <Undo2 className="w-5 h-5"/> Ignora Report
                                    </button>
                                </fetcher.Form>

                                <fetcher.Form method="post" className="flex-1">
                                    <input type="hidden" name="barrierId" value={barrier.id}/>
                                    <button type="submit" name="intent" value="HIDE_BARRIER"
                                            disabled={fetcher.state !== "idle"}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-error text-white hover:bg-error/90 shadow-md rounded-xl font-bold transition-colors disabled:opacity-50">
                                        {fetcher.state === "submitting" ?
                                            <Loader2 className="w-5 h-5 animate-spin"/> :
                                            <EyeOff className="w-5 h-5"/>} Nascondi Barriera
                                    </button>
                                </fetcher.Form>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </PageWrapper>
    );
}