import {
    type ActionFunctionArgs,
    Link,
    type LoaderFunctionArgs,
    redirect,
    useFetcher,
    useLoaderData,
    useNavigate,
    useSubmit
} from "react-router";
import {prisma} from "~/db.server";
import type {ReportReason} from "@prisma/client";
import {useAuth} from "~/context/AuthContext";
import {ArrowLeft, Edit, MapPin, Trash2} from "lucide-react";
import {getDynamicIcon} from "~/utils/icons";
import PhotoGallery from "~/components/barrier/PhotoGallery";
import {formatDate} from "~/utils/format";
import ResolutionsCard from "~/components/moderation/ResolutionsCard";
import FeedbacksCard from "~/components/moderation/FeedbacksCard";
import AdminReportsCard from "~/components/moderation/AdminReportsCard";
import UserReportFormCard from "~/components/moderation/UserReportFormCard";
import {deletePhotosFromStorage} from "~/utils/storage";

const REPORT_REASONS: Record<string, string> = {
    DOES_NOT_EXIST: "L'ostacolo non esiste più",
    DUPLICATE: "Duplicato",
    WRONG_LOCATION: "Posizione errata",
    INAPPROPRIATE: "Contenuto offensivo o spam",
    OTHER: "Altro"
};

export async function loader({params}: LoaderFunctionArgs) {
    const {id} = params;
    if (!id) throw new Response("ID mancante", {status: 400});

    const barrier = await prisma.barrier.findUnique({
        where: {id},
        include: {
            type: {select: {id: true, label: true, iconKey: true, colorHex: true}},
            creator: {select: {id: true, firstName: true, lastName: true, role: true}},
            feedbacks: {
                orderBy: {createdAt: 'desc'},
                include: {user: {select: {id: true, firstName: true, lastName: true}}}
            },
            resolutions: {
                orderBy: {createdAt: 'desc'},
                include: {user: {select: {id: true, firstName: true, lastName: true}}}
            },
            reports: {
                where: {status: 'PENDING'},
                orderBy: {createdAt: 'desc'},
                include: {user: {select: {id: true, firstName: true, lastName: true}}}
            }
        }
    });

    if (!barrier) throw new Response("Barriera non trovata", {status: 404});
    return {barrier};
}

export async function action({request, params}: ActionFunctionArgs) {
    const formData = await request.formData();
    const intent = formData.get("intent");
    const userId = formData.get("userId") as string;
    const {id: barrierId} = params;

    if (!userId || !barrierId) return {error: "Dati mancanti"};

    try {
        if (intent === "delete") {
            const existingBarrier = await prisma.barrier.findUnique({where: {id: barrierId}});
            const user = await prisma.user.findUnique({where: {id: userId}});

            if (!existingBarrier || !user || (existingBarrier.userId !== user.id && user.role !== "ADMIN")) {
                return {error: "Non sei autorizzato a eliminare questa barriera."};
            }

            if (existingBarrier.state === "RESOLVED" || existingBarrier.state === "HIDDEN") {
                return {error: "Non puoi eliminare una barriera che è già stata risolta o nascosta."};
            }

            await prisma.barrier.delete({where: {id: barrierId}});

            if (existingBarrier.photoUrls && existingBarrier.photoUrls.length > 0) {
                await deletePhotosFromStorage("barrier-photos", existingBarrier.photoUrls);
            }

            return redirect("/app/barriers");
        }

        if (intent === "feedback") {
            const rating = Number(formData.get("rating"));
            const comment = formData.get("comment") as string;

            const existingFeedback = await prisma.feedback.findUnique({
                where: {userId_barrierId: {userId, barrierId}}
            });

            await prisma.feedback.upsert({
                where: {userId_barrierId: {userId, barrierId}},
                update: {rating, comment},
                create: {id: crypto.randomUUID(), userId, barrierId, rating, comment: comment || null}
            });

            if (!existingFeedback) {
                await prisma.user.update({where: {id: userId}, data: {reputationScore: {increment: 1}}});
            }

            return {success: true};
        }

        if (intent === "report") {
            const reason = formData.get("reason") as ReportReason;
            await prisma.report.upsert({
                where: {userId_barrierId: {userId, barrierId}},
                update: {reason, status: 'PENDING'},
                create: {id: crypto.randomUUID(), userId, barrierId, reason, status: 'PENDING'}
            });
            return {success: true, reported: true};
        }
    } catch (error: any) {
        return {error: error.message || "Errore durante l'operazione."};
    }
    return null;
}

