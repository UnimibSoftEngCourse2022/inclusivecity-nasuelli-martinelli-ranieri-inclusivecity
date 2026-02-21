import {useAuth} from "~/context/AuthContext";
import {LogOut} from "lucide-react";

export default function ProfilePage() {
    const {signOut} = useAuth();

    return (
        <div className="p-4 max-w-md mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-text">Profilo</h1>

            <div className="bg-surface rounded-xl border border-border overflow-hidden shadow-sm">
                <button
                    onClick={signOut}
                    className="w-full flex items-center gap-3 p-4 text-left text-error hover:bg-error/5 transition-colors"
                >
                    <LogOut className="w-5 h-5"/>
                    <span className="font-medium">Esci dall'account</span>
                </button>
            </div>
        </div>
    );
}