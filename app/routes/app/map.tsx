import {useEffect, useRef, useState} from "react";
import {Link, type LoaderFunctionArgs, useFetcher, useLoaderData} from "react-router";
import Map, {GeolocateControl, NavigationControl} from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import {Filter, Plus, Search} from "lucide-react";
import {prisma} from "~/db.server";
import BarrierMapBanner from "~/components/map/BarrierMapBanner";
import Loading from "~/components/Loading";
import type {BarrierMapData} from "~/types/barrier";
import {useAuth} from "~/context/AuthContext";
import BarrierMarker from "~/components/map/BarrierMarker";


export async function loader({request}: LoaderFunctionArgs) {
    const url = new URL(request.url);
    const minLng = url.searchParams.get("minLng");
    const minLat = url.searchParams.get("minLat");
    const maxLng = url.searchParams.get("maxLng");
    const maxLat = url.searchParams.get("maxLat");
    const userId = url.searchParams.get("userId");

    let barriers: BarrierMapData[] = [];
    let userMobilityLevel = 0;

    if (userId) {
        const user = await prisma.user.findUnique({
            where: {id: userId},
            include: {disability: true}
        });
        if (user?.disability) {
            userMobilityLevel = user.disability.mobilityLevel;
        }
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
              AND b.difficulty >= ${userMobilityLevel}
              AND ST_Intersects(
                    b.location::geometry,
                    ST_MakeEnvelope(${Number.parseFloat(minLng)}, ${Number.parseFloat(minLat)},
                                    ${Number.parseFloat(maxLng)}, ${Number.parseFloat(maxLat)}, 4326)
                  )
                LIMIT 150
        `;
    }

    return {barriers, mapboxToken: process.env.VITE_MAPBOX_TOKEN};
}

export default function MapPage() {
    const {profile} = useAuth();
    const initialData = useLoaderData<typeof loader>();

    const fetcher = useFetcher<typeof loader>();

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
                (position) => {
                    setViewState({
                        longitude: position.coords.longitude,
                        latitude: position.coords.latitude,
                        zoom: 15
                    });
                    setIsLocating(false);
                },
                (error) => {
                    console.warn("Posizione non ottenuta. Fallback su coordinate base.", error);
                    setIsLocating(false);
                },
                {enableHighAccuracy: true, timeout: 5000}
            );
        } else {
            setIsLocating(false);
        }
    }, []);

    const handleMoveEnd = () => {
        if (!mapRef.current) return;

        const bounds = mapRef.current.getMap().getBounds();

        const params = new URLSearchParams({
            minLng: bounds.getWest().toString(),
            minLat: bounds.getSouth().toString(),
            maxLng: bounds.getEast().toString(),
            maxLat: bounds.getNorth().toString(),
        });

        if (profile?.id) {
            params.append("userId", profile.id);
        }

        fetcher.load(`/app/map?${params.toString()}`);
    };

    const onMapLoad = () => {
        geoControlRef.current?.trigger();
        handleMoveEnd();
    };

    if (isLocating) return <Loading/>;

    return (
        <div className="relative w-full h-full bg-surface">
            {/* BARRA DI RICERCA SUPERIORE */}
            <div className="absolute top-4 left-4 right-4 z-10 flex gap-2 pointer-events-none">
                <div
                    className="flex-1 bg-surface border border-border shadow-md rounded-full px-4 py-3 flex items-center gap-3 pointer-events-auto relative">
                    <Search className="w-5 h-5 text-text-muted"/>
                    <input type="text" placeholder="Cerca un indirizzo o un luogo..."
                           className="bg-transparent border-none outline-none w-full text-text placeholder-text-muted text-base"/>

                    {/* INDICATORE DI CARICAMENTO BACKGROUND */}
                    {fetcher.state === "loading" && (
                        <span className="absolute right-4 flex h-3 w-3">
                            <span
                                className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                        </span>
                    )}
                </div>
                <button
                    className="bg-surface border border-border shadow-md rounded-full p-3 flex items-center justify-center text-text pointer-events-auto hover:bg-surface/80 transition">
                    <Filter className="w-6 h-6"/>
                </button>
            </div>

            {/* MAPPA */}
            <Map
                ref={mapRef}
                {...viewState}
                onMove={evt => setViewState(evt.viewState)}
                onMoveEnd={handleMoveEnd}
                onLoad={onMapLoad}
                mapStyle="mapbox://styles/mapbox/streets-v12"
                mapboxAccessToken={mapboxToken}
                style={{width: "100%", height: "100%"}}
            >
                <NavigationControl position="bottom-left"/>

                <GeolocateControl
                    ref={geoControlRef}
                    position="bottom-left"
                    trackUserLocation={true}
                    showUserLocation={true}
                    showAccuracyCircle={false}
                    showUserHeading={true}
                />

                {/* MARKERS */}
                {barriers.map((barrier) => (
                    <BarrierMarker
                        key={barrier.id}
                        barrier={barrier}
                        onClick={setSelectedBarrier}
                    />
                ))}

                {/* BANNER BARRIERA */}
                <BarrierMapBanner barrier={selectedBarrier} onClose={() => setSelectedBarrier(null)}/>
            </Map>

            {/* FAB AGGIUNGI BARRIERA */}
            <div className="absolute bottom-6 right-4 z-10 flex flex-col gap-3">
                <Link to="/app/barriers/new"
                      className="bg-primary text-white shadow-xl rounded-full p-4 flex items-center justify-center hover:scale-105 active:scale-95 transition">
                    <Plus className="w-8 h-8"/>
                </Link>
            </div>
        </div>
    );
}