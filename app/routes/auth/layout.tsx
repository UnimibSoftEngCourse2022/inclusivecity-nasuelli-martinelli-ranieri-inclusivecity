import {Navigate, Outlet, useLocation} from "react-router";
import {useAuth} from "~/context/AuthContext";
import Loading from "~/components/Loading";

export default function AuthLayout() {
    const {user, loading} = useAuth();

    if (loading) {
        return <Loading/>;
    }

    if (user) {
        return <Navigate to="/app/map" replace/>;
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4 transition-colors duration-500">
            <div className="w-full max-w-md space-y-8">
                <Outlet/>
            </div>
        </div>
    );
}