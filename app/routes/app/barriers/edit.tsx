import {useState} from "react";
import type {ActionFunctionArgs, LoaderFunctionArgs} from "react-router";
import {
    Link,
    redirect,
    useActionData,
    useLoaderData,
    useNavigation as useReactNavigation,
    useSubmit
} from "react-router";
import {prisma} from "~/db.server";
import {envSchema} from "~/utils/envSchema";
import {useAuth} from "~/context/AuthContext";
import {ArrowLeft, ShieldAlert} from "lucide-react";
import {barrierFormSchema} from "~/utils/validations";
import {uploadBarrierPhotos} from "~/utils/storage";
import BarrierForm from "~/components/barrier/BarrierForm";

export async function loader({params}: LoaderFunctionArgs) {
    const {id} = params;
    if (!id) throw new Response("ID mancante", {status: 400});

    const result = await prisma.$queryRaw<any[]>`
        SELECT id,
               title,
               description,
               address,
               "photoUrls",
               difficulty,
               "typeId",
               "userId",
               state,
               ST_X(location::geometry) as lng,
               ST_Y(location::geometry) as lat
        FROM "Barrier"
        WHERE id = ${id}
    `;

    const barrier = result[0];
    if (!barrier) throw new Response("Barriera non trovata", {status: 404});

    const types = await prisma.barrierType.findMany({orderBy: {label: 'asc'}});
    const env = envSchema.parse(process.env);

    return {barrier, types, mapboxToken: env.VITE_MAPBOX_TOKEN};
}

export async function action({request, params}: ActionFunctionArgs) {
    const {id: barrierId} = params;
    const formData = await request.formData();
    const rawData = Object.fromEntries(formData);

    const parsed = barrierFormSchema.safeParse(rawData);
    if (!parsed.success) {
        return {error: parsed.error.issues[0].message};
    }

    const data = parsed.data;

    try {
        const existingBarrier = await prisma.barrier.findUnique({where: {id: barrierId}});
        if (!existingBarrier) return {error: "Barriera non trovata"};

        const user = await prisma.user.findUnique({where: {id: data.userId}});
        if (!user || (existingBarrier.userId !== user.id && user.role !== "ADMIN")) {
            return {error: "Non sei autorizzato a modificare questa barriera."};
        }

        await prisma.$executeRaw`
            UPDATE "Barrier"
            SET title       = ${data.title},
                description = ${data.description},
                address     = ${data.address},
                "photoUrls" = CAST(${data.photoUrls} AS text[]),
                difficulty  = ${data.difficulty}::integer,
                location = ST_SetSRID(ST_MakePoint(${data.lng}:: float, ${data.lat}:: float), 4326), 
                "typeId" = ${data.typeId},
                "updatedAt" = NOW()
            WHERE id = ${barrierId}
        `;

        return redirect(`/app/barriers/${barrierId}?updated=true`);
    } catch {
        return {error: "Errore durante l'aggiornamento nel database."};
    }
}

export default function EditBarrierPage() {
    const {barrier, types, mapboxToken} = useLoaderData<typeof loader>();
    const actionData = useActionData<typeof action>();
    const submit = useSubmit();
    const navigation = useReactNavigation();
    const {user, profile} = useAuth();

    const [isUploading, setIsUploading] = useState(false);
    const [clientError, setClientError] = useState<string | null>(null);

    const isSubmitting = isUploading || navigation.state === "submitting";
    const displayError = clientError || actionData?.error || null;

    // Blocco permessi
    if (profile && profile.id !== barrier.userId && profile.role !== "ADMIN") {
        return (
            <div className="p-6 max-w-xl mx-auto text-center mt-20 space-y-4">
                <ShieldAlert className="w-16 h-16 text-error mx-auto opacity-80"/>
                <h1 className="text-2xl font-bold text-text">Accesso Negato</h1>
                <p className="text-text-muted">Non hai i permessi per modificare questa barriera perché non ne sei il
                    creatore.</p>
                <Link to={`/app/barriers/${barrier.id}`}
                      className="inline-flex mt-4 bg-primary text-white px-6 py-3 rounded-xl font-bold shadow hover:bg-primary/90 transition">Torna
                    alla Barriera</Link>
            </div>
        );
    }

    const handleFormSubmit = async (formData: FormData, newPhotos: File[], existingPhotos: string[], address: string, lat: number | null, lng: number | null, difficulty: number) => {
        setClientError(null);

        if (existingPhotos.length === 0 && newPhotos.length === 0) return setClientError("Devi lasciare almeno una foto della barriera.");
        if (!lat || !lng) return setClientError("Tocca la mappa per impostare la posizione.");
        if (!user) return;

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
            const newlyUploadedUrls = await uploadBarrierPhotos(newPhotos);
            const finalPhotoUrls = [...existingPhotos, ...newlyUploadedUrls];

            formData.set("photoUrls", JSON.stringify(finalPhotoUrls));
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
        <div className="p-4 md:p-6 max-w-3xl mx-auto flex flex-col gap-6 animate-in fade-in duration-300 pb-20">
            <header className="flex items-center gap-4">
                <Link to={`/app/barriers/${barrier.id}`}
                      className="p-3 bg-surface border border-border rounded-full hover:bg-background transition-colors shadow-sm">
                    <ArrowLeft className="w-5 h-5 text-text"/>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-text">Modifica Barriera</h1>
                    <p className="text-sm text-text-muted mt-1">Aggiorna i dettagli della tua segnalazione.</p>
                </div>
            </header>

            <BarrierForm
                types={types}
                mapboxToken={mapboxToken}
                initialData={barrier}
                isSubmitting={isSubmitting}
                clientError={displayError}
                onSubmit={handleFormSubmit}
            />
        </div>
    );
}