import {type BarrierType, PrismaClient} from '@prisma/client';
import crypto from 'node:crypto';

const prisma = new PrismaClient();

// Helper per coordinate casuali
function getRandomInRange(min: number, max: number) {
    return Math.random() * (max - min) + min;
}

// Helper per query SQL raw spaziale
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
    console.log('🌱 Inizio del Seeding Non-Distruttivo del Database...');

    // 1. PULIZIA CHIRURGICA DEI VECCHI DATI DI SEED
    console.log('🧹 Eliminazione dei vecchi dati di seed...');
    const seedUsers = await prisma.user.findMany({
        where: {email: {startsWith: 'seed_'}},
        select: {id: true}
    });

    const seedUserIds = seedUsers.map(u => u.id);

    if (seedUserIds.length > 0) {
        await prisma.resolution.deleteMany({where: {userId: {in: seedUserIds}}});
        await prisma.report.deleteMany({where: {userId: {in: seedUserIds}}});
        await prisma.feedback.deleteMany({where: {userId: {in: seedUserIds}}});
        await prisma.barrier.deleteMany({where: {userId: {in: seedUserIds}}});
        await prisma.user.deleteMany({where: {id: {in: seedUserIds}}});
        console.log(`✅ Eliminati ${seedUserIds.length} utenti di seed e relative dipendenze.`);
    } else {
        console.log('Nessun dato di seed trovato. Procedo con la creazione.');
    }

    // 2. CREAZIONE O RECUPERO DISABILITÀ (Senza eliminare)
    console.log('♿ Verifica tipologie di disabilità...');
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
        let existing = await prisma.disability.findFirst({where: {name: d.name}});
        existing ??= await prisma.disability.create({data: d});
        createdDisabilities.push(existing);
    }

    // 3. CREAZIONE O RECUPERO TIPI DI BARRIERA (Ampliati)
    console.log('🚧 Verifica categorie di barriere...');
    const barrierTypesData = [
        {label: 'Gradino / Scala', defaultDifficulty: 50, iconKey: 'TrendingUp', colorHex: '#EF4444'},
        {label: 'Ascensore Guasto', defaultDifficulty: 80, iconKey: 'ArrowUpDown', colorHex: '#F97316'},
        {label: 'Ostacolo sul marciapiede', defaultDifficulty: 40, iconKey: 'AlertTriangle', colorHex: '#EAB308'},
        {label: 'Attraversamento Pericoloso', defaultDifficulty: 90, iconKey: 'AlertOctagon', colorHex: '#3B82F6'},
        {label: 'Porta Stretta / Inaccessibile', defaultDifficulty: 50, iconKey: 'DoorClosed', colorHex: '#8B5CF6'},
        {label: 'Pavimentazione Sconnessa', defaultDifficulty: 40, iconKey: 'Grip', colorHex: '#A16207'},
        {label: 'Rampa Troppo Ripida', defaultDifficulty: 60, iconKey: 'Activity', colorHex: '#E11D48'},
        {label: 'Semaforo Senza Segnale Acustico', defaultDifficulty: 80, iconKey: 'VolumeX', colorHex: '#06B6D4'},
        {label: 'Mancanza Percorso Tattile', defaultDifficulty: 80, iconKey: 'MoreHorizontal', colorHex: '#4F46E5'},
        {label: 'Parcheggio Disabili Bloccato', defaultDifficulty: 60, iconKey: 'CarFront', colorHex: '#0284C7'}
    ];

    const types: BarrierType[] = [];
    for (const bt of barrierTypesData) {
        let existing = await prisma.barrierType.findFirst({where: {label: bt.label}});
        if (existing) {
            existing = await prisma.barrierType.update({
                where: {id: existing.id},
                data: {iconKey: bt.iconKey, colorHex: bt.colorHex}
            });
        } else {
            existing = await prisma.barrierType.create({data: bt});
        }
        types.push(existing);
    }

    // 4. CREAZIONE NUOVI UTENTI MOCK (Con prefisso seed_)
    console.log('👤 Creazione utenti seed...');
    const admin = await prisma.user.create({
        data: {
            id: crypto.randomUUID(),
            email: 'seed_admin@inclusivecity.com',
            firstName: 'Admin',
            lastName: 'Seed',
            role: 'ADMIN',
            reputationScore: 100,
            disabilityId: createdDisabilities[6].id
        }
    });
    const user1 = await prisma.user.create({
        data: {
            id: crypto.randomUUID(),
            email: 'seed_mario.rossi@example.com',
            firstName: 'Mario',
            lastName: 'Seed',
            role: 'USER',
            reputationScore: 25,
            disabilityId: createdDisabilities[1].id
        }
    });
    const user2 = await prisma.user.create({
        data: {
            id: crypto.randomUUID(),
            email: 'seed_giulia.bianchi@example.com',
            firstName: 'Giulia',
            lastName: 'Seed',
            role: 'USER',
            reputationScore: 5,
            disabilityId: createdDisabilities[5].id
        }
    });

    const userIds = [admin.id, user1.id, user2.id];

    // 5. BARRIERE MANUALI
    console.log('📍 Creazione barriere manuali...');
    const b1Id = crypto.randomUUID();
    const b2Id = crypto.randomUUID();
    const b3Id = crypto.randomUUID();

    await insertBarrierRaw(b1Id, 'Gradino alto ingresso negozio', 'C\'è un gradino di 15cm senza rampa.', 'Piazza del Duomo, Milano', 50, 45.4642, 9.1899, 'ACTIVE', user1.id, types[0].id);
    await insertBarrierRaw(b2Id, 'Lavori in corso bloccano marciapiede', 'Transenne ovunque, impossibile passare.', 'Piazza del Colosseo, Roma', 80, 41.8902, 12.4922, 'IN_REVIEW', user2.id, types[2].id);
    await insertBarrierRaw(b3Id, 'Ascensore Metro guasto', 'Ascensore fermo.', 'Piazza del Plebiscito, Napoli', 90, 40.8359, 14.2488, 'RESOLVED', user1.id, types[1].id);

    // 6. GENERAZIONE MASSIVA
    console.log('🏙️ Generazione massiva barriere (Milano e Antegnate)...');
    const states = ['ACTIVE', 'ACTIVE', 'IN_REVIEW', 'IN_REVIEW', 'RESOLVED'];

    const generateBarriers = async (count: number, latMin: number, latMax: number, lngMin: number, lngMax: number, city: string) => {
        for (let i = 0; i < count; i++) {
            const t = types[Math.floor(Math.random() * types.length)];
            const u = userIds[Math.floor(Math.random() * userIds.length)];
            const state = states[Math.floor(Math.random() * states.length)];

            let diff = t.defaultDifficulty + Math.floor(getRandomInRange(-15, 15));
            diff = Math.max(0, Math.min(100, diff));

            const lat = getRandomInRange(latMin, latMax);
            const lng = getRandomInRange(lngMin, lngMax);
            const barrierId = crypto.randomUUID();

            await insertBarrierRaw(
                barrierId, `${t.label} Segnalato`, `Barriera generata automaticamente per testare la mappa.`, `${city}, Italia`,
                diff, lat, lng, state, u, t.id
            );

            if (state === 'IN_REVIEW') {
                await prisma.report.create({
                    data: {
                        reason: 'DOES_NOT_EXIST',
                        status: 'PENDING',
                        userId: u,
                        barrierId: barrierId
                    }
                });
            }
        }
    };

    await generateBarriers(100, 45.43, 45.5, 9.12, 9.24, "Milano");
    await generateBarriers(10, 45.475, 45.49, 9.77, 9.795, "Antegnate");

    console.log('💬 Aggiunta recensioni e segnalazioni extra...');
    await prisma.feedback.create({
        data: {
            rating: 4,
            comment: 'Confermo, molto scomodo.',
            userId: user2.id,
            barrierId: b1Id
        }
    });
    await prisma.report.create({data: {reason: 'OTHER', status: 'PENDING', userId: user1.id, barrierId: b2Id}});
    await prisma.resolution.create({
        data: {
            status: 'PENDING',
            evidenceUrl: 'https://placehold.co/600x400/png',
            comment: 'Risolto!',
            userId: user2.id,
            barrierId: b1Id
        }
    });

    console.log('✅ Seeding Non-Distruttivo completato con successo!');
}

main()
    .catch((e) => {
        console.error('❌ Errore durante il seeding:', e);
        process.exit(1);
    })
    .finally(async () => { // NOSONAR
        await prisma.$disconnect();
    });