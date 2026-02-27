import {PrismaClient} from '@prisma/client';
import crypto from 'node:crypto';

const prisma = new PrismaClient();

// Funzione helper per ottenere un numero casuale in un range
function getRandomInRange(min: number, max: number) {
    return Math.random() * (max - min) + min;
}

// Helper per inserire rapidamente barriere usando raw SQL
async function insertBarrierRaw( // NOSONAR
    id: string, title: string, description: string, address: string,
    difficulty: number, lat: number, lng: number, state: string,
    userId: string, typeId: string
) {
    await prisma.$executeRaw`
        INSERT INTO "Barrier" (id, title, description, address, "photoUrls", difficulty, location, state, "userId",
                               "typeId", "updatedAt")
        VALUES (${id}::uuid, ${title}, ${description}, ${address},
                ARRAY['https://placehold.co/600x400/png']::text[], ${difficulty},
                ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326),
                ${state}::"BarrierState", ${userId}::uuid, ${typeId}, NOW());
    `;
}

async function main() {
    console.log('🌱 Inizio del Seeding completo del Database...');

    // 1. PULIZIA PROFONDA DEL DATABASE
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
        {label: 'Gradino / Scala', defaultDifficulty: 50, iconKey: 'Stairs', colorHex: '#EF4444'},
        {label: 'Ascensore Guasto', defaultDifficulty: 80, iconKey: 'Elevator', colorHex: '#F97316'},
        {label: 'Ostacolo sul marciapiede', defaultDifficulty: 40, iconKey: 'AlertTriangle', colorHex: '#EAB308'},
        {label: 'Attraversamento Pericoloso', defaultDifficulty: 90, iconKey: 'MapPin', colorHex: '#3B82F6'}
    ];

    const types = [];
    for (const bt of barrierTypesData) {
        types.push(await prisma.barrierType.create({data: bt}));
    }

    // 4. CREAZIONE UTENTI MOCK
    console.log('👤 Creazione utenti...');
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

    const userIds = [adminId, user1Id, user2Id];

    // 5. CREAZIONE BARRIERE MANUALI
    console.log('📍 Creazione barriere manuali sulla mappa...');
    const barrier1Id = crypto.randomUUID();
    const barrier2Id = crypto.randomUUID();
    const barrier3Id = crypto.randomUUID();

    // Nota: diff da 3,4,5 a 50, 80, 90
    await insertBarrierRaw(barrier1Id, 'Gradino alto ingresso negozio', 'C\'è un gradino di 15cm senza rampa.', 'Piazza del Duomo, Milano', 50, 45.4642, 9.1899, 'ACTIVE', user1Id, types[0].id);
    await insertBarrierRaw(barrier2Id, 'Lavori in corso bloccano marciapiede', 'Transenne ovunque, impossibile passare.', 'Piazza del Colosseo, Roma', 80, 41.8902, 12.4922, 'IN_REVIEW', user2Id, types[2].id);
    await insertBarrierRaw(barrier3Id, 'Ascensore Metro guasto', 'Ascensore fermo da due settimane.', 'Piazza del Plebiscito, Napoli', 90, 40.8359, 14.2488, 'RESOLVED', user1Id, types[1].id);

    // 6. GENERAZIONE MASSIVA: 100 A MILANO
    console.log('🏙️ Generazione di 100 barriere casuali a Milano...');
    const states = ['ACTIVE', 'ACTIVE', 'ACTIVE', 'IN_REVIEW', 'RESOLVED']; // Più probabilità che siano ACTIVE

    for (let i = 0; i < 100; i++) {
        const t = types[Math.floor(Math.random() * types.length)];
        const u = userIds[Math.floor(Math.random() * userIds.length)];
        const s = states[Math.floor(Math.random() * states.length)];

        // Varia la difficoltà di default del +- 15
        let diff = t.defaultDifficulty + Math.floor(getRandomInRange(-15, 15));
        diff = Math.max(0, Math.min(100, diff)); // Assicura che sia tra 0 e 100

        // Coordinate indicative di Milano (da San Siro a Lambrate circa)
        const lat = getRandomInRange(45.43, 45.5);
        const lng = getRandomInRange(9.12, 9.24);

        await insertBarrierRaw(
            crypto.randomUUID(),
            `${t.label} Segnalato`,
            `Barriera generata automaticamente per test di carico mappa.`,
            'Milano, MI',
            diff, lat, lng, s, u, t.id
        );
    }

    // 7. GENERAZIONE MASSIVA: 10 AD ANTEGNATE
    console.log('🏘️ Generazione di 10 barriere casuali ad Antegnate...');
    for (let i = 0; i < 10; i++) {
        const t = types[Math.floor(Math.random() * types.length)];
        const u = userIds[Math.floor(Math.random() * userIds.length)];
        const s = states[Math.floor(Math.random() * states.length)];

        let diff = t.defaultDifficulty + Math.floor(getRandomInRange(-15, 15));
        diff = Math.max(0, Math.min(100, diff));

        // Coordinate indicative per Antegnate (BG)
        const lat = getRandomInRange(45.475, 45.49);
        const lng = getRandomInRange(9.77, 9.795);

        await insertBarrierRaw(
            crypto.randomUUID(),
            `Problema ad Antegnate: ${t.label}`,
            `Segnalazione fittizia generata in zona Antegnate.`,
            'Antegnate, BG',
            diff, lat, lng, s, u, t.id
        );
    }

    // 8. INTERAZIONI MOCK SULLE BARRIERE ORIGINALI
    console.log('💬 Aggiunta di recensioni, segnalazioni e risoluzioni...');
    await prisma.feedback.create({
        data: {
            rating: 4,
            comment: 'Confermo, molto scomodo.',
            userId: user2Id,
            barrierId: barrier1Id
        }
    });
    await prisma.report.create({
        data: {
            reason: 'DOES_NOT_EXIST',
            status: 'PENDING',
            userId: user1Id,
            barrierId: barrier2Id
        }
    });
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
    .finally(async () => { // NOSONAR
        await prisma.$disconnect();
    });