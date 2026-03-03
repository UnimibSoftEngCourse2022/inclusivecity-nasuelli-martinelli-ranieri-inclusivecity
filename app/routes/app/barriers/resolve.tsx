import React, {useState} from "react";
import type {LoaderFunctionArgs} from "react-router";
import {redirect, useLoaderData, useNavigation as useReactNavigation, useSubmit} from "react-router";
import {prisma} from "~/db.server";
import {useAuth} from "~/context/AuthContext";
import {supabase} from "~/services/supabase/supabase";
import {ArrowLeft, Loader2, UploadCloud, X} from "lucide-react";

export async function loader({params}: LoaderFunctionArgs) {
    const {id} = params;
    if (!id) throw new Response("ID mancante", {status: 400});

    const barrier = await prisma.barrier.findUnique({
        where: {id},
        select: {id: true, title: true, state: true}
    });

    if (!barrier) throw new Response("Barriera non trovata", {status: 404});
    if (barrier.state === 'RESOLVED') throw new Response("Barriera già risolta", {status: 400});

    return {barrier};
}

export async function action({request, params}: { request: Request, params: any }) {
    const formData = await request.formData();
    const comment = formData.get("comment") as string;
    const evidenceUrl = formData.get("evidenceUrl") as string;
    const userId = formData.get("userId") as string;
    const {id: barrierId} = params;

    try {
        await prisma.resolution.upsert({
            where: {userId_barrierId: {userId, barrierId}},
            update: {evidenceUrl, comment, status: 'PENDING'},
            create: {
                id: crypto.randomUUID(),
                barrierId,
                userId,
                evidenceUrl,
                comment,
                status: 'PENDING'
            }
        });

        return redirect(`/app/barriers/${barrierId}?resolved=true`);
    } catch {
        return {error: "Errore durante il salvataggio."};
    }
}

export default function ResolveBarrierPage() {
    const {barrier} = useLoaderData<typeof loader>();
    const {user} = useAuth();
    const submit = useSubmit();
    const navigation = useReactNavigation();

    const [photo, setPhoto] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [comment, setComment] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [clientError, setClientError] = useState<string | null>(null);

    const isSubmitting = navigation.state === "submitting" || isUploading;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPhoto(file);
            setPhotoPreview(URL.createObjectURL(file));
        }
    };

    const removePhoto = () => {
        setPhoto(null);
        if (photoPreview) URL.revokeObjectURL(photoPreview);
        setPhotoPreview(null);
    };

    async function handleSubmit(e: React.SubmitEvent) {
        e.preventDefault();
        setClientError(null);

        if (!photo) {
            setClientError("Devi allegare una foto che provi la risoluzione.");
            return;
        }

        if (!user) return;

        setIsUploading(true);
        try {
            const fileExt = photo.name.split(".").pop();
            const fileName = `resolution-${crypto.randomUUID()}.${fileExt}`;

            const {error: uploadError} = await supabase.storage.from("resolution-evidence").upload(fileName, photo);
            if (uploadError) throw new Error("Errore caricamento foto.");

            const {data} = supabase.storage.from("resolution-evidence").getPublicUrl(fileName);

            const formData = new FormData();
            formData.set("evidenceUrl", data.publicUrl);
            formData.set("comment", comment);
            formData.set("userId", user.id);

            submit(formData, {method: "post"});
        } catch (err: any) {
            setClientError(err.message || "Errore imprevisto.");
        } finally {
            setIsUploading(false);
        }
    }

    return (
        <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6 animate-in fade-in">
            <div className="flex items-center gap-4">
                <button onClick={() => window.history.back()}
                        className="p-3 bg-surface border border-border rounded-full hover:bg-background shadow-sm">
                    <ArrowLeft className="w-5 h-5 text-text"/>
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-text">Proponi Risoluzione</h1>
                    <p className="text-sm text-text-muted">Per: {barrier.title}</p>
                </div>
            </div>

            {clientError &&
                <div className="p-4 bg-error/10 text-error rounded-xl text-sm font-medium">{clientError}</div>}

            <form onSubmit={handleSubmit}
                  className="bg-surface p-6 rounded-3xl border border-border shadow-sm space-y-6">
                <div>
                    <label className="block text-sm font-semibold text-text mb-2">Foto della barriera risolta <span
                        className="text-error">*</span></label>
                    <input id="photo" type="file" accept="image/*" capture="environment" className="hidden"
                           onChange={handleFileChange}/>

                    {photoPreview ? (
                        <div
                            className="relative aspect-video rounded-xl border border-border overflow-hidden bg-background">
                            <img src={photoPreview} alt="Preview" className="w-full h-full object-cover"/>
                            <button type="button" onClick={removePhoto}
                                    className="absolute top-2 right-2 bg-black/50 hover:bg-error text-white p-2 rounded-full">
                                <X className="w-5 h-5"/>
                            </button>
                        </div>
                    ) : (
                        <label htmlFor="photo"
                               className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-primary/30 bg-primary/5 rounded-xl cursor-pointer hover:bg-primary/10 transition">
                            <UploadCloud className="w-8 h-8 text-primary mb-2"/>
                            <span className="text-sm font-semibold text-primary">Scatta o carica foto</span>
                        </label>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-semibold text-text mb-2">Dettagli dell'intervento
                        (Opzionale)</label>
                    <textarea
                        value={comment} onChange={(e) => setComment(e.target.value)}
                        placeholder="Es. Il gradino è stato rimosso e sostituito con uno scivolo a norma..."
                        rows={3}
                        className="w-full bg-background border border-border px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-primary resize-none text-text"
                    />
                </div>

                <button type="submit" disabled={isSubmitting}
                        className="w-full bg-success text-white py-4 rounded-xl font-bold text-lg shadow-md hover:bg-success/90 transition active:scale-95 disabled:opacity-70 flex justify-center items-center gap-2">
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin"/> : "Invia Prova per la Verifica"}
                </button>
            </form>
        </div>
    );
}