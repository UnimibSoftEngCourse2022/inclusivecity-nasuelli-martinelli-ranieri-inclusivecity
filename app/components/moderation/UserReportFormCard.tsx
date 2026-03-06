import {AlertTriangle} from "lucide-react";
import {REPORT_REASONS} from "~/utils/reportReason";
import React from "react";

export default function UserReportFormCard({barrier, profile, fetcher}: Readonly<{
    barrier: any,
    profile: any,
    fetcher: any
}>) {
    if (!profile || profile.id === barrier.userId || barrier.state === "RESOLVED" || barrier.state === "HIDDEN") return null;

    return (
        <details className="group bg-surface rounded-3xl border border-border shadow-sm overflow-hidden">
            <summary
                className="cursor-pointer p-4 flex items-center justify-between font-bold text-error/80 hover:bg-error/5 transition-colors list-none">
                <span className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5"/> Segnala un problema</span>
            </summary>
            <div className="p-5 border-t border-border bg-background">
                {fetcher.data?.reported ? (
                    <div className="text-success font-medium text-sm text-center">Segnalazione inviata!</div>
                ) : (
                    <fetcher.Form method="post" className="space-y-4">
                        <input type="hidden" name="intent" value="report"/>
                        <input type="hidden" name="userId" value={profile.id}/>

                        <p className="text-xs text-text-muted">
                            Se ritieni che questa segnalazione violi le regole o contenga errori gravi, avvisa i
                            moderatori.
                        </p>
                        <select name="reason" required
                                className="w-full bg-surface border border-border px-3 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-error text-sm">
                            {Object.entries(REPORT_REASONS).map(([val, label]) => <option key={val}
                                                                                          value={val}>{label}</option>)}
                        </select>
                        <button type="submit" disabled={fetcher.state !== "idle"}
                                className="w-full bg-error text-white py-2.5 rounded-xl text-sm font-bold shadow hover:bg-error/90 disabled:opacity-50 transition-opacity">Invia
                            Segnalazione
                        </button>
                    </fetcher.Form>
                )}
            </div>
        </details>
    );
}