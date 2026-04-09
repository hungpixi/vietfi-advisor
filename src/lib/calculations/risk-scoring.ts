/* ═══════════════════════════════════════════════════════════
 * Risk DNA Profiler v2 — Prospect Theory Scoring Engine
 *
 * Replaces the linear 1-3 scoring with behaviorally grounded:
 *   - Weighted questions (loss signals > gain signals)
 *   - Non-linear Kahneman-Tversky value function
 *   - Softmax probabilistic classification (not hard buckets)
 *   - Internal consistency detection
 * ═══════════════════════════════════════════════════════════ */

// ── Prospect Theory Constants (Tversky & Kahneman, 1992) ──
const ALPHA = 0.88   // Gain curvature
const BETA = 0.88   // Loss curvature
const LAMBDA = 2.25   // Loss aversion coefficient
const SOFTMAX_TEMP = 2.8  // Distribution temperature (lower = sharper)

// ── Question Weights (behavioral signal strength) ──
// Loss-reaction question is weighted 2.25× (matching λ)
// Stated preference (return expectation) is barely weighted
const QUESTION_WEIGHTS: Record<number, number> = {
  1: 1.0,    // Capital allocation — revealed preference
  2: 2.25,   // Loss reaction — strongest behavioral signal
  3: 1.5,    // Probabilistic reasoning — ability to evaluate risk/reward
  4: 0.8,    // Regret aversion — emotional sensitivity to missed gains
  5: 0.5,    // Loss tolerance — stated (least reliable) preference
}

// ── Contradiction Rules ──
interface ContradictionRule { q1: number; a1: number; q2: number; a2: number; penalty: number }
const CONTRADICTIONS: ContradictionRule[] = [
  { q1: 1, a1: 3, q2: 2, a2: 1, penalty: 0.60 }, // All-in + panic sell
  { q1: 3, a1: 1, q2: 5, a2: 3, penalty: 0.40 }, // Sure gain + want 30%
  { q1: 2, a1: 3, q2: 3, a2: 1, penalty: 0.35 }, // Buy dip + sure gain
  { q1: 4, a1: 3, q2: 1, a2: 1, penalty: 0.30 }, // Strong regret + all-safe
  { q1: 1, a1: 1, q2: 5, a2: 3, penalty: 0.25 }, // 100% savings + want 30%
]

// ── Interfaces ──
export interface RiskQuestion {
  id: number
  question: string
  hint?: string
  options: { label: string; value: number; emoji: string }[]
}

export interface RiskDistribution {
  conservative: number
  balanced: number
  growth: number
}

export interface QuestionBreakdown {
  questionId: number
  rawAnswer: number
  weight: number
  utilityValue: number
  weightedUtility: number
}

export interface RiskResult {
  // Core (legacy-compatible display score)
  score: number           // 5-15 (raw sum, for display only)
  normalizedScore: number // 0-1 (actual behavioral score)

  // Classification
  type: 'conservative' | 'balanced' | 'growth'
  distribution: RiskDistribution  // probabilistic output
  confidence: number              // 0-1 (max prob × consistency)
  consistency: number             // 0-1 (internal answer coherence)

  // Presentation
  label: string
  emoji: string
  description: string
  traits: string[]
  allocation: { asset: string; percent: number; color: string }[]

  // Diagnostics (for result page)
  questionBreakdown: QuestionBreakdown[]
  hasContradiction: boolean
}