export default function BarrierDetailPage() {
    const {barrier} = useLoaderData<typeof loader>();
    const {profile} = useAuth();
    const fetcher = useFetcher<typeof action>();
    const submit = useSubmit();
    const navigate = useNavigate();

    const isAdmin = profile?.role === "ADMIN";
    const isOwner = profile?.id === barrier.userId;

    const isEditableState = barrier.state === 'ACTIVE' || barrier.state === 'IN_REVIEW';
    const canEdit = (isOwner || isAdmin) && isEditableState;

    function handleDelete() {
        if (!canEdit) return;
        if (globalThis.confirm("Sei sicuro di voler eliminare definitivamente questa barriera? L'azione è irreversibile.")) {
            submit({intent: "delete", userId: profile.id}, {method: "post"});
        }
    }

    const IconComponent = getDynamicIcon(barrier.type?.iconKey);

    return (
        <div className="w-full p-4 md:p-6 max-w-4xl mx-auto space-y-6 pb-20 animate-in fade-in duration-300">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate(-1)}
                        className="p-3 bg-surface border border-border rounded-full hover:bg-background transition-colors shadow-sm shrink-0">
                    <ArrowLeft className="w-5 h-5 text-text"/>
                </button>
                <div className="min-w-0">
                    <h1 className="text-2xl font-bold text-text truncate">{barrier.title}</h1>
                    <p className="text-sm text-text-muted mt-1 flex items-center gap-1.5 truncate">
                        <MapPin className="w-4 h-4 shrink-0"/>
                        <span className="truncate">{barrier.address || "Indirizzo non specificato"}</span>
                    </p>
                </div>
            </div>

            {fetcher.data?.error && (
                <div className="p-4 bg-error/10 text-error rounded-xl text-sm font-medium">
                    {fetcher.data.error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1 flex flex-col gap-4">
                    <div className="relative w-full">
                        <PhotoGallery photos={barrier.photoUrls} altText={barrier.title}/>
                        <div className="absolute top-4 left-4 pointer-events-none">
                    <span
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase border shadow-md backdrop-blur-md 
                        ${barrier.state === 'ACTIVE' ? 'bg-error/90 text-white border-error/20' : ''} 
                        ${barrier.state === 'RESOLVED' ? 'bg-success/90 text-white border-success/20' : ''} 
                        ${barrier.state === 'IN_REVIEW' ? 'bg-warning/90 text-white border-warning/20' : ''} 
                        ${barrier.state === 'HIDDEN' ? 'bg-surface/90 text-text border-border' : ''}`}>
                        {barrier.state}
                    </span>
                        </div>
                    </div>

                    <div className="bg-surface p-5 rounded-3xl border border-border shadow-sm text-sm">
                        <div className="flex justify-between mb-2 pb-2 border-b border-border/50">
                            <span className="text-text-muted">Segnalato da</span>
                            <span className="font-bold">{barrier.creator?.firstName}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-text-muted">In data</span>
                            <span className="font-bold">{formatDate(barrier.createdAt)}</span>
                        </div>
                    </div>

                    {canEdit && (
                        <div className="bg-surface p-4 rounded-3xl border border-border shadow-sm flex flex-col gap-2">
                            <Link to={`/app/barriers/${barrier.id}/edit`}
                                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 transition-all active:scale-95">
                                <Edit className="w-4 h-4"/> Modifica
                            </Link>
                            <button onClick={handleDelete}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm bg-error/10 text-error hover:bg-error/20 border border-error/20 transition-all active:scale-95 disabled:opacity-50">
                                <Trash2 className="w-4 h-4"/> Elimina
                            </button>
                        </div>
                    )}
                </div>

                <div className="md:col-span-2 flex flex-col gap-6">
                    <div className="bg-surface p-6 rounded-3xl border border-border shadow-sm space-y-6">
                        <div className="flex flex-wrap gap-3">
                            <div
                                className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-xl border border-primary/20">
                                <IconComponent className="w-5 h-5"/>
                                <span className="text-sm font-bold">{barrier.type?.label}</span>
                            </div>
                            <div
                                className="flex items-center gap-2 bg-error/10 text-error px-4 py-2 rounded-xl border border-error/20">
                                <span className="text-sm font-bold uppercase">Livello {barrier.difficulty}</span>
                            </div>
                        </div>
                        <div>
                            <h3 className="text-xs font-bold text-text-muted uppercase mb-2">Descrizione</h3>
                            <p className="text-text leading-relaxed">{barrier.description}</p>
                        </div>
                    </div>

                    <ResolutionsCard barrier={barrier} profile={profile} isAdmin={isAdmin}/>

                    <FeedbacksCard barrier={barrier} profile={profile} fetcher={fetcher}/>

                    {isAdmin && barrier.reports.length > 0 && (
                        <AdminReportsCard barrier={barrier}/>
                    )}

                    <UserReportFormCard barrier={barrier} profile={profile} fetcher={fetcher}/>
                </div>
            </div>
        </div>
    );
}