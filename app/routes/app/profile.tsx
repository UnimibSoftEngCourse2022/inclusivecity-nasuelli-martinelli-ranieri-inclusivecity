import {Award, Bell, ChevronRight, List, LogOut, MapPin, Settings, Shield} from "lucide-react";
import {Link, useNavigate} from "react-router";
import {useEffect, useState} from "react";
import {usePushNotifications} from "../../hooks/usePushNotifications";
import {useAuth} from "../../context/AuthContext";
import {supabase} from "../../services/supabase";
import PageWrapper from "../../components/ui/PageWrapper";
import PageHeader from "../../components/ui/PageHeader";

export default function ProfilePage() {
    const navigate = useNavigate();
    const {profile, signOut} = useAuth();

    const {
        enableNotifications, disableNotifications, loading: notifLoading,
        error: notifError, isActive, isSupported, permission
    } = usePushNotifications();

    const [unreadCount, setUnreadCount] = useState(0);

    // Fetch del numero di notifiche non lette
    useEffect(() => {
        if (!profile?.id) return;
        const fetchUnread = async () => {
            const {count} = await supabase
                .from('Notification')
                .select('*', {count: 'exact', head: true})
                .eq('userId', profile.id)
                .eq('isRead', false);
            setUnreadCount(count || 0);
        };
        fetchUnread();
    }, [profile?.id]);

    const isAdmin = profile?.role === "ADMIN";
    const initials = `${profile?.firstName?.[0] || ""}${profile?.lastName?.[0] || ""}`.toUpperCase();

    return (
        <PageWrapper>
            <div className="mb-2">
                <PageHeader title="Il tuo Profilo" showBack={false}/>
            </div>

            {/* GRIGLIA RESPONSIVE: 1 colonna su mobile, 2 colonne su desktop */}
            <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8">

                {/* --- COLONNA SINISTRA (Profilo e Notifiche) --- */}
                <div className="w-full md:col-span-5 flex flex-col gap-6">
                    <section
                        className="w-full bg-surface rounded-3xl border border-border p-6 shadow-sm flex flex-col items-center text-center gap-4 relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-24 bg-primary/10"></div>

                        <div className="relative z-10 flex flex-col items-center mt-4">
                            <div
                                className="w-24 h-24 rounded-full border-4 border-surface shadow-md bg-background flex items-center justify-center overflow-hidden">
                                {profile?.profilePicUrl ? (
                                    <img src={profile.profilePicUrl} alt="Foto profilo"
                                         className="w-full h-full object-cover"/>
                                ) : (
                                    <span className="text-3xl font-bold text-text-muted">{initials}</span>
                                )}
                            </div>
                            <h2 className="text-xl font-bold text-text mt-3">
                                {profile?.firstName} {profile?.lastName}
                            </h2>
                            <p className="text-sm text-text-muted">{profile?.email}</p>
                        </div>

                        <div
                            className="flex items-center gap-2 mt-2 bg-warning/10 text-warning px-4 py-1.5 rounded-full font-bold text-sm border border-warning/20 z-10">
                            <Award className="w-4 h-4"/>
                            Reputazione: {profile?.reputationScore || 0}
                        </div>
                    </section>

                    <section className="w-full bg-surface rounded-3xl border border-border p-5 shadow-sm space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="bg-warning/10 p-2.5 rounded-xl text-warning shrink-0">
                                <Bell className="w-5 h-5"/>
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-text truncate">Notifiche Push</h3>
                                <p className="text-xs text-text-muted truncate">Aggiornamenti sulle tue segnalazioni</p>
                            </div>

                            {isSupported && permission !== "denied" && (
                                <button
                                    onClick={isActive ? disableNotifications : enableNotifications}
                                    disabled={notifLoading}
                                    className={`shrink-0 relative inline-flex h-7 w-12 items-center rounded-full transition-colors disabled:opacity-50 ${isActive ? "bg-primary" : "bg-border"}`}
                                >
                                    <span
                                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${isActive ? "translate-x-6" : "translate-x-1"}`}/>
                                </button>
                            )}
                        </div>

                        {permission === "denied" && !notifError && (
                            <p className="text-error text-xs font-medium mt-2">
                                Hai bloccato le notifiche. Sblocca i permessi dal browser.
                            </p>
                        )}
                        {notifError && (
                            <p className="text-error text-xs font-medium mt-2">{notifError}</p>
                        )}
                    </section>
                </div>

                {/* --- COLONNA DESTRA (Menu e Logout) --- */}
                <div className="w-full md:col-span-7 flex flex-col gap-6">
                    <section
                        className="w-full bg-surface rounded-3xl border border-border shadow-sm overflow-hidden flex flex-col h-fit">
                        {/* LINK CENTRO NOTIFICHE */}
                        <Link to={`/app/notifications?userId=${profile?.id}`}
                              className="flex items-center justify-between p-5 hover:bg-background transition-colors border-b border-border/50 group text-left">
                            <div className="flex items-center gap-4">
                                <div
                                    className="relative bg-primary/10 p-2.5 rounded-xl text-primary group-hover:scale-110 transition-transform">
                                    <Bell className="w-5 h-5"/>
                                    {unreadCount > 0 && (
                                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                            <span
                                                className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-error"></span>
                                        </span>
                                    )}
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-semibold text-text">Centro Notifiche</span>
                                    <span className="text-xs text-text-muted">Messaggi e aggiornamenti</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {unreadCount > 0 && (
                                    <span
                                        className="bg-error text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                                        {unreadCount} nuove
                                    </span>)}
                                <ChevronRight className="w-5 h-5 text-text-muted"/>
                            </div>
                        </Link>

                        <Link to="/app/profile/edit"
                              className="flex items-center justify-between p-5 hover:bg-background transition-colors border-b border-border/50 group">
                            <div className="flex items-center gap-4">
                                <div
                                    className="bg-primary/10 p-2.5 rounded-xl text-primary group-hover:scale-110 transition-transform">
                                    <Settings className="w-5 h-5"/>
                                </div>
                                <span className="font-semibold text-text">Modifica Account</span>
                            </div>
                            <ChevronRight className="w-5 h-5 text-text-muted"/>
                        </Link>

                        <button onClick={() => navigate(`/app/barriers?view=me&userId=${profile?.id}`)}
                                className="w-full flex items-center justify-between p-5 hover:bg-background transition-colors border-b border-border/50 group text-left">
                            <div className="flex items-center gap-4">
                                <div
                                    className="bg-primary/10 p-2.5 rounded-xl text-primary group-hover:scale-110 transition-transform">
                                    <MapPin className="w-5 h-5"/>
                                </div>
                                <span className="font-semibold text-text">Le mie segnalazioni</span>
                            </div>
                            <ChevronRight className="w-5 h-5 text-text-muted"/>
                        </button>

                        <button onClick={() => navigate("/app/barriers")}
                                className="w-full flex items-center justify-between p-5 hover:bg-background transition-colors group text-left">
                            <div className="flex items-center gap-4">
                                <div
                                    className="bg-primary/10 p-2.5 rounded-xl text-primary group-hover:scale-110 transition-transform">
                                    <List className="w-5 h-5"/>
                                </div>
                                <span className="font-semibold text-text">Esplora tutte le barriere</span>
                            </div>
                            <ChevronRight className="w-5 h-5 text-text-muted"/>
                        </button>
                    </section>

                    {isAdmin && (
                        <section
                            className="w-full bg-error/5 rounded-3xl border border-error/20 shadow-sm overflow-hidden">
                            <Link to="/app/admin/reports"
                                  className="flex items-center justify-between p-5 hover:bg-error/10 transition-colors group text-left">
                                <div className="flex items-center gap-4">
                                    <div
                                        className="bg-error/20 p-2.5 rounded-xl text-error group-hover:scale-110 transition-transform">
                                        <Shield className="w-5 h-5"/>
                                    </div>
                                    <div>
                                        <span className="font-bold text-error block">Pannello Admin</span>
                                        <span className="text-xs text-error/70">Gestisci report e risoluzioni</span>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-error"/>
                            </Link>
                        </section>
                    )}

                    <button
                        onClick={signOut}
                        className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl text-error font-bold hover:bg-error/10 transition-colors border border-transparent hover:border-error/20 active:scale-95 mt-auto"
                    >
                        <LogOut className="w-5 h-5"/> Esci dall'account
                    </button>
                </div>

            </div>
        </PageWrapper>
    );
}