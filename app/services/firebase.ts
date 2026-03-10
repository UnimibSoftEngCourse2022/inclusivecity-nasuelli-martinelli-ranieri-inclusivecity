import {getApp, getApps, initializeApp} from "firebase/app";
import {getMessaging, getToken, isSupported as isMessagingSupported} from "firebase/messaging";
import {envSchema} from "~/utils/envSchema";

const env = envSchema.parse(import.meta.env);

const firebaseConfig = {
    apiKey: env.VITE_FIREBASE_API_KEY,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
};

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export async function requestNotificationPermission(): Promise<string | null> {
    try {
        if (globalThis.window === undefined) return null;

        if (Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                console.log("L'utente ha negato i permessi per le notifiche.");
                return null;
            }
        } else if (Notification.permission === 'denied') {
            console.log("Permessi bloccati nelle impostazioni del browser.");
            return null;
        }

        const supported = await isMessagingSupported();
        if (!supported) {
            console.warn("Firebase Messaging non è supportato in questo browser.");
            return null;
        }

        const messaging = getMessaging(app);

        const currentToken = await getToken(messaging, {
            vapidKey: env.VITE_FIREBASE_VAPID_KEY
        });

        if (currentToken) {
            return currentToken;
        } else {
            console.warn("Nessun token disponibile. Assicurati di aver concesso i permessi.");
            return null;
        }
    } catch (error) {
        console.error("Errore durante il recupero del token FCM:", error);
        return null;
    }
}