// ── Updated Questions ──
// Q3: Fixed dominated alternatives (all EVs roughly equal ~500K)
// Q4: Regret Aversion (replaces FOMO — measures emotional cost of missing gains)
// Q5: Loss Tolerance stated preference (replaces aspirational return)
export const RISK_QUESTIONS: RiskQuestion[] = [
  {
    id: 1,
    question: 'Bạn có 50 triệu. Bạn sẽ phân bổ thế nào?',
    hint: 'Không có đáp án đúng hay sai — hãy chọn phương án gần nhất với bạn nhất',
    options: [
      { label: 'Gửi tiết kiệm ngân hàng 100% — chắc chắn 3.5 triệu/năm', value: 1, emoji: '🏦' },
      { label: 'Một nửa tiết kiệm, một nửa cổ phiếu/ETF', value: 2, emoji: '⚖️' },
      { label: 'Dồn phần lớn vào cổ phiếu hoặc crypto', value: 3, emoji: '📈' },
    ],
  },
  {
    id: 2,
    question: 'Sáng thứ 2, bạn mở app thấy danh mục giảm 20% trong 1 tuần. Phản ứng TỨC THÌ của bạn?',
    hint: 'Hãy tưởng tượng bạn đang thực sự ở trong tình huống này',
    options: [
      { label: 'Bán một phần hoặc toàn bộ để tránh thua lỗ thêm', value: 1, emoji: '🛑' },
      { label: 'Giữ nguyên, theo dõi thêm một vài ngày', value: 2, emoji: '🧘' },
      { label: 'Mua thêm — đây là cơ hội tích lũy', value: 3, emoji: '🎯' },
    ],
  },
  {
    id: 3,
    question: 'Bạn chọn khoản đầu tư nào dưới đây?',
    hint: 'Cả ba lựa chọn đều có kỳ vọng lợi nhuận tương đương ~500K',
    options: [
      { label: 'Chắc chắn nhận 500K — không có rủi ro', value: 1, emoji: '✅' },
      { label: '50% nhận 1.2 triệu, 50% hòa vốn', value: 2, emoji: '🎲' },
      { label: '25% nhận 3.5 triệu, 75% mất 100K', value: 3, emoji: '💎' },
    ],
  },
  {
    id: 4,
    question: 'Bạn KHÔNG mua Bitcoin ở 50K USD, giờ nó lên 120K. Bạn cảm thấy thế nào?',
    hint: 'Đây là câu hỏi về cảm xúc khi bỏ lỡ cơ hội',
    options: [
      { label: 'Bình thản — tôi không có đủ thông tin để đầu tư lúc đó', value: 1, emoji: '😌' },
      { label: 'Hơi tiếc, nhưng tôi sẽ nghiên cứu kỹ hơn lần sau', value: 2, emoji: '🤔' },
      { label: 'Rất tiếc — tôi sẽ không để cơ hội như vậy vuột khỏi tay lần nữa', value: 3, emoji: '😤' },
    ],
  },
  {
    id: 5,
    question: 'Tối đa bạn chấp nhận mất bao nhiêu trong 1 năm trước khi quyết định rút vốn?',
    hint: 'Đây là ngưỡng chịu đựng thực tế của bạn, không phải kỳ vọng lợi nhuận',
    options: [
      { label: 'Dưới 5% — tôi không chấp nhận mất nhiều', value: 1, emoji: '🌱' },
      { label: '10–20% — tôi có thể chịu đựng sự biến động vừa phải', value: 2, emoji: '📊' },
      { label: 'Trên 30% — tôi hiểu đầu tư dài hạn cần vượt qua khủng hoảng', value: 3, emoji: '⚡' },
    ],
  },
]

// ── Prospect Theory value function ──
function prospectValue(rawAnswer: number): number {
  const deviation = rawAnswer - 2  // reference point = 2 (middle option)
  if (deviation >= 0) {
    return Math.pow(deviation, ALPHA)
  } else {
    return -LAMBDA * Math.pow(-deviation, BETA)
  }
}

// ── Consistency checker ──
function calculateConsistency(answers: number[]): { score: number; hasContradiction: boolean } {
  let totalPenalty = 0
  for (const rule of CONTRADICTIONS) {
    if (answers[rule.q1 - 1] === rule.a1 && answers[rule.q2 - 1] === rule.a2) {
      totalPenalty += rule.penalty
    }
  }
  return {
    score: Math.max(0.3, Math.min(1.0, 1.0 - totalPenalty)),
    hasContradiction: totalPenalty > 0.25,
  }
}

// ── Softmax ──
function softmax(logits: number[]): number[] {
  const maxLogit = Math.max(...logits)
  const exps = logits.map(l => Math.exp(l - maxLogit))
  const sumExp = exps.reduce((s, e) => s + e, 0)
  return exps.map(e => e / sumExp)
}

// ── Distribution from normalized score ──
function buildDistribution(
  normalizedScore: number,
  consistency: number,
): RiskDistribution {
  const centers = [0.22, 0.50, 0.78]  // bucket centroids
  const logits = centers.map(c => -(Math.pow(normalizedScore - c, 2)) / SOFTMAX_TEMP)
  const raw = softmax(logits)

  const uniform = 1 / 3
  const blended = raw.map(p => p * consistency + uniform * (1 - consistency))
  const sum = blended.reduce((s, v) => s + v, 0)

  return {
    conservative: Math.round((blended[0] / sum) * 100) / 100,
    balanced: Math.round((blended[1] / sum) * 100) / 100,
    growth: Math.round((blended[2] / sum) * 100) / 100,
  }
}

// ── Profile content ──
const PROFILES: Record<
  RiskResult['type'],
  Pick<RiskResult, 'label' | 'emoji' | 'description' | 'traits' | 'allocation'>
