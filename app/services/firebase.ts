import {getApp, getApps, initializeApp} from "firebase/app";
import {type Analytics, getAnalytics, isSupported as isAnalyticsSupported} from "firebase/analytics";
import {getMessaging, getToken, isSupported as isMessagingSupported} from "firebase/messaging";
import {envSchema} from "~/utils/envSchema";

const env = envSchema.parse(import.meta.env);

const firebaseConfig = {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
    measurementId: env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

let analytics: Analytics | null = null;
if (typeof window !== "undefined") {
    isAnalyticsSupported().then((supported) => {
        if (supported) {
            analytics = getAnalytics(app);
        }
    });
}

export async function requestNotificationPermission(): Promise<string | null> {
    try {
        if (typeof window === "undefined") return null;

        const supported = await isMessagingSupported();
        if (!supported) {
            console.warn("Firebase Messaging non è supportato in questo browser.");
            return null;
        }

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.log("L'utente ha negato i permessi per le notifiche.");
            return null;
        }

        const messaging = getMessaging(app);

        const currentToken = await getToken(messaging, {
            vapidKey: env.VITE_FIREBASE_VAPID_KEY
        });

        if (currentToken) {
            return currentToken;
        } else {
            console.warn("Nessun token disponibile.");
            return null;
        }
    } catch (error) {
        console.error("Errore durante il recupero del token FCM:", error);
        return null;
    }
}

export {app, analytics};