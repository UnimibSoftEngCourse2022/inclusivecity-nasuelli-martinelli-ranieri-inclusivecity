"use client";

import {useState} from "react";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import * as z from "zod";
import {useLocation, useNavigate} from "react-router";
import {supabase} from "~/services/supabase/supabase";

const loginSchema = z.object({
    email: z.email("Inserisci un'email valida"),
    password: z.string().min(1, "Inserisci la password"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginForm() {
    const navigate = useNavigate();
    const location = useLocation();
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const from = location.state?.from?.pathname || "/app/map";

    const {
        register,
        handleSubmit,
        formState: {errors},
    } = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit = async (formData: LoginFormValues) => {
        setLoading(true);
        setError(null);

        try {
            const {error: authError} = await supabase.auth.signInWithPassword({
                email: formData.email,
                password: formData.password,
            });

            if (authError) throw authError;

            // Login riuscito, reindirizza
            navigate(from, {replace: true});

        } catch (e: any) {
            console.error(e);
            setError("Email o password non corretti");
        } finally {
            setLoading(false);
        }
    };

    const inputClass = "mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-text placeholder-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors";
    const labelClass = "block text-sm font-medium text-text-muted";
    const errorClass = "text-error text-xs mt-1";

    return (
        <div className="w-full bg-surface rounded-xl shadow-lg border border-border p-6 md:p-8">
            <h2 className="text-2xl font-bold mb-2 text-center text-text">Bentornato</h2>
            <p className="text-center text-text-muted mb-6 text-sm">Accedi al tuo account InclusiveCity</p>

            {error && (
                <div className="mb-4 p-3 bg-error/10 border border-error/20 text-error rounded text-sm text-center">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Email */}
                <div>
                    <label className={labelClass}>Email</label>
                    <input
                        {...register("email")}
                        type="email"
                        className={inputClass}
                        placeholder="nome@esempio.com"
                        autoComplete="username"
                    />
                    {errors.email && <p className={errorClass}>{errors.email.message}</p>}
                </div>

                {/* Password */}
                <div>
                    <label className={labelClass}>Password</label>
                    <input
                        {...register("password")}
                        type="password"
                        className={inputClass}
                        placeholder="••••••"
                        autoComplete="current-password"
                    />
                    {errors.password && <p className={errorClass}>{errors.password.message}</p>}
                </div>

                {/* Bottone Submit */}
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-6 flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-primary-foreground bg-primary hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                    {loading ? "Accesso in corso..." : "Accedi"}
                </button>
            </form>
        </div>
    );
}