import {PrismaClient, Role, BarrierState} from '@prisma/client';
import {fakerIT as faker} from '@faker-js/faker'; // Uso il locale IT per nomi italiani

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Inizio del Seeding...');

    // 1. PULIZIA DEL DATABASE (Ordine inverso per evitare errori di Foreign Key)
    await prisma.notification.deleteMany();
    await prisma.deviceToken.deleteMany();
    await prisma.resolution.deleteMany();
    await prisma.report.deleteMany();
    await prisma.feedback.deleteMany();
    await prisma.barrier.deleteMany();
    await prisma.user.deleteMany();
    await prisma.barrierType.deleteMany();
    await prisma.disability.deleteMany();

    console.log('🧹 Database pulito.');

    // 2. CREAZIONE TIPI DI DISABILITÀ
    const disMotor = await prisma.disability.create({
        data: {name: 'Motoria', description: 'Difficoltà di movimento', mobilityLevel: 50},
    });
    const disWheelchair = await prisma.disability.create({
        data: {name: 'Sedia a rotelle', description: 'Uso esclusivo di carrozzina', mobilityLevel: 0},
    });
    console.log('✅ Disabilità create.');

    // 3. CREAZIONE TIPI DI BARRIERA
    const typeStairs = await prisma.barrierType.create({
        data: {
            label: 'Scale senza rampa',
            defaultDifficulty: 5,
            iconKey: 'stairs',
            colorHex: '#FF0000'
        },
    });
    const typeHole = await prisma.barrierType.create({
        data: {
            label: 'Buca profonda',
            defaultDifficulty: 3,
            iconKey: 'alert-circle',
            colorHex: '#FFA500'
        },
    });
    const typeNarrow = await prisma.barrierType.create({
        data: {
            label: 'Marciapiede stretto',
            defaultDifficulty: 2,
            iconKey: 'narrow',
            colorHex: '#FFFF00'
        },
    });
    const barrierTypes = [typeStairs, typeHole, typeNarrow];
    console.log('✅ Tipi di Barriera creati.');

    // 4. CREAZIONE UTENTI
    // Creiamo un Admin fisso per i tuoi test
    const ADMIN_ID = "11111111-1111-1111-1111-111111111111";

    const admin = await prisma.user.create({
        data: {
            id: ADMIN_ID,
            email: 'admin@test.com',
            firstName: 'Super',
            lastName: 'Admin',
            role: Role.ADMIN,
            reputationScore: 100,
        },
    });

    // Creiamo 10 utenti random
    const users = [];
    for (let i = 0; i < 10; i++) {
        const user = await prisma.user.create({
            data: {
                id: faker.string.uuid(),
                email: faker.internet.email(),
                firstName: faker.person.firstName(),
                lastName: faker.person.lastName(),
                profilePicUrl: faker.image.avatar(),
                disabilityId: Math.random() > 0.5 ? disMotor.id : undefined,
                reputationScore: faker.number.int({min: 0, max: 50}),
            },
        });
        users.push(user);
    }
    console.log(`✅ Creati ${users.length + 1} utenti.`);

    // 5. CREAZIONE BARRIERE (Con SQL Raw per PostGIS)
    // Generiamo barriere attorno al Colosseo (Lat: 41.8902, Lng: 12.4922)
    console.log('🚧 Creazione barriere geolocalizzate...');

    for (let i = 0; i < 20; i++) {
        const randomUser = users[Math.floor(Math.random() * users.length)];
        const randomType = barrierTypes[Math.floor(Math.random() * barrierTypes.length)];

        // Genera coordinate vicine (entro ~500m)
        const lat = 41.8902 + (Math.random() - 0.5) * 0.01;
        const lng = 12.4922 + (Math.random() - 0.5) * 0.01;

        const barrierId = faker.string.uuid();
        const title = faker.lorem.words(3);
        const desc = faker.lorem.sentence();
        const address = "Via dei Fori Imperiali, Roma";

        // INSERT RAW: Necessario per inserire il punto geometrico
        await prisma.$executeRaw`
            INSERT INTO "Barrier" (id, title, description, address, difficulty, location, state, "createdAt",
                                   "updatedAt", "userId", "typeId", "photoUrls")
            VALUES (${barrierId}::uuid,
                    ${title},
                    ${desc},
                    ${address},
                    ${randomType.defaultDifficulty},
                    ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326),
                    'ACTIVE',
                    NOW(),
                    NOW(),
                    ${randomUser.id}::uuid,
                    ${randomType.id}::uuid,
                    ARRAY['https://picsum.photos/200/300']);
        `;

        // 6. CREAZIONE FEEDBACK PER OGNI BARRIERA
        // Aggiungiamo 0-3 feedback per barriera
        const numFeedbacks = Math.floor(Math.random() * 4);
        for (let j = 0; j < numFeedbacks; j++) {
            // Scegliamo un utente diverso dal creatore
            const voter = users.filter(u => u.id !== randomUser.id)[j % (users.length - 1)];

            if (voter) {
                await prisma.feedback.create({
                    data: {
                        rating: faker.number.int({min: 1, max: 5}),
                        comment: faker.lorem.sentence(),
                        userId: voter.id,
                        barrierId: barrierId, // Usiamo l'ID generato sopra
                    },
                });
            }
        }
    }

    console.log('✅ Barriere e Feedback inseriti.');
    console.log('🚀 Seeding completato con successo!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });