import {createContext, useContext, useEffect, useState} from "react";
import type {User, Session} from "@supabase/supabase-js";
import {supabase} from "~/services/supabase/supabase";
import type {User as UserProfile} from "@prisma/client";

type AuthContextType = {
    session: Session | null;
    user: User | null;
    profile: UserProfile | null;
    loading: boolean;
    signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({children}: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        async function initAuth() {
            try {
                const {data: {session}, error} = await supabase.auth.getSession();

                if (error) throw error;

                if (mounted) {
                    setSession(session);
                    setUser(session?.user ?? null);

                    if (session?.user) {
                        await fetchProfile(session.user.id);
                    } else {
                        setLoading(false);
                    }
                }
            } catch (err) {
                console.error("Errore inizializzazione Auth:", err);
                if (mounted) setLoading(false);
            }
        }

        initAuth();

        const {data: {subscription}} = supabase.auth.onAuthStateChange((_event, session) => {
            if (!mounted) return;

            setSession(session);
            setUser(session?.user ?? null);

            if (session?.user) {
                fetchProfile(session.user.id);
            } else {
                setProfile(null);
                setLoading(false);
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    async function fetchProfile(userId: string) {
        try {
            const {data, error} = await supabase
                .from("User")
                .select("*")
                .eq("id", userId)
                .maybeSingle();

            if (error) throw error;
            if (data) setProfile(data as UserProfile);
        } catch (error) {
            console.error("Errore recupero profilo:", error);
        } finally {
            setLoading(false);
        }
    }

    const signOut = async () => {
        await supabase.auth.signOut();
        setProfile(null);
        setUser(null);
        setSession(null);
    };

    return (
        <AuthContext.Provider value={{session, user, profile, loading, signOut}}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}