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
        <div
            className="h-full w-full overflow-y-auto bg-background flex flex-col items-center justify-center p-4 transition-colors duration-500">
            <div className="w-full max-w-md space-y-8 my-auto">
                <Outlet/>
            </div>
        </div>
    );
}