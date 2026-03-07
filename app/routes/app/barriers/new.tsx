import {useState} from "react";
import {redirect, useActionData, useLoaderData, useNavigation as useReactNavigation, useSubmit} from "react-router";
import {prisma} from "~/db.server";
import {envSchema} from "~/utils/envSchema";
import {useAuth} from "~/context/AuthContext";
import {barrierFormSchema} from "~/utils/validations";
import {uploadBarrierPhotos} from "~/utils/storage";
import BarrierForm from "~/components/barrier/BarrierForm";
import PageHeader from "~/components/ui/PageHeader";
import PageWrapper from "~/components/ui/PageWrapper";

export async function loader() {
    const types = await prisma.barrierType.findMany({orderBy: {label: 'asc'}});
    const env = envSchema.parse(process.env);
    return {types, mapboxToken: env.VITE_MAPBOX_TOKEN};
}

export async function action({request}: { request: Request }) {
    const formData = await request.formData();
    const rawData = Object.fromEntries(formData);

    const parsed = barrierFormSchema.safeParse(rawData);
    if (!parsed.success) {
        return {error: parsed.error.issues[0].message};
    }

    const data = parsed.data;

    try {
        const barrierId = crypto.randomUUID();

        await prisma.$executeRaw`
            INSERT INTO "Barrier" (id, title, description, address, "photoUrls", difficulty, location, state, "userId",
                                   "typeId", "updatedAt")
            VALUES (${barrierId},
                    ${data.title},
                    ${data.description},
                    ${data.address},
                    CAST(${data.photoUrls} AS text[]),
                    ${data.difficulty}::integer,
                    ST_SetSRID(ST_MakePoint(${data.lng}::float, ${data.lat}::float), 4326),
                    'ACTIVE'::"BarrierState",
                    ${data.userId}::uuid,
                    ${data.typeId},
                    NOW())
        `;

        await prisma.user.update({
            where: {id: data.userId},
            data: {reputationScore: {increment: 2}}
        });

        return redirect(`/app/barriers/${barrierId}?new=true`);
    } catch {
        return {error: "Errore durante il salvataggio nel database."};
    }
}

export default function NewBarrier() {
    const {types, mapboxToken} = useLoaderData<typeof loader>();
    const actionData = useActionData<typeof action>();
    const submit = useSubmit();
    const navigation = useReactNavigation();
    const {user} = useAuth();

    const [isUploading, setIsUploading] = useState(false);
    const [clientError, setClientError] = useState<string | null>(null);

    const isSubmitting = isUploading || navigation.state === "submitting";
    const displayError = clientError || actionData?.error || null;

    const handleFormSubmit = async (formData: FormData, newPhotos: File[], existingPhotos: string[], address: string, lat: number | null, lng: number | null, difficulty: number) => {
        setClientError(null);

        if (!lat || !lng) return setClientError("Tocca la mappa per impostare la posizione esatta.");
        if (newPhotos.length === 0) return setClientError("Inserisci almeno una foto della barriera.");
        if (!user) return setClientError("Devi effettuare l'accesso.");

        const formValues = {
            title: formData.get("title"),
            description: formData.get("description"),
            address: address.trim() || "Indirizzo generico",
            difficulty: difficulty,
            typeId: formData.get("typeId"),
            userId: user.id,
            lat, lng,
        };

        const clientSchema = barrierFormSchema.omit({photoUrls: true});
        const parsed = clientSchema.safeParse(formValues);

        if (!parsed.success) {
            setClientError(parsed.error.issues[0].message);
            window.scrollTo({top: 0, behavior: "smooth"});
            return;
        }

        setIsUploading(true);
        try {
            const uploadedUrls = await uploadBarrierPhotos(newPhotos);

            formData.set("photoUrls", JSON.stringify(uploadedUrls));
            formData.set("lat", String(lat));
            formData.set("lng", String(lng));
            formData.set("difficulty", String(difficulty));
            formData.set("address", formValues.address);
            formData.set("userId", user.id);

            submit(formData, {method: "post"});
        } catch (err: any) {
            setClientError(err.message || "Errore imprevisto.");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <PageWrapper>
            <PageHeader
                title="Segnala una barriera"
                subtitle="Aiuta la community mappando un nuovo ostacolo."
                showBack={false}
            />

            <BarrierForm
                types={types}
                mapboxToken={mapboxToken}
                isSubmitting={isSubmitting}
                clientError={displayError}
                onSubmit={handleFormSubmit}
            />
        </PageWrapper>
    );
}