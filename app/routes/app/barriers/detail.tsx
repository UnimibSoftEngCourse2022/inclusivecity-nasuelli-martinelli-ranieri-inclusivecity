import {useEffect, useMemo, useState} from "react";
import {Link, useNavigate, useParams} from "react-router";
import type {Barrier, BarrierType, Feedback, User} from "@prisma/client";
import {BarrierState, Role} from "@prisma/client";

import {supabase} from "~/services/supabase/supabase";
import {useAuth} from "~/context/AuthContext";

type BarrierDetail = Pick<
  Barrier,
  | "id"
  | "title"
  | "description"
  | "address"
  | "photoUrls"
  | "difficulty"
  | "state"
  | "averageRating"
  | "totalRatings"
  | "createdAt"
  | "userId"
  | "typeId"
> & {
  type: Pick<BarrierType, "id" | "label" | "iconKey" | "colorHex"> | null;
  creator: Pick<User, "id" | "firstName" | "lastName" | "role"> | null;
  feedbacks?: Array<
    Pick<Feedback, "id" | "rating" | "comment" | "createdAt" | "userId"> & {
      user: Pick<User, "id" | "firstName" | "lastName"> | null;
    }
  >;
};

function formatDate(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("it-IT", {year: "numeric", month: "short", day: "2-digit"});
}

