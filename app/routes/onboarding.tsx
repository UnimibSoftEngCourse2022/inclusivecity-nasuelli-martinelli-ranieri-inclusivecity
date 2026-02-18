import {useState} from "react";
import {Navigate, useNavigate} from "react-router";
import {supabase} from "~/services/supabase/supabase";
import {useAuth} from "~/context/AuthContext";
import {Accessibility, Activity, Baby, Brain, CheckCircle2, Ear, Eye, HelpCircle, User} from "lucide-react";
import type {Route} from "./+types/onboarding";
import Loading from "~/components/Loading";

const ICON_MAP: Record<string, React.ElementType> = {
    Accessibility,
    Eye,
    Ear,
    Brain,
    Baby,
    User,
    Activity,
    HelpCircle
};

export async function loader() {
    const {data, error} = await supabase
        .from("Disability")
        .select("id, name, description, mobilityLevel, iconName")
        .order("mobilityLevel", {ascending: false});

    if (error) {
        throw new Response("Errore nel caricamento delle disabilità", {status: 500});
    }

    return {options: data || []};
}

export default function OnboardingPage({loaderData}: Route.ComponentProps) {
    const {options} = loaderData;

    const {user, profile, refreshProfile, loading} = useAuth();
    const navigate = useNavigate();

    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (loading) {
        return <Loading/>;
    }

    if (profile?.disabilityId) {
        return <Navigate to="/app/map" replace/>;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedId || !user) {
            setError("Seleziona un'opzione per continuare.");
            return;
        }

        setSubmitting(true);
        try {
            const {error: updateError} = await supabase
                .from("User")
                .update({disabilityId: selectedId})
                .eq("id", user.id);

            if (updateError) throw updateError;

            await refreshProfile();

            navigate("/app/map", {replace: true});
        } catch (err) {
            console.error(err);
            setError("Errore durante il salvataggio.");
        } finally {
            setSubmitting(false);
        }
    };

    const welcomeName = profile?.firstName ? `Ciao, ${profile.firstName}!` : "Benvenuto!";

    return (
        <div
            className="min-h-screen bg-background flex flex-col items-center justify-center p-4 md:p-8 animate-in fade-in duration-500">
            <div className="max-w-3xl w-full space-y-8">

                <div className="text-center space-y-2">
                    <h1 className="text-3xl md:text-4xl font-extrabold text-primary tracking-tight">
                        {welcomeName}
                    </h1>
                    <p className="text-text-muted text-lg max-w-xl mx-auto">
                        Seleziona il profilo che meglio ti descrive.
                    </p>
                </div>

                {error && (
                    <div
                        className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-lg text-center text-sm font-medium">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {options.map((option) => {
                            const isSelected = selectedId === option.id;

                            const IconComponent = (option.iconName && ICON_MAP[option.iconName])
                                ? ICON_MAP[option.iconName]
                                : HelpCircle;

                            return (
                                <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => setSelectedId(option.id)}
                                    className={`
                                        relative group flex items-start gap-4 p-5 rounded-xl border-2 text-left transition-all duration-200 outline-none
                                        ${isSelected
                                        ? "border-primary bg-primary/5 shadow-md ring-1 ring-primary"
                                        : "border-border bg-surface hover:border-primary/50 hover:bg-surface/80"
                                    }
                                    `}
                                >
                                    <div className={`
                                        p-3 rounded-full shrink-0 transition-colors
                                        ${isSelected ? "bg-primary text-primary-foreground" : "bg-background text-text-muted group-hover:text-primary"}
                                    `}>
                                        <IconComponent className="w-6 h-6"/>
                                    </div>

                                    <div className="flex-1">
                                        <h3 className={`font-semibold text-lg ${isSelected ? "text-primary" : "text-text"}`}>
                                            {option.name}
                                        </h3>
                                        <p className="text-sm text-text-muted mt-1 leading-relaxed">
                                            {option.description}
                                        </p>
                                    </div>

                                    {isSelected && (
                                        <div
                                            className="absolute top-4 right-4 text-primary animate-in zoom-in duration-200">
                                            <CheckCircle2 className="w-5 h-5 fill-primary/10"/>
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex justify-center pt-4">
                        <button
                            type="submit"
                            disabled={!selectedId || submitting}
                            className="w-full md:w-auto min-w-[200px] flex justify-center py-3 px-8 border border-transparent rounded-full shadow-lg text-base font-bold text-white bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {submitting ? "Salvataggio..." : "Inizia a esplorare"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}