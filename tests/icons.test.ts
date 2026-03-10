import {describe, expect, it} from 'vitest';
import {getDynamicIcon} from '~/utils/icons';
import {MapPin, TrendingUp} from 'lucide-react';

describe('getDynamicIcon utility', () => {
    it('dovrebbe restituire MapPin se iconName è nullo', () => {
        expect(getDynamicIcon(null)).toBe(MapPin);
    });

    it('dovrebbe restituire l\'icona corretta', () => {
        expect(getDynamicIcon('TrendingUp')).toBe(TrendingUp);
    });
});