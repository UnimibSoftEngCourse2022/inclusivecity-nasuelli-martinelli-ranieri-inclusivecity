import {NavLink} from "react-router";
import {List, Map, User} from "lucide-react";

export default function Navbar() {
    const navItems = [
        {
            label: "Mappa",
            href: "/app/map",
            icon: Map
        },
        {
            label: "Elenco",
            href: "/app/barriers",
            icon: List
        },
        {
            label: "Profilo",
            href: "/app/profile",
            icon: User
        }
    ];

    return (
        <div className="flex items-center justify-around w-full h-full max-w-md mx-auto px-2">
            {navItems.map((item) => {
                const Icon = item.icon;

                return (
                    <NavLink
                        key={item.href}
                        to={item.href}
                        end={item.href === "/app/map"}
                        className={({isActive}) => `
                            flex flex-col items-center justify-center gap-1 py-2 px-4 rounded-xl transition-colors
                            ${isActive
                            ? "text-primary font-semibold"
                            : "text-text-muted hover:text-text hover:bg-surface/50"
                        }
                        `}
                    >
                        <Icon className="w-6 h-6" strokeWidth={2}/>
                        <span className="text-[10px] uppercase tracking-wide">{item.label}</span>
                    </NavLink>
                );
            })}
        </div>
    );
}