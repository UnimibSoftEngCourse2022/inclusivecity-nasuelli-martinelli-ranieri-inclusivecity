import { Link } from "react-router-dom";

export default function Dashboard() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Pannello di Controllo</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Colonna sinistra: Resolutions */}
        <div className="p-6 rounded-xl border border-gray-200 shadow-sm bg-white">
          <h2 className="text-2xl font-semibold mb-4">Resolutions</h2>
          <p className="text-gray-600 mb-4">
            Gestisci lo stato delle risoluzioni delle barriere.
          </p>

          <Link
            to="/app/admin/resolutions"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Vai alle Resolutions
          </Link>
        </div>

        {/* Colonna destra: Reports */}
        <div className="p-6 rounded-xl border border-gray-200 shadow-sm bg-white">
          <h2 className="text-2xl font-semibold mb-4">Reports</h2>
          <p className="text-gray-600 mb-4">
            Visualizza e approva le segnalazioni inviate dagli utenti.
          </p>

          <Link
            to="/app/admin/barriers"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Vai ai Reports
          </Link>
        </div>

      </div>
    </div>
  );
}
