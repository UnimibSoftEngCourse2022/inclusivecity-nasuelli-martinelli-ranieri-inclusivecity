import {describe, expect, it} from "vitest";
import {profileSchema} from "../app/utils/validations";

describe("profileSchema utility", () => {
    const validProfile = {
        firstName: "Luca",
        lastName: "Raineri",
        profilePicUrl: "https://example.com/profile.jpg",
        userId: "550e8400-e29b-41d4-a716-446655440000",
    };

    it("dovrebbe validare correttamente un profilo valido", () => {
        const result = profileSchema.parse(validProfile);
        expect(result).toEqual(validProfile);
    });

    it("dovrebbe lanciare un errore se firstName ha meno di 2 caratteri", () => {
        const invalidProfile = {
            ...validProfile,
            firstName: "L",
        };

        expect(() => profileSchema.parse(invalidProfile)).toThrow();
    });

    it("dovrebbe accettare profilePicUrl come stringa vuota", () => {
        const profileWithEmptyPic = {
            ...validProfile,
            profilePicUrl: "",
        };

        const result = profileSchema.parse(profileWithEmptyPic);
        expect(result.profilePicUrl).toBe("");
    });

    it("dovrebbe lanciare un errore se userId non è un UUID valido", () => {
        const invalidProfile = {
            ...validProfile,
            userId: "id-non-valido",
        };

        expect(() => profileSchema.parse(invalidProfile)).toThrow();
    });
});