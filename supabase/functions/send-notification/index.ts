import {serve} from "https://deno.land/std@0.192.0/http/server.ts";
import {createClient} from "https://esm.sh/@supabase/supabase-js@2.39.3";
import {cert, getApps, initializeApp} from "npm:firebase-admin@12.0.0/app";
import {getMessaging} from "npm:firebase-admin@12.0.0/messaging";

// 1. Inizializza Firebase Admin (solo se non è già inizializzato)
if (getApps().length === 0) {
    const serviceAccount = {
        projectId: Deno.env.get("FIREBASE_PROJECT_ID"),
        clientEmail: Deno.env.get("FIREBASE_CLIENT_EMAIL"),
        privateKey: Deno.env.get("FIREBASE_PRIVATE_KEY")?.replace(/\\n/g, '\n'), // Corregge i ritorni a capo
    };

    initializeApp({
        credential: cert(serviceAccount),
    });
}

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
    // Gestione chiamate CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', {headers: corsHeaders});
    }

    try {
        // 2. Leggi il payload dal Webhook di Supabase
        const payload = await req.json();
        const notification = payload.record; // La nuova riga appena inserita nella tabella Notification

        if (!notification || !notification.userId) {
            throw new Error("Payload non valido o userId mancante");
        }

        // 3. Inizializza Supabase Client (usando il Service Role per bypassare le RLS lato server)
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // 4. Cerca tutti i DeviceToken attivi di quell'utente
        const {data: tokens, error} = await supabaseClient
            .from('DeviceToken')
            .select('token')
            .eq('userId', notification.userId);

        if (error) throw error;
        if (!tokens || tokens.length === 0) {
            console.log(`Nessun token trovato per l'utente ${notification.userId}`);
            return new Response(JSON.stringify({message: 'Nessun dispositivo registrato'}), {
                headers: {...corsHeaders, 'Content-Type': 'application/json'},
            });
        }

        const deviceTokens = tokens.map((t) => t.token);

        // 5. Prepara il messaggio per Firebase
        const message = {
            notification: {
                title: notification.title,
                body: notification.body,
            },
            data: {
                notificationId: notification.id,
                barrierId: notification.barrierId || "",
                type: notification.type,
            },
            tokens: deviceTokens,
        };

        // 6. Invia tramite Firebase Cloud Messaging
        const response = await getMessaging().sendEachForMulticast(message);
        console.log(`Notifiche inviate: ${response.successCount} successi, ${response.failureCount} fallimenti`);

        return new Response(JSON.stringify({success: true, response}), {
            headers: {...corsHeaders, 'Content-Type': 'application/json'},
            status: 200,
        });

    } catch (err: any) {
        console.error("Errore nell'invio della notifica:", err);
        return new Response(JSON.stringify({error: err.message}), {
            headers: {...corsHeaders, 'Content-Type': 'application/json'},
            status: 400,
        });
    }
});