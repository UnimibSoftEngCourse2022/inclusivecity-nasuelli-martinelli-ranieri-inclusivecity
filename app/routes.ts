import {type RouteConfig, index, route} from "@react-router/dev/routes";

export default [
    index("routes/_index.tsx"),

    // Auth
    route("auth", "routes/auth.tsx", [
        route("login", "routes/auth.login.tsx"),
        route("register", "routes/auth.register.tsx"),
        route("onboarding", "routes/auth.onboarding.tsx"),
    ]),

    // Barriere
    route("barriers", "routes/barriers._index.tsx"),
    route("barriers/new", "routes/barriers.new.tsx"),
    route("barriers/:id", "routes/barriers.$id.tsx"),

    // Profilo
    route("account", "routes/account.tsx"),
    route("profile", "routes/account.profile.tsx"),

    // Admin
    route("admin/reports", "routes/admin.reports.tsx"),
] satisfies RouteConfig;
