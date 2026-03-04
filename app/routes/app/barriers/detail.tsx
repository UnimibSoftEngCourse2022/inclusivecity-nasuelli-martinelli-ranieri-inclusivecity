import type {ActionFunctionArgs, LoaderFunctionArgs} from "react-router";
import {Link, redirect, useFetcher, useLoaderData, useNavigate, useSubmit} from "react-router";
import {prisma} from "~/db.server";
import {BarrierState, ReportReason, Role} from "@prisma/client";
import {useAuth} from "~/context/AuthContext";
import {useState} from "react";
import {AlertTriangle, ArrowLeft, Camera, CheckCircle, Edit, MapPin, Star, Trash2} from "lucide-react";
import {getDynamicIcon} from "~/utils/icons";
import StarRating from "~/components/barrier/StarRating";
import PhotoGallery from "~/components/barrier/PhotoGallery";
import ResolutionCard from "~/components/moderation/ResolutionCard";
import FeedbackCard from "~/components/moderation/FeedbackCard";
import {formatDate} from "~/utils/format";

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

            await prisma.barrier.delete({where: {id: barrierId}});
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
                await prisma.user.update({
                    where: {id: userId},
                    data: {reputationScore: {increment: 1}}
                });
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
    const navigate = useNavigate();
    const {profile} = useAuth();
    const fetcher = useFetcher<typeof action>();
    const submit = useSubmit();

    const [rating, setRating] = useState<number>(0);

    const isAdmin = profile?.role === Role.ADMIN;
    const isOwner = profile?.id === barrier.userId;
    const canEdit = isOwner || isAdmin;
    const isResolved = barrier.state === BarrierState.RESOLVED;

    const hasMyFeedback = barrier.feedbacks.some(f => f.userId === profile?.id);
    const showFeedbackForm = !isOwner && !hasMyFeedback;

    const hasProposedResolution = profile ? barrier.resolutions.some(r => r.userId === profile.id) : false;

    function handleDelete() {
        if (!canEdit) return;
        const ok = globalThis.confirm("Sei sicuro di voler eliminare definitivamente questa barriera? L'azione è irreversibile.");
        if (!ok) return;

        submit({intent: "delete", userId: profile.id}, {method: "post"});
    }

    const IconComponent = getDynamicIcon(barrier.type?.iconKey);

    return (
        <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6 pb-20 animate-in fade-in duration-300">

            <div className="flex items-center gap-4">
                <button onClick={() => navigate(-1)}
                        className="p-3 bg-surface border border-border rounded-full hover:bg-background transition-colors shadow-sm">
                    <ArrowLeft className="w-5 h-5 text-text"/>
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-text">{barrier.title}</h1>
                    <p className="text-sm text-text-muted mt-1 flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 shrink-0"/>
                        {barrier.address || "Indirizzo non specificato"}
                    </p>
                </div>
            </div>

            {fetcher.data?.error &&
                <div className="p-4 bg-error/10 text-error rounded-xl text-sm font-medium">{fetcher.data.error}</div>}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1 space-y-4">
                    <div className="relative w-full">
                        <PhotoGallery photos={barrier.photoUrls} altText={barrier.title}/>
                        <div className="absolute top-4 left-4 pointer-events-none">
                            <span
                                className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase border shadow-md backdrop-blur-md ${barrier.state === 'ACTIVE' ? 'bg-error/90 text-white border-error/20' : ''} ${barrier.state === 'RESOLVED' ? 'bg-success/90 text-white border-success/20' : ''} ${barrier.state === 'IN_REVIEW' ? 'bg-warning/90 text-white border-warning/20' : ''} ${barrier.state === 'HIDDEN' ? 'bg-surface/90 text-text border-border' : ''}`}>
                                {barrier.state}
                            </span>
                        </div>
                    </div>

                    <div className="bg-surface p-5 rounded-3xl border border-border shadow-sm text-sm">
                        <div className="flex justify-between mb-2 pb-2 border-b border-border/50"><span
                            className="text-text-muted">Segnalato da</span><span
                            className="font-bold">{barrier.creator?.firstName}</span></div>
                        <div className="flex justify-between"><span className="text-text-muted">In data</span><span
                            className="font-bold">{formatDate(barrier.createdAt)}</span></div>
                    </div>

                    {!isResolved && !hasProposedResolution && (
                        <Link to={`/app/barriers/${barrier.id}/resolve`}
                              className="w-full flex items-center justify-center gap-2 bg-success text-white py-3.5 rounded-2xl font-bold shadow-md hover:bg-success/90 transition active:scale-95">
                            <Camera className="w-5 h-5"/> Proponi Risoluzione
                        </Link>
                    )}

                    {!isResolved && hasProposedResolution && (
                        <div
                            className="w-full flex items-center justify-center gap-2 bg-success/10 text-success border border-success/20 py-3.5 rounded-2xl font-bold shadow-sm">
                            <CheckCircle className="w-5 h-5"/> Risoluzione Inviata
                        </div>
                    )}
                </div>

                <div className="md:col-span-2 space-y-6">
                    <div className="bg-surface p-6 rounded-3xl border border-border shadow-sm space-y-6">
                        <div className="flex flex-wrap gap-3">
                            <div
                                className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-xl border border-primary/20">
                                <IconComponent className="w-5 h-5"/><span
                                className="text-sm font-bold">{barrier.type?.label}</span>
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

                    {/* SEZIONE RISOLUZIONI PROPOSTE */}
                    {barrier.resolutions.length > 0 && (
                        <div className="bg-surface p-6 rounded-3xl border border-border shadow-sm space-y-5">
                            <h3 className="text-lg font-bold text-text flex items-center gap-2 border-b border-border pb-3">
                                <Camera className="w-5 h-5 text-success"/> Prove di Risoluzione
                            </h3>

                            <div className="space-y-4">
                                {barrier.resolutions.slice(0, 5).map(res => (
                                    <ResolutionCard
                                        key={res.id}
                                        userFullName={`${res.user.firstName} ${res.user.lastName || ""}`}
                                        status={res.status}
                                        evidenceUrl={res.evidenceUrl}
                                        comment={res.comment}
                                        createdAt={res.createdAt}
                                        isOwn={res.user.id === profile?.id}
                                    />
                                ))}
                            </div>
                            {barrier.resolutions.length > 5 && (
                                <Link to={`/app/barriers/${barrier.id}/resolutions`}
                                      className="block text-center text-sm font-bold text-primary hover:underline mt-4 py-2 border border-primary/20 rounded-xl bg-primary/5 transition-colors">
                                    Vedi tutte le {barrier.resolutions.length} prove
                                </Link>
                            )}
                        </div>
                    )}

                    <div className="bg-surface p-6 rounded-3xl border border-border shadow-sm space-y-5">
                        <div className="flex justify-between items-center border-b border-border pb-3">
                            <h3 className="text-lg font-bold text-text flex items-center gap-2"><Star
                                className="w-5 h-5 text-warning"/> Affidabilità</h3>
                            {barrier.totalRatings > 0 && <span
                                className="text-sm font-bold bg-warning/10 text-warning px-3 py-1 rounded-full">{Number(barrier.averageRating).toFixed(1)} / 5</span>}
                        </div>

                        {showFeedbackForm && profile && (
                            <fetcher.Form method="post"
                                          className="space-y-4 bg-background p-5 rounded-2xl border border-border">
                                <input type="hidden" name="intent" value="feedback"/>
                                <input type="hidden" name="userId" value={profile.id}/>
                                <input type="hidden" name="rating" value={rating}/>

                                <div className="flex flex-col items-center sm:items-start">
                                    <label className="block text-sm font-bold text-text mb-2">
                                        Quanto è accurata questa segnalazione?
                                        <StarRating rating={rating} onChange={setRating}
                                                    disabled={fetcher.state !== "idle"}/>
                                    </label>
                                </div>

                                <textarea name="comment" rows={3} placeholder="Aggiungi dettagli (opzionale)..."
                                          className="w-full bg-surface border border-border px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-primary resize-none mt-2 text-sm"/>

                                <button type="submit" disabled={fetcher.state !== "idle" || rating === 0}
                                        className="w-full sm:w-auto bg-primary text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-primary/90 disabled:opacity-50 transition-opacity">
                                    {fetcher.state === "idle" ? "Pubblica Valutazione" : "Invio in corso..."}
                                </button>
                            </fetcher.Form>
                        )}

                        {barrier.feedbacks.length > 0 ? (
                            <div className="space-y-4">
                                {barrier.feedbacks.slice(0, 5).map(f => (
                                    <FeedbackCard
                                        key={f.id}
                                        userFullName={`${f.user.firstName} ${f.user.lastName || ""}`}
                                        rating={f.rating}
                                        comment={f.comment}
                                        createdAt={f.createdAt}
                                        isOwn={f.user.id === profile?.id}
                                    />
                                ))}
                            </div>
                        ) : <p className="text-sm text-text-muted">Nessuna valutazione presente. Verifica tu questa
                            barriera!</p>}

                        {barrier.feedbacks.length > 5 && (
                            <Link to={`/app/barriers/${barrier.id}/feedbacks`}
                                  className="block text-center text-sm font-bold text-primary hover:underline mt-4 py-2 border border-primary/20 rounded-xl bg-primary/5 transition-colors">
                                Vedi tutte le {barrier.feedbacks.length} valutazioni
                            </Link>
                        )}
                    </div>

                    {profile && !isOwner && (
                        <details
                            className="group bg-surface rounded-3xl border border-border shadow-sm overflow-hidden">
                            <summary
                                className="cursor-pointer p-4 flex items-center justify-between font-bold text-error/80 hover:bg-error/5 transition-colors list-none">
                                <span className="flex items-center gap-2"><AlertTriangle className="w-5 h-5"/> Segnala un problema (Admin)</span>
                            </summary>
                            <div className="p-6 border-t border-border bg-background">
                                {fetcher.data?.reported ? (
                                    <div className="text-success font-medium text-sm text-center">Segnalazione inviata!
                                        I moderatori controlleranno presto.</div>
                                ) : (
                                    <fetcher.Form method="post" className="space-y-4">
                                        <input type="hidden" name="intent" value="report"/>
                                        <input type="hidden" name="userId" value={profile.id}/>

                                        <p className="text-sm text-text-muted">Se ritieni che questa segnalazione violi
                                            le regole o contenga errori gravi, avvisa i moderatori.</p>
                                        <select name="reason" required
                                                className="w-full bg-surface border border-border px-3 py-2 rounded-xl outline-none focus:ring-2 focus:ring-error text-sm">
                                            <option value="DOES_NOT_EXIST">L'ostacolo non esiste più</option>
                                            <option value="DUPLICATE">È un duplicato di un'altra barriera</option>
                                            <option value="WRONG_LOCATION">La posizione sulla mappa è palesemente
                                                errata
                                            </option>
                                            <option value="INAPPROPRIATE">Contenuto offensivo o spam</option>
                                            <option value="OTHER">Altro</option>
                                        </select>
                                        <button type="submit" disabled={fetcher.state !== "idle"}
                                                className="w-full bg-error text-white py-3 rounded-xl font-bold shadow hover:bg-error/90 disabled:opacity-50 transition-opacity">
                                            {fetcher.state === "idle" ? "Invia Segnalazione" : "Invio in corso..."}
                                        </button>
                                    </fetcher.Form>
                                )}
                            </div>
                        </details>
                    )}

                    {canEdit && (
                        <div className="bg-surface p-6 rounded-3xl border border-border shadow-sm space-y-4">
                            <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Gestione
                                Segnalazione</h3>
                            <div className="flex flex-col gap-3">
                                <Link to={`/app/barriers/${barrier.id}/edit`}
                                      className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 transition-all active:scale-95">
                                    <Edit className="w-5 h-5"/> Modifica Barriera
                                </Link>

                                <button onClick={handleDelete}
                                        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm bg-error/10 text-error hover:bg-error/20 border border-error/20 transition-all active:scale-95 disabled:opacity-50">
                                    <Trash2 className="w-5 h-5"/> Elimina Barriera
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}