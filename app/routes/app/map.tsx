import {useEffect, useRef, useState} from "react";
import {Link, type LoaderFunctionArgs, useLoaderData} from "react-router";
import Map, {GeolocateControl, NavigationControl} from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import {Filter, Plus, RotateCcw, Search, X} from "lucide-react";
import {prisma} from "~/db.server";
import BarrierMapBanner from "~/components/map/BarrierMapBanner";
import Loading from "~/components/Loading";
import type {BarrierMapData} from "~/types/barrier";
import {useAuth} from "~/context/AuthContext";
import BarrierMarker from "~/components/map/BarrierMarker";
import {useMapFetcher} from "~/hooks/useMapFetcher";

export async function loader({request}: LoaderFunctionArgs) {
    const url = new URL(request.url);
    const minLng = url.searchParams.get("minLng");
    const minLat = url.searchParams.get("minLat");
    const maxLng = url.searchParams.get("maxLng");
    const maxLat = url.searchParams.get("maxLat");
    const userId = url.searchParams.get("userId");
    const maxDiffParam = url.searchParams.get("maxDifficulty");

    let barriers: BarrierMapData[] = [];
    let userBaseDifficulty = 100;

    if (userId) {
        const user = await prisma.user.findUnique({
            where: {id: userId},
            include: {disability: true}
        });
        if (user?.disability) {
            userBaseDifficulty = user.disability.mobilityLevel;
        }
    }

    let appliedMaxDifficulty = userBaseDifficulty;
    if (maxDiffParam !== null && !Number.isNaN(Number.parseInt(maxDiffParam))) {
        appliedMaxDifficulty = Number.parseInt(maxDiffParam, 10);
    }

    if (minLng && minLat && maxLng && maxLat) {
        barriers = await prisma.$queryRaw<Array<BarrierMapData>>`
            SELECT b.id,
                   b.title,
                   b.address,
                   b.difficulty,
                   b.state,
                   b."photoUrls"[1]           as image,
                   ST_X(b.location::geometry) as lng,
                   ST_Y(b.location::geometry) as lat,
                   bt."iconKey"               as "iconKey",
                   bt."colorHex"              as "colorHex"
            FROM "Barrier" b
                     JOIN "BarrierType" bt ON b."typeId" = bt.id
            WHERE (b.state = 'ACTIVE' OR b.state = 'IN_REVIEW')
              AND b.difficulty <= ${appliedMaxDifficulty}
              AND ST_Intersects(b.location::geometry,
                                ST_MakeEnvelope(${Number.parseFloat(minLng)}, ${Number.parseFloat(minLat)},
                                                ${Number.parseFloat(maxLng)}, ${Number.parseFloat(maxLat)}, 4326))
                LIMIT 150
        `;
    }

    return {barriers, mapboxToken: process.env.VITE_MAPBOX_TOKEN, appliedMaxDifficulty, userBaseDifficulty};
}

