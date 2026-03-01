import {useCallback, useEffect, useState} from "react";
import {useAuth} from "~/context/AuthContext";
import {requestNotificationPermission} from "~/services/firebase";
import {supabase} from "~/services/supabase/supabase";

export function usePushNotifications() {
    const {user} = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [isActive, setIsActive] = useState(false);
    const [isSupported, setIsSupported] = useState(true);
    const [permission, setPermission] = useState<NotificationPermission>("default");

    const checkSubscription = useCallback(async () => {
        try {
            const token = await requestNotificationPermission();
            if (token && user) {
                const {data} = await supabase
                    .from("DeviceToken")
                    .select("id")
                    .eq("token", token)
                    .eq("userId", user.id)
                    .maybeSingle();

                if (data) setIsActive(true);
            }
        } catch (e) {
            console.error("Errore controllo iscrizione:", e);
        }
    }, [user]);

    useEffect(() => {
        if (typeof window !== "undefined") {
            if (!("Notification" in window)) {
                setIsSupported(false);
            } else {
                setPermission(Notification.permission);
                if (Notification.permission === "granted" && user) {
                    checkSubscription();
                }
            }
        }
    }, [user, checkSubscription]);

    const enableNotifications = async () => {
        if (!isSupported || !user) return false;

        let currentPermission = Notification.permission;
        if (currentPermission === 'default') {
            currentPermission = await Notification.requestPermission();
            setPermission(currentPermission);
        }

        if (currentPermission !== 'granted') {
            if (currentPermission === 'denied') {
                setError("Hai bloccato le notifiche. Sblocca i permessi cliccando sul lucchetto nella barra degli indirizzi del browser.");
            } else {
                setError("Permesso negato per le notifiche.");
            }
            return false;
        }

        setLoading(true);
        setError(null);

        try {
            const token = await requestNotificationPermission();

            if (token) {
                const deviceType = navigator.userAgent.includes("Mobi") ? "Mobile" : "Desktop";

                const {error: rpcError} = await supabase.rpc('register_device_token', {
                    p_token: token,
                    p_device_type: deviceType
                });

                if (rpcError) throw rpcError;

                setIsActive(true);
                return true;
            } else {
                setError("Impossibile generare il token di notifica.");
                return false;
            }
        } catch (err: any) {
            console.error("Errore attivazione notifiche:", err);
            setError(err.message || "Si è verificato un errore imprevisto durante l'attivazione.");
            return false;
        } finally {
            setLoading(false);
        }
    };

    const disableNotifications = async () => {
        if (!user) return false;

        setLoading(true);
        setError(null);

        try {
            const token = await requestNotificationPermission();

            if (token) {
                const {error: dbError} = await supabase
                    .from("DeviceToken")
                    .delete()
                    .eq("token", token);

                if (dbError) throw dbError;
            }

            setIsActive(false);
            return true;
        } catch (err: any) {
            console.error("Errore disattivazione notifiche:", err);
            setError("Errore durante la disattivazione delle notifiche.");
            return false;
        } finally {
            setLoading(false);
        }
    };

    return {enableNotifications, disableNotifications, loading, error, isActive, isSupported, permission};
}