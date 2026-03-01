import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { supabase } from "~/services/supabase/supabase";
import { useNavigate } from "react-router";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

export default function NewBarrier() {
    const navigate = useNavigate();

    const mapContainer = useRef<HTMLDivElement | null>(null);
    const map = useRef<mapboxgl.Map | null>(null);

    const [marker, setMarker] = useState<mapboxgl.Marker | null>(null);
    const [coords, setCoords] = useState<{ lat: number | null; lng: number | null }>({
        lat: null,
        lng: null,
    });

    const [types, setTypes] = useState<any[]>([]);
    const [selectedPhotos, setSelectedPhotos] = useState(0);
    const [showSuccess, setShowSuccess] = useState(false);

    // Carica categorie
    useEffect(() => {
        async function loadTypes() {
            const { data } = await supabase.from("BarrierType").select("*");
            if (data) setTypes(data);
        }
        loadTypes();
    }, []);

    // Inizializza mappa + geolocalizzazione + click marker
    useEffect(() => {
        if (map.current || !mapContainer.current) return;

        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: "mapbox://styles/mapbox/streets-v11",
            center: [9.19, 45.46], // fallback
            zoom: 12,
        });

        // Geolocalizzazione reale
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                map.current?.flyTo({ center: [longitude, latitude], zoom: 14 });
            },
            () => console.warn("Geolocalizzazione non consentita")
        );

        // Click manuale per piazzare marker
        map.current.on("click", (e) => {
            const { lng, lat } = e.lngLat;
            setCoords({ lat, lng });

            if (marker) {
                marker.setLngLat([lng, lat]);
            } else {
                const newMarker = new mapboxgl.Marker()
                    .setLngLat([lng, lat])
                    .addTo(map.current!);
                setMarker(newMarker);
            }
        });
    }, [marker]);

    // Ricerca indirizzo
    async function searchAddress(query: string) {
        if (!query.trim()) return;

        const res = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
                query
            )}.json?access_token=${mapboxgl.accessToken}`
        );

        const data = await res.json();
        if (!data.features || data.features.length === 0) return;

        const [lng, lat] = data.features[0].center;

        map.current?.flyTo({ center: [lng, lat], zoom: 16 });
        setCoords({ lat, lng });

        if (marker) {
            marker.setLngLat([lng, lat]);
        } else {
            const newMarker = new mapboxgl.Marker()
                .setLngLat([lng, lat])
                .addTo(map.current!);
            setMarker(newMarker);
        }
    }

    // Submit
    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        const form = e.currentTarget;
        const formData = new FormData(form);

        const title = formData.get("title") as string;
        const description = formData.get("description") as string;
        const address = formData.get("address") as string;
        const difficulty = Number(formData.get("difficulty"));
        const typeId = formData.get("typeId") as string;
        const photos = formData.getAll("photos") as File[];

        const { data: userData } = await supabase.auth.getUser();
        const user = userData?.user;
        if (!user) return;

        // Upload foto
        const photoUrls: string[] = [];
        for (const file of photos) {
            if (file.size === 0) continue;

            const fileName = `${user.id}-${Date.now()}-${file.name}`;
            const { error: uploadError } = await supabase.storage
                .from("barrier-photos")
                .upload(fileName, file);

            if (uploadError) return;

            const publicUrl = supabase.storage
                .from("barrier-photos")
                .getPublicUrl(fileName).data.publicUrl;

            photoUrls.push(publicUrl);
        }
        
        // salva barriera
        await supabase.from("Barrier").insert({
            title,
            description,
            address,
            difficulty,
            typeId,
            userId: user.id,
            photoUrls,
            location: JSON.stringify({ lat: coords.lat, lng: coords.lng }),
            state: "IN_REVIEW",
            averageRating: 0,
            totalRatings: 0,
        });

        setShowSuccess(true);
    }

    return (
        <div className="p-6 flex flex-col gap-6">
            <h1 className="text-2xl font-bold">Segnala una nuova barriera</h1>

            {showSuccess && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded text-sm flex flex-col gap-2">
                    <span>
                        La tua barriera è stata salvata correttamente, visualizza l&apos;elenco in
                        “Mostra le mie barriere”.
                    </span>
                    <button
                        type="button"
                        onClick={() => navigate("/app/mybarriers")}
                        className="self-start text-primary underline font-medium"
                    >
                        Mostra le mie barriere
                    </button>
                </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">

                {/* TITOLO */}
                <input
                    type="text"
                    name="title"
                    placeholder="Titolo"
                    required
                    className="border p-2 rounded"
                />

                {/* DESCRIZIONE */}
                <textarea
                    name="description"
                    placeholder="Descrizione"
                    required
                    className="border p-2 rounded"
                />

                {/* INDIRIZZO */}
                <input
                    type="text"
                    name="address"
                    placeholder="Indirizzo"
                    required
                    className="border p-2 rounded"
                />

                {/* DIFFICOLTÀ */}
                <select
                    name="difficulty"
                    required
                    className="border p-2 rounded text-black"
                >
                    <option value="">Seleziona difficoltà</option>
                    <option value="1">1 - Molto facile</option>
                    <option value="2">2 - Facile</option>
                    <option value="3">3 - Media</option>
                    <option value="4">4 - Difficile</option>
                    <option value="5">5 - Molto difficile</option>
                </select>

                {/* CATEGORIA */}
                <select name="typeId" required className="border p-2 rounded text-black">
                    <option value="">Seleziona categoria</option>
                    {types.map((t) => (
                        <option key={t.id} value={t.id}>
                            {t.label}
                        </option>
                    ))}
                </select>

                {/* FOTO MULTIPLE */}
                <div className="flex flex-col gap-2">
                    <label className="font-medium">Foto della barriera *</label>

                    <input
                        id="photos"
                        type="file"
                        name="photos"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => setSelectedPhotos(e.target.files?.length || 0)}
                        required
                    />

                    <label
                        htmlFor="photos"
                        className="cursor-pointer bg-primary text-white px-4 py-2 rounded-lg text-center hover:opacity-90 transition"
                    >
                        Aggiungi foto barriera
                    </label>

                    <p className="text-sm text-text-muted">
                        {selectedPhotos === 0
                            ? "Nessuna foto selezionata"
                            : `${selectedPhotos} foto selezionate`}
                    </p>
                </div>

                {/* VALIDAZIONE POSIZIONE */}
                <input
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    style={{
                        opacity: 0,
                        height: 0,
                        padding: 0,
                        margin: 0,
                        border: "none",
                        position: "absolute",
                    }}
                    value={coords.lat && coords.lng ? "ok" : ""}
                    onChange={() => {}}
                    required
                />

                {/* MAPPA + BARRA DI RICERCA */}
                <div className="relative w-full h-72 rounded border">

                    <input
                        type="text"
                        placeholder="Cerca indirizzo..."
                        className="absolute top-2 left-1/2 -translate-x-1/2 w-[80%] z-20 bg-white border p-2 rounded shadow"
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                searchAddress(e.currentTarget.value);
                            }
                        }}
                    />

                    <div
                        ref={mapContainer}
                        className="w-full h-full rounded"
                    />
                </div>

                {/* SUBMIT */}
                <button
                    type="submit"
                    className="bg-primary text-white p-3 rounded font-semibold hover:opacity-90"
                >
                    Invia segnalazione
                </button>
            </form>
        </div>
    );
}
