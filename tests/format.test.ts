import {describe, expect, it} from 'vitest';
import {formatDate} from "../app/utils/format";

describe('formatDate utility', () => {
    it('dovrebbe formattare correttamente una data valida', () => {
        const result = formatDate('2026-02-15');
        expect(result).toBe('15 febbraio 2026');
    });

    it('dovrebbe restituire una stringa vuota per una data non valida', () => {
        const result = formatDate('data-non-valida');
        expect(result).toBe('');
    });
});