> = {
  conservative: {
    label: 'Nhà đầu tư Bảo thủ',
    emoji: '🛡️',
    description: 'Bạn ưu tiên bảo toàn vốn — phản ứng mất mát của bạn mạnh hơn mức trung bình, đây là đặc điểm hoàn toàn hợp lý theo Lý thuyết Prospect. Chiến lược tối ưu cho bạn là tài sản an toàn với lãi suất ổn định kết hợp vàng như lớp bảo vệ.',
    traits: ['Kỷ luật cao', 'Nhạy cảm với rủi ro', 'Kiên nhẫn dài hạn', 'Ưu tiên ổn định'],
    allocation: [
      { asset: 'Tiết kiệm', percent: 50, color: '#00E5FF' },
      { asset: 'Trái phiếu', percent: 20, color: '#64B5F6' },
      { asset: 'Vàng', percent: 20, color: '#FFD700' },
      { asset: 'Chứng khoán', percent: 10, color: '#00E676' },
    ],
  },
  balanced: {
    label: 'Nhà đầu tư Cân bằng',
    emoji: '⚖️',
    description: 'Bạn có xu hướng đánh giá rủi ro lý tính. Bạn chấp nhận biến động vừa phải để đổi lấy lợi nhuận tốt hơn — điều này phù hợp với phân bổ đa dạng hóa, kết hợp tài sản tăng trưởng và tài sản phòng thủ.',
    traits: ['Lý tính', 'Đa dạng hóa', 'Tư duy dài hạn', 'Linh hoạt thích nghi'],
    allocation: [
      { asset: 'Tiết kiệm', percent: 25, color: '#00E5FF' },
      { asset: 'Vàng', percent: 20, color: '#FFD700' },
      { asset: 'Chứng khoán', percent: 35, color: '#00E676' },
      { asset: 'Crypto', percent: 10, color: '#AB47BC' },
      { asset: 'BĐS (REIT)', percent: 10, color: '#FF6B35' },
    ],
  },
  growth: {
    label: 'Nhà đầu tư Tăng trưởng',
    emoji: '🚀',
    description: 'Bạn có ngưỡng chịu đựng tổn thất cao hơn trung bình đáng kể — điều này mở ra cơ hội đầu tư vào tài sản có biến động lớn. Tuy nhiên, Lý thuyết Prospect nhắc nhở: hãy kiểm tra xem đây là quyết định lý tính hay do môi trường thị trường đang thuận lợi.',
    traits: ['Chịu đựng biến động cao', 'Tầm nhìn xa', 'Hành động quyết đoán', 'Tư duy phân tích'],
    allocation: [
      { asset: 'Tiết kiệm', percent: 10, color: '#00E5FF' },
      { asset: 'Vàng', percent: 10, color: '#FFD700' },
      { asset: 'Chứng khoán', percent: 45, color: '#00E676' },
      { asset: 'Crypto', percent: 25, color: '#AB47BC' },
      { asset: 'BĐS (REIT)', percent: 10, color: '#FF6B35' },
    ],
  },
}

// ═══════════════════ MAIN ═══════════════════
export function calculateRiskProfile(answers: number[]): RiskResult {
  // Step 1: Question-weighted Prospect Theory utilities
  const breakdown: QuestionBreakdown[] = answers.map((rawAnswer, i) => {
    const questionId = i + 1
    const weight = QUESTION_WEIGHTS[questionId] ?? 1.0
    const utilityValue = prospectValue(rawAnswer)
    const weightedUtility = utilityValue * weight
    return { questionId, rawAnswer, weight, utilityValue, weightedUtility }
  })

  const weightedScore = breakdown.reduce((sum, b) => sum + b.weightedUtility, 0)

  // Step 2: Normalize to [0, 1] using theoretical bounds
  const minPossible = answers.map((_, i) =>
    prospectValue(1) * (QUESTION_WEIGHTS[i + 1] ?? 1.0),
  ).reduce((s, v) => s + v, 0)

  const maxPossible = answers.map((_, i) =>
    prospectValue(3) * (QUESTION_WEIGHTS[i + 1] ?? 1.0),
  ).reduce((s, v) => s + v, 0)

  const normalizedScore = (weightedScore - minPossible) / (maxPossible - minPossible)

  // Step 3: Consistency check
  const { score: consistency, hasContradiction } = calculateConsistency(answers)

  // Step 4: Probabilistic distribution
  const distribution = buildDistribution(normalizedScore, consistency)

  // Step 5: Primary type = highest probability bucket
  const primaryType = (Object.entries(distribution) as [RiskResult['type'], number][])
    .sort((a, b) => b[1] - a[1])[0][0]

  // Step 6: Confidence = max probability × consistency
  const confidence = Math.round(distribution[primaryType] * consistency * 100) / 100

  // Step 7: Display score (legacy compatibility)
  const score = answers.reduce((s, v) => s + v, 0)

  return {
    score,
    normalizedScore: Math.round(normalizedScore * 1000) / 1000,
    type: primaryType,
    distribution,
    confidence,
    consistency: Math.round(consistency * 100) / 100,
    ...PROFILES[primaryType],
    questionBreakdown: breakdown,
    hasContradiction,
  }
}
