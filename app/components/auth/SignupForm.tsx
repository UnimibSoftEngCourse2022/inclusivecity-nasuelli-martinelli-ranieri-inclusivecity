"use client";

import {useState} from "react";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import * as z from "zod";
import {useNavigate} from "react-router";
import {supabase} from "~/services/supabase/supabase";
import SocialLogin from "~/components/auth/SocialLogin";

const signUpSchema = z
    .object({
        firstName: z.string().min(2, "Il nome deve avere almeno 2 caratteri"),
        lastName: z.string().min(2, "Il cognome deve avere almeno 2 caratteri"),
        email: z.email("Inserisci un'email valida"),
        password: z
            .string()
            .min(6, "La password deve avere almeno 6 caratteri"),
        confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Le password non coincidono",
        path: ["confirmPassword"],
    });

type SignUpFormValues = z.infer<typeof signUpSchema>;

export default function SignUpForm() {
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const {
        register,
        handleSubmit,
        formState: {errors},
    } = useForm<SignUpFormValues>({
        resolver: zodResolver(signUpSchema),
    });

    const onSubmit = async (formData: SignUpFormValues) => {
        setLoading(true);
        setError(null);

        try {
            const {data, error: authError} = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        firstName: formData.firstName,
                        lastName: formData.lastName,
                    },
                },
            });

            if (authError) throw authError;

            if (data.session) {
                navigate("/app/map");
            } else {
                // Caso in cui sia richiesta conferma email
                navigate("/auth/login");
            }
        } catch (e: any) {
            setError(e.message || "Errore durante la registrazione");
        } finally {
            setLoading(false);
        }
    };

    const inputClass = "mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-text placeholder-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors";
    const labelClass = "block text-sm font-medium text-text-muted";
    const errorClass = "text-error text-xs mt-1";

    return (
        <div className="w-full bg-surface rounded-xl shadow-lg border border-border p-6 md:p-8">
            <h2 className="text-2xl font-bold mb-2 text-center text-text">Crea Account</h2>
            <p className="text-center text-text-muted mb-6 text-sm">Unisciti a InclusiveCity</p>

            {error && (
                <div className="mb-4 p-3 bg-error/10 border border-error/20 text-error rounded text-sm">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    {/* Nome */}
                    <div>
                        <label className={labelClass}>Nome</label>
                        <input {...register("firstName")} type="text" className={inputClass} placeholder="Mario" />
                        {errors.firstName && <p className={errorClass}>{errors.firstName.message}</p>}
                    </div>

                    {/* Cognome */}
                    <div>
                        <label className={labelClass}>Cognome</label>
                        <input {...register("lastName")} type="text" className={inputClass} placeholder="Rossi" />
                        {errors.lastName && <p className={errorClass}>{errors.lastName.message}</p>}
                    </div>
                </div>

                {/* Email */}
                <div>
                    <label className={labelClass}>Email</label>
                    <input {...register("email")} type="email" className={inputClass} placeholder="nome@esempio.com" />
                    {errors.email && <p className={errorClass}>{errors.email.message}</p>}
                </div>

                {/* Password */}
                <div>
                    <label className={labelClass}>Password</label>
                    <input {...register("password")} type="password" className={inputClass} placeholder="••••••" />
                    {errors.password && <p className={errorClass}>{errors.password.message}</p>}
                </div>

                {/* Conferma Password */}
                <div>
                    <label className={labelClass}>Conferma Password</label>
                    <input {...register("confirmPassword")} type="password" className={inputClass} placeholder="••••••" />
                    {errors.confirmPassword && <p className={errorClass}>{errors.confirmPassword.message}</p>}
                </div>

                {/* Bottone Submit */}
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-6 flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-primary-foreground bg-primary hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                    {loading ? "Registrazione in corso..." : "Registrati"}
                </button>
            </form>

            {/* Google Login */}
            <SocialLogin />
        </div>
    );
}