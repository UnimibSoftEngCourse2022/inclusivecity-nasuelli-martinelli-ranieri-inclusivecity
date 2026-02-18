import {Navigate} from "react-router";
import {useAuth} from "~/context/AuthContext";
import Loading from "~/components/Loading";


export default function Index() {
    const {user, loading} = useAuth();

    if (loading) {
        return <Loading/>;
    }

    if (user) {
        return <Navigate to="/app/map" replace/>;
    }

    return <Navigate to="/auth/login" replace/>;
}