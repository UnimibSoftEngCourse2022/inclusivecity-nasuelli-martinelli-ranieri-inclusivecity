import {Link, useNavigate} from "react-router";
import {ArrowLeft} from "lucide-react";
import React from "react";

type Props = {
    title: React.ReactNode;
    subtitle?: React.ReactNode;
    backUrl?: string;
    showBack?: boolean;
};

export default function PageHeader({title, subtitle, backUrl, showBack = true}: Readonly<Props>) {
    const navigate = useNavigate();
    const btnClass = "p-3 bg-surface border border-border rounded-full hover:bg-background transition-colors shadow-sm shrink-0";

    return (
        <div className="flex items-center gap-4">
            {showBack && (
                backUrl ? (
                    <Link to={backUrl} className={btnClass}><ArrowLeft className="w-5 h-5 text-text"/></Link>
                ) : (
                    <button onClick={() => navigate(-1)} className={btnClass}>
                        <ArrowLeft className="w-5 h-5 text-text"/>
                    </button>
                )
            )}
            <div className="min-w-0">
                <h1 className="text-2xl font-bold text-text flex items-center gap-2 truncate">{title}</h1>
                {subtitle && <div className="text-sm text-text-muted mt-1 truncate">{subtitle}</div>}
            </div>
        </div>
    );
}