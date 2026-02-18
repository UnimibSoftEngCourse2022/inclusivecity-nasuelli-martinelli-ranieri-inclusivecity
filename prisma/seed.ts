import {PrismaClient} from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Inizio del Seeding (Solo Disabilità)...');

    // 1. PULIZIA DEL DATABASE
    // Cancelliamo tutto in ordine inverso per evitare errori di Foreign Key
    // se il DB contiene già dei dati collegati.
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
        {
            name: 'Disabilità Visiva',
            description: 'Cecità totale o ipovisione.',
            mobilityLevel: 80,
            iconName: 'Eye'
        },
        {
            name: 'Disabilità Uditiva',
            description: 'Sordità totale o parziale.',
            mobilityLevel: 90,
            iconName: 'Ear'
        },
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

    for (const d of disabilitiesData) {
        await prisma.disability.create({data: d});
    }

    console.log(`✅ Create ${disabilitiesData.length} tipologie di disabilità.`);
    console.log('🚀 Seeding completato!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });