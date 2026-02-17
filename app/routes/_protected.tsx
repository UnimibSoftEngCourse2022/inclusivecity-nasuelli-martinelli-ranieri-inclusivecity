import {Navigate, Outlet, useLocation} from "react-router";
import {useAuth} from "~/context/AuthContext";
import Loading from "~/components/Loading";

export default function ProtectedLayout() {
    const {user, loading} = useAuth();
    const location = useLocation();

    if (loading) {
        return <Loading/>;
    }

    if (!user) {
        return <Navigate to="/auth/login" state={{from: location}} replace/>;
    }

    return <Outlet/>;
}