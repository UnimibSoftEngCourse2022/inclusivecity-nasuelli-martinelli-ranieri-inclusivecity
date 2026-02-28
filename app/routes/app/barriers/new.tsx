import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { supabase } from "~/services/supabase/supabase"; {/* client supabase */}
import { useNavigate } from "react-router";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN; {/* token mapbox */}

export default function NewBarrier() {

    const navigate = useNavigate(); {/* redirect */}

    {/* riferimenti per mappa */}
    const mapContainer = useRef<HTMLDivElement | null>(null);
    const map = useRef<mapboxgl.Map | null>(null);

    {/* marker */}
    const [marker, setMarker] = useState<mapboxgl.Marker | null>(null);

    {/* coordinate */}
    const [coords, setCoords] = useState<{ lat: number | null; lng: number | null }>({
        lat: null,
        lng: null,
    });

    {/* categorie */}
    const [types, setTypes] = useState<any[]>([]);

    {/* foto selezionate */}
    const [selectedPhotos, setSelectedPhotos] = useState(0);

    {/* errori */}
    const [error, setError] = useState<string | null>(null);

    {/* ---------------- CARICA CATEGORIE ---------------- */}
    useEffect(() => {
        async function loadTypes() {
            const { data, error } = await supabase.from("BarrierType").select("*");

            console.log("TYPES:", data, error); {/* debug */}

            if (!error && data) setTypes(data);
        }
        loadTypes();
    }, []);

    {/* ---------------- INIZIALIZZA MAPPA ---------------- */}
    useEffect(() => {
        if (map.current || !mapContainer.current) return;

        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: "mapbox://styles/mapbox/streets-v11",
            center: [9.19, 45.46], 
            zoom: 12,
        });

        map.current.on(
            "click",
            (e: mapboxgl.MapMouseEvent & mapboxgl.EventData) => {
                const { lng, lat } = e.lngLat;

                setCoords({ lat, lng });

                if (marker) {
                    marker.setLngLat([lng, lat]);
                } else {
                    if (!map.current) return;
                    const newMarker = new mapboxgl.Marker()
                        .setLngLat([lng, lat])
                        .addTo(map.current);
                    setMarker(newMarker);
                }
            }
        );
    }, [marker]);

    {/* ---------------- SUBMIT FORM ---------------- */}
    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);

        const form = e.currentTarget;
        const formData = new FormData(form);

        const title = formData.get("title") as string;
        const description = formData.get("description") as string;
        const address = formData.get("address") as string;
        const difficulty = Number(formData.get("difficulty"));
        const typeId = formData.get("typeId") as string;
        const photos = formData.getAll("photos") as File[];

        {/* controllo posizione */}
        if (!coords.lat || !coords.lng) {
            setError("Seleziona una posizione sulla mappa.");
            return;
        }

        {/* controllo foto */}
        if (photos.length === 0 || photos[0].size === 0) {
            setError("È obbligatorio aggiungere la foto della barriera.");
            return;
        }

        {/* utente loggato */}
        const { data: userData } = await supabase.auth.getUser();
        const user = userData?.user;

        if (!user) {
            setError("Devi essere loggato per creare una barriera.");
            return;
        }

        {/* ---------------- UPLOAD FOTO ---------------- */}
        const photoUrls: string[] = [];

        for (const file of photos) {
            if (file.size === 0) continue;

            const fileName = `${user.id}-${Date.now()}-${file.name}`;

            const { error: uploadError } = await supabase.storage
                .from("barrier-photos")
                .upload(fileName, file);

            if (uploadError) {
                setError("Errore durante l'upload delle immagini.");
                return;
            }

            const publicUrl = supabase.storage
                .from("barrier-photos")
                .getPublicUrl(fileName).data.publicUrl;

            photoUrls.push(publicUrl);
        }

        {/* ---------------- CREA BARRIERA ---------------- */}
        const { error: insertError } = await supabase.from("Barrier").insert({
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

        if (insertError) {
            setError("Errore durante la creazione della barriera.");
            return;
        }

        navigate("/app/mybarriers"); {/* redirect */}
    }

    {/* ---------------- RENDER ---------------- */}
    return (
        <div className="p-6 flex flex-col gap-6">
            <h1 className="text-2xl font-bold">Segnala una nuova barriera</h1>

            {error && <p className="text-red-600">{error}</p>}

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
                <input
                    type="number"
                    name="difficulty"
                    min="1"
                    max="5"
                    placeholder="Difficoltà (1-5)"
                    required
                    className="border p-2 rounded"
                />

                {/* CATEGORIA */}
                <select name="typeId" required className="border p-2 rounded">
                    <option value="">Seleziona categoria</option>
                    {types.map((t) => (
                        <option key={t.typeId} value={t.typeId}>
                            {t.text}
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

                {/* MAPPA */}
                <div
                    ref={mapContainer}
                    className="w-full h-72 rounded border"
                />

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
