import {Loader2} from "lucide-react";

export default function Loading() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary"/>
                <p className="text-text-muted text-sm font-medium">Caricamento...</p>
            </div>
        </div>
    );
}