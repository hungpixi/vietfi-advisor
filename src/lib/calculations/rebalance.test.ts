import { describe, it, expect } from 'vitest';
// Note: We will implement this function in the GREEN phase
import { rebalanceWeights } from './rebalance';

describe('rebalanceWeights', () => {
    const initialWeights = {
        food: 30,
        housing: 20,
        transport: 10,
        education: 10,
        healthcare: 10,
        entertainment: 10,
        other: 10
    };

    it('should adjust other weights proportionally when one weight changes', () => {
        // Increase food from 30 to 40 (+10)
        // Other 70 should decrease by 10 to 60.
        const result = rebalanceWeights(initialWeights, 'food', 40, new Set());

        const total = (Object.values(result) as number[]).reduce((sum: number, w: number) => sum + w, 0);
        expect(total).toBeCloseTo(100, 5);
        expect(result.food).toBe(40);
        // Other categories should have decreased
        expect(result.housing).toBeLessThan(20);
        expect(result.transport).toBeLessThan(10);
    });

    it('should not change locked weights', () => {
        const lockedIds = new Set(['housing', 'transport']);
        // Change food from 30 to 40
        const result = rebalanceWeights(initialWeights, 'food', 40, lockedIds);

        expect(result.food).toBe(40);
        expect(result.housing).toBe(20);
        expect(result.transport).toBe(10);

        const total = (Object.values(result) as number[]).reduce((sum: number, w: number) => sum + w, 0);
        expect(total).toBeCloseTo(100, 5);
    });

    it('should handle zeroing out weights correctly', () => {
        const result = rebalanceWeights(initialWeights, 'food', 100, new Set());
        expect(result.food).toBe(100);
        expect(result.housing).toBe(0);
        expect(result.other).toBe(0);
    });

    it('should handle cases where all other items are locked', () => {
        const lockedIds = new Set(['housing', 'transport', 'education', 'healthcare', 'entertainment', 'other']);
        // Try to change food from 30 to 40. Since all others are locked, it should stay 30 or be limited.
        // For better UX, if everything else is locked, the change should be ignored or capped.
        const result = rebalanceWeights(initialWeights, 'food', 40, lockedIds);
        expect(result.food).toBe(30);
        expect((Object.values(result) as number[]).reduce((sum: number, w: number) => sum + w, 0)).toBeCloseTo(100, 5);
    });

    it('should handle small floating point adjustments accurately', () => {
        const result = rebalanceWeights(initialWeights, 'food', 30.5, new Set());
        const total = (Object.values(result) as number[]).reduce((sum: number, w: number) => sum + w, 0);
        expect(total).toBeCloseTo(100, 5);
    });
});
