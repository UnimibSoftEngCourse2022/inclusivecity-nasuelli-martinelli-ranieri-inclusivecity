import {type BarrierType, PrismaClient} from '@prisma/client';
import crypto from 'node:crypto';

const prisma = new PrismaClient();

// Helper per coordinate casuali (Area di Milano)
function getRandomInRange(min: number, max: number) {
    return Math.random() * (max - min) + min;
}

// Limiti geografici di Milano
const MILANO_BOUNDS = {latMin: 45.43, latMax: 45.5, lngMin: 9.12, lngMax: 9.24};

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

    // PULIZIA CHIRURGICA DEI VECCHI DATI DI SEED
    console.log('🧹 Eliminazione dei vecchi dati di seed...');
    const seedUsers = await prisma.user.findMany({
        where: {email: {startsWith: 'seed_'}},
        select: {id: true}
    });

    const seedUserIds = seedUsers.map(u => u.id);

    if (seedUserIds.length > 0) {
        await prisma.resolution.deleteMany({where: {barrier: {userId: {in: seedUserIds}}}});
        await prisma.report.deleteMany({where: {barrier: {userId: {in: seedUserIds}}}});
        await prisma.feedback.deleteMany({where: {barrier: {userId: {in: seedUserIds}}}});

        await prisma.resolution.deleteMany({where: {userId: {in: seedUserIds}}});
        await prisma.report.deleteMany({where: {userId: {in: seedUserIds}}});
        await prisma.feedback.deleteMany({where: {userId: {in: seedUserIds}}});
        await prisma.barrier.deleteMany({where: {userId: {in: seedUserIds}}});
        await prisma.user.deleteMany({where: {id: {in: seedUserIds}}});
        console.log(`✅ Eliminati ${seedUserIds.length} utenti di seed e relative dipendenze.`);
    }

    // CREAZIONE O RECUPERO DISABILITÀ
    console.log('♿ Creazione tipologie di disabilità...');
    const disabilitiesData = [
        // Livello 10: Bloccati da tutto ciò che ha difficoltà >= 20
        {
            name: 'Sedia a rotelle',
            description: 'Uso esclusivo di carrozzina.',
            mobilityLevel: 10,
            iconName: 'Accessibility'
        },
        // Livello 30: Possono superare piccole pendenze, ma bloccati da porte strette (>= 40)
        {
            name: 'Genitore con Passeggino',
            description: 'Necessità di percorsi ampi e senza gradini.',
            mobilityLevel: 30,
            iconName: 'Baby'
        },
        // Livello 50: Superano porte strette, ma bloccati da scale/gradini (>= 60)
        {
            name: 'Disabilità Motoria',
            description: 'Difficoltà di movimento o uso di ausili.',
            mobilityLevel: 50,
            iconName: 'Accessibility'
        },
        // Livello 70: Possono fare le scale, ma bloccati da barriere sensoriali (>= 75)
        {name: 'Disabilità Visiva', description: 'Cecità totale o ipovisione.', mobilityLevel: 70, iconName: 'Eye'},
        // Livello 80: Superano ostacoli fisici e tattili, fermati solo da pericoli gravi (>= 90)
        {name: 'Disabilità Uditiva', description: 'Sordità totale o parziale.', mobilityLevel: 80, iconName: 'Ear'},
        {
            name: 'Disabilità Cognitiva',
            description: 'Difficoltà di orientamento o memoria.',
            mobilityLevel: 80,
            iconName: 'Brain'
        },
        // Livello 100: Mobilità totale
        {
            name: 'Nessuna / Accompagnatore',
            description: 'Nessuna esigenza specifica.',
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

    // CREAZIONE O RECUPERO TIPI DI BARRIERA
    console.log('🚧 Verifica categorie di barriere...');
    const barrierTypesData = [
        // Difficoltà 20: Bloccano solo le sedie a rotelle (10)
        {label: 'Pavimentazione Sconnessa', defaultDifficulty: 20, iconKey: 'Grip', colorHex: '#A16207'},
        {label: 'Rampa Troppo Ripida', defaultDifficulty: 20, iconKey: 'Activity', colorHex: '#E11D48'},

        // Difficoltà 40: Bloccano sedie a rotelle (10) e passeggini (30)
        {label: 'Ostacolo sul marciapiede', defaultDifficulty: 40, iconKey: 'AlertTriangle', colorHex: '#EAB308'},
        {label: 'Porta Stretta / Inaccessibile', defaultDifficulty: 40, iconKey: 'DoorClosed', colorHex: '#8B5CF6'},

        // Difficoltà 60: Bloccano sedie a rotelle, passeggini e disabilità motorie (50)
        {label: 'Gradino / Scala', defaultDifficulty: 60, iconKey: 'TrendingUp', colorHex: '#EF4444'},
        {label: 'Ascensore Guasto', defaultDifficulty: 60, iconKey: 'ArrowUpDown', colorHex: '#F97316'},
        {label: 'Parcheggio Disabili Bloccato', defaultDifficulty: 60, iconKey: 'CarFront', colorHex: '#0284C7'},

        // Difficoltà 75: Bloccano anche le disabilità visive (70)
        {label: 'Mancanza Percorso Tattile', defaultDifficulty: 75, iconKey: 'MoreHorizontal', colorHex: '#4F46E5'},
        {label: 'Semaforo Senza Segnale Acustico', defaultDifficulty: 75, iconKey: 'VolumeX', colorHex: '#06B6D4'},

        // Difficoltà 90: Ostacoli critici, passa solo chi ha piena mobilità (100)
        {label: 'Attraversamento Pericoloso', defaultDifficulty: 90, iconKey: 'AlertOctagon', colorHex: '#3B82F6'}
    ];

    const types: BarrierType[] = [];
    for (const bt of barrierTypesData) {
        let existing = await prisma.barrierType.findFirst({where: {label: bt.label}});
        if (existing) {
            existing = await prisma.barrierType.update({
                where: {id: existing.id},
                data: {iconKey: bt.iconKey, colorHex: bt.colorHex, defaultDifficulty: bt.defaultDifficulty}
            });
        } else {
            existing = await prisma.barrierType.create({data: bt});
        }
        types.push(existing);
    }

    // CREAZIONE 5 UTENTI CON AFFIDABILITÀ DIVERSE
    console.log('👤 Creazione dei 5 utenti seed per test moderazione...');

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
    // rs >= 50: peso 3
    const userVeteran = await prisma.user.create({
        data: {
            id: crypto.randomUUID(),
            email: 'seed_veteran@example.com',
            firstName: 'Veterano',
            lastName: 'Seed',
            role: 'USER',
            reputationScore: 60,
            disabilityId: createdDisabilities[1].id
        }
    });
    // 20 <= rs < 50: peso 2
    const userHabitual = await prisma.user.create({
        data: {
            id: crypto.randomUUID(),
            email: 'seed_habitual@example.com',
            firstName: 'Abituale',
            lastName: 'Seed',
            role: 'USER',
            reputationScore: 30,
            disabilityId: createdDisabilities[0].id
        }
    });
    // 0 <= rs < 20: peso 1
    const userNew = await prisma.user.create({
        data: {
            id: crypto.randomUUID(),
            email: 'seed_new@example.com',
            firstName: 'Nuovo',
            lastName: 'Seed',
            role: 'USER',
            reputationScore: 10,
            disabilityId: createdDisabilities[5].id
        }
    });
    // rs < 0: peso 0
    const userUnreliable = await prisma.user.create({
        data: {
            id: crypto.randomUUID(),
            email: 'seed_unreliable@example.com',
            firstName: 'Inaffidabile',
            lastName: 'Seed',
            role: 'USER',
            reputationScore: -5,
            disabilityId: createdDisabilities[2].id
        }
    });

    const allUserIds = [admin.id, userVeteran.id, userHabitual.id, userNew.id, userUnreliable.id];

    // Helper per estrarre utente e tipo casuale
    const getRandomUser = () => allUserIds[Math.floor(Math.random() * allUserIds.length)];
    const getDistinctUsers = (n: number) => {
        const shuffled = [...allUserIds].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, n);
    };
    const getRandomType = () => types[Math.floor(Math.random() * types.length)];

    // GENERAZIONE 150 BARRIERE ACTIVE CON INTERAZIONI MASSIVE
    console.log('📍 Generazione di 150 barriere ACTIVE (con 2 feedback, 2 report, 2 resolution ciascuna)...');
    for (let i = 0; i < 150; i++) {
        const t = getRandomType();
        const bId = crypto.randomUUID();
        const lat = getRandomInRange(MILANO_BOUNDS.latMin, MILANO_BOUNDS.latMax);
        const lng = getRandomInRange(MILANO_BOUNDS.lngMin, MILANO_BOUNDS.lngMax);

        await insertBarrierRaw(
            bId, `${t.label} (Attiva)`, `Barriera attiva con varie segnalazioni generate.`, `Milano, Italia`,
            t.defaultDifficulty, lat, lng, 'ACTIVE', getRandomUser(), t.id
        );

        // Aggiungo 2 Feedbacks
        const [fbUser1, fbUser2] = getDistinctUsers(2);
        await prisma.feedback.createMany({
            data: [
                {
                    rating: Math.floor(Math.random() * 5) + 1,
                    comment: 'Pessima situazione, confermo.',
                    userId: fbUser1,
                    barrierId: bId
                },
                {
                    rating: Math.floor(Math.random() * 5) + 1,
                    comment: 'Ho fatto molta fatica a passare.',
                    userId: fbUser2,
                    barrierId: bId
                }
            ]
        });

        // Aggiungo 2 Reports (PENDING, così l'admin li vede)
        const [repUser1, repUser2] = getDistinctUsers(2);
        await prisma.report.createMany({
            data: [
                {reason: 'INAPPROPRIATE', status: 'PENDING', userId: repUser1, barrierId: bId},
                {reason: 'WRONG_LOCATION', status: 'PENDING', userId: repUser2, barrierId: bId}
            ]
        });

        // Aggiungo 2 Resolutions (PENDING, in attesa di approvazione)
        const [resUser1, resUser2] = getDistinctUsers(2);
        await prisma.resolution.createMany({
            data: [
                {
                    status: 'PENDING',
                    evidenceUrl: 'https://placehold.co/600x400/png',
                    comment: 'Sembra che l\'abbiano sistemata.',
                    userId: resUser1,
                    barrierId: bId
                },
                {
                    status: 'PENDING',
                    evidenceUrl: 'https://placehold.co/600x400/png',
                    comment: 'Ostacolo rimosso questa mattina.',
                    userId: resUser2,
                    barrierId: bId
                }
            ]
        });
    }

    // GENERAZIONE 50 BARRIERE IN_REVIEW
    console.log('👀 Generazione di 50 barriere IN_REVIEW (con 2 feedback, 2 resolution ciascuna)...');
    for (let i = 0; i < 50; i++) {
        const t = getRandomType();
        const bId = crypto.randomUUID();
        const lat = getRandomInRange(MILANO_BOUNDS.latMin, MILANO_BOUNDS.latMax);
        const lng = getRandomInRange(MILANO_BOUNDS.lngMin, MILANO_BOUNDS.lngMax);

        await insertBarrierRaw(
            bId, `${t.label} (In Revisione)`, `Barriera sotto indagine a causa di report.`, `Milano, Italia`,
            t.defaultDifficulty, lat, lng, 'IN_REVIEW', getRandomUser(), t.id
        );

        // Aggiungo 2 Feedbacks
        const [fbUser1, fbUser2] = getDistinctUsers(2);
        await prisma.feedback.createMany({
            data: [
                {
                    rating: Math.floor(Math.random() * 5) + 1,
                    comment: 'Non sono sicuro sia ancora qui.',
                    userId: fbUser1,
                    barrierId: bId
                },
                {
                    rating: Math.floor(Math.random() * 5) + 1,
                    comment: 'Situazione ambigua.',
                    userId: fbUser2,
                    barrierId: bId
                }
            ]
        });

        // Aggiungo 2 Resolutions (PENDING)
        const [resUser1, resUser2] = getDistinctUsers(2);
        await prisma.resolution.createMany({
            data: [
                {
                    status: 'PENDING',
                    evidenceUrl: 'https://placehold.co/600x400/png',
                    comment: 'Allego foto della presunta risoluzione.',
                    userId: resUser1,
                    barrierId: bId
                },
                {
                    status: 'PENDING',
                    evidenceUrl: 'https://placehold.co/600x400/png',
                    comment: 'Risolto secondo me.',
                    userId: resUser2,
                    barrierId: bId
                }
            ]
        });
    }

    // GENERAZIONE 10 BARRIERE HIDDEN (Simulazione post-moderazione)
    console.log('🕵️ Generazione di 10 barriere HIDDEN (nascoste per spam)...');
    for (let i = 0; i < 10; i++) {
        const t = getRandomType();
        const bId = crypto.randomUUID();
        const lat = getRandomInRange(MILANO_BOUNDS.latMin, MILANO_BOUNDS.latMax);
        const lng = getRandomInRange(MILANO_BOUNDS.lngMin, MILANO_BOUNDS.lngMax);

        // Inserisco direttamente come HIDDEN
        await insertBarrierRaw(
            bId, `Segnalazione Spam ${i}`, `Questa barriera è stata nascosta dalla community.`, `Milano Periferia, Italia`,
            t.defaultDifficulty, lat, lng, 'HIDDEN', userUnreliable.id, t.id
        );

        // Aggiungo i report che l'hanno fatta nascondere (Reviewati dall'admin/sistema) per mantenere consistenza
        await prisma.report.createMany({
            data: [
                {reason: 'DOES_NOT_EXIST', status: 'REVIEWED', userId: userVeteran.id, barrierId: bId},
                {reason: 'INAPPROPRIATE', status: 'REVIEWED', userId: userHabitual.id, barrierId: bId}
            ]
        });
    }

    console.log('✅ Seeding Completato con successo!');
}

main()
    .catch((e) => {
        console.error('❌ Errore durante il seeding:', e);
        process.exit(1);
    })
    .finally(async () => { // NOSONAR
        await prisma.$disconnect();
    });