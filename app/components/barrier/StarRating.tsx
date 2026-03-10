import { useState } from "react";
import { Star } from "lucide-react";

const RATING_LABELS: Record<number, string> = {
    1: "Segnalazione erratissima / Falsa",
    2: "Poco utile o imprecisa",
    3: "Abbastanza utile",
    4: "Utile e accurata",
    5: "Segnalazione molto utile!"
};

type Props = {
    rating: number;
    onChange: (rating: number) => void;
    disabled?: boolean;
};

export default function StarRating({ rating, onChange, disabled }: Readonly<Props>) {
    const [hoverRating, setHoverRating] = useState<number>(0);

    const displayRating = hoverRating || rating;

    return (
        <div className="flex flex-col items-center sm:items-start">
            <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((starIndex) => (
                    <button
                        key={starIndex}
                        type="button"
                        disabled={disabled}
                        onClick={() => onChange(starIndex)}
                        onMouseEnter={() => !disabled && setHoverRating(starIndex)}
                        onMouseLeave={() => !disabled && setHoverRating(0)}
                        className={`focus:outline-none transition-transform ${
                            disabled ? 'cursor-not-allowed opacity-50' : 'hover:scale-110 active:scale-90'
                        }`}
                    >
                        <Star
                            className={`w-9 h-9 transition-colors duration-200 ${
                                starIndex <= displayRating
                                    ? "fill-warning text-warning"
                                    : "fill-transparent text-border hover:text-warning/50"
                            }`}
                        />
                    </button>
                ))}
            </div>

            <div className="h-5 mt-2">
                {displayRating > 0 && (
                    <p className="text-sm font-medium text-warning animate-in fade-in zoom-in duration-200">
                        {RATING_LABELS[displayRating]}
                    </p>
                )}
            </div>
        </div>
    );
}