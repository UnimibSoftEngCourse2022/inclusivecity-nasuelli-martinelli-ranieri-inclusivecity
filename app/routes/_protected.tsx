import {Navigate, Outlet} from "react-router";
import {useAuth} from "~/context/AuthContext";
import Loading from "~/components/Loading";

export default function ProtectedLayout() {
    const {user, loading} = useAuth();

    if (loading) {
        return <Loading/>;
    }

    if (!user) {
        return <Navigate to="/auth/login" replace/>;
    }

    return <Outlet/>;
}