import {useState} from "react";
import {useAuth} from "~/context/AuthContext";
import {requestNotificationPermission} from "~/services/firebase";
import {supabase} from "~/services/supabase/supabase";

export function usePushNotifications() {
    const {user} = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const enableNotifications = async () => {
        if (!user) {
            setError("Devi effettuare l'accesso per attivare le notifiche.");
            return false;
        }

        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            const token = await requestNotificationPermission();

            if (token) {
                const deviceType = navigator.userAgent.includes("Mobi") ? "Mobile" : "Desktop";
                const {error: dbError} = await supabase.from("DeviceToken").upsert({
                    token: token,
                    userId: user.id,
                    deviceType: deviceType,
                    lastUsedAt: new Date().toISOString()
                }, {onConflict: "token"});

                if (dbError) throw dbError;

                setSuccess(true);
                return true;
            } else {
                setError("Permesso negato o notifiche non supportate dal browser.");
                return false;
            }
        } catch (err: any) {
            console.error("Errore attivazione notifiche:", err);
            setError(err.message || "Si è verificato un errore imprevisto.");
            return false;
        } finally {
            setLoading(false);
        }
    };

    return {enableNotifications, loading, error, success};
}