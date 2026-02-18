import {type RouteConfig, index, layout, route} from "@react-router/dev/routes";

export default [

    // ROOT
    index("routes/_index.tsx"),

    route("auth/callback", "routes/auth/callback.tsx"),

    // PARTE PUBBLICA - AUTH (solo se non autenticato, altrimenti reindirizza alla PARTE PRIVATA)
    layout("routes/auth/layout.tsx", [
        route("auth/login", "routes/auth/login.tsx"),
        route("auth/signin", "routes/auth/signin.tsx"),
    ]),

    // PARTE PRIVATA (solo se autenticato, altrimenti reindirizza ad AUTH)
    layout("routes/_protected.tsx", [

        // ONBOARDING (solo se non ha inserito tutti i dati)
        route("onboarding", "routes/onboarding.tsx"),

        // APP
        route("app", "routes/app/layout.tsx", [
            route("map", "routes/app/map.tsx"),
            route("account", "routes/app/account.tsx"),
            route("admin/reports", "routes/app/reports.tsx"),

            route("barriers", "routes/app/barriers/list.tsx"),
            route("barriers/new", "routes/app/barriers/new.tsx"),
            route("barriers/:id", "routes/app/barriers/detail.tsx"),
            route("barriers/:id/edit", "routes/app/barriers/edit.tsx"),
        ]),
    ]),

] satisfies RouteConfig;