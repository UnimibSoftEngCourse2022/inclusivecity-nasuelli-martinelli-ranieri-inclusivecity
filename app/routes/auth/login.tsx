import {Link} from "react-router";
import LoginForm from "~/components/auth/LoginForm";

export default function LoginPage() {
    return (
        <>
            <div className="text-center mb-8">
                <h1 className="text-3xl font-extrabold text-primary tracking-tight">
                    InclusiveCity
                </h1>
                <h2 className="mt-2 text-sm text-text-muted">
                    Accedi per continuare
                </h2>
            </div>

            <LoginForm/>

            <p className="mt-6 text-center text-sm text-text-muted">
                Non hai ancora un account?{" "}
                <Link
                    to="/auth/signin"
                    className="font-medium text-primary hover:text-primary/80 transition-colors"
                >
                    Registrati ora
                </Link>
            </p>
        </>
    );
}