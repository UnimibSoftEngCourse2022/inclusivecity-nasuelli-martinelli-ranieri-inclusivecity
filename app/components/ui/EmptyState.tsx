import type {LucideIcon} from "lucide-react";

type Props = {
    icon: LucideIcon;
    title: string;
    description?: string;
    actionLabel?: string;
    onAction?: () => void;
};

export default function EmptyState({icon: Icon, title, description, actionLabel, onAction}: Readonly<Props>) {
    return (
        <div
            className="bg-surface border-2 border-dashed border-border p-12 rounded-3xl text-center flex flex-col items-center justify-center text-text-muted space-y-3">
            <Icon className="w-12 h-12 opacity-20"/>
            <p className="font-medium text-lg">{title}</p>
            {description && <p className="text-sm">{description}</p>}
            {actionLabel && onAction && (
                <button onClick={onAction} className="text-primary font-bold hover:underline mt-2">
                    {actionLabel}
                </button>
            )}
        </div>
    );
}