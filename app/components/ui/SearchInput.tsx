import {Loader2, Search} from "lucide-react";

type Props = {
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    isLoading?: boolean;
    resultsCount?: number;
    resultsLabel?: string;
};

export default function SearchInput({
                                        value,
                                        onChange,
                                        placeholder = "Cerca...",
                                        isLoading,
                                        resultsCount,
                                        resultsLabel = "risultati"
                                    }: Readonly<Props>) {
    return (
        <div className="space-y-4">
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted"/>
                <input
                    type="text" value={value} onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-border bg-surface outline-none focus:ring-2 focus:ring-primary shadow-sm text-text transition-all"
                />
            </div>
            {resultsCount !== undefined && (
                <div className="text-sm font-semibold text-text-muted flex items-center gap-2">
                    {isLoading
                        ? <Loader2 className="w-4 h-4 animate-spin text-primary"/>
                        : `${resultsCount} ${resultsLabel} trovati`
                    }
                </div>
            )}
        </div>
    );
}