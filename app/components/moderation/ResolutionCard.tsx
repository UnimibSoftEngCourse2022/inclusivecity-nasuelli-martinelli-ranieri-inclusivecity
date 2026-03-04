import {ResolutionStatus} from "@prisma/client";
import {formatDate} from "~/utils/format";

type Props = {
    userFullName: string;
    status: ResolutionStatus;
    evidenceUrl?: string | null;
    comment?: string | null;
    createdAt: Date | string;
    isOwn?: boolean;
};

export default function ResolutionCard({
                                           userFullName,
                                           status,
                                           evidenceUrl,
                                           comment,
                                           createdAt,
                                           isOwn
                                       }: Readonly<Props>) {
    let badgeStyles, badgeText;

    if (status === ResolutionStatus.APPROVED) {
        badgeText = 'Approvata';
        badgeStyles = 'bg-success/10 text-success border-success/20';
    } else if (status === ResolutionStatus.REJECTED) {
        badgeText = 'Rifiutata';
        badgeStyles = 'bg-error/10 text-error border-error/20';
    } else {
        badgeText = 'In verifica';
        badgeStyles = 'bg-warning/10 text-warning border-warning/20';
    }

    const containerStyles = isOwn
        ? "bg-primary/5 border-primary shadow-md ring-1 ring-primary/20"
        : "bg-background border-border/50 hover:border-primary/30";

    return (
        <div
            className={`p-4 rounded-2xl border flex flex-col sm:flex-row gap-4 transition-colors ${containerStyles}`}>
            {evidenceUrl && (
                <div
                    className="w-full sm:w-32 h-32 shrink-0 rounded-xl overflow-hidden border border-border bg-surface">
                    <img src={evidenceUrl} alt="Prova risoluzione" className="w-full h-full object-cover"/>
                </div>
            )}
            <div className="flex-1 flex flex-col justify-between">
                <div>
                    <div className="flex justify-between items-start mb-2 gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-text">{userFullName}</span>
                            {isOwn && (
                                <span
                                    className="bg-primary text-white text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md">
                                    Tua Proposta
                                </span>
                            )}
                        </div>
                        <span
                            className={`shrink-0 text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg border tracking-wider ${badgeStyles}`}>
                            {badgeText}
                        </span>
                    </div>
                    {comment ? (
                        <p className="text-sm text-text leading-relaxed">{comment}</p>
                    ) : (
                        <p className="text-sm text-text-muted italic">Nessun commento aggiuntivo</p>
                    )}
                </div>
                <span className="text-[10px] text-text-muted/70 mt-3 block uppercase tracking-wider font-medium">
                    Inviata il {formatDate(createdAt)}
                </span>
            </div>
        </div>
    );
}