import {AlertTriangle, Flag} from "lucide-react";
import {Link} from "react-router";
import React from "react";
import {REPORT_REASONS} from "../../utils/reportReason";
import {formatDate} from "../../utils/format";

export default function AdminReportsCard({barrier}: Readonly<{ barrier: any }>) {
    const canManage = barrier.state !== 'RESOLVED' && barrier.state !== 'HIDDEN';

    return (
        <div className="bg-error/5 p-5 sm:p-6 rounded-3xl border border-error/20 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-error/20 pb-3">
                <h3 className="text-base sm:text-lg font-bold text-error flex items-center gap-2">
                    <Flag className="w-5 h-5"/> Segnalazioni {canManage ? "In Sospeso" : "Ricevute"}
                </h3>
                <span className="bg-error/20 text-error text-xs font-bold px-2 py-1 rounded-md border border-error/30">
                    {barrier.reports.length}
                </span>
            </div>
            <div className="space-y-3">
                {barrier.reports.slice(0, 5).map((report: any) => (
                    <div key={report.id}
                         className="bg-background p-3 rounded-xl border border-error/20 flex items-center gap-3">
                        <AlertTriangle className="w-4 h-4 text-warning shrink-0"/>
                        <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-bold text-text truncate">
                                {REPORT_REASONS[report.reason] || report.reason}
                            </p>
                            <p className="text-xs text-text-muted truncate">
                                Da: {report.user.firstName} • {formatDate(report.createdAt)}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {canManage ? (
                <Link to={`/app/barriers/${barrier.id}/reports`}
                      className="block text-center text-sm font-bold text-error hover:underline py-2.5 border border-error/20 rounded-xl bg-error/10 transition-colors">
                    Gestisci {barrier.reports.length} segnalazioni
                </Link>
            ) : (
                <p className="text-[10px] text-center text-text-muted uppercase font-bold tracking-widest pt-2">
                    Segnalazioni archiviate (Barriera {barrier.state})
                </p>
            )}
        </div>
    );
}