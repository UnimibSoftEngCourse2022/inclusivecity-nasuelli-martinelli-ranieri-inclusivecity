import {Navigate, Outlet} from "react-router";
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
        <div className="auth-layout-container">
            <Outlet/>
        </div>
    );
}