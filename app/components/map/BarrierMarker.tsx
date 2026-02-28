import {Marker} from "react-map-gl";
import * as LucideIcons from "lucide-react";
import type {BarrierMapData} from "~/types/barrier";

type Props = {
    barrier: BarrierMapData;
    onClick: (barrier: BarrierMapData) => void;
};

export default function BarrierMarker({barrier, onClick}: Readonly<Props>) {
    const isReview = barrier.state === 'IN_REVIEW';

    const iconName = barrier.iconKey || (barrier as any).iconkey;
    const color = barrier.colorHex || (barrier as any).colorhex || "#EF4444";

    const IconComponent = (LucideIcons as any)[iconName] || LucideIcons.MapPin;

    return (
        <Marker
            longitude={barrier.lng}
            latitude={barrier.lat}
            onClick={e => {
                e.originalEvent.stopPropagation();
                onClick(barrier);
            }}
        >
            {/* Contenitore principale interattivo */}
            <div className="relative cursor-pointer transform transition-all duration-200 hover:scale-110">

                {/* Puck */}
                <div
                    className={`
                        w-10 h-10 rounded-full flex items-center justify-center 
                        text-white shadow-md border-2 border-surface
                        ${isReview ? "outline outline-2 outline-offset-2 outline-orange-500 ring-4 ring-orange-500/20" : ""}
                    `}
                    style={{backgroundColor: color}}
                >
                    {/* Icona Dinamica */}
                    <IconComponent className="w-5 h-5 text-white"/>
                </div>

            </div>
        </Marker>
    );
}