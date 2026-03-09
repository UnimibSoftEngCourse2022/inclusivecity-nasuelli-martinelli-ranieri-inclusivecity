import React, {useState} from "react";
import {Star} from "lucide-react";
import {Link} from "react-router";
import StarRating from "../barrier/StarRating";
import FeedbackCard from "./FeedbackCard";

export default function FeedbacksCard({barrier, profile, fetcher}: Readonly<{
    barrier: any,
    profile: any,
    fetcher: any
}>) {
    const [rating, setRating] = useState<number>(0);
    const canInteract = barrier.state !== "RESOLVED" && barrier.state !== "HIDDEN";
    const hasMyFeedback = barrier.feedbacks.some((f: any) => f.userId === profile?.id);
    const showFeedbackForm = profile?.id !== barrier.userId && !hasMyFeedback && canInteract;

    const myFeedbackObj = profile ? barrier.feedbacks.find((f: any) => f.userId === profile.id) : undefined;
    const topFeedbacks = (myFeedbackObj ? [myFeedbackObj, ...barrier.feedbacks.filter((f: any) => f.userId !== profile?.id)] : barrier.feedbacks).slice(0, 3);

    return (
        <div className="bg-surface p-5 sm:p-6 rounded-3xl border border-border shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-border pb-3">
                <h3 className="text-base sm:text-lg font-bold text-text flex items-center gap-2"><Star
                    className="w-5 h-5 text-warning"/> Affidabilità</h3>
                {barrier.totalRatings > 0 && (
                    <span className="text-sm font-bold bg-warning/10 text-warning px-3 py-1 rounded-full">
                        {Number(barrier.averageRating).toFixed(1)} / 5
                    </span>
                )}
            </div>

            {showFeedbackForm && profile && (
                <fetcher.Form method="post"
                              className="flex flex-col gap-3 bg-background p-4 rounded-2xl border border-border mb-4">
                    <div className="flex flex-col mb-1">
                        <h4 className="text-sm font-bold text-text mb-0.5"> Valuta segnalazione </h4>
                        <p className="text-xs text-text-muted">Il tuo voto aiuterà la community.</p>
                    </div>

                    <StarRating rating={rating} onChange={setRating} disabled={fetcher.state !== "idle"}/>

                    <textarea name="comment" rows={2} placeholder="Commento opzionale..."
                              className="w-full bg-surface border border-border px-3 py-2 rounded-xl outline-none focus:ring-2 focus:ring-primary resize-none text-xs transition-shadow"/>

                    <div className="flex justify-end">
                        <button type="submit" disabled={fetcher.state !== "idle" || rating === 0}
                                className="bg-primary text-white px-5 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-primary/90 disabled:opacity-50 transition-all active:scale-95">Invia
                        </button>
                    </div>

                    <input type="hidden" name="intent" value="feedback"/>
                    <input type="hidden" name="userId" value={profile.id}/>
                    <input type="hidden" name="rating" value={rating}/>
                </fetcher.Form>
            )}

            {barrier.feedbacks.length > 0 ? (
                <div className="space-y-3">
                    {topFeedbacks.map((f: any) => <FeedbackCard key={f.id}
                                                                userFullName={`${f.user.firstName} ${f.user.lastName || ""}`}
                                                                rating={f.rating}
                                                                comment={f.comment}
                                                                createdAt={f.createdAt}
                                                                isOwn={f.user.id === profile?.id}
                                                                compact={true}/>
                    )}
                </div>
            ) : <p className="text-sm text-text-muted">Nessuna valutazione presente.</p>}

            {barrier.feedbacks.length > 3 && (
                <Link to={`/app/barriers/${barrier.id}/feedbacks`}
                      className="block text-center text-sm font-bold text-primary hover:underline py-2.5 border border-primary/20 rounded-xl bg-primary/5 transition-colors">
                    Vedi tutte le {barrier.feedbacks.length} valutazioni
                </Link>
            )}
        </div>
    );
}
