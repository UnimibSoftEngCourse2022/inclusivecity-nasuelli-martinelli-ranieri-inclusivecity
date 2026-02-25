import {PrismaClient} from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Inizio del Seeding completo del Database...');

    // 1. PULIZIA PROFONDA DEL DATABASE
    // Usiamo TRUNCATE CASCADE per piallare tutte le tabelle istantaneamente ignorando i vincoli di chiave esterna
    console.log('🧹 Pulizia delle tabelle in corso...');
    await prisma.$executeRaw`TRUNCATE TABLE "Notification", "Resolution", "Report", "Feedback", "Barrier", "DeviceToken", "User", "BarrierType", "Disability" CASCADE;`;

    // 2. CREAZIONE DISABILITÀ
    console.log('♿ Creazione tipologie di disabilità...');
    const disabilitiesData = [
        {
            name: 'Disabilità Motoria',
            description: 'Difficoltà di movimento, uso di ausili o deambulazione faticosa.',
            mobilityLevel: 50,
            iconName: 'Accessibility'
        },
        {
            name: 'Sedia a rotelle',
            description: 'Uso esclusivo di carrozzina per gli spostamenti.',
            mobilityLevel: 0,
            iconName: 'Accessibility'
        },
        {name: 'Disabilità Visiva', description: 'Cecità totale o ipovisione.', mobilityLevel: 80, iconName: 'Eye'},
        {name: 'Disabilità Uditiva', description: 'Sordità totale o parziale.', mobilityLevel: 90, iconName: 'Ear'},
        {
            name: 'Disabilità Cognitiva',
            description: 'Difficoltà di orientamento o memoria.',
            mobilityLevel: 90,
            iconName: 'Brain'
        },
        {
            name: 'Genitore con Passeggino',
            description: 'Necessità di percorsi ampi e senza gradini.',
            mobilityLevel: 40,
            iconName: 'Baby'
        },
        {
            name: 'Nessuna / Accompagnatore',
            description: 'Nessuna esigenza specifica di accessibilità.',
            mobilityLevel: 100,
            iconName: 'User'
        }
    ];

    const createdDisabilities = [];
    for (const d of disabilitiesData) {
        createdDisabilities.push(await prisma.disability.create({data: d}));
    }

    // 3. CREAZIONE TIPI DI BARRIERA
    console.log('🚧 Creazione categorie di barriere...');
    const barrierTypesData = [
        {
            label: 'Gradino / Scala',
            defaultDifficulty: 50, // Richiede almeno mobilità 50 (esclude sedie a rotelle 0 e passeggini 40, accessibile a fatica per disabilità motoria 50)
            iconKey: 'Stairs',
            colorHex: '#EF4444'
        },
        {
            label: 'Ascensore Guasto',
            defaultDifficulty: 80, // Costringe all'uso delle scale, richiede mobilità molto alta (esclude motoria grave, passeggini, ecc.)
            iconKey: 'Elevator',
            colorHex: '#F97316'
        },
        {
            label: 'Ostacolo sul marciapiede',
            defaultDifficulty: 40, // Richiede deviazioni o scendere dal marciapiede (blocca chi ha mobilità 0, ma superabile da passeggini 40 in su)
            iconKey: 'AlertTriangle',
            colorHex: '#EAB308'
        },
        {
            label: 'Attraversamento Pericoloso',
            defaultDifficulty: 90, // Manca semaforo o strisce sbiadite. Richiede ottimi riflessi e sensi (blocca disabilità visiva 80, richiede mobilità 90/100)
            iconKey: 'MapPin',
            colorHex: '#3B82F6'
        }
    ];

    const types = [];
    for (const bt of barrierTypesData) {
        types.push(await prisma.barrierType.create({ data: bt }));
    }

    // 4. CREAZIONE UTENTI MOCK
    console.log('👤 Creazione utenti (Admin e normali)...');
    const adminId = crypto.randomUUID();
    const user1Id = crypto.randomUUID();
    const user2Id = crypto.randomUUID();

    await prisma.user.create({
        data: {
            id: adminId,
            email: 'admin@inclusivecity.com',
            firstName: 'Admin',
            lastName: 'Supremo',
            role: 'ADMIN',
            reputationScore: 100,
            disabilityId: createdDisabilities[6].id
        }
    });
    await prisma.user.create({
        data: {
            id: user1Id,
            email: 'mario.rossi@example.com',
            firstName: 'Mario',
            lastName: 'Rossi',
            role: 'USER',
            reputationScore: 25,
            disabilityId: createdDisabilities[1].id
        }
    });
    await prisma.user.create({
        data: {
            id: user2Id,
            email: 'giulia.bianchi@example.com',
            firstName: 'Giulia',
            lastName: 'Bianchi',
            role: 'USER',
            reputationScore: 5,
            disabilityId: createdDisabilities[5].id
        }
    });

    // 5. CREAZIONE BARRIERE (Con coordinate PostGIS tramite query SQL grezza)
    console.log('📍 Creazione barriere sulla mappa...');
    const barrier1Id = crypto.randomUUID(); // Barriera Attiva
    const barrier2Id = crypto.randomUUID(); // Barriera in revisione
    const barrier3Id = crypto.randomUUID(); // Barriera risolta

    // Barriera 1: Milano - Duomo (Attiva)
    await prisma.$executeRaw`
        INSERT INTO "Barrier" (id, title, description, address, "photoUrls", difficulty, location, state, "userId",
                               "typeId", "updatedAt")
        VALUES (${barrier1Id}, 'Gradino alto ingresso negozio', 'C''è un gradino di 15cm senza rampa.',
                'Piazza del Duomo, Milano',
                ARRAY['https://placehold.co/600x400/png']::text[], 3, ST_SetSRID(ST_MakePoint(9.1899, 45.4642), 4326),
                'ACTIVE'::"BarrierState", ${user1Id}::uuid, ${types[0].id}, NOW());
    `;

    // Barriera 2: Roma - Colosseo (In Review - Ha ricevuto segnalazioni)
    await prisma.$executeRaw`
        INSERT INTO "Barrier" (id, title, description, address, "photoUrls", difficulty, location, state, "userId",
                               "typeId", "updatedAt")
        VALUES (${barrier2Id}, 'Lavori in corso bloccano marciapiede', 'Transenne ovunque, impossibile passare.',
                'Piazza del Colosseo, Roma',
                ARRAY['https://placehold.co/600x400/png']::text[], 4, ST_SetSRID(ST_MakePoint(12.4922, 41.8902), 4326),
                'IN_REVIEW'::"BarrierState", ${user2Id}::uuid, ${types[2].id}, NOW());
    `;

    // Barriera 3: Napoli - Plebiscito (Risolta)
    await prisma.$executeRaw`
        INSERT INTO "Barrier" (id, title, description, address, "photoUrls", difficulty, location, state, "userId",
                               "typeId", "updatedAt")
        VALUES (${barrier3Id}, 'Ascensore Metro guasto', 'Ascensore fermo da due settimane.',
                'Piazza del Plebiscito, Napoli',
                ARRAY['https://placehold.co/600x400/png']::text[], 5, ST_SetSRID(ST_MakePoint(14.2488, 40.8359), 4326),
                'RESOLVED'::"BarrierState", ${user1Id}::uuid, ${types[1].id}, NOW());
    `;

    // 6. INTERAZIONI: FEEDBACK, REPORT E RESOLUTION
    console.log('💬 Aggiunta di recensioni, segnalazioni e risoluzioni...');

    // Feedback sulla Barriera 1
    await prisma.feedback.create({
        data: {rating: 4, comment: 'Confermo, molto scomodo.', userId: user2Id, barrierId: barrier1Id}
    });

    // Report (Segnalazioni) sulla Barriera 2 per giustificare lo stato 'IN_REVIEW'
    await prisma.report.create({
        data: {reason: 'DOES_NOT_EXIST', status: 'PENDING', userId: user1Id, barrierId: barrier2Id}
    });

    // Resolution finta e PENDING sulla Barriera 1 (in attesa di admin)
    await prisma.resolution.create({
        data: {
            status: 'PENDING',
            evidenceUrl: 'https://placehold.co/600x400/png',
            comment: 'Hanno messo la pedana mobile!',
            userId: user2Id,
            barrierId: barrier1Id
        }
    });

    console.log('✅ Seeding completato con successo!');
}

main()
    .catch((e) => {
        console.error('❌ Errore durante il seeding:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });