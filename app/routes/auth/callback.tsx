import {useEffect} from "react";
import {useNavigate} from "react-router";
import {supabase} from "~/services/supabase/supabase";
import Loading from "~/components/Loading";

export default function AuthCallback() {
    const navigate = useNavigate();

    useEffect(() => {
        const {data: {subscription}} = supabase.auth.onAuthStateChange((event, session) => {
            if (event === "SIGNED_IN" || session) {
                // Login con google completato
                navigate("/app/map", {replace: true});
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [navigate]);

    return <Loading/>;
}