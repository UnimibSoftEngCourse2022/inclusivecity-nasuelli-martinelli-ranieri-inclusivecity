import {useCallback, useState} from "react";
import * as turf from "@turf/turf";
import type {BarrierMapData} from "~/types/barrier";

export type NavState = "IDLE" | "PRE_NAV" | "NAV";

export type RouteData = {
    geometry: any;
    distance: number;
    duration: number;
    steps: any[];
};

export function useNavigation(orsApiKey: string) {
    const [navState, setNavState] = useState<NavState>("IDLE");
    const [destination, setDestination] = useState<{ lng: number; lat: number; name?: string } | null>(null);
    const [route, setRoute] = useState<RouteData | null>(null);
    const [isLoadingRoute, setIsLoadingRoute] = useState(false);

    const calculateRoute = useCallback(async (
        destLng: number,
        destLat: number,
        destName: string | undefined,
        barriers: BarrierMapData[],
        userMobilityLevel: number
    ) => {
        setIsLoadingRoute(true);
        setDestination({lng: destLng, lat: destLat, name: destName});
        setNavState("PRE_NAV");

        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const startLng = pos.coords.longitude;
                const startLat = pos.coords.latitude;

                try {
                    const hardBarriers = barriers.filter(b => b.difficulty > userMobilityLevel);

                    const polygonsCoords = hardBarriers
                        .map(b => {
                            const point = turf.point([b.lng, b.lat]);
                            const buffered = turf.buffer(point, 15, {units: 'meters'});

                            if (buffered?.geometry) {
                                return buffered.geometry.coordinates;
                            }

                            return null;
                        })
                        .filter(coords => coords !== null);

                    const body: any = {
                        coordinates: [
                            [startLng, startLat],
                            [destLng, destLat]
                        ],
                        language: "it",
                        elevation: false,
                        instructions: true
                    };

                    if (polygonsCoords.length > 0) {
                        body.options = {
                            avoid_polygons: {
                                type: "MultiPolygon",
                                coordinates: polygonsCoords
                            }
                        };
                    }

                    const res = await fetch("https://api.openrouteservice.org/v2/directions/foot-walking/geojson", {
                        method: "POST",
                        headers: {
                            "Authorization": orsApiKey,
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify(body)
                    });

                    const data = await res.json();

                    if (data.features && data.features.length > 0) {
                        const routeFeature = data.features[0];
                        setRoute({
                            geometry: routeFeature.geometry,
                            distance: routeFeature.properties.summary.distance,
                            duration: routeFeature.properties.summary.duration,
                            steps: routeFeature.properties.segments[0].steps,
                        });
                    } else {
                        console.error("Nessun percorso trovato. Forse la meta è irraggiungibile!", data);
                        alert("Impossibile trovare un percorso accessibile per questa destinazione.");
                        setNavState("IDLE");
                    }
                } catch (error) {
                    console.error("Errore nel calcolo del percorso:", error);
                } finally {
                    setIsLoadingRoute(false);
                }
            },
            (err) => {
                console.error("Impossibile ottenere la posizione iniziale", err);
                alert("Devi attivare il GPS per calcolare il percorso.");
                setIsLoadingRoute(false);
                setNavState("IDLE");
            },
            {enableHighAccuracy: true}
        );
    }, [orsApiKey]);

    const startNavigation = () => setNavState("NAV");

    const cancelNavigation = () => {
        setNavState("IDLE");
        setDestination(null);
        setRoute(null);
    };

    return {
        navState,
        destination,
        route,
        isLoadingRoute,
        calculateRoute,
        startNavigation,
        cancelNavigation
    };
}