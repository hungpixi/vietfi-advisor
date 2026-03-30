/* ═══════════════════════════════════════════════════════════
 * Debt Optimizer — DTI + Snowball + Avalanche
 * ═══════════════════════════════════════════════════════════ */

export interface Debt {
  id: string;
  name: string;
  type: "credit_card" | "mortgage" | "personal" | "bnpl" | "loan_shark" | "other";
  principal: number;     // Dư nợ gốc (VND)
  rate: number;          // Lãi suất năm (%)
  minPayment: number;    // Trả tối thiểu/tháng
  hiddenFees?: number;   // Phí dịch vụ/ẩn hàng tháng (VND)
}

export interface PayoffStep {
  month: number;
  debtName: string;
  payment: number;
  remaining: number;
  totalInterest: number;
}

export interface DebtAnalysis {
  totalDebt: number;
  dtiRatio: number;        // % — Debt-to-Income
  dtiLevel: "safe" | "warning" | "danger" | "domino";
  dtiColor: string;
  totalMonthlyMin: number;
  totalHiddenInterest: number;  // Tổng lãi phí ẩn nếu chỉ trả min
  realInterestRates: { id: string; name: string; realRate: number }[]; // Lãi suất thực tế đã tính phí ẩn
}

/* ─── DTI Calculation ─── */
export function analyzeDTI(debts: Debt[], monthlyIncome: number): DebtAnalysis {
  const totalDebt = debts.reduce((sum, d) => sum + d.principal, 0);
  const totalMonthlyMin = debts.reduce((sum, d) => sum + d.minPayment, 0);
  const dtiRatio = monthlyIncome > 0 ? (totalMonthlyMin / monthlyIncome) * 100 : 0;

  let dtiLevel: DebtAnalysis["dtiLevel"];
  let dtiColor: string;
  if (dtiRatio < 20) { dtiLevel = "safe"; dtiColor = "#00E676"; }
  else if (dtiRatio < 40) { dtiLevel = "warning"; dtiColor = "#FFD700"; }
  else if (dtiRatio < 60) { dtiLevel = "danger"; dtiColor = "#FF5252"; }
  else { dtiLevel = "domino"; dtiColor = "#991B1B"; }

  // Tính lãi ẩn và lãi suất thực tế từng khoản
  const realInterestRates = debts.map(d => {
    // Ước tính dư nợ trung bình trong năm đầu
    const yearlyInterest = d.principal * (d.rate / 100);
    const yearlyFees = (d.hiddenFees || 0) * 12;
    const realRate = d.principal > 0 ? ((yearlyInterest + yearlyFees) / d.principal) * 100 : 0;
    
    return { id: d.id, name: d.name, realRate };
  });

  const totalHiddenInterest = debts.reduce((sum, d) => {
    const monthlyRate = d.rate / 12 / 100;
    const fees = d.hiddenFees || 0;
    // Ước tính tổng lãi + phí nếu chỉ trả min trong 12 tháng
    return sum + (d.principal * monthlyRate + fees) * 12;
  }, 0);

  return { totalDebt, dtiRatio, dtiLevel, dtiColor, totalMonthlyMin, totalHiddenInterest, realInterestRates };
}

/* ─── Snowball: trả khoản NHỎ NHẤT trước (tâm lý) ─── */
export function snowballPlan(debts: Debt[], extraPayment: number = 0): PayoffStep[] {
  const sorted = [...debts].sort((a, b) => a.principal - b.principal);
  return simulatePayoff(sorted, extraPayment);
}

/* ─── Avalanche: trả khoản LÃI CAO NHẤT trước (tối ưu) ─── */
export function avalanchePlan(debts: Debt[], extraPayment: number = 0): PayoffStep[] {
  // Ưu tiên lãi thực tếcao nhất (đã tính hidden fees)
  const analysis = analyzeDTI(debts, 1);
  const getRate = (id: string) => analysis.realInterestRates.find(r => r.id === id)?.realRate || 0;
  
  const sorted = [...debts].sort((a, b) => getRate(b.id) - getRate(a.id));
  return simulatePayoff(sorted, extraPayment);
}

/* ─── Simulate payoff timeline ─── */
function simulatePayoff(debts: Debt[], extraPayment: number): PayoffStep[] {
  const steps: PayoffStep[] = [];
  const remaining = debts.map((d) => ({ ...d, balance: d.principal }));
  let month = 0;
  const maxMonths = 360; // 30 năm max

  // TIỀN MỞ KHOÁ (Freed-up cashflow): Lượng tiền hàng tháng rảnh rang sau khi thanh toán xong 1 khoản nợ
  let accumulatedSnowball = 0; 

  while (remaining.some((d) => d.balance > 0) && month < maxMonths) {
    month++;
    
    // Mỗi đầu tháng, người dùng có thể trả: (Tiền trả thêm cố định) + (Lượng tiền các khoản nợ cũ đã giải phóng)
    let extraAvailableForThisMonth = extraPayment + accumulatedSnowball;

    for (const debt of remaining) {
      if (debt.balance <= 0) continue;

      const monthlyRate = debt.rate / 12 / 100;
      const interest = debt.balance * monthlyRate;
      
      // CHỈ ưu tiên dồn 'extraAvailableForThisMonth' vào khoản nợ ĐẦU TIÊN (chưa trả xong) trong danh sách đã sort
      let payment = debt.minPayment;
      if (extraAvailableForThisMonth > 0) {
        payment += extraAvailableForThisMonth;
        extraAvailableForThisMonth = 0; // Đã dồn hết lực vào khoản nợ này
      }

      // Không trả quá số tiền còn nợ + lãi tháng này
      payment = Math.min(payment, debt.balance + interest);

      debt.balance = debt.balance + interest - payment;
      if (debt.balance < 1) debt.balance = 0;

      steps.push({
        month,
        debtName: debt.name,
        payment,
        remaining: Math.round(debt.balance),
        totalInterest: Math.round(interest),
      });

      // KHI KHOẢN NỢ NÀY VỪA ĐƯỢC TRẢ XONG TRONG THÁNG NÀY (Snowball Effect Hype!)
      if (debt.balance <= 0) {
        // Vĩnh viễn mở khoá số tiền Min Payment của lịch này để dồn cho lịch sau ở các tháng tới
        accumulatedSnowball += debt.minPayment;
        
        // Cú hích (Cascade Effect): Nếu payment của tháng này > balance + interest, thì tiền dư sẽ được quăng thẳng xuống khoản nợ bên dưới ngay trong cùng 1 tháng
        const overpaid = payment - (debt.balance + interest);
        if (overpaid > 0) {
           extraAvailableForThisMonth += overpaid;
        }
      }
    }
  }

  return steps;
}

/* ─── Tính tổng interest + months ─── */
export function summarizePlan(steps: PayoffStep[]): {
  totalMonths: number;
  totalInterestPaid: number;
  totalPaid: number;
} {
  const totalMonths = steps.length > 0 ? Math.max(...steps.map((s) => s.month)) : 0;
  const totalInterestPaid = steps.reduce((sum, s) => sum + s.totalInterest, 0);
  const totalPaid = steps.reduce((sum, s) => sum + s.payment, 0);
  return { totalMonths, totalInterestPaid, totalPaid };
}

/* ─── Helper: Lấy Ngày Độc Lập Tài Chính (Freedom Day) ─── */
export function getFreedomMonth(addMonths: number): string {
  if (addMonths <= 0) return "Hôm nay";
  const date = new Date();
  date.setMonth(date.getMonth() + addMonths);
  return `Tháng ${date.getMonth() + 1}/${date.getFullYear()}`;
}
