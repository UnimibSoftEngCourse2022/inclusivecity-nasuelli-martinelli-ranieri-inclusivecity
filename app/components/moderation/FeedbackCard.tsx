import {Star} from "lucide-react";
import {formatDate} from "../../utils/format";

type Props = {
    userFullName: string;
    rating: number;
    comment?: string | null;
    createdAt: Date | string;
    isOwn?: boolean;
    compact?: boolean;
};

export default function FeedbackCard({userFullName, rating, comment, createdAt, isOwn, compact}: Readonly<Props>) {
    const containerStyles = isOwn
        ? "bg-primary/5 border-primary shadow-sm ring-1 ring-primary/20"
        : "bg-background border-border/50 hover:border-warning/30";

    const padding = compact ? "p-3" : "p-4";
    const titleSize = compact ? "text-xs" : "text-sm";
    const textSize = compact ? "text-xs" : "text-sm";

    return (
        <div className={`${padding} rounded-2xl border transition-colors ${containerStyles}`}>
            <div className="flex justify-between items-start mb-1 gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-bold text-text ${titleSize}`}>{userFullName}</span>
                    {isOwn && (
                        <span
                            className="bg-primary text-white text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md">
                            Tua Valutazione
                        </span>
                    )}
                </div>
                <span className={`text-warning font-bold flex items-center gap-1 shrink-0 ${titleSize}`}>
                    <Star className={`${compact ? 'w-3 h-3' : 'w-4 h-4'} fill-warning`}/> {rating}
                </span>
            </div>
            {comment && <p className={`text-text mt-1.5 ${textSize}`}>{comment}</p>}
            <span className="text-[9px] text-text-muted/70 mt-2 block uppercase tracking-wider font-medium">
                {formatDate(createdAt)}
            </span>
        </div>
    );
}