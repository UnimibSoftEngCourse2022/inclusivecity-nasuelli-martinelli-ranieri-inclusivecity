import {index, layout, route, type RouteConfig} from "@react-router/dev/routes";

export default [
    // ROOT
    index("routes/_index.tsx"),

    // AUTH CALLBACK (Google Login, ecc.)
    route("auth/callback", "routes/auth/callback.tsx"),

    // PARTE PUBBLICA - AUTH (solo se non autenticato)
    layout("routes/auth/layout.tsx", [
        route("auth/login", "routes/auth/login.tsx"),
        route("auth/signin", "routes/auth/signin.tsx"),
    ]),

    // PARTE PRIVATA (solo se autenticato)
    layout("routes/_protected.tsx", [

        // ONBOARDING (scelta disabilità)
        route("onboarding", "routes/onboarding.tsx"),

        // APP PRINCIPALE
        route("app", "routes/app/layout.tsx", [
            // Redirect iniziale
            index("routes/app/_index.tsx"),

            // Core Features
            route("map", "routes/app/map.tsx"),

            // Profilo e Impostazioni
            route("profile", "routes/app/profile.tsx"),
            route("profile/edit", "routes/app/profile/edit.tsx"),

            // Gestione Barriere
            route("barriers", "routes/app/barriers/list.tsx"),
            route("barriers/new", "routes/app/barriers/new.tsx"),
            route("barriers/:id", "routes/app/barriers/detail.tsx"),
            route("barriers/:id/edit", "routes/app/barriers/edit.tsx"),
            route("barriers/:id/resolve", "routes/app/barriers/resolve.tsx"),
            route("barriers/:id/resolutions", "routes/app/barriers/resolutions.tsx"),

            // Area Admin
            route("admin/reports", "routes/app/admin/reports.tsx"),
            route("admin/resolutions", "routes/app/admin/resolutions.tsx"),
        ]),
    ]),

] satisfies RouteConfig;