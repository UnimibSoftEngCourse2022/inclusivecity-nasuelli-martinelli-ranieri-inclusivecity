import {describe, expect, it} from "vitest";
import {barrierFormSchema} from "../app/utils/validations";

describe("barrierFormSchema utility", () => {
    const validBarrier = {
        title: "Scalino alto",
        description: "C'è uno scalino molto alto che impedisce il passaggio.",
        address: "Via Roma 10, Milano",
        difficulty: "75",
        typeId: "550e8400-e29b-41d4-a716-446655440001",
        userId: "550e8400-e29b-41d4-a716-446655440000",
        lat: "45.4642",
        lng: "9.1900",
        photoUrls: JSON.stringify(["https://example.com/photo1.jpg"]),
    };

    it("dovrebbe validare correttamente una barriera valida", () => {
        const result = barrierFormSchema.parse(validBarrier);

        expect(result.title).toBe(validBarrier.title);
        expect(result.description).toBe(validBarrier.description);
        expect(result.address).toBe(validBarrier.address);
        expect(result.typeId).toBe(validBarrier.typeId);
        expect(result.userId).toBe(validBarrier.userId);
        expect(result.photoUrls).toEqual(["https://example.com/photo1.jpg"]);
    });

    it("dovrebbe convertire difficulty, lat e lng da stringhe a numeri", () => {
        const result = barrierFormSchema.parse(validBarrier);

        expect(result.difficulty).toBe(75);
        expect(result.lat).toBe(45.4642);
        expect(result.lng).toBe(9.19);
    });

    it("dovrebbe lanciare un errore se il titolo ha meno di 3 caratteri", () => {
        const invalidBarrier = {
            ...validBarrier,
            title: "No",
        };

        expect(() => barrierFormSchema.parse(invalidBarrier)).toThrow();
    });

    it("dovrebbe lanciare un errore se la descrizione ha meno di 10 caratteri", () => {
        const invalidBarrier = {
            ...validBarrier,
            description: "breve",
        };

        expect(() => barrierFormSchema.parse(invalidBarrier)).toThrow();
    });

    it("dovrebbe lanciare un errore se difficulty è fuori dal range 0-100", () => {
        const invalidBarrier = {
            ...validBarrier,
            difficulty: "150",
        };

        expect(() => barrierFormSchema.parse(invalidBarrier)).toThrow();
    });

    it("dovrebbe lanciare un errore se typeId non è un UUID valido", () => {
        const invalidBarrier = {
            ...validBarrier,
            typeId: "categoria-non-valida",
        };

        expect(() => barrierFormSchema.parse(invalidBarrier)).toThrow();
    });

    it("dovrebbe lanciare un errore se userId non è un UUID valido", () => {
        const invalidBarrier = {
            ...validBarrier,
            userId: "utente-non-valido",
        };

        expect(() => barrierFormSchema.parse(invalidBarrier)).toThrow();
    });

    it("dovrebbe lanciare un errore se photoUrls contiene un JSON malformato", () => {
        const invalidBarrier = {
            ...validBarrier,
            photoUrls: "non-json-valido",
        };

        expect(() => barrierFormSchema.parse(invalidBarrier)).toThrow();
    });

    it("dovrebbe lanciare un errore se photoUrls è un array vuoto", () => {
        const invalidBarrier = {
            ...validBarrier,
            photoUrls: JSON.stringify([]),
        };

        expect(() => barrierFormSchema.parse(invalidBarrier)).toThrow();
    });

    it("dovrebbe lanciare un errore se photoUrls contiene URL non valide", () => {
        const invalidBarrier = {
            ...validBarrier,
            photoUrls: JSON.stringify(["url-non-valida"]),
        };

        expect(() => barrierFormSchema.parse(invalidBarrier)).toThrow();
    });
});