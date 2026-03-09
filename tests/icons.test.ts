import {describe, expect, it} from 'vitest';
import {MapPin, TrendingUp} from 'lucide-react';
import {getDynamicIcon} from "../app/utils/icons";

describe('getDynamicIcon utility', () => {
    it('dovrebbe restituire MapPin se iconName è nullo', () => {
        expect(getDynamicIcon(null)).toBe(MapPin);
    });

    it('dovrebbe restituire l\'icona corretta', () => {
        expect(getDynamicIcon('TrendingUp')).toBe(TrendingUp);
    });
});