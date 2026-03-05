import React, {useEffect, useState} from "react";
import {Loader2, MapPin, UploadCloud, X} from "lucide-react";
import Map, {Marker} from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import SearchBar from "~/components/map/SearchBar";
import mapboxgl from "mapbox-gl";

type BarrierFormProps = {
    types: any[];
    mapboxToken: string;
    initialData?: any;
    isSubmitting: boolean;
    clientError: string | null;
    onSubmit: (formData: FormData, newPhotos: File[], existingPhotos: string[], address: string, lat: number | null, lng: number | null, difficulty: number) => void;
};

export default function BarrierForm(
    {
        types,
        mapboxToken,
        initialData,
        isSubmitting,
        clientError,
        onSubmit
    }: Readonly<BarrierFormProps>) {
    const isEditMode = !!initialData;

    // --- STATI FORM ---
    const [difficulty, setDifficulty] = useState<number>(initialData?.difficulty ?? 0);
    const [selectedCategory, setSelectedCategory] = useState<string>(initialData?.typeId || "");
    const [addressQuery, setAddressQuery] = useState(initialData?.address || "");
    const [coords, setCoords] = useState<{ lat: number | null; lng: number | null }>({
        lat: initialData?.lat || null,
        lng: initialData?.lng || null
    });

    // --- STATI FOTO ---
    const [existingPhotos, setExistingPhotos] = useState<string[]>(initialData?.photoUrls || []);
    const [newPhotos, setNewPhotos] = useState<File[]>([]);
    const [newPhotoPreviews, setNewPhotoPreviews] = useState<string[]>([]);

    // --- STATI MAPPA ---
    const [locationReady, setLocationReady] = useState(isEditMode);
    const [isReversing, setIsReversing] = useState(false);
    const [viewState, setViewState] = useState({
        longitude: initialData?.lng || 12.4964,
        latitude: initialData?.lat || 41.9028,
        zoom: isEditMode ? 16 : 14
    });

    useEffect(() => {
        if (!isEditMode && "geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const {latitude, longitude} = pos.coords;
                    setViewState(prev => ({...prev, latitude, longitude, zoom: 16}));
                    setLocationReady(true);
                },
                () => setLocationReady(true),
                {enableHighAccuracy: true, timeout: 5000}
            );
        } else {
            setLocationReady(true);
        }
    }, [isEditMode]);

    useEffect(() => {
        return () => newPhotoPreviews.forEach(URL.revokeObjectURL);
    }, [newPhotoPreviews]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const addedFiles = Array.from(e.target.files);
            setNewPhotos(prev => [...prev, ...addedFiles]);
            const addedPreviews = addedFiles.map(file => URL.createObjectURL(file));
            setNewPhotoPreviews(prev => [...prev, ...addedPreviews]);
        }
    };

    const removeExistingPhoto = (index: number) => {
        setExistingPhotos(prev => prev.filter((_, idx) => idx !== index));
    };

    const removeNewPhoto = (index: number) => {
        setNewPhotos(prev => prev.filter((_, idx) => idx !== index));
        setNewPhotoPreviews(prev => {
            URL.revokeObjectURL(prev[index]);
            return prev.filter((_, idx) => idx !== index);
        });
    };

    const handleLocationSelect = (lng: number, lat: number, placeName?: string) => {
        setViewState(prev => ({...prev, longitude: lng, latitude: lat, zoom: 17}));
        setCoords({lat, lng});
        if (placeName) setAddressQuery(placeName);
    };

    const handleMapClick = async (e: mapboxgl.MapLayerMouseEvent) => {
        const lat = e.lngLat.lat;
        const lng = e.lngLat.lng;
        setCoords({lat, lng});
        setIsReversing(true);

        try {
            const baseUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json`;
            const params = new URLSearchParams({
                access_token: mapboxToken,
                limit: "1",
                country: "it"
            });
            const url = `${baseUrl}?${params.toString()}`;

            const res = await fetch(url);
            const data = await res.json();

            if (data.features && data.features.length > 0) {
                setAddressQuery(data.features[0].place_name);
            } else {
                setAddressQuery(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
            }
        } catch {
            setAddressQuery(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        } finally {
            setIsReversing(false);
        }
    };

    const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        setSelectedCategory(val);
        const selectedType = types.find((t: any) => t.id === val);
        if (selectedType && !isEditMode) {
            setDifficulty(selectedType.defaultDifficulty);
        }
    };

    const handleSubmitLocal = (e: React.SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        onSubmit(formData, newPhotos, existingPhotos, addressQuery, coords.lat, coords.lng, difficulty);
    };

    const inputClass = "w-full bg-background border border-border px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all text-text";
    const labelClass = "block text-sm font-semibold text-text mb-1.5";

    let submitButtonText = "Invia Segnalazione";
    if (isSubmitting) {
        submitButtonText = "Salvataggio...";
    } else if (isEditMode) {
        submitButtonText = "Salva Modifiche";
    }

    return (
        <form onSubmit={handleSubmitLocal} className="flex flex-col gap-6">

            {clientError && (
                <div
                    className="p-4 bg-error/10 border border-error/20 text-error rounded-xl text-sm font-medium shadow-sm">
                    {clientError}
                </div>
            )}

            {/* DETTAGLI E INDIRIZZO */}
            <section className="bg-surface p-5 rounded-2xl border border-border shadow-sm space-y-4">
                <h2 className="text-lg font-bold text-text mb-4 border-b border-border pb-2">Dettagli Ostacolo</h2>

                <div>
                    <label className={labelClass}>
                        Titolo <span className="text-error">*</span>
                        <input type="text" name="title" defaultValue={initialData?.title}
                               placeholder="Es. Gradino alto senza rampa" required className={inputClass}/>
                    </label>
                </div>

                <div>
                    <label className={labelClass}>
                        Indirizzo <span className="text-error">*</span>
                        <input
                            type="text"
                            value={addressQuery}
                            onChange={(e) => setAddressQuery(e.target.value)}
                            placeholder="Tocca la mappa o inserisci a mano..."
                            required
                            className={inputClass}
                            readOnly={isReversing}
                        />
                    </label>
                    {isReversing ? (
                        <p className="text-xs text-primary mt-1 flex items-center gap-1 animate-pulse">
                            <Loader2 className="w-3 h-3 animate-spin"/> Calcolo indirizzo in corso...
                        </p>
                    ) : (
                        <p className="text-xs text-text-muted mt-1">Puoi modificare questo testo o cliccare sulla mappa
                            per aggiornarlo.</p>
                    )}
                </div>

                <div>
                    <label className={labelClass}>Descrizione <span className="text-error">*</span>
                        <textarea name="description" defaultValue={initialData?.description}
                                  placeholder="Descrivi il problema nel dettaglio..." required rows={4}
                                  className={`${inputClass} resize-none`}/>
                    </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
                    <div>
                        <label className={labelClass}>Categoria <span className="text-error">*</span>
                            <select name="typeId" required className={inputClass} onChange={handleCategoryChange}
                                    value={selectedCategory}>
                                <option value="" disabled>Seleziona tipo</option>
                                {types.map((t: any) => (
                                    <option key={t.id} value={t.id}>{t.label}</option>
                                ))}
                            </select>
                        </label>
                    </div>

                    <div
                        className={`transition-opacity duration-300 ${selectedCategory ? 'opacity-100' : 'opacity-40 pointer-events-none grayscale'}`}>
                        <label className="flex justify-between items-center text-sm font-semibold text-text mb-1.5">
                            <span>Difficoltà percepita <span className="text-error">*</span></span>
                            <span
                                className={`px-3 py-1 rounded-lg text-sm font-bold transition-all duration-300 ${selectedCategory ? 'bg-primary/10 text-primary' : 'bg-border text-text-muted'}`}>
                                Lvl {difficulty}
                            </span>
                        </label>
                        <input
                            type="range" min="0" max="100" step="5"
                            value={difficulty}
                            onChange={(e) => setDifficulty(Number(e.target.value))}
                            disabled={!selectedCategory}
                            className="w-full h-2.5 bg-border rounded-full appearance-none cursor-pointer mt-3 transition-all duration-500 ease-out"
                            style={{background: `linear-gradient(to right, var(--color-primary) ${difficulty}%, var(--color-border) ${difficulty}%)`}}
                        />
                        <div
                            className="flex justify-between text-[10px] text-text-muted mt-2 font-medium px-1 uppercase tracking-wider">
                            <span>Facile</span><span>Media</span><span>Insuperabile</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* CARD 2: FOTO */}
            <section className="bg-surface p-5 rounded-2xl border border-border shadow-sm space-y-4">
                <h2 className="text-lg font-bold text-text mb-4 border-b border-border pb-2">Documentazione Visiva</h2>

                <div className="space-y-4">
                    <input id="photos" type="file" multiple accept="image/*" className="hidden"
                           onChange={handleFileChange}/>

                    {(existingPhotos.length > 0 || newPhotoPreviews.length > 0) && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {existingPhotos.map((url, idx) => (
                                <div key={url}
                                     className="relative aspect-square rounded-xl border-2 border-border overflow-hidden bg-background shadow-sm group">
                                    <img src={url} alt={`Esistente ${idx}`}
                                         className="w-full h-full object-cover opacity-90"/>
                                    <button type="button" onClick={() => removeExistingPhoto(idx)}
                                            className="absolute top-1 right-1 bg-black/70 hover:bg-error text-white p-1 rounded-full backdrop-blur-sm transition-colors shadow">
                                        <X className="w-4 h-4"/>
                                    </button>
                                </div>
                            ))}

                            {newPhotoPreviews.map((url, idx) => (
                                <div key={url}
                                     className="relative aspect-square rounded-xl border-2 border-primary overflow-hidden bg-background shadow-sm group animate-in zoom-in duration-200">
                                    <img src={url} alt={`Nuova ${idx}`} className="w-full h-full object-cover"/>
                                    <div
                                        className="absolute bottom-0 left-0 right-0 bg-primary text-white text-[9px] font-bold text-center py-0.5 uppercase">Nuova
                                    </div>
                                    <button type="button" onClick={() => removeNewPhoto(idx)}
                                            className="absolute top-1 right-1 bg-black/70 hover:bg-error text-white p-1 rounded-full backdrop-blur-sm transition-colors shadow">
                                        <X className="w-4 h-4"/>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <label htmlFor="photos"
                           className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-primary/30 bg-primary/5 rounded-xl cursor-pointer hover:bg-primary/10 transition group">
                        <UploadCloud className="w-6 h-6 text-primary mb-1 group-hover:scale-110 transition-transform"/>
                        <span
                            className="text-sm font-semibold text-primary">{isEditMode ? "Aggiungi altre foto" : "Clicca per aggiungere foto"}</span>
                    </label>
                </div>
            </section>

            {/* CARD 3: MAPPA */}
            <section className="bg-surface p-5 rounded-2xl border border-border shadow-sm space-y-4">
                <h2 className="text-lg font-bold text-text mb-2 border-b border-border pb-2 flex items-center gap-2">
                    Posizione Esatta <span className="text-error">*</span>
                </h2>

                {locationReady ? (
                    <div
                        className="relative w-full h-100 rounded-xl border border-border overflow-hidden shadow-inner">
                        <div className="absolute top-3 left-3 right-3 z-10">
                            <SearchBar mapboxToken={mapboxToken} onSelect={handleLocationSelect}/>
                        </div>

                        <Map
                            {...viewState}
                            onMove={evt => setViewState(evt.viewState)}
                            onClick={handleMapClick}
                            mapboxAccessToken={mapboxToken}
                            mapStyle="mapbox://styles/mapbox/streets-v12"
                            style={{width: "100%", height: "100%"}}
                            cursor={isSubmitting ? "not-allowed" : "crosshair"}
                        >
                            {coords.lat && coords.lng && (
                                <Marker latitude={coords.lat} longitude={coords.lng} anchor="bottom">
                                    <div className="relative flex flex-col items-center">
                                        <div
                                            className="bg-primary text-white p-1.5 rounded-full shadow-lg border-2 border-surface">
                                            <MapPin className="w-6 h-6 fill-primary-foreground/20"/>
                                        </div>
                                        <div className="w-2 h-1 bg-black/30 rounded-[100%] mt-0.5 blur-[1px]"></div>
                                    </div>
                                </Marker>
                            )}
                        </Map>

                        {!coords.lat && (
                            <div
                                className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-surface/90 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-border pointer-events-none z-10 animate-pulse w-max">
                                <p className="text-sm font-bold text-primary">Tocca la mappa per posizionare</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div
                        className="w-full h-100 bg-background rounded-xl flex flex-col items-center justify-center border border-border shadow-inner gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-primary"/>
                        <span className="text-sm font-medium text-text-muted">Ricerca posizione GPS...</span>
                    </div>
                )}
            </section>

            {/* SUBMIT BUTTON */}
            <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary text-white py-4 rounded-xl font-bold text-lg shadow-md hover:opacity-90 transition active:scale-95 disabled:opacity-70 flex items-center justify-center gap-3 mt-2"
            >
                {isSubmitting && <Loader2 className="w-5 h-5 animate-spin"/>}
                {submitButtonText}
            </button>
        </form>
    );
}