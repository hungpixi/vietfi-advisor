// Quick verification: does the scoring engine produce valid distributions?
import { calculateRiskProfile } from './src/lib/calculations/risk-scoring'

const scenarios = [
    { label: 'All conservative', answers: [1, 1, 1, 1, 1] },
    { label: 'All balanced', answers: [2, 2, 2, 2, 2] },
    { label: 'All growth', answers: [3, 3, 3, 3, 3] },
    { label: 'Contradictory', answers: [3, 1, 2, 2, 3] },
    { label: 'Mixed lean growth', answers: [2, 3, 2, 2, 3] },
]

let pass = true
for (const s of scenarios) {
    const r = calculateRiskProfile(s.answers)
    const sum = r.distribution.conservative + r.distribution.balanced + r.distribution.growth
    const sumOk = Math.abs(sum - 1.0) < 0.01
    const scoreOk = r.score >= 5 && r.score <= 15
    const normOk = r.normalizedScore >= 0 && r.normalizedScore <= 1
    const ok = sumOk && scoreOk && normOk
    console.log(`${ok ? '✅' : '❌'} ${s.label}: primary=${r.type}, dist=[C:${r.distribution.conservative} B:${r.distribution.balanced} G:${r.distribution.growth}], sum=${sum.toFixed(3)}, confidence=${r.confidence}, consistency=${r.consistency}, contradiction=${r.hasContradiction}`)
    if (!ok) pass = false
}

console.log(pass ? '\n✅ All checks passed' : '\n❌ Some checks failed')
