import { useEffect, useState } from "react";
import { supabase } from "~/services/supabase/supabase";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useAuth } from "~/context/AuthContext";

// Tipi corretti per Supabase
type Resolution = {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  evidenceUrl: string | null;
  comment: string | null;
  barrierId: string;
  createdAt: string;
  approvedAt: string | null;
  userId: string;
  approverId: string | null;
};

type Barrier = {
  id: string;
  title: string;
  address: string;
  state: string;
};

export default function AdminResolutionsPage() {
  const { profile } = useAuth();

  const [resolutions, setResolutions] = useState<Resolution[]>([]);
  const [barriers, setBarriers] = useState<Record<string, Barrier>>({});
  const [loading, setLoading] = useState(false);

  // Carica resolutions + barriere collegate
  useEffect(() => {
    async function load() {
      // 1) resolutions PENDING
      const { data: resData } = await supabase
        .from("Resolution")
        .select("*")
        .eq("status", "PENDING")
        .order("createdAt", { ascending: false });

      if (!resData) return;

      setResolutions(resData as Resolution[]);

      // 2) carica tutte le barriere collegate
      const barrierIds = resData.map((r) => r.barrierId);

      const { data: barrierData } = await supabase
        .from("Barrier") // <-- nome esatto della tabella
        .select("*")
        .in("id", barrierIds);

      if (barrierData) {
        const map: Record<string, Barrier> = {};
        barrierData.forEach((b) => (map[b.id] = b as Barrier));
        setBarriers(map);
      }
    }

    load();
  }, []);

  // APPROVA o RIFIUTA
  async function handleAction(
    resolution: Resolution,
    newStatus: "APPROVED" | "REJECTED"
  ) {
    setLoading(true);

    // APPROVAZIONE
    if (newStatus === "APPROVED") {
      // 1) aggiorna resolution
      await supabase
        .from("Resolution")
        .update({ status: "APPROVED" })
        .eq("id", resolution.id);

      // 2) aggiorna barriera
      await supabase
        .from("Barrier")
        .update({ state: "RESOLVED" })
        .eq("id", resolution.barrierId);
    }

    // RIFIUTO → DELETE
    if (newStatus === "REJECTED") {
      await supabase
        .from("Resolution")
        .delete()
        .eq("id", resolution.id);
    }

    // aggiorna lista localmente
    setResolutions((prev) => prev.filter((r) => r.id !== resolution.id));

    setLoading(false);
  }

  if (profile?.role !== "ADMIN") {
    return (
      <div className="p-8 text-center text-error font-semibold">
        Accesso negato.
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-text">Resolutions proposte</h1>

      {resolutions.length === 0 && (
        <p className="text-text-muted">Nessuna risoluzione proposta.</p>
      )}

      <div className="space-y-4">
        {resolutions.map((r) => {
          const barrier = barriers[r.barrierId];

          return (
            <div
              key={r.id}
              className="bg-surface border border-border rounded-xl p-4 shadow-sm"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <p className="font-semibold text-text">
                    {barrier ? barrier.title : "Barriera sconosciuta"}
                  </p>

                  <p className="text-sm text-text-muted">
                    {barrier ? barrier.address : ""}
                  </p>

                  <p className="text-sm mt-2">
                    <strong>Commento:</strong> {r.comment || "Nessun commento"}
                  </p>

                  {r.evidenceUrl && (
                    <img
                      src={r.evidenceUrl}
                      alt="Foto risoluzione"
                      className="mt-3 w-40 h-40 object-cover rounded-lg border"
                    />
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleAction(r, "APPROVED")}
                    className="p-2 bg-success/10 text-success rounded-lg hover:bg-success/20"
                  >
                    <CheckCircle className="w-5 h-5" />
                  </button>

                  <button
                    onClick={() => handleAction(r, "REJECTED")}
                    className="p-2 bg-error/10 text-error rounded-lg hover:bg-error/20"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {loading && (
        <div className="flex justify-center mt-4">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}
    </div>
  );
}

