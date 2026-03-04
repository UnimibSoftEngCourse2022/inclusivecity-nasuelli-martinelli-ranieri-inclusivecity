import {Star} from "lucide-react";
import {formatDate} from "~/utils/format";

type Props = {
    userFullName: string;
    rating: number;
    comment?: string | null;
    createdAt: Date | string;
};

export default function FeedbackCard({userFullName, rating, comment, createdAt}: Readonly<Props>) {
    return (
        <div
            className="p-4 bg-background rounded-2xl border border-border/50 hover:border-warning/30 transition-colors">
            <div className="flex justify-between mb-1">
                <span className="font-bold text-sm text-text">{userFullName}</span>
                <span className="text-warning font-bold text-sm flex items-center gap-1">
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