export default function MapPage() {
    const {profile} = useAuth();
    const initialData = useLoaderData<typeof loader>();

    const {
        fetcher,
        isFilterOpen,
        draftFilters,
        setDraftFilters,
        openFilterMenu,
        closeFilterMenu,
        applyFilters,
        resetFilters,
        fetchMapData,
        hasActiveCustomFilters,
        userBaseDifficulty
    } = useMapFetcher(initialData.userBaseDifficulty, profile?.id);

    const barriers = fetcher.data?.barriers || initialData.barriers;
    const mapboxToken = initialData.mapboxToken;

    const [selectedBarrier, setSelectedBarrier] = useState<typeof barriers[0] | null>(null);
    const [isLocating, setIsLocating] = useState(true);

    const geoControlRef = useRef<any>(null);
    const mapRef = useRef<any>(null);

    const [viewState, setViewState] = useState({
        longitude: 12.4964, latitude: 41.9028, zoom: 13
    });

    useEffect(() => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setViewState({longitude: pos.coords.longitude, latitude: pos.coords.latitude, zoom: 15});
                    setIsLocating(false);
                },
                (err) => {
                    console.warn("Fallback su coordinate base.", err);
                    setIsLocating(false);
                },
                {enableHighAccuracy: true, timeout: 5000}
            );
        } else {
            setIsLocating(false);
        }
    }, []);

    const handleMoveEnd = () => fetchMapData(mapRef.current?.getMap().getBounds());
    const handleApplyFilters = () => applyFilters(mapRef.current?.getMap().getBounds());
    const handleResetFilters = () => resetFilters(mapRef.current?.getMap().getBounds());

    const onMapLoad = () => {
        geoControlRef.current?.trigger();
        handleMoveEnd();
    };

    if (isLocating) return <Loading/>;

    return (
        <div className="relative w-full h-full bg-surface overflow-hidden">

            <div className="absolute top-4 left-4 right-4 z-10 flex gap-2 pointer-events-none">
                {/* SEARCH BAR */}
                <div
                    className="flex-1 bg-surface border border-border shadow-md rounded-full px-4 py-3 flex items-center gap-3 pointer-events-auto relative">
                    <Search className="w-5 h-5 text-text-muted"/>
                    <input type="text" placeholder="Cerca un indirizzo o un luogo..."
                           className="bg-transparent border-none outline-none w-full text-text placeholder-text-muted text-base"/>
                    {fetcher.state === "loading" && (
                        <span className="absolute right-4 flex h-3 w-3">
                            <span
                                className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                        </span>
                    )}
                </div>

                { /* FILTERS BUTTON */}
                <button onClick={openFilterMenu}
                        className="relative bg-surface border border-border shadow-md rounded-full p-3 flex items-center justify-center text-text pointer-events-auto">
                    <Filter className="w-6 h-6"/>
                    {hasActiveCustomFilters && <span
                        className="absolute top-2 right-2 w-2.5 h-2.5 bg-error rounded-full border-2 border-surface shadow-sm"></span>}
                </button>
            </div>

            {/* MAPPA */}
            <Map
                ref={mapRef} {...viewState}
                onMove={evt => setViewState(evt.viewState)}
                onMoveEnd={handleMoveEnd} onLoad={onMapLoad}
                mapStyle="mapbox://styles/mapbox/streets-v12" mapboxAccessToken={mapboxToken}
                style={{width: "100%", height: "100%"}}
            >
                <NavigationControl position="bottom-left"/>
                <GeolocateControl ref={geoControlRef} position="bottom-left" trackUserLocation={true}
                                  showUserLocation={true} showAccuracyCircle={false} showUserHeading={true}/>

                {/* MARKERS */}
                {barriers.map((barrier) =>
                    <BarrierMarker key={barrier.id} barrier={barrier} onClick={setSelectedBarrier}/>
                )}

                {/* SELECTED BARRIER BANNER */}
                <BarrierMapBanner barrier={selectedBarrier} onClose={() => setSelectedBarrier(null)}/>
            </Map>

            {/* AGGIUNGI BARRIERA */}
            <div className="absolute bottom-6 right-4 z-10 flex flex-col gap-3">
                <Link to="/app/barriers/new"
                      className="bg-primary text-white shadow-xl rounded-full p-4 flex items-center justify-center hover:scale-105 active:scale-95 transition">
                    <Plus className="w-8 h-8"/>
                </Link>
            </div>

            {/* OVERLAY MENU FILTRI */}
            <div
                className={`absolute inset-0 z-50 flex justify-end transition-opacity duration-300 ${isFilterOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
                <div className="absolute inset-0 bg-text/20 backdrop-blur-sm" onClick={closeFilterMenu}/>

                <div
                    className={`relative w-full max-w-sm bg-surface h-full shadow-2xl flex flex-col transform transition-transform duration-300 ${isFilterOpen ? "translate-x-0" : "translate-x-full"}`}>

                    {/* HEADER */}
                    <div className="p-4 border-b border-border flex justify-between items-center bg-surface">
                        <h2 className="text-lg font-bold text-text">Filtri Mappa</h2>
                        <div className="flex items-center gap-3">

                            {(draftFilters.maxDifficulty !== userBaseDifficulty || hasActiveCustomFilters) && (
                                <button onClick={handleResetFilters}
                                        className="flex items-center gap-1.5 text-sm text-primary font-semibold bg-primary/10 px-3 py-1.5 rounded-full hover:bg-primary/20 active:scale-95 transition">
                                    <RotateCcw className="w-4 h-4"/>
                                    Azzera
                                </button>
                            )}

                            <button onClick={closeFilterMenu}
                                    className="p-2 bg-background rounded-full hover:bg-border transition text-text">
                                <X className="w-5 h-5"/>
                            </button>
                        </div>
                    </div>

                    {/* CORPO */}
                    <div className="p-6 flex-1 overflow-y-auto space-y-8">
                        <div className="space-y-4">
                            <label className="flex justify-between items-center font-semibold text-text">
                                <span>Difficoltà Massima</span>
                                <span className="bg-primary/10 text-primary px-3 py-1 rounded-lg text-sm font-bold">
                                    Lvl {draftFilters.maxDifficulty}
                                </span>
                            </label>

                            <input
                                type="range" min="0" max="100" step="10"
                                value={draftFilters.maxDifficulty}
                                onChange={(e) => setDraftFilters(prev => ({
                                    ...prev,
                                    maxDifficulty: Number.parseInt(e.target.value)
                                }))}
                                className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
                            />

                            <div className="flex flex-col gap-1.5 mt-2">
                                <p className="text-xs text-text-muted leading-relaxed">
                                    Verranno mostrate le barriere con livello di difficoltà uguale o inferiore a quello
                                    selezionato (che puoi superare).
                                </p>
                                <p className="text-xs font-medium text-primary">
                                    Il tuo livello di mobilità: Lvl {userBaseDifficulty}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* FOOTER */}
                    <div className="p-4 border-t border-border bg-surface">
                        <button onClick={handleApplyFilters}
                                className="w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-xl shadow-md hover:opacity-90 transition active:scale-95">
                            Applica Filtri
                        </button>
                    </div>
                </div>
            </div>

        </div>
    );
}