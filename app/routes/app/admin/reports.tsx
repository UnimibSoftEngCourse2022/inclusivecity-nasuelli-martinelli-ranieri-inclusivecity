import { Link } from "react-router-dom";

export default function Dashboard() {
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-text mb-4">Pannello di Controllo</h1>

      {/* Banner Resolutions */}
      <div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-text mb-2">Resolutions</h2>
        <p className="text-text-muted mb-4">
          Gestisci le risoluzioni proposte dagli utenti per le barriere.
        </p>

        <Link
          to="/app/admin/resolutions"
          className="inline-block px-4 py-2 rounded-lg text-white font-medium
                     bg-green-400 hover:bg-green-500 transition"
        >
          Vai alle Resolutions
        </Link>
      </div>

      {/* Banner Reports */}
      <div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-text mb-2">Reports</h2>
        <p className="text-text-muted mb-4">
          Visualizza e gestisci le segnalazioni inviate dagli utenti.
        </p>

        <Link
          to="/app/admin/barriers"
          className="inline-block px-4 py-2 rounded-lg text-white font-medium
                     bg-green-400 hover:bg-green-500 transition"
        >
          Vai ai Reports
        </Link>
      </div>
    </div>
  );
}
