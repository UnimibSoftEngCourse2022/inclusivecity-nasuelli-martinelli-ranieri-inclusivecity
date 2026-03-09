import type {ResolutionStatus} from "@prisma/client";
import React from "react";
import {formatDate} from "../../utils/format";

type Props = {
    userFullName: string;
    status: ResolutionStatus;
    evidenceUrl?: string | null;
    comment?: string | null;
    createdAt: Date | string;
    isOwn?: boolean;
    adminActions?: React.ReactNode;
    compact?: boolean;
};

export default function ResolutionCard({
                                           userFullName,
                                           status,
                                           evidenceUrl,
                                           comment,
                                           createdAt,
                                           isOwn,
                                           adminActions,
                                           compact
                                       }: Readonly<Props>) {
    let badgeStyles, badgeText;

    if (status === "APPROVED") {
        badgeText = 'Approvata';
        badgeStyles = 'bg-success/10 text-success border-success/20';
    } else if (status === "REJECTED") {
        badgeText = 'Rifiutata';
        badgeStyles = 'bg-error/10 text-error border-error/20';
    } else {
        badgeText = 'In verifica';
        badgeStyles = 'bg-warning/10 text-warning border-warning/20';
    }

    const containerStyles = isOwn
        ? "bg-primary/5 border-primary shadow-sm ring-1 ring-primary/20"
        : "bg-background border-border/50 hover:border-primary/30";

    const padding = compact ? "p-3" : "p-4";
    const imgSize = compact ? "w-20 h-20 sm:w-24 sm:h-24" : "w-full h-48 sm:w-32 sm:h-32";
    const textSize = compact ? "text-xs" : "text-sm";

    const flexLayout = compact ? "flex-row items-start" : "flex-col sm:flex-row";

    return (
        <div
            className={`${padding} rounded-2xl border flex ${flexLayout} gap-3 sm:gap-4 transition-colors ${containerStyles}`}>
            {evidenceUrl && (
                <button
                    className={`${imgSize} shrink-0 rounded-xl overflow-hidden border border-border bg-surface relative group cursor-pointer`}
                    onClick={() => window.open(evidenceUrl, "_blank")}>
                    <img src={evidenceUrl} alt="Prova risoluzione"
                         className="w-full h-full object-cover group-hover:scale-105 transition-transform"/>
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"/>
                </button>
            )}
            <div className="flex-1 flex flex-col justify-between min-w-0 w-full">
                <div>
                    <div className="flex justify-between items-start mb-1.5 gap-2">
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                            <span className={`font-bold text-text truncate ${textSize}`}>{userFullName}</span>
                            {isOwn && (
                                <span
                                    className="bg-primary text-white text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md shrink-0">
                                    Tua Proposta
                                </span>
                            )}
                        </div>
                        <span
                            className={`shrink-0 text-[9px] font-bold uppercase px-2 py-0.5 rounded-lg border tracking-wider ${badgeStyles}`}>
                            {badgeText}
                        </span>
                    </div>
                    {comment ? (
                        <p className={`text-text leading-relaxed line-clamp-2 ${textSize}`}>{comment}</p>
                    ) : (
                        <p className={`text-text-muted italic ${textSize}`}>Nessun commento aggiuntivo</p>
                    )}
                </div>

                <div className="flex items-end justify-between mt-3 flex-wrap gap-2">
                    <span className="text-[10px] text-text-muted/70 block uppercase tracking-wider font-medium">
                        {formatDate(createdAt)}
                    </span>
                    {adminActions && (
                        <div className="flex gap-2">
                            {adminActions}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}