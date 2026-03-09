import {useCallback, useEffect, useState} from "react";
import {useAuth} from "../context/AuthContext";
import {requestNotificationPermission} from "../services/firebase";
import {supabase} from "../services/supabase";

export function usePushNotifications() {
    const {user} = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [isActive, setIsActive] = useState(false);
    const [isSupported, setIsSupported] = useState(true);
    const [permission, setPermission] = useState<NotificationPermission>("default");

    const isStandalone = globalThis.window !== undefined &&
        (globalThis.matchMedia('(display-mode: standalone)').matches || ('standalone' in navigator && (navigator as any).standalone));

    const isIOS = typeof navigator !== "undefined" &&
        (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
            (navigator.userAgent.includes("Mac") && "maxTouchPoints" in navigator && navigator.maxTouchPoints > 1));

    const isSecureContext = globalThis.window !== undefined && globalThis.isSecureContext;

    const checkSubscription = useCallback(async () => {
        if (!user) return;
        try {
            const token = await requestNotificationPermission();
            if (token) {
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
        if (globalThis.window !== undefined) {
            if (!isSecureContext) {
                setIsSupported(false);
                setError("Le notifiche Push richiedono una connessione sicura (HTTPS).");
                return;
            }

            if ("Notification" in globalThis) {
                setPermission(Notification.permission);

                if (isIOS && !isStandalone) {
                    setIsSupported(false);
                    setError("Per ricevere le notifiche su iPhone, installa l'app sulla Schermata Home (Condividi > Aggiungi a schermata Home).");
                    return;
                }

                if (Notification.permission === "granted" && user) {
                    checkSubscription();
                }
            } else {
                setIsSupported(false);
                setError("Il tuo dispositivo o browser non supporta le notifiche Push.");
            }
        }
    }, [user, checkSubscription, isIOS, isStandalone, isSecureContext]);

    const enableNotifications = async () => {
        if (!isSupported || !user) return false;

        setLoading(true);
        setError(null);

        try {
            const token = await requestNotificationPermission();

            if (!token) {
                setPermission(Notification.permission);
                if (Notification.permission === 'denied') {
                    if (isStandalone) {
                        setError("Hai bloccato le notifiche. Sblocca i permessi dalle Impostazioni del tuo dispositivo.");
                    } else {
                        setError("Hai bloccato le notifiche. Clicca sul lucchetto nella barra degli indirizzi per sbloccarle.");
                    }
                } else {
                    setError("Impossibile attivare le notifiche in questo momento. Riprova più tardi.");
                }
                return false;
            }

            setPermission("granted");
            let deviceType;
            if (isIOS) {
                deviceType = "iOS PWA";
            } else if (navigator.userAgent.includes("Mobi")) {
                deviceType = "Android";
            } else {
                deviceType = "Desktop";
            }

            const {error: rpcError} = await supabase.rpc('register_device_token', {
                p_token: token,
                p_device_type: deviceType
            });

            if (rpcError) throw rpcError;

            setIsActive(true);
            return true;

        } catch (err: any) {
            console.error("Errore attivazione notifiche:", err);
            setError(err.message || "Si è verificato un errore imprevisto.");
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
            setError("Errore durante la disattivazione. Riprova.");
            return false;
        } finally {
            setLoading(false);
        }
    };

    return {enableNotifications, disableNotifications, loading, error, isActive, isSupported, permission};
}