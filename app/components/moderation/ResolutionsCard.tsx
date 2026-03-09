import {Link} from "react-router";
import {Camera, CheckCircle} from "lucide-react";
import ResolutionCard from "./ResolutionCard";

export default function ResolutionsCard({barrier, profile, isAdmin}: Readonly<{
    barrier: any,
    profile: any,
    isAdmin: boolean
}>) {
    const canInteract = barrier.state !== "RESOLVED" && barrier.state !== "HIDDEN";
    const hasProposedResolution = profile ? barrier.resolutions.some((r: any) => r.userId === profile.id) : false;
    const myResolution = profile ? barrier.resolutions.find((r: any) => r.userId === profile.id) : undefined;
    const topResolutions = (myResolution ? [myResolution, ...barrier.resolutions.filter((r: any) => r.userId !== profile?.id)] : barrier.resolutions).slice(0, 3);

    return (
        <div className="bg-surface p-5 sm:p-6 rounded-3xl border border-border shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-border pb-3">
                <h3 className="text-base sm:text-lg font-bold text-text flex items-center gap-2">
                    <Camera className="w-5 h-5 text-success"/> Prove di Risoluzione
                </h3>
                {barrier.resolutions.length > 0 && <span
                    className="bg-success/10 text-success text-xs font-bold px-2 py-1 rounded-md border border-success/20">{barrier.resolutions.length}</span>}
            </div>

            {barrier.resolutions.length > 0 ? (
                <div className="space-y-3">
                    {topResolutions.map((res: any) => <ResolutionCard key={res.id}
                                                                      userFullName={`${res.user.firstName} ${res.user.lastName || ""}`}
                                                                      status={res.status}
                                                                      evidenceUrl={res.evidenceUrl}
                                                                      comment={res.comment}
                                                                      createdAt={res.createdAt}
                                                                      isOwn={res.user.id === profile?.id}
                                                                      compact={true}/>
                    )}
                </div>
            ) : <p className="text-sm text-text-muted">Nessuna prova presente.</p>}

            <div className="flex flex-col gap-3 pt-2">
                {canInteract && !hasProposedResolution && (
                    <Link to={`/app/barriers/${barrier.id}/resolve`}
                          className="w-full flex justify-center gap-2 bg-success text-white py-3 rounded-xl font-bold shadow-md hover:bg-success/90 transition active:scale-95">
                        <Camera className="w-5 h-5"/> Proponi Risoluzione
                    </Link>
                )}
                {canInteract && hasProposedResolution && (
                    <div
                        className="w-full flex justify-center gap-2 bg-success/10 text-success border border-success/20 py-3 rounded-xl font-bold shadow-sm">
                        <CheckCircle className="w-5 h-5"/> Hai già inviato una prova
                    </div>
                )}
                {barrier.resolutions.length > 0 && (
                    <Link to={`/app/barriers/${barrier.id}/resolutions`}
                          className="block text-center text-sm font-bold text-primary hover:underline py-2.5 border border-primary/20 rounded-xl bg-primary/5 transition-colors">
                        {isAdmin ? "Gestisci tutte le prove" : `Vedi tutte le ${barrier.resolutions.length} prove`}
                    </Link>
                )}
            </div>
        </div>
    );
}