export default function BarrierDetailPage() {
  const {id} = useParams();
  const navigate = useNavigate();
  const {profile} = useAuth();

  const [barrier, setBarrier] = useState<BarrierDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingState, setTogglingState] = useState(false);

  //permessi/azioni calcolati
  const isAdmin = useMemo(() => profile?.role === Role.ADMIN, [profile?.role]);
  const isOwner = useMemo(() => {
    if (!profile?.id) return false;
    return barrier?.userId === profile.id;
  }, [barrier?.userId, profile?.id]);

  const canEdit = useMemo(() => isOwner || isAdmin, [isOwner, isAdmin]);
  const canModerate = useMemo(() => isAdmin, [isAdmin]);

  // computed per toggle stato
  const canToggleResolved =
  !!barrier &&
  canEdit &&
  (barrier.state === BarrierState.ACTIVE || barrier.state === BarrierState.RESOLVED);

  async function handleDelete() {
    if (!barrier) return;
    if (!canModerate) return;

    const ok = window.confirm("Vuoi eliminare definitivamente questa barriera?");
    if (!ok) return;

    try {
      setDeleting(true);

      const { error } = await supabase.from("Barrier").delete().eq("id", barrier.id);
      if (error) throw error;

      // Torna alla lista dopo eliminazione
      navigate("/app/barriers");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Errore eliminando la barriera";
      setError(message);
    } finally {
      setDeleting(false);
    }
  }

  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState("");
  const [sendingFeedback, setSendingFeedback] = useState(false);

  async function handleSendFeedback() {
    if (!barrier) return;
    if (!profile?.id) {
      setError("Devi essere autenticato per lasciare un feedback.");
      return;
    }

    try {
      setSendingFeedback(true);

      const { error } = await supabase.from("Feedback").insert({
        barrierId: barrier.id,
        userId: profile.id,
        rating,
        comment: comment.trim() ? comment.trim() : null,
      });

      if (error) throw error;

      // ricarica dettagli per vedere feedback + rating aggiornati
      // (riusiamo la pagina: modo semplice -> refetch con navigate(0) o rifare la query)
      navigate(0);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Errore inviando feedback";
      setError(message);
    } finally {
      setSendingFeedback(false);
    }
  }

  async function handleToggleResolved() {
    if (!barrier) return;
    if (!canEdit) return;

    // Consentiamo il toggle solo tra ACTIVE e RESOLVED
    if (barrier.state !== BarrierState.ACTIVE && barrier.state !== BarrierState.RESOLVED) {
      setError("Questa barriera non può essere aggiornata da questo stato.");
      return;
    }

    const nextState =
      barrier.state === BarrierState.RESOLVED ? BarrierState.ACTIVE : BarrierState.RESOLVED;

    try {
      setTogglingState(true);

      const { data, error } = await supabase
        .from("Barrier")
        .update({ state: nextState })
        .eq("id", barrier.id)
        .select(
          `
          id,
          title,
          description,
          address,
          photoUrls,
          difficulty,
          state,
          averageRating,
          totalRatings,
          createdAt,
          userId,
          typeId,
          type:BarrierType ( id, label, iconKey, colorHex ),
          creator:User ( id, firstName, lastName, role ),
          feedbacks:Feedback (
            id,
            rating,
            comment,
            createdAt,
            userId,
            user:User ( id, firstName, lastName )
          )
        `
        )
        .single();

      if (error) throw error;

      setBarrier(data as unknown as BarrierDetail);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Errore aggiornando lo stato";
      setError(message);
    } finally {
      setTogglingState(false);
    }
  }

  // fetch da supabase
  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    async function fetchBarrierDetail() {
      setLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase
          .from("Barrier")
          .select(
            `
            id,
            title,
            description,
            address,
            photoUrls,
            difficulty,
            state,
            averageRating,
            totalRatings,
            createdAt,
            userId,
            typeId,
            type:BarrierType ( id, label, iconKey, colorHex ),
            creator:User ( id, firstName, lastName, role ),
            feedbacks:Feedback (
              id,
              rating,
              comment,
              createdAt,
              userId,
              user:User ( id, firstName, lastName )
            )
          `
          )
          .eq("id", id)
          .single();

        if (error) throw error;
        if (cancelled) return;

        // ordina feedback più recenti prima (se supabase non garantisce ordine)
        const sorted = {
          ...(data as any),
          feedbacks: Array.isArray((data as any).feedbacks)
            ? [...(data as any).feedbacks].sort(
                (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              )
            : [],
        };

        setBarrier(sorted as BarrierDetail);
      } catch (e: unknown) {
        if (cancelled) return;
        const message = e instanceof Error ? e.message : "Errore sconosciuto nel caricamento della barriera";
        setError(message);
        setBarrier(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchBarrierDetail();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!id) {
    return (
      <div className="p-4">
        <p className="text-sm">ID barriera mancante.</p>
        <button className="mt-2 rounded-md border px-3 py-2 text-sm" onClick={() => navigate(-1)}>
          Indietro
        </button>
      </div>
    );
  }

  if (loading) return <div className="p-4 text-sm">Caricamento...</div>;

  if (error) {
    return (
      <div className="p-4 space-y-2">
        <div className="rounded-md border p-3 text-sm">
          <div className="font-medium">Errore</div>
          <div className="opacity-80">{error}</div>
        </div>
        <button className="rounded-md border px-3 py-2 text-sm" onClick={() => navigate(-1)}>
          Indietro
        </button>
      </div>
    );
  }

  if (!barrier) {
    return (
      <div className="p-4 space-y-2">
        <div className="rounded-md border p-3 text-sm opacity-80">Barriera non trovata.</div>
        <Link className="inline-flex rounded-md border px-3 py-2 text-sm" to="/app/barriers">
          Torna alla lista
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">{barrier.title}</h1>
        <div className="text-sm opacity-80">
          {barrier.address ? barrier.address : "Indirizzo non disponibile"} • {formatDate(barrier.createdAt)}
        </div>
      </header>

      <section className="grid gap-3 md:grid-cols-3">
        {/* Colonna sinistra: foto (prima foto se presente) */}
        <div className="md:col-span-1">
          <div className="rounded-md border overflow-hidden bg-black/5">
            {Array.isArray(barrier.photoUrls) && barrier.photoUrls.length > 0 ? (
              <img
                src={barrier.photoUrls[0]}
                alt={barrier.title}
                className="h-56 w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="h-56 flex items-center justify-center text-sm opacity-70">
                Nessuna foto
              </div>
            )}
          </div>
        </div>

        {/* Colonna destra: dettagli */}
        <div className="md:col-span-2 space-y-3">
          <div className="rounded-md border p-3 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border px-2 py-1 text-xs">
                Stato: {barrier.state}
              </span>

              <span className="rounded-full border px-2 py-1 text-xs">
                Difficoltà: {barrier.difficulty ?? "-"}
              </span>

              {barrier.type?.label ? (
                <span className="rounded-full border px-2 py-1 text-xs">
                  Tipo: {barrier.type.label}
                </span>
              ) : null}
            </div>

            <div className="text-sm">
              <div className="font-medium">Descrizione</div>
              <div className="opacity-90">
                {barrier.description ? barrier.description : "Nessuna descrizione."}
              </div>
            </div>

            <div className="text-sm grid gap-1">
              <div>
                <span className="opacity-70">Creatore:</span>{" "}
                {barrier.creator
                  ? `${barrier.creator.firstName} ${barrier.creator.lastName}`
                  : "Sconosciuto"}
              </div>
              <div>
                <span className="opacity-70">Rating medio:</span>{" "}
                {barrier.totalRatings && barrier.totalRatings > 0
                  ? `${Number(barrier.averageRating ?? 0).toFixed(1)} (${barrier.totalRatings})`
                  : "Nessun voto"}
              </div>
            </div>
          </div>

          {/* Azioni (per ora solo visibili, le implementiamo step 4) */}
          <div className="rounded-md border p-3 flex flex-wrap gap-2">
            <button
              className="rounded-md border px-3 py-2 text-sm disabled:opacity-50"
              disabled={!canEdit}
              title={!canEdit ? "Solo il creatore o un admin può modificare" : undefined}
              onClick={() => navigate(`/app/barriers/${barrier.id}/edit`)}
            >
              Modifica
            </button>
            
            <button
              className="rounded-md border px-3 py-2 text-sm disabled:opacity-50"
              disabled={!canToggleResolved || togglingState}
              title={
                !canEdit
                  ? "Solo il creatore o un admin può cambiare lo stato"
                  : !canToggleResolved
                    ? "Disponibile solo per stati ACTIVE/RESOLVED"
                    : undefined
              }
              onClick={handleToggleResolved}
            >
              {togglingState
                ? "Aggiorno..."
                : barrier.state === BarrierState.RESOLVED
                  ? "Riapri"
                  : "Segna risolta"}
            </button>

            <button
              className="rounded-md border px-3 py-2 text-sm disabled:opacity-50"
              disabled={!canModerate || deleting}
              title={!canModerate ? "Solo un admin può eliminare" : undefined}
              onClick={handleDelete}
            >
              {deleting ? "Elimino..." : "Elimina"}
            </button>

            <button
              className="rounded-md border px-3 py-2 text-sm"
              onClick={() => navigate(-1)}
            >
              Indietro
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Feedback</h2>
        
        <div className="rounded-md border p-3 space-y-2">
          <div className="text-sm font-medium">Lascia un feedback</div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm opacity-80">Voto</label>
            <select
              className="rounded-md border px-2 py-1 text-sm"
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              disabled={sendingFeedback}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          <textarea
            className="w-full rounded-md border p-2 text-sm"
            rows={3}
            placeholder="Commento (opzionale)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={sendingFeedback}
          />

          <div className="flex gap-2">
            <button
              className="rounded-md border px-3 py-2 text-sm disabled:opacity-50"
              onClick={handleSendFeedback}
              disabled={sendingFeedback}
            >
              {sendingFeedback ? "Invio..." : "Invia"}
            </button>
            <button
              className="rounded-md border px-3 py-2 text-sm disabled:opacity-50"
              onClick={() => setComment("")}
              disabled={sendingFeedback}
            >
              Pulisci
            </button>
          </div>
        </div>

        {barrier.feedbacks && barrier.feedbacks.length > 0 ? (
          <div className="space-y-2">
            {barrier.feedbacks.map((f) => (
              <div key={f.id} className="rounded-md border p-3 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium">
                    {f.user ? `${f.user.firstName} ${f.user.lastName}` : "Utente"}
                  </div>
                  <div className="text-sm">
                    <span className="opacity-70">Voto:</span> {f.rating}
                  </div>
                </div>

                {f.comment ? (
                  <div className="text-sm opacity-90">{f.comment}</div>
                ) : (
                  <div className="text-sm opacity-70">Nessun commento.</div>
                )}

                <div className="text-xs opacity-70">{formatDate(f.createdAt)}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-md border p-3 text-sm opacity-80">
            Nessun feedback ancora.
          </div>
        )}
      </section>
    </div>
  );
}