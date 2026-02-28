import {Link} from "react-router";
import {Popup} from "react-map-gl";
import {AlertTriangle, ChevronRight, MapPin, ShieldAlert} from "lucide-react";
import type {BarrierMapData} from "~/types/barrier";

type Props = {
    barrier: BarrierMapData | null;
    onClose: () => void;
};

export default function BarrierMapBanner({barrier, onClose}: Readonly<Props>) {
    if (!barrier) return null;

    const isReview = barrier.state === 'IN_REVIEW';

    return (
        <Popup
            longitude={barrier.lng}
            latitude={barrier.lat}
            anchor="bottom"
            onClose={onClose}
            closeOnClick={true}
            closeOnMove={true}
            closeButton={false}
            className="z-20"
            maxWidth="280px"
        >
            <div className="flex flex-col w-full min-w-60">

                {/* HEADER IMMAGINE */}
                <div className="relative w-full h-32 bg-surface rounded-t-xl border-b border-border">
                    {barrier.image ? (
                        <img
                            src={barrier.image}
                            alt="Barriera"
                            className="w-full h-full object-cover rounded-t-xl"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <ShieldAlert className="w-8 h-8 text-text-muted opacity-50"/>
                        </div>
                    )}

                    {/* BADGE IN_REVIEW SOVRAPPOSTO ALL'IMMAGINE */}
                    {isReview && (
                        <div
                            className="absolute top-2 right-2 bg-orange-500/90 backdrop-blur-sm text-white px-2 py-1 rounded-md shadow-sm flex items-center gap-1.5 border border-white/20">
                            <AlertTriangle className="w-4 h-4"/>
                            <span className="text-[10px] font-bold uppercase tracking-wider">In Verifica</span>
                        </div>
                    )}
                </div>

                {/* --- CONTENUTO CARD --- */}
                <div className="p-4 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                        <h3 className="font-bold text-base text-text leading-tight line-clamp-2">
                            {barrier.title}
                        </h3>
                        <span
                            className="shrink-0 bg-error/10 text-error text-xs font-bold px-2.5 py-1 rounded-full border border-error/20">
                            Lvl {barrier.difficulty}
                        </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-text-muted">
                        <MapPin className="w-4 h-4 shrink-0"/>
                        <p className="text-xs truncate">{barrier.address}</p>
                    </div>

                    <Link
                        to={`/app/barriers/${barrier.id}`}
                        className="mt-1 flex items-center justify-center gap-1 w-full bg-primary/10 hover:bg-primary/20 text-primary py-2.5 rounded-lg text-sm font-semibold transition-colors"
                    >
                        Vedi dettagli
                        <ChevronRight className="w-4 h-4"/>
                    </Link>
                </div>

            </div>
        </Popup>
    );
}