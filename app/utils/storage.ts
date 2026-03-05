import {supabase} from "~/services/supabase";

export async function uploadBarrierPhotos(files: File[]): Promise<string[]> {
    const uploadedUrls: string[] = [];

    for (const file of files) {
        if (file.size === 0) continue;

        const fileExt = file.name.split(".").pop();
        const fileName = `barrier-${crypto.randomUUID()}.${fileExt}`;

        const {error: uploadError} = await supabase.storage
            .from("barrier-photos")
            .upload(fileName, file);

        if (uploadError) {
            throw new Error(`Errore durante il caricamento dell'immagine: ${file.name}`);
        }

        const {data} = supabase.storage
            .from("barrier-photos")
            .getPublicUrl(fileName);

        uploadedUrls.push(data.publicUrl);
    }

    return uploadedUrls;
}