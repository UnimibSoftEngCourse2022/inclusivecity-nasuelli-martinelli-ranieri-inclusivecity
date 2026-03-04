import {ResolutionStatus} from "@prisma/client";
import {formatDate} from "~/utils/format";

type Props = {
    userFullName: string;
    status: ResolutionStatus;
    evidenceUrl?: string | null;
    comment?: string | null;
    createdAt: Date | string;
};

export default function ResolutionCard({userFullName, status, evidenceUrl, comment, createdAt}: Readonly<Props>) {
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

    return (
        <div
            className="p-4 bg-background rounded-2xl border border-border/50 flex flex-col sm:flex-row gap-4 hover:border-primary/30 transition-colors">
            {evidenceUrl && (
                <div
                    className="w-full sm:w-32 h-32 shrink-0 rounded-xl overflow-hidden border border-border bg-surface">
                    <img src={evidenceUrl} alt="Prova risoluzione" className="w-full h-full object-cover"/>
                </div>
            )}
            <div className="flex-1 flex flex-col justify-between">
                <div>
                    <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-sm text-text">{userFullName}</span>
                        <span
                            className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg border tracking-wider ${badgeStyles}`}>
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