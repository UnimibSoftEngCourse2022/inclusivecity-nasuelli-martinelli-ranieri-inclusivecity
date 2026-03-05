import type {ActionFunctionArgs, LoaderFunctionArgs} from "react-router";
import {useFetcher, useLoaderData} from "react-router";
import {CheckCircle, Loader2, XCircle} from "lucide-react";
import {prisma} from "~/db.server";
import {useAuth} from "~/context/AuthContext";
import {formatDate} from "~/utils/format";

// LOADER SERVER-SIDE 
export async function loader({request}: LoaderFunctionArgs) {
    const pendingResolutions = await prisma.resolution.findMany({
        where: {status: "PENDING"},
        orderBy: {createdAt: "desc"},
        include: {
            barrier: {select: {id: true, title: true, address: true, state: true}},
            user: {select: {firstName: true, lastName: true}}
        }
    });

    return {resolutions: pendingResolutions};
}

// ACTION SERVER-SIDE (APPROVE = update, REJECT = delete)
export async function action({request}: ActionFunctionArgs) {
    const formData = await request.formData();
    const resolutionId = formData.get("resolutionId") as string;
    const intent = formData.get("intent") as "APPROVE" | "REJECT";
    const approverId = formData.get("approverId") as string;

    if (!resolutionId || !intent || !approverId) {
        return {error: "Dati mancanti."};
    }

    try {
        if (intent === "APPROVE") {
            // APPROVAZIONE: aggiorno la resolution
            await prisma.resolution.update({
                where: {id: resolutionId},
                data: {
                    status: "APPROVED",
                    approverId: approverId,
                    approvedAt: new Date()
                }
            });

        } else {
            // RIFIUTO: elimino la resolution
            await prisma.resolution.delete({
                where: {id: resolutionId}
            });
        }

        return {success: true};
    } catch (error: any) {
        console.error("Errore Admin:", error);
        return {error: "Impossibile aggiornare la risoluzione."};
    }
}


export default function AdminResolutionsPage() {
    const {resolutions} = useLoaderData<typeof loader>();
    const {profile} = useAuth();
    const fetcher = useFetcher();

   
    if (profile?.role !== "ADMIN") {
        return (
            <div className="p-8 text-center text-error font-semibold mt-20">
                Accesso negato. Questa area è riservata agli amministratori.
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6 pb-24 animate-in fade-in">
            <header>
                <h1 className="text-2xl font-bold text-text">Risoluzioni</h1>
                <p className="text-sm text-text-muted mt-1">
                    Approva o rifiuta le prove fotografiche caricate dagli utenti relative alle barriere che credono risolte.
                </p>
            </header>

            {fetcher.data?.error && (
                <div className="p-4 bg-error/10 text-error font-medium rounded-xl border border-error/20">
                    {fetcher.data.error}
                </div>
            )}

            {resolutions.length === 0 ? (
                <div
                    className="bg-surface border-2 border-dashed border-border p-12 rounded-3xl text-center text-text-muted">
                    <CheckCircle className="w-12 h-12 mx-auto opacity-20 mb-3"/>
                    <p className="font-medium text-lg">Nessuna risoluzione in sospeso.</p>
                    <p className="text-sm">Ottimo lavoro, hai svuotato la coda!</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {resolutions.map((res) => (
                        <div key={res.id}
                             className="bg-surface border border-border rounded-2xl p-5 shadow-sm flex flex-col md:flex-row gap-5">

                            {/* FOTO EVIDENZA */}
                            {res.evidenceUrl ? (
                                <button
                                    className="w-full md:w-48 h-48 shrink-0 rounded-xl overflow-hidden bg-background border border-border cursor-pointer"
                                    onClick={() => window.open(res.evidenceUrl!, "_blank")}>
                                    <img src={res.evidenceUrl} alt="Foto risoluzione"
                                         className="w-full h-full object-cover hover:scale-105 transition-transform"/>
                                </button>
                            ) : (
                                <div
                                    className="w-full md:w-48 h-48 shrink-0 rounded-xl bg-background border border-border flex items-center justify-center text-text-muted text-xs">
                                    Nessuna foto
                                </div>
                            )}

                            {/* DETTAGLI */}
                            <div className="flex-1 flex flex-col justify-between">
                                <div>
                                    <h3 className="font-bold text-lg text-text leading-tight mb-1">
                                        {res.barrier.title}
                                    </h3>
                                    <p className="text-xs text-text-muted mb-3">{res.barrier.address}</p>

                                    <div className="bg-background p-3 rounded-xl border border-border/50 mb-3">
                                        <p className="text-xs text-text-muted uppercase font-bold mb-1">Commento
                                            di {res.user.firstName}:</p>
                                        <p className="text-sm text-text italic">"{res.comment || "Nessun commento fornito."}"</p>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-2">
                                    <span
                                        className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">
                                        Caricata il {formatDate(res.createdAt)}
                                    </span>

                                    {/* AZIONI ADMIN */}
                                    <div className="flex gap-2 w-full sm:w-auto">
                                        <fetcher.Form method="post" className="flex-1 sm:flex-none">
                                            <input type="hidden" name="resolutionId" value={res.id}/>
                                            <input type="hidden" name="approverId" value={profile.id}/>
                                            <button
                                                type="submit"
                                                name="intent"
                                                value="REJECT"
                                                disabled={fetcher.state !== "idle"}
                                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-error/10 text-error hover:bg-error/20 border border-error/20 rounded-xl font-bold transition-colors disabled:opacity-50"
                                            >
                                                <XCircle className="w-5 h-5"/> Rifiuta
                                            </button>
                                        </fetcher.Form>

                                        <fetcher.Form method="post" className="flex-1 sm:flex-none">
                                            <input type="hidden" name="resolutionId" value={res.id}/>
                                            <input type="hidden" name="approverId" value={profile.id}/>
                                            <button
                                                type="submit"
                                                name="intent"
                                                value="APPROVE"
                                                disabled={fetcher.state !== "idle"}
                                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-success text-white hover:bg-success/90 rounded-xl font-bold transition-colors disabled:opacity-50 shadow-md"
                                            >
                                                {fetcher.state === "idle" ?
                                                    <CheckCircle className="w-5 h-5"/> :
                                                    <Loader2 className="w-5 h-5 animate-spin"/>}
                                                Approva
                                            </button>
                                        </fetcher.Form>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
