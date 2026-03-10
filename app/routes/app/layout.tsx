import {Navigate, Outlet, useLocation} from "react-router";
import {useAuth} from "~/context/AuthContext";
import Loading from "~/components/Loading";
import Navbar from "~/components/Navbar";

export default function AppLayout() {
    const {user, profile, loading} = useAuth();
    const location = useLocation();

    if (loading) return <Loading/>;

    if (!user) {
        return <Navigate to="/auth/login" replace/>;
    }

    if (!profile?.disabilityId) {
        return <Navigate to="/onboarding" replace/>;
    }

    if (location.pathname === "/app" || location.pathname === "/app/") {
        return <Navigate to="/app/map" replace/>;
    }

    return (
        <div className="app-layout">
            <main className="app-content">
                <Outlet/>
            </main>

            <nav className="app-navbar">
                <Navbar/>
            </nav>
        </div>
    );
}