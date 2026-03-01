import { useEffect, useState } from "react";
import { supabase } from "~/services/supabase/supabase";
import { useNavigate } from "react-router";

export default function MyBarriersPage() {
  const navigate = useNavigate();
  const [barriers, setBarriers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBarriers() {
      // Recupera utente loggato
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;

      if (!user) {
        navigate("/login");
        return;
      }

      const { data, error } = await supabase
        .from("Barrier")
        .select("*")
        .eq("userId", user.id);

      console.log("BARRIERS:", data, error);

      if (!error && data) {
        setBarriers(data);
      }

      setLoading(false);
    }

    loadBarriers();
  }, []);

  return (
    <div className="p-4 flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-text">Le mie barriere</h1>

      {loading && <p className="text-text/70">Caricamento...</p>}

      {!loading && barriers.length === 0 && (
        <p className="text-text/70">
          Non hai ancora creato nessuna barriera.
        </p>
      )}

      <div className="flex flex-col gap-4">
        {barriers.map((b) => (
          <div
            key={b.id}
            className="border rounded p-4 shadow-sm bg-white flex flex-col gap-2"
          >
            <h2 className="font-semibold text-lg">{b.title}</h2>
            <p className="text-sm text-text/70">{b.description}</p>

            <p className="text-sm">
              <span className="font-medium">Indirizzo:</span> {b.address}
            </p>

            <p className="text-sm">
              <span className="font-medium">Difficoltà:</span> {b.difficulty}
            </p>

            {b.photoUrls?.length > 0 && (
              <img
                src={b.photoUrls[0]}
                alt="Foto barriera"
                className="w-full h-40 object-cover rounded"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
