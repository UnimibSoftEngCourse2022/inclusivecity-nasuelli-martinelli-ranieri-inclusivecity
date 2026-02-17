import SignUpForm from "~/components/auth/SignupForm";
import {Link} from "react-router";

export default function SigninPage() {
    return (
        <>
            <div className="text-center mb-8">
                <h1 className="text-3xl font-extrabold text-primary tracking-tight">
                    InclusiveCity
                </h1>
                <h2 className="mt-2 text-sm text-text-muted">
                    Crea il tuo profilo
                </h2>
            </div>

            <SignUpForm/>

            <p className="mt-6 text-center text-sm text-text-muted">
                Hai già un account?{" "}
                <Link
                    to="/auth/login"
                    className="font-medium text-primary hover:text-primary/80 transition-colors"
                >
                    Accedi qui
                </Link>
            </p>
        </>
    );
}