import {describe, expect, it} from 'vitest';
import {envSchema} from '~/utils/envSchema';

describe('envSchema utility', () => {
    const validEnv = {
        VITE_FIREBASE_API_KEY: 'fake-api-key',
        VITE_FIREBASE_PROJECT_ID: 'project-id',
        VITE_FIREBASE_MESSAGING_SENDER_ID: '123456789',
        VITE_FIREBASE_APP_ID: '1:123456789:web:abcdef',
        VITE_FIREBASE_VAPID_KEY: 'fake-vapid-key',
        VITE_MAPBOX_TOKEN: 'fake-mapbox-token',
        VITE_ORS_API_KEY: 'fake-ors-key',
        VITE_SUPABASE_URL: 'https://example.supabase.co',
        VITE_SUPABASE_ANON_KEY: 'fake-anon-key',
    };

    it('dovrebbe validare correttamente un oggetto env completo e valido', () => {
        const result = envSchema.parse(validEnv);
        expect(result).toEqual(validEnv);
    });

    it('dovrebbe lanciare un errore se VITE_SUPABASE_URL non è una URL valida', () => {
        const invalidEnv = {
            ...validEnv,
            VITE_SUPABASE_URL: 'url-non-valida',
        };

        expect(() => envSchema.parse(invalidEnv)).toThrow();
    });

    it('dovrebbe lanciare un errore se manca una variabile obbligatoria', () => {
        const invalidEnv = {
            ...validEnv,
        };

        delete (invalidEnv as Record<string, string>).VITE_MAPBOX_TOKEN;

        expect(() => envSchema.parse(invalidEnv)).toThrow();
    });
});