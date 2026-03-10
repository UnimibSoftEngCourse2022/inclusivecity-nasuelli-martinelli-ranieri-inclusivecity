import React, {useState} from "react";
import {ChevronLeft, ChevronRight, Maximize2, ShieldAlert, X} from "lucide-react";

type Props = {
    photos: string[];
    altText?: string;
};

export default function PhotoGallery({photos, altText = "Foto"}: Readonly<Props>) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);

    if (!photos || photos.length === 0) {
        return (
            <div
                className="relative aspect-square w-full bg-surface rounded-3xl border border-border overflow-hidden shadow-sm flex flex-col items-center justify-center text-text-muted gap-2">
                <ShieldAlert className="w-12 h-12 opacity-20"/>
                <span className="text-sm font-medium uppercase tracking-widest opacity-50">No Foto</span>
            </div>
        );
    }

    const nextPhoto = (e?: React.MouseEvent | React.KeyboardEvent) => {
        e?.stopPropagation();
        setCurrentIndex((prev) => (prev + 1) % photos.length);
    };

    const prevPhoto = (e?: React.MouseEvent | React.KeyboardEvent) => {
        e?.stopPropagation();
        setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
    };

    // Gestore per la tastiera (Accessibilità)
    const handleMainImageKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsModalOpen(true);
        }
    };

    const isMultiple = photos.length > 1;

    return (
        <div className="space-y-3">
            {/* IMMAGINE PRINCIPALE */}
            <button
                tabIndex={0}
                onKeyDown={handleMainImageKeyDown}
                className="relative aspect-square w-full bg-surface rounded-3xl border border-border overflow-hidden shadow-sm group cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
                onClick={() => setIsModalOpen(true)}
            >
                <img
                    src={photos[currentIndex]}
                    alt={`${altText} - Foto ${currentIndex + 1}`}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />

                {/* Overlay per suggerire il click */}
                <div
                    className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center pointer-events-none">
                    <Maximize2
                        className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md"/>
                </div>

                {/* Frecce di navigazione (solo se > 1 foto) */}
                {isMultiple && (
                    <>
                        <button
                            onClick={prevPhoto}
                            aria-label="Foto precedente"
                            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-md transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 outline-none focus:ring-2 focus:ring-primary"
                        >
                            <ChevronLeft className="w-5 h-5"/>
                        </button>
                        <button
                            onClick={nextPhoto}
                            aria-label="Foto successiva"
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-md transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 outline-none focus:ring-2 focus:ring-primary"
                        >
                            <ChevronRight className="w-5 h-5"/>
                        </button>

                        {/* Contatore */}
                        <div
                            className="absolute bottom-3 right-3 bg-black/60 text-white text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur-md pointer-events-none">
                            {currentIndex + 1} / {photos.length}
                        </div>
                    </>
                )}
            </button>

            {/* MINIATURE (solo se > 1 foto) */}
            {isMultiple && (
                <div className="flex gap-2 overflow-x-auto pb-2 snap-x hide-scrollbar">
                    {photos.map((photo, idx) => (
                        <button
                            key={photo} // <--- Fix: Usata la URL della foto al posto dell'indice!
                            onClick={() => setCurrentIndex(idx)}
                            className={`relative w-16 h-16 shrink-0 rounded-xl overflow-hidden border-2 transition-all snap-start focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 focus:ring-offset-background ${
                                currentIndex === idx ? "border-primary scale-105 shadow-md" : "border-transparent opacity-60 hover:opacity-100"
                            }`}
                        >
                            <img src={photo} alt={`Miniatura ${idx + 1}`} className="w-full h-full object-cover"/>
                        </button>
                    ))}
                </div>
            )}

            {/* LIGHTBOX MODAL */}
            {isModalOpen && (
                <div
                    className="fixed inset-0 z-100 bg-black/95 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200">
                    <button
                        onClick={() => setIsModalOpen(false)}
                        aria-label="Chiudi"
                        className="absolute top-6 right-6 text-white/70 hover:text-white p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white"
                    >
                        <X className="w-6 h-6"/>
                    </button>

                    <img
                        src={photos[currentIndex]}
                        alt="Fullscreen"
                        className="max-w-full max-h-full object-contain p-4 select-none"
                    />

                    {isMultiple && (
                        <>
                            <button onClick={prevPhoto}
                                    aria-label="Foto precedente"
                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white">
                                <ChevronLeft className="w-8 h-8"/>
                            </button>
                            <button onClick={nextPhoto}
                                    aria-label="Foto successiva"
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white">
                                <ChevronRight className="w-8 h-8"/>
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}