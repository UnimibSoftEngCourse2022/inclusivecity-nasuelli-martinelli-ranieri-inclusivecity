import {useEffect, useRef, useState} from "react";
import {Link, type LoaderFunctionArgs, useLoaderData} from "react-router";
import Map, {GeolocateControl, Layer, NavigationControl, Source} from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import {ArrowUpRight, Filter, Navigation, Plus, RotateCcw, X} from "lucide-react";
import {prisma} from "~/db.server";
import BarrierMapBanner from "~/components/map/BarrierMapBanner";
import Loading from "~/components/Loading";
import type {BarrierMapData} from "~/types/barrier";
import {useAuth} from "~/context/AuthContext";
import BarrierMarker from "~/components/map/BarrierMarker";
import {useMapFetcher} from "~/hooks/useMapFetcher";
import SearchBar from "~/components/map/SearchBar";
import {envSchema} from "~/utils/envSchema";
import {useNavigation} from "~/hooks/useNavigation";

export async function loader({request}: LoaderFunctionArgs) {
    const url = new URL(request.url);
    const minLng = url.searchParams.get("minLng");
    const minLat = url.searchParams.get("minLat");
    const maxLng = url.searchParams.get("maxLng");
    const maxLat = url.searchParams.get("maxLat");
    const userId = url.searchParams.get("userId");
    const minDiffParam = url.searchParams.get("minDifficulty");

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

    let appliedMinDifficulty = userBaseDifficulty;
    if (minDiffParam !== null && !Number.isNaN(Number.parseInt(minDiffParam))) {
        appliedMinDifficulty = Number.parseInt(minDiffParam, 10);
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
              AND b.difficulty >= ${appliedMinDifficulty}
              AND ST_Intersects(b.location::geometry,
                                ST_MakeEnvelope(${Number.parseFloat(minLng)}, ${Number.parseFloat(minLat)},
                                                ${Number.parseFloat(maxLng)}, ${Number.parseFloat(maxLat)}, 4326))
                LIMIT 150
        `;
    }

    const env = envSchema.parse(process.env);

    return {
        barriers,
        mapboxToken: env.VITE_MAPBOX_TOKEN,
        orsApiKey: env.VITE_ORS_API_KEY,
        appliedMinDifficulty,
        userBaseDifficulty
    };
}

export default function MapPage() {
    const {profile} = useAuth();
    const initialData = useLoaderData<typeof loader>();

    const mapboxToken = initialData.mapboxToken;
    const orsApiKey = initialData.orsApiKey;

    const {
        fetcher, isFilterOpen, draftFilters, setDraftFilters, openFilterMenu,
        closeFilterMenu, applyFilters, resetFilters, fetchMapData,
        hasActiveCustomFilters, userBaseDifficulty
    } = useMapFetcher(initialData.userBaseDifficulty, profile?.id);

    const {
        navState, destination, route, isLoadingRoute,
        calculateRoute, startNavigation, cancelNavigation
    } = useNavigation(orsApiKey);

    const barriers = fetcher.data?.barriers || initialData.barriers;

    const [selectedBarrier, setSelectedBarrier] = useState<typeof barriers[0] | null>(null);
    const [isLocating, setIsLocating] = useState(true);

    const geoControlRef = useRef<any>(null);
    const mapRef = useRef<any>(null);

    const [viewState, setViewState] = useState({
        longitude: 12.4964, latitude: 41.9028, zoom: 13, pitch: 0, bearing: 0
    });

    useEffect(() => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setViewState({
                        longitude: pos.coords.longitude,
                        latitude: pos.coords.latitude,
                        zoom: 15,
                        pitch: 0,
                        bearing: 0
                    });
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

    useEffect(() => {
        let watchId: number | null = null;

        if (navState === "NAV") {
            watchId = navigator.geolocation.watchPosition(
                (pos) => {
                    setViewState((prev) => ({
                        ...prev,
                        longitude: pos.coords.longitude,
                        latitude: pos.coords.latitude,
                        zoom: 18.5,
                        pitch: 65,
                        bearing: pos.coords.heading ?? prev.bearing,
                    }));
                },
                (err) => console.warn("Errore GPS in navigazione:", err),
                {enableHighAccuracy: true, maximumAge: 0, timeout: 5000}
            );
        } else if (navState === "IDLE") {
            setViewState((prev) => ({...prev, pitch: 0, bearing: 0}));
        }

        return () => {
            if (watchId !== null) navigator.geolocation.clearWatch(watchId);
        };
    }, [navState]);

    const handleMoveEnd = () => fetchMapData(mapRef.current?.getMap().getBounds());
    const handleApplyFilters = () => applyFilters(mapRef.current?.getMap().getBounds());
    const handleResetFilters = () => resetFilters(mapRef.current?.getMap().getBounds());

    const onMapLoad = () => {
        geoControlRef.current?.trigger();
        handleMoveEnd();
    };

    const handleMapContextMenu = (e: mapboxgl.MapLayerMouseEvent) => {
        if (navState !== "IDLE") return;
        e.preventDefault();
        calculateRoute(e.lngLat.lng, e.lngLat.lat, "Destinazione su Mappa", barriers, userBaseDifficulty);
    };

    const handleLocationSelect = (lng: number, lat: number, placeName?: string) => {
        if (mapRef.current) {
            mapRef.current.flyTo({center: [lng, lat], zoom: 16, duration: 1500});
        }
        calculateRoute(lng, lat, placeName, barriers, userBaseDifficulty);
    };

    let routeStatusContent = null;
    if (isLoadingRoute) {
        routeStatusContent = (
            <p className="text-sm text-text-muted animate-pulse">
                Ricerca percorso accessibile in corso...
            </p>
        );
    } else if (route) {
        routeStatusContent = (
            <p className="text-sm text-primary font-medium">
                {Math.round(route.duration / 60)} min ({Math.round(route.distance)} metri)
            </p>
        );
    }

    if (isLocating) return <Loading/>;

    return (
        <div className="absolute inset-0 bg-surface overflow-hidden">

            {/* TOP BAR */}
            {navState !== "NAV" && (
                <div className="absolute top-4 left-4 right-4 z-10 flex gap-2 pointer-events-none animate-in fade-in">
                    {/* SEARCH BAR */}
                    <SearchBar
                        mapboxToken={mapboxToken}
                        onSelect={handleLocationSelect}
                        isMapLoading={fetcher.state === "loading"}
                    />

                    {/* FILTER BUTTON */}
                    <button onClick={openFilterMenu}
                            className="relative bg-surface border border-border shadow-md rounded-full p-3 flex items-center justify-center text-text pointer-events-auto active:scale-95 transition-transform touch-manipulation select-none"
                            style={{WebkitTapHighlightColor: "transparent"}}>
                        <Filter className="w-6 h-6"/>
                        {hasActiveCustomFilters && <span
                            className="absolute top-2 right-2 w-2.5 h-2.5 bg-error rounded-full border-2 border-surface shadow-sm"></span>}
                    </button>
                </div>
            )}

            {/* MAPPA */}
            <Map
                ref={mapRef} {...viewState}
                onMove={evt => setViewState(evt.viewState)}
                onMoveEnd={handleMoveEnd}
                onLoad={onMapLoad}
                onContextMenu={handleMapContextMenu}
                mapStyle="mapbox://styles/mapbox/streets-v12"
                mapboxAccessToken={mapboxToken}
                style={{width: "100%", height: "100%"}}
            >
                <NavigationControl position="bottom-left"/>
                <GeolocateControl ref={geoControlRef} position="bottom-left" trackUserLocation={true}
                                  showUserLocation={true} showAccuracyCircle={false} showUserHeading={true}/>

                {/* PERCORSO NAVIGAZIONE */}
                {route && (
                    <Source id="route" type="geojson" data={route.geometry}>
                        <Layer
                            id="route-line"
                            type="line"
                            layout={{"line-join": "round", "line-cap": "round"}}
                            paint={{"line-color": "#3b82f6", "line-width": 6, "line-opacity": 0.8}}
                        />
                    </Source>
                )}

                {/* MARKERS BARRIERE */}
                {barriers.map((barrier) =>
                    <BarrierMarker key={barrier.id} barrier={barrier} onClick={setSelectedBarrier}/>
                )}

                {/* BANNER BARRIERA CLICCATA */}
                <BarrierMapBanner barrier={selectedBarrier} onClose={() => setSelectedBarrier(null)}/>
            </Map>

            {/* FAB AGGIUNGI BARRIERA */}
            {navState === "IDLE" && (
                <div className="absolute bottom-6 right-4 z-10 flex flex-col gap-3">
                    <Link to="/app/barriers/new"
                          className="bg-primary text-white shadow-xl rounded-full p-4 flex items-center justify-center hover:scale-105 active:scale-95 transition">
                        <Plus className="w-8 h-8"/>
                    </Link>
                </div>
            )}

            {/* PRE-NAVIGAZIONE */}
            {navState === "PRE_NAV" && (
                <div
                    className="absolute bottom-6 left-4 right-4 z-20 bg-surface rounded-2xl shadow-2xl border border-border p-5 animate-in slide-in-from-bottom-8">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="font-bold text-lg text-text">
                                {destination?.name || "Destinazione selezionata"}
                            </h3>
                            {routeStatusContent}
                        </div>
                        <button onClick={cancelNavigation}
                                className="p-2 bg-background rounded-full text-text-muted hover:text-text">
                            <X className="w-5 h-5"/>
                        </button>
                    </div>

                    <button
                        onClick={startNavigation}
                        disabled={isLoadingRoute || !route}
                        className="w-full flex items-center justify-center gap-2 bg-primary text-white font-bold py-3.5 rounded-xl shadow-md hover:bg-primary/90 disabled:opacity-50 transition active:scale-95"
                    >
                        <Navigation className="w-5 h-5 fill-current"/>
                        Inizia Navigazione
                    </button>
                </div>
            )}

            {/* UI: NAVIGAZIONE ATTIVA */}
            {navState === "NAV" && route && (
                <div
                    className="absolute top-4 left-4 right-4 z-20 bg-primary rounded-2xl shadow-xl p-5 text-white flex items-center gap-4 animate-in slide-in-from-top-8">
                    <div className="bg-white/20 p-3 rounded-xl shrink-0">
                        <ArrowUpRight className="w-8 h-8"/>
                    </div>
                    <div className="flex-1">
                        <p className="font-bold text-xl leading-tight">
                            {route.steps[0]?.instruction || "Procedi verso la destinazione"}
                        </p>
                        <p className="text-sm text-white/80 mt-1">
                            Tra {Math.round(route.steps[0]?.distance || 0)} metri
                        </p>
                    </div>
                    <button onClick={cancelNavigation}
                            className="p-3 bg-white/20 rounded-full hover:bg-white/30 transition">
                        <X className="w-6 h-6"/>
                    </button>
                </div>
            )}

            {/* OVERLAY MENU FILTRI */}
            <div
                className={`absolute inset-0 z-50 flex justify-end transition-opacity duration-300 ${isFilterOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
                <button className="absolute inset-0 bg-text/20 backdrop-blur-sm" onClick={closeFilterMenu}/>

                <div
                    className={`relative w-full max-w-sm bg-surface h-full shadow-2xl flex flex-col transform transition-transform duration-300 ${isFilterOpen ? "translate-x-0" : "translate-x-full"}`}>

                    {/* HEADER */}
                    <div className="p-4 border-b border-border flex justify-between items-center bg-surface">
                        <h2 className="text-lg font-bold text-text">Filtri Mappa</h2>
                        <div className="flex items-center gap-3">

                            {(draftFilters.minDifficulty !== userBaseDifficulty || hasActiveCustomFilters) && (
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
                                <span>Difficoltà Minima</span>
                                <span className="bg-primary/10 text-primary px-3 py-1 rounded-lg text-sm font-bold">
                                    Lvl {draftFilters.minDifficulty}
                                </span>
                            </label>

                            <input
                                type="range" min="0" max="100" step="10"
                                value={draftFilters.minDifficulty}
                                onChange={(e) => setDraftFilters(prev => ({
                                    ...prev,
                                    minDifficulty: Number.parseInt(e.target.value)
                                }))}
                                className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
                            />

                            <div className="flex flex-col gap-1.5 mt-2">
                                <p className="text-xs text-text-muted leading-relaxed">
                                    Verranno mostrate le barriere con livello di difficoltà uguale o superiore a quello
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