import React, {useEffect, useState} from "react";
import type {ActionFunctionArgs} from "react-router";
import {Form, redirect, useActionData, useNavigation as useReactNavigation, useSubmit} from "react-router";
import {supabase} from "~/services/supabase";
import {useAuth} from "~/context/AuthContext";
import {prisma} from "~/db.server";
import {Camera, CheckCircle, Loader2, Lock, Save} from "lucide-react";
import {profileSchema} from "~/utils/validations";
import PageWrapper from "~/components/ui/PageWrapper";
import PageHeader from "~/components/ui/PageHeader";


export async function action({request}: ActionFunctionArgs) {
    const formData = await request.formData();
    const rawData = Object.fromEntries(formData);

    const parsed = profileSchema.safeParse(rawData);

    if (!parsed.success) {
        return {error: parsed.error.issues[0].message};
    }

    try {
        await prisma.user.update({
            where: {id: parsed.data.userId},
            data: {
                firstName: parsed.data.firstName,
                lastName: parsed.data.lastName || null,
                profilePicUrl: parsed.data.profilePicUrl || null
            }
        });

        return redirect("/app/profile");
    } catch (error: any) {
        console.error("Errore update profilo:", error);
        return {error: "Errore durante il salvataggio nel database."};
    }
}

export default function EditProfilePage() {
    const {user, profile, refreshProfile} = useAuth();
    const actionData = useActionData<typeof action>();
    const submit = useSubmit();
    const navigation = useReactNavigation();

    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string>(profile?.profilePicUrl || "");
    const [isUploading, setIsUploading] = useState(false);
    const [clientError, setClientError] = useState<string | null>(null);

    const [newPassword, setNewPassword] = useState("");
    const [changingPassword, setChangingPassword] = useState(false);
    const [passwordFeedback, setPasswordFeedback] = useState<{ type: 'error' | 'success', msg: string } | null>(null);

    const isSubmittingProfile = isUploading || navigation.state === "submitting";
    const displayError = clientError || actionData?.error;

    useEffect(() => {
        return () => {
            if (photoFile && photoPreview) URL.revokeObjectURL(photoPreview);
        };
    }, [photoFile, photoPreview]);

    if (!user || !profile) {
        return (
            <div className="p-8 flex justify-center w-full">
                <Loader2 className="w-8 h-8 animate-spin text-primary"/>
            </div>
        );
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPhotoFile(file);
            setPhotoPreview(URL.createObjectURL(file));
        }
    };

    const handleProfileSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();
        setClientError(null);

        const formElement = e.currentTarget;
        const formData = new FormData(formElement);

        const formValues = {
            firstName: formData.get("firstName"),
            lastName: formData.get("lastName"),
            profilePicUrl: photoPreview,
            userId: user.id
        };

        const parsed = profileSchema.safeParse(formValues);
        if (!parsed.success) {
            setClientError(parsed.error.issues[0].message);
            window.scrollTo({top: 0, behavior: "smooth"});
            return;
        }

        setIsUploading(true);
        try {
            let finalPhotoUrl = profile.profilePicUrl || "";

            if (photoFile) {
                const fileExt = photoFile.name.split(".").pop() || "jpg";
                const fileName = `avatar-${user.id}.${fileExt}`;

                const {error: uploadError} = await supabase.storage
                    .from("profile-pictures")
                    .upload(fileName, photoFile, {
                        upsert: true
                    });

                if (uploadError) throw new Error("Errore durante il caricamento dell'immagine.");

                const {data} = supabase.storage.from("profile-pictures").getPublicUrl(fileName);
                finalPhotoUrl = `${data.publicUrl}?t=${Date.now()}`;
            }

            formData.set("profilePicUrl", finalPhotoUrl);
            formData.set("userId", user.id);

            refreshProfile();
            submit(formData, {method: "post"});
        } catch (err: any) {
            setClientError(err.message || "Si è verificato un errore.");
        } finally {
            setIsUploading(false);
        }
    };

    const handlePasswordChange = async (e: React.SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!newPassword || newPassword.length < 6) {
            setPasswordFeedback({type: 'error', msg: "La password deve avere almeno 6 caratteri."});
            return;
        }

        setChangingPassword(true);
        setPasswordFeedback(null);

        const {error} = await supabase.auth.updateUser({password: newPassword});

        setChangingPassword(false);

        if (error) {
            setPasswordFeedback({type: 'error', msg: "Errore durante l'aggiornamento. Riprova."});
        } else {
            setPasswordFeedback({type: 'success', msg: "Password aggiornata con successo!"});
            setNewPassword("");
        }
    };

    const inputClass = "w-full bg-background border border-border px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all text-text";
    const labelClass = "block text-sm font-semibold text-text mb-1.5";
    const initials = `${profile?.firstName?.[0] || ""}${profile?.lastName?.[0] || ""}`.toUpperCase();

    return (
        <PageWrapper>
            <PageHeader
                title="Modifica Account"
                subtitle="Gestisci i tuoi dati personali"
                backUrl="/app/profile"
            />

            {displayError && (
                <div
                    className="p-4 mb-6 bg-error/10 border border-error/20 text-error rounded-xl text-sm font-medium shadow-sm">
                    {displayError}
                </div>
            )}

            <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8">

                {/* --- COLONNA SINISTRA: Foto Profilo --- */}
                <div className="w-full md:col-span-5 flex flex-col gap-6">
                    <section
                        className="w-full bg-surface rounded-3xl border border-border p-6 shadow-sm flex flex-col items-center text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-24 bg-primary/10"></div>

                        <div className="relative z-10 mt-4 group cursor-pointer">
                            <div
                                className="w-24 h-24 rounded-full border-4 border-surface shadow-md bg-background overflow-hidden relative flex items-center justify-center">
                                {photoPreview ? (
                                    <img src={photoPreview} alt="Profile Preview"
                                         className="w-full h-full object-cover"/>
                                ) : (
                                    <span className="text-3xl font-bold text-text-muted">
                                        {initials || "U"}
                                    </span>
                                )}
                                <div
                                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Camera className="w-8 h-8 text-white"/>
                                </div>
                            </div>
                            <input type="file" accept="image/*" onChange={handleFileChange}
                                   className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                   disabled={isSubmittingProfile}/>
                        </div>

                        <h2 className="text-xl font-bold text-text mt-3 relative z-10 truncate w-full px-2">
                            {profile?.firstName} {profile?.lastName}
                        </h2>
                        <p className="text-sm font-medium text-text-muted mt-1 relative z-10">
                            Tocca la foto per cambiarla
                        </p>
                    </section>
                </div>

                {/* --- COLONNA DESTRA: Dati Testuali e Password --- */}
                <div className="w-full md:col-span-7 flex flex-col gap-6">

                    {/* FORM DATI */}
                    <Form onSubmit={handleProfileSubmit}
                          className="w-full bg-surface rounded-3xl border border-border p-6 shadow-sm space-y-5">
                        <h2 className="text-lg font-bold text-text mb-2 border-b border-border pb-2">Dati Personali</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Nome <span className="text-error">*</span>
                                    <input name="firstName" defaultValue={profile.firstName} required
                                           className={inputClass}/>
                                </label>
                            </div>
                            <div>
                                <label className={labelClass}>
                                    Cognome <input name="lastName" defaultValue={profile.lastName || ""}
                                                   className={inputClass}/>
                                </label>
                            </div>
                        </div>

                        <div>
                            <label className={labelClass}>
                                Email (Non modificabile) <input type="email" value={profile.email} disabled
                                                                className={`${inputClass} opacity-60 cursor-not-allowed`}/>
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmittingProfile}
                            className="w-full mt-2 flex items-center justify-center gap-2 bg-primary text-white font-bold py-3.5 rounded-xl shadow-md hover:bg-primary/90 disabled:opacity-70 transition active:scale-95"
                        >
                            {isSubmittingProfile ?
                                <Loader2 className="w-5 h-5 animate-spin"/> :
                                <Save className="w-5 h-5"/>}
                            {isUploading ? "Caricamento foto..." : "Salva Profilo"}
                        </button>
                    </Form>

                    {/* SICUREZZA E PASSWORD */}
                    <form onSubmit={handlePasswordChange}
                          className="w-full bg-surface rounded-3xl border border-border p-6 shadow-sm space-y-5">
                        <h2 className="flex items-center gap-2 text-lg font-bold text-text border-b border-border pb-2">
                            <Lock className="w-5 h-5 text-primary"/> Sicurezza
                        </h2>

                        {passwordFeedback && (
                            <div
                                className={`p-3 rounded-xl text-sm font-medium flex items-center gap-2 ${passwordFeedback.type === 'error' ? 'bg-error/10 text-error' : 'bg-success/10 text-success'}`}>
                                {passwordFeedback.type === 'success' && <CheckCircle className="w-4 h-4 shrink-0"/>}
                                {passwordFeedback.msg}
                            </div>
                        )}

                        <div>
                            <label className={labelClass}>
                                Nuova Password <input
                                type="password"
                                placeholder="Inserisci almeno 6 caratteri"
                                className={inputClass}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                            />
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={changingPassword || newPassword.length < 6}
                            className="w-full mt-2 flex items-center justify-center gap-2 bg-surface border border-border text-text font-bold py-3.5 rounded-xl shadow-sm hover:bg-background disabled:opacity-50 transition active:scale-95"
                        >
                            {changingPassword ? <Loader2 className="w-5 h-5 animate-spin"/> : "Aggiorna Password"}
                        </button>
                    </form>
                </div>
            </div>
        </PageWrapper>
    );
}