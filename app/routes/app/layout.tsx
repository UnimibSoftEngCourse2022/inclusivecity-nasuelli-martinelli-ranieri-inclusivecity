import {Navigate, Outlet} from "react-router";
import {useAuth} from "~/context/AuthContext";
import Loading from "~/components/Loading";
import {Navbar} from "~/components/Navbar";

export default function AppLayout() {
    const {profile, loading} = useAuth();

    if (loading) return <Loading/>;

    if (!profile?.disabilityId) {
        return <Navigate to="/onboarding" replace/>;
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