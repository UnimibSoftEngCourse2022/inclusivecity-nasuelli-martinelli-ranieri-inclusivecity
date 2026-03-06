import React from "react";

export default function PageWrapper({children, className = ""}: Readonly<{
    children: React.ReactNode,
    className?: string
}>) {
    return (
        <div
            className={`w-full p-4 md:p-6 max-w-4xl mx-auto space-y-6 pb-24 animate-in fade-in duration-300 ${className}`}>
            {children}
        </div>
    );
}