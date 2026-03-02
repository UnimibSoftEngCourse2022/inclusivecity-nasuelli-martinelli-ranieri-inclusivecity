import {useEffect, useRef, useState} from "react";
import mapboxgl from "mapbox-gl";
import {supabase} from "~/services/supabase/supabase";
import {Loader2} from "lucide-react";
import {useAuth} from "~/context/AuthContext";
import {
    redirect,
    useActionData,
    useLoaderData,
    useNavigation as useReactNavigation,
    useSubmit,
    useSearchParams,
    Link
} from "react-router";
import {prisma} from "~/db.server";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

export async function loader() {
    const types = await prisma.barrierType.findMany({
        orderBy: {label: 'asc'}
    });
    return {types};
}

export async function action({request}: { request: Request }) {
    const formData = await request.formData();

    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const address = formData.get("address") as string;
    const difficulty = Number(formData.get("difficulty"));
    const typeId = formData.get("typeId") as string;
    const userId = formData.get("userId") as string;
    const lat = Number(formData.get("lat"));
    const lng = Number(formData.get("lng"));
    const photoUrls = JSON.parse(formData.get("photoUrls") as string || "[]");

    try {
        const barrierId = crypto.randomUUID();

        await prisma.$executeRaw`
            INSERT INTO "Barrier" (
                id, title, description, address, "photoUrls",
                difficulty, location, state, "userId", "typeId", "updatedAt"
            )
            VALUES (
                ${barrierId}::uuid,
                ${title},
                ${description},
                ${address},
                ${photoUrls},
                ${difficulty}::integer,
                ST_SetSRID(ST_MakePoint(${lng}::float, ${lat}::float), 4326),
                'IN_REVIEW'::"BarrierState",
                ${userId}::uuid,
                ${typeId},
                NOW()
            )
        `;

        return redirect("/app/barriers/new?success=true");

    } catch (error: any) {
        console.error("Errore Prisma:", error);
        return {error: "Errore durante il salvataggio nel database."};
    }
}

