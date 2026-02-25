import { useAuth } from "~/context/AuthContext";
import { LogOut, Shield, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";

export default function ProfilePage() {
    const navigate = useNavigate();

    const { profile, signOut } = useAuth();

    const isAdmin = profile?.role === "ADMIN";

    return (
        <div className="p-4 max-w-2xl mx-auto space-y-8">
            <h1 className="text-2xl font-bold text-text">Profilo</h1>

            {/* --- DATI PROFILO --- */}
            <section className="bg-surface rounded-xl border border-border p-4 shadow-sm space-y-4">
                <div className="flex items-center gap-4">
                    <img
                        src={profile?.profilePicUrl ?? "/placeholder-user.png"}
                        alt="Foto profilo"
                        className="w-16 h-16 rounded-full object-cover border"
                    />

                    <div>
                        <p className="text-lg font-semibold">
                            {profile?.firstName} {profile?.lastName}
                        </p>
                        <p className="text-sm text-text/70">{profile?.email}</p>
                    </div>
                </div>

                {/* --- COLLEGAMENTO ALLA PAGINA DI MODIFICA --- */}
                <Link
                   to="/app/profilesettings"
                className="inline-block mt-2 text-primary font-medium hover:underline"
                >
                  Modifica profilo
                
                </Link>

            </section>

            {/* --- ADMIN --- */}
            {isAdmin && (
                <section className="bg-surface rounded-xl border border-border p-4 shadow-sm">
                    <Link
                        to="/admin"
                        className="flex items-center gap-3 p-2 hover:bg-primary/10 rounded-lg transition"
                    >
                        <Shield className="w-5 h-5 text-primary" />
                        <span className="font-medium">Vai alla sezione Admin</span>
                    </Link>
                </section>
            )}
{/* --- LE MIE BARRIERE --- */}
          <section className="bg-surface rounded-xl border border-border p-4 shadow-sm space-y-3 mt-6">
  <h2 className="text-lg font-semibold text-text">Barriere</h2>
  <div className="flex flex-col space-y-3">
  <button
    onClick={() => navigate("/app/mybarriers")}
    className="text-primary font-medium hover:underline text-left"
  >
    Mostra barriere segnalate da me
  </button>

  <button
    onClick={() => navigate("/app/allbarriers")}
    className="text-primary font-medium hover:underline text-left"
  >
    Mostra tutte le barriere
  </button>
  </div>
</section>
 

            {/* --- LOGOUT --- */}
            <section className="bg-surface rounded-xl border border-border overflow-hidden shadow-sm">
                <button
                    onClick={signOut}
                    className="w-full flex items-center gap-3 p-4 text-left text-error hover:bg-error/5 transition-colors"
                >
                    <LogOut className="w-5 h-5" />
                    <span className="font-medium">Esci dall'account</span>
                </button>
            </section>
        </div>
    );
}
