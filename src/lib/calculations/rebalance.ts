/**
 * Rebalances weights such that they always sum to 100.
 * 
 * @param weights Current weights (id -> %)
 * @param changedId The ID of the weight that was manually changed
 * @param newValue The new value for the changed ID
 * @param lockedIds Set of IDs that should not be changed
 * @returns New weights object
 */
export function rebalanceWeights(
    weights: Record<string, number>,
    changedId: string,
    newValue: number,
    lockedIds: Set<string>
): Record<string, number> {
    const result = { ...weights };
    const ids = Object.keys(weights);

    // 1. Calculate locked sum (excluding the one being changed)
    let lockedSum = 0;
    ids.forEach(id => {
        if (id !== changedId && lockedIds.has(id)) {
            lockedSum += weights[id];
        }
    });

    // 2. Cap newValue to ensure sum doesn't exceed 100 due to locked items
    const maxAllowed = 100 - lockedSum;
    let actualNewValue = Math.min(newValue, maxAllowed);
    actualNewValue = Math.max(0, actualNewValue); // Clamp to 0

    result[changedId] = actualNewValue;

    // 3. How much is left to distribute among unlocked items
    const remainder = 100 - actualNewValue - lockedSum;
    const unlockedIds = ids.filter(id => id !== changedId && !lockedIds.has(id));

    if (unlockedIds.length === 0) {
        // Everything else is locked, we must preserve total 100.
        // Adjust the changed target to fit what's left.
        result[changedId] = Math.max(0, 100 - lockedSum);
        return result;
    }

    // 4. Distribute remainder proportionally
    const currentUnlockedSum = unlockedIds.reduce((sum, id) => sum + weights[id], 0);

    if (currentUnlockedSum > 0) {
        unlockedIds.forEach(id => {
            result[id] = (weights[id] / currentUnlockedSum) * remainder;
        });
    } else {
        // If all unlocked was zero, distribute equally
        const share = remainder / unlockedIds.length;
        unlockedIds.forEach(id => {
            result[id] = share;
        });
    }

    // 5. Final pass to ensure exact 100.00 (rounding fix)
    const total = Object.values(result).reduce((s, v) => s + v, 0);
    if (Math.abs(total - 100) > 0.000001) {
        const diff = 100 - total;
        result[unlockedIds[0]] += diff;
    }

    return result;
}
