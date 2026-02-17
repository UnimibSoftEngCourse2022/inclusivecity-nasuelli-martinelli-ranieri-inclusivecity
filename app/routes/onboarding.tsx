import {Navigate} from "react-router";
import {useAuth} from "~/context/AuthContext";
import Loading from "~/components/Loading";

export default function Onboarding() {
    const {profile, loading} = useAuth();

    if (loading) return <Loading/>;

    if (profile?.disabilityId) {
        return <Navigate to="/app/map" replace/>;
    }

    return <p>Onboarding</p>;
}