export default function NewBarrier() {
    const {types} = useLoaderData<typeof loader>();
    const actionData = useActionData<typeof action>();
    const submit = useSubmit();
    const navigation = useReactNavigation();
    const {user} = useAuth();

    const [searchParams] = useSearchParams();
    const success = searchParams.get("success") === "true";

    const isSubmittingToServer = navigation.state === "submitting";

    const mapContainer = useRef<HTMLDivElement | null>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const markerRef = useRef<mapboxgl.Marker | null>(null);
    const clickHandlerRef = useRef<((e: mapboxgl.MapMouseEvent) => void) | null>(null);

    const [coords, setCoords] = useState<{ lat: number | null; lng: number | null }>({lat: null, lng: null});
    const [selectedPhotos, setSelectedPhotos] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [clientError, setClientError] = useState<string | null>(null);

    const [query, setQuery] = useState("");
    const [suggestions, setSuggestions] = useState<any[]>([]);

    useEffect(() => {
        if (success) {
            window.scrollTo({top: 0, behavior: "smooth"});
        }
    }, [success]);

    useEffect(() => {
        if (!map.current && mapContainer.current) {
            map.current = new mapboxgl.Map({
                container: mapContainer.current,
                style: "mapbox://styles/mapbox/streets-v11",
                center: [9.19, 45.46],
                zoom: 12,
            });

            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const {latitude, longitude} = pos.coords;
                    map.current?.flyTo({center: [longitude, latitude], zoom: 14});
                },
                () => console.warn("Geolocalizzazione non consentita")
            );
        }

        if (!map.current) return;

        if (clickHandlerRef.current) map.current.off("click", clickHandlerRef.current);

        const handleClick = (e: mapboxgl.MapMouseEvent) => {
            const {lng, lat} = e.lngLat;
            setCoords({lat, lng});

            if (markerRef.current) {
                markerRef.current.setLngLat([lng, lat]);
            } else {
                markerRef.current = new mapboxgl.Marker().setLngLat([lng, lat]).addTo(map.current!);
            }
        };

        clickHandlerRef.current = handleClick;
        map.current.on("click", handleClick);
    }, []);

    async function fetchSuggestions(text: string) {
        if (text.length < 3) {
            setSuggestions([]);
            return;
        }
        try {
            const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(text)}.json?autocomplete=true&limit=5&language=it&access_token=${mapboxgl.accessToken}`);
            const data = await res.json();
            setSuggestions(data.features || []);
        } catch (err) {
            console.error(err);
        }
    }

    function goToLocation(feature: any) {
        const [lng, lat] = feature.center;
        map.current?.flyTo({center: [lng, lat], zoom: 16});
        setQuery(feature.place_name);
        setSuggestions([]);
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setClientError(null);

        if (!coords.lat || !coords.lng) {
            setClientError("Tocca la mappa per impostare la posizione della barriera.");
            window.scrollTo({top: 0, behavior: "smooth"});
            return;
        }

        if (!user) {
            setClientError("Devi effettuare l'accesso.");
            return;
        }

        setIsUploading(true);
        try {
            const formElement = e.currentTarget;
            const formData = new FormData(formElement);
            const photos = formData.getAll("photos") as File[];

            const photoUrls: string[] = [];
            for (const file of photos) {
                if (file.size === 0) continue;
                const fileExt = file.name.split(".").pop();
                const fileName = `barrier-${crypto.randomUUID()}.${fileExt}`;

                const {error: uploadError} = await supabase.storage.from("barrier-photos").upload(fileName, file);
                if (uploadError) throw new Error("Errore durante il caricamento delle foto.");

                const {data} = supabase.storage.from("barrier-photos").getPublicUrl(fileName);
                photoUrls.push(data.publicUrl);
            }

            formData.set("photoUrls", JSON.stringify(photoUrls));
            formData.set("lat", String(coords.lat));
            formData.set("lng", String(coords.lng));
            formData.set("address", query.trim() || "Indirizzo non specificato");
            formData.set("userId", user.id);
            formData.delete("photos");

            submit(formData, {method: "post"});

        } catch (err: any) {
            setClientError(err.message || "Errore imprevisto.");
        } finally {
            setIsUploading(false);
        }
    }

    const isBusy = isUploading || isSubmittingToServer;
    const displayError = clientError || actionData?.error;

    return (
        <div
            key={success ? "success" : "normal"}
            className="p-4 md:p-6 max-w-3xl mx-auto flex flex-col gap-6"
        >

            <h1 className="text-2xl font-bold text-text">Segnala una nuova barriera</h1>

            {success && (
                <div className="p-4 bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-xl text-sm font-medium flex flex-col gap-2">
                    <span>La barriera è stata creata con successo!</span>
                    <Link
                        to="/app/mybarriers"
                        className="text-primary underline font-semibold"
                    >
                        Vai a “Le mie barriere”
                    </Link>
                </div>
            )}

            {displayError && (
                <div className="p-4 bg-error/10 border border-error/20 text-error rounded-xl text-sm font-medium">
                    {displayError}
                </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">

                <div className="space-y-1">
                    <label className="text-sm font-medium text-text-muted">Titolo *</label>
                    <input type="text" name="title" required
                           className="w-full border border-border bg-surface px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-primary"/>
                </div>

                <div className="space-y-1">
                    <label className="text-sm font-medium text-text-muted">Descrizione *</label>
                    <textarea name="description" required rows={3}
                              className="w-full border border-border bg-surface px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-primary resize-none"/>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-text-muted">Categoria *</label>
                        <select name="typeId" required
                                className="w-full border border-border bg-surface px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-primary">
                            <option value="">Seleziona categoria</option>
                            {types.map((t) => (
                                <option key={t.id} value={t.id}>{t.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-text-muted">Difficoltà percepita *</label>
                        <select name="difficulty" required
                                className="w-full border border-border bg-surface px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-primary">
                            <option value="">Seleziona difficoltà</option>
                            <option value="20">20 - Molto facile</option>
                            <option value="40">40 - Facile</option>
                            <option value="60">60 - Media</option>
                            <option value="80">80 - Difficile</option>
                            <option value="100">100 - Molto difficile</option>
                        </select>
                    </div>
                </div>

                <div className="space-y-2 mt-2">
                    <label className="text-sm font-medium text-text-muted">Foto della barriera *</label>
                    <input id="photos" type="file" name="photos" accept="image/*" multiple className="hidden"
                           onChange={(e) => setSelectedPhotos(e.target.files?.length || 0)} required/>
                    <div className="flex items-center gap-4">
                        <label htmlFor="photos"
                               className="cursor-pointer bg-primary/10 text-primary font-semibold px-5 py-3 rounded-xl hover:bg-primary/20 border border-primary/20 transition">
                            Seleziona immagini
                        </label>
                        <p className="text-sm font-medium text-text">
                            {selectedPhotos === 0 ? "Nessuna foto" : `${selectedPhotos} foto selezionate`}
                        </p>
                    </div>
                </div>

                <div className="space-y-1 mt-4">
                    <label className="text-sm font-medium text-text-muted">Posizione *</label>
                    <p className="text-xs text-text-muted mb-2">Cerca un indirizzo e poi clicca sulla mappa per
                        confermare il punto esatto.</p>

                    <div
                        className="relative w-full h-80 rounded-xl border-2 border-border overflow-hidden shadow-inner">

                        <input
                            type="text"
                            value={query}
                            placeholder="Cerca un indirizzo per avvicinarti..."
                            className="absolute top-3 left-1/2 -translate-x-1/2 w-[90%] md:w-[80%] z-20 bg-surface border border-border px-4 py-3 rounded-full shadow-lg outline-none focus:ring-2 focus:ring-primary transition"
                            onChange={(e) => {
                                setQuery(e.target.value);
                                fetchSuggestions(e.target.value);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") e.preventDefault();
                            }}
                        />

                        {suggestions.length > 0 && (
                            <div
                                className="absolute top-16 left-1/2 -translate-x-1/2 w-[90%] md:w-[80%] bg-surface border border-border rounded-xl shadow-xl z-30 max-h-48 overflow-y-auto">
                                {suggestions.map((s) => (
                                    <div key={s.id}
                                         className="p-3 hover:bg-background cursor-pointer border-b border-border/50 text-sm"
                                         onClick={() => goToLocation(s)}>
                                        {s.place_name}
                                    </div>
                                ))}
                            </div>
                        )}

                        <div ref={mapContainer} className="w-full h-full"/>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isBusy}
                    className="mt-4 w-full bg-primary text-white py-4 rounded-xl font-bold text-lg shadow-md hover:opacity-90 transition active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2"
                >
                    {isBusy && <Loader2 className="w-5 h-5 animate-spin"/>}
                    {isUploading ? "Caricamento foto..." : isSubmittingToServer ? "Salvataggio dati..." : "Invia segnalazione"}
                </button>
            </form>
        </div>
    );
}
