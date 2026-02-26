import {serve} from "https://deno.land/std@0.192.0/http/server.ts";
import {createClient} from "https://esm.sh/@supabase/supabase-js@2.39.3";
import {cert, getApps, initializeApp} from "npm:firebase-admin@12.0.0/app";
import {getMessaging} from "npm:firebase-admin@12.0.0/messaging";

// --- CONFIGURAZIONE CORS ---
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// --- HELPER PER RISPOSTE JSON ---
const createResponse = (body: any, status = 200) =>
    new Response(JSON.stringify(body), {
        status,
        headers: {...corsHeaders, 'Content-Type': 'application/json'}
    });

// --- INIZIALIZZAZIONE FIREBASE ---
const initFirebase = () => {
    if (getApps().length > 0) return;

    const projectId = Deno.env.get("FIREBASE_PROJECT_ID");
    const clientEmail = Deno.env.get("FIREBASE_CLIENT_EMAIL");
    let privateKey = Deno.env.get("FIREBASE_PRIVATE_KEY");

    if (!projectId || !clientEmail || !privateKey) {
        throw new Error("Mancano le configurazioni di Firebase nei Secrets.");
    }

    // PULIZIA CHIAVE: Gestisce virgolette extra e trasforma \n testuali in veri a capo
    privateKey = privateKey
        .trim()
        .replace(/^"(.*)"$/, '$1')
        .split(String.raw`\n`)
        .join('\n');

    initializeApp({
        credential: cert({projectId, clientEmail, privateKey}),
    });
};

// --- LOGICA PRINCIPALE ---
serve(async (req: Request) => {
    // Gestione Preflight CORS
    if (req.method === 'OPTIONS') return new Response('ok', {headers: corsHeaders});

    try {
        initFirebase();

        // 1. Parsing del payload dal Webhook
        const payload = await req.json();
        const notification = payload.record;

        if (!notification?.userId) {
            return createResponse({error: "userId mancante nel record"}, 400);
        }

        // 2. Client Supabase con Service Role
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // 3. Recupero Token Dispositivi
        const {data: tokens, error: dbError} = await supabaseClient
            .from('DeviceToken')
            .select('token')
            .eq('userId', notification.userId);

        if (dbError) throw dbError;

        if (!tokens || tokens.length === 0) {
            console.log(`Nessun dispositivo registrato per l'utente ${notification.userId}`);
            return createResponse({success: false, message: 'Nessun token trovato'});
        }

        const deviceTokens = tokens.map(t => t.token);

        // 4. Invio tramite Firebase Messaging
        const message = {
            notification: {
                title: notification.title,
                body: notification.body,
            },
            data: {
                notificationId: String(notification.id),
                barrierId: String(notification.barrierId || ""),
                type: String(notification.type),
            },
            tokens: deviceTokens,
        };

        const response = await getMessaging().sendEachForMulticast(message);

        console.log(`Inviate: ${response.successCount} | Fallite: ${response.failureCount}`);

        return createResponse({
            success: true,
            sentCount: response.successCount,
            failureCount: response.failureCount
        });

    } catch (err: any) {
        console.error("Errore critico:", err.message);
        return createResponse({error: err.message}, 500);
    }
});