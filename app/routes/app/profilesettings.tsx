import {useState} from "react";
import {supabase} from "~/services/supabase/supabase";
import {useAuth} from "~/context/AuthContext";
import {useNavigate} from "react-router-dom";
import {usePushNotifications} from "~/hooks/usePushNotifications";

export default function SettingsPage() {
    const {user, profile, refreshProfile} = useAuth();
    const navigate = useNavigate();

    const {
        enableNotifications,
        disableNotifications,
        loading: notifLoading,
        error: notifError,
        isActive,
        isSupported,
        permission
    } = usePushNotifications();

    if (!user) return <div>Caricamento...</div>;

    const safeUser = user!;

    const [firstName, setFirstName] = useState(profile?.firstName || "");
    const [lastName, setLastName] = useState(profile?.lastName || "");
    const [email, setEmail] = useState(profile?.email || "");
    const [newPassword, setNewPassword] = useState("");
    const [profilePicUrl, setProfilePicUrl] = useState(profile?.profilePicUrl || "");
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);
    const [changingRole, setChangingRole] = useState(false);

    async function uploadImage(e: React.ChangeEvent<HTMLInputElement>) {
        try {
            setUploading(true);
            const file = e.target.files?.[0];
            if (!file) return;

            const fileExt = file.name.split(".").pop();
            const fileName = `avatar-${safeUser.id}.${fileExt}`;

            const {error: uploadError} = await supabase.storage
                .from("profile-pictures")
                .upload(fileName, file, {upsert: true});

            if (uploadError) throw uploadError;

            const {data} = supabase.storage
                .from("profile-pictures")
                .getPublicUrl(fileName);

            const publicUrl = `${data.publicUrl}?t=${Date.now()}`;


            setProfilePicUrl(publicUrl);

            const {error: updateError} = await supabase
                .from("User")
                .update({profilePicUrl: publicUrl})
                .eq("id", safeUser.id);

            if (updateError) throw updateError;

            await refreshProfile();

        } catch (error) {
            alert("Errore durante l'upload dell'immagine.");
        } finally {
            setUploading(false);
        }
    }

    async function handleSave() {
        setSaving(true);

        const {error} = await supabase
            .from("User")
            .update({
                firstName,
                lastName,
                email,
                profilePicUrl,
            })
            .eq("id", safeUser.id);

        setSaving(false);

        if (!error) {
            await refreshProfile();
            navigate("/app/profile");
        } else {
            alert("Errore durante il salvataggio");
        }
    }

    async function handlePasswordChange() {
        setChangingPassword(true);

        const {error} = await supabase.auth.updateUser({
            password: newPassword,
        });

        setChangingPassword(false);

        if (!error) {
            alert("Password aggiornata con successo");
            setNewPassword("");
        } else {
            alert("Errore durante il cambio password");
        }
    }

    async function handleRoleChangeToAdmin() {
        const ADMIN_KEY = "adminkey123";

        const key = prompt("Inserisci la chiave per diventare Admin:");

        if (!key) {
            alert("Operazione annullata");
            return;
        }

        if (key !== ADMIN_KEY) {
            alert("Chiave non valida");
            return;
        }

        setChangingRole(true);

        const {error} = await supabase
            .from("User")
            .update({role: "ADMIN"})
            .eq("id", safeUser.id);

        setChangingRole(false);

        if (!error) {
            await refreshProfile();
            alert("Ora sei Admin");
            navigate("/app/profile");
        } else {
            alert("Errore durante il cambio ruolo");
        }
    }

    async function handleRoleChangeToUser() {
        setChangingRole(true);

        const {error} = await supabase
            .from("User")
            .update({role: "USER"})
            .eq("id", safeUser.id);

        setChangingRole(false);

        if (!error) {
            await refreshProfile();
            alert("Ora sei tornato utente normale");
            navigate("/app/profile");
        } else {
            alert("Errore durante il cambio ruolo");
        }
    }

    return (
        <div className="p-4 max-w-2xl mx-auto space-y-8">
            <h1 className="text-2xl font-bold text-text">Modifica profilo</h1>

            <section className="bg-surface rounded-xl border border-border p-4 shadow-sm space-y-6">

                {/* FOTO PROFILO */}
                <div className="flex items-center gap-4">
                    <img
                        src={profilePicUrl || "/placeholder-user.png"}
                        alt="Profile"
                        className="w-20 h-20 rounded-full object-cover border"
                    />

                    <label className="cursor-pointer text-primary font-medium hover:underline">
                        {uploading ? "Caricamento..." : "Cambia immagine"}
                        <input type="file" accept="image/*" onChange={uploadImage} hidden/>
                    </label>
                </div>

                {/* FORM */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-text/80">Nome</label>
                        <input
                            className="w-full mt-1 p-2 rounded-lg border border-border bg-surface"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text/80">Cognome</label>
                        <input
                            className="w-full mt-1 p-2 rounded-lg border border-border bg-surface"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                        />
                    </div>

                    {/* EMAIL */}
                    <div>
                        <label className="block text-sm font-medium text-text/80">Email</label>
                        <input
                            className="w-full mt-1 p-2 rounded-lg border border-border bg-surface"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    {/* PASSWORD */}
                    <div>
                        <label className="block text-sm font-medium text-text/80">Nuova password</label>
                        <input
                            type="password"
                            className="w-full mt-1 p-2 rounded-lg border border-border bg-surface"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                        />
                        <button
                            className="mt-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition"
                            onClick={handlePasswordChange}
                            disabled={changingPassword}
                        >
                            {changingPassword ? "Aggiornamento..." : "Cambia password"}
                        </button>
                    </div>

                    {/* NOTIFICHE PUSH */}
                    <div className="pt-4 border-t border-border">
                        <h3 className="text-sm font-medium text-text/80 mb-2">Notifiche Push</h3>
                        <p className="text-xs text-text-muted mb-3">
                            Ricevi aggiornamenti sullo stato delle tue segnalazioni e feedback sulle barriere.
                        </p>

                        {!isSupported ? (
                            <p className="text-error text-xs font-medium">Il tuo browser o dispositivo non supporta le
                                notifiche push.</p>
                        ) : permission === "denied" ? (
                            <p className="text-error text-xs font-medium">Hai bloccato le notifiche per questo sito.
                                Sblocca i permessi cliccando sul lucchetto nella barra degli indirizzi del browser.</p>
                        ) : isActive ? (
                            <button
                                className="px-4 py-2 rounded-lg transition border text-sm font-medium bg-error/10 border-error/30 text-error hover:bg-error/20 disabled:opacity-50"
                                onClick={disableNotifications}
                                disabled={notifLoading}
                            >
                                {notifLoading ? "Disattivazione..." : "Disabilita Notifiche"}
                            </button>
                        ) : (
                            <button
                                className="px-4 py-2 rounded-lg transition border text-sm font-medium bg-surface border-primary text-primary hover:bg-primary/10 disabled:opacity-50"
                                onClick={enableNotifications}
                                disabled={notifLoading}
                            >
                                {notifLoading ? "Richiesta permessi..." : "Abilita Notifiche"}
                            </button>
                        )}

                        {notifError && <p className="text-error text-xs mt-2">{notifError}</p>}
                    </div>

                    {/* RUOLO */}
                    <div className="pt-4 border-t border-border">
                        <p className="text-sm text-text/80">
                            Ruolo attuale: <strong>{profile?.role}</strong>
                        </p>

                        {profile?.role === "USER" && (
                            <button
                                className="mt-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition"
                                onClick={handleRoleChangeToAdmin}
                                disabled={changingRole}
                            >
                                {changingRole ? "Aggiornamento..." : "Passa alla modalità Admin"}
                            </button>
                        )}

                        {profile?.role === "ADMIN" && (
                            <button
                                className="mt-2 bg-error text-white px-4 py-2 rounded-lg hover:bg-error/90 transition"
                                onClick={handleRoleChangeToUser}
                                disabled={changingRole}
                            >
                                {changingRole ? "Aggiornamento..." : "Torna utente normale"}
                            </button>
                        )}
                    </div>
                </div>

                {/* SALVA */}
                <button
                    className="w-full bg-primary text-white font-medium py-2 rounded-lg hover:bg-primary/90 transition"
                    onClick={handleSave}
                    disabled={saving}
                >
                    {saving ? "Salvataggio..." : "Salva modifiche"}
                </button>
            </section>
        </div>
    );
}