import {Star} from "lucide-react";
import {formatDate} from "~/utils/format";

type Props = {
    userFullName: string;
    rating: number;
    comment?: string | null;
    createdAt: Date | string;
    isOwn?: boolean;
};

export default function FeedbackCard({userFullName, rating, comment, createdAt, isOwn}: Readonly<Props>) {
    const containerStyles = isOwn
        ? "bg-primary/5 border-primary shadow-md ring-1 ring-primary/20"
        : "bg-background border-border/50 hover:border-warning/30";

    return (
        <div className={`p-4 rounded-2xl border transition-colors ${containerStyles}`}>
            <div className="flex justify-between items-start mb-1 gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-text">{userFullName}</span>
                    {isOwn && (
                        <span
                            className="bg-primary text-white text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md">
                            Tua Valutazione
                        </span>
                    )}
                </div>
                <span className="text-warning font-bold text-sm flex items-center gap-1 shrink-0">
                    <Star className="w-4 h-4 fill-warning"/> {rating}
                </span>
            </div>
            {comment && <p className="text-sm text-text mt-2">{comment}</p>}
            <span className="text-[10px] text-text-muted/70 mt-3 block uppercase tracking-wider font-medium">
                {formatDate(createdAt)}
            </span>
        </div>
    );
}