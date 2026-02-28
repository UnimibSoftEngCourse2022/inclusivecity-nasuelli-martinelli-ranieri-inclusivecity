import type {BarrierState} from "@prisma/client";

export type BarrierMapData = {
    id: string;
    title: string;
    address: string;
    difficulty: number;
    state: BarrierState;
    image: string | null;
    lng: number;
    lat: number;
    iconKey: string;
    colorHex: string;
};