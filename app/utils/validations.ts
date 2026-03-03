import {z} from "zod";

export const profileSchema = z.object({
    firstName: z.string().min(2, "Il nome deve avere almeno 2 caratteri"),
    lastName: z.string().optional(),
    profilePicUrl: z.url().optional().or(z.literal("")),
    userId: z.uuid("ID utente non valido")
});

export const barrierFormSchema = z.object({
    title: z.string().min(3, "Il titolo deve avere almeno 3 caratteri"),
    description: z.string().min(10, "La descrizione deve essere più dettagliata (minimo 10 caratteri)"),
    address: z.string().min(1, "Indirizzo mancante"),
    difficulty: z.coerce.number().min(0).max(100),
    typeId: z.uuid("Categoria non valida"),
    userId: z.uuid("Errore di autenticazione utente"),
    lat: z.coerce.number({error: "Posizione sulla mappa non valida"}),
    lng: z.coerce.number({error: "Posizione sulla mappa non valida"}),
    photoUrls: z.string()
        .transform((val) => {
            try {
                return JSON.parse(val);
            } catch {
                return [];
            }
        })
        .pipe(z.array(z.url()).min(1, "Devi lasciare almeno una foto per la barriera"))
});