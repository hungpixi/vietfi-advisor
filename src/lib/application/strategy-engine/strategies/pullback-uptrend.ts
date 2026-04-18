/**
 * pullback-uptrend.ts
 * Strategy A1: Pullback in Uptrend
 * Mua khi giá điều chỉnh về vùng hỗ trợ động (MA20/MA50) trong xu hướng tăng dài hạn.
 */
import { OHLCV, calculateSMA } from '../../market-data/indicators';
import { Strategy, Signal } from '../strategy-manager';

export class PullbackUptrendStrategy implements Strategy {
    name = 'Pullback In Uptrend';
    description = 'Tìm kiếm cổ phiếu đang Uptrend trung/dài hạn (MA50 > MA200) điều chỉnh về MA20 với thanh khoản cạn kiệt.';

    generateSignals(ticker: string, bars: OHLCV[]): Signal[] {
        const signals: Signal[] = [];
        if (bars.length < 200) return signals; // Need at least 200 days of data for MA200

        const closes = bars.map(b => b.close);
        const volumes = bars.map(b => b.volume);

        const ma20 = calculateSMA(closes, 20);
        const ma50 = calculateSMA(closes, 50);
        const ma200 = calculateSMA(closes, 200);
        const avgVol20 = calculateSMA(volumes, 20);

        let position = false;

        for (let i = 200; i < bars.length; i++) {
            const today = bars[i];
            const yesterday = bars[i - 1];

            // Trend conditions
            const isUptrend = ma50[i] > ma200[i] && closes[i] > ma200[i];

            // Pullback condition: Price comes down to near MA20 or MA50 (within 2-3%)
            const nearMA20 = today.low <= ma20[i] * 1.02 && today.close >= ma20[i] * 0.98;
            const lightVolume = today.volume < avgVol20[i] * 0.8; // Volume cạn kiệt (dưới 80% trung bình)

            // Reversal confirmation: Close near the high of the day or higher than open
            const bullishCandle = today.close > today.open && (today.close - today.open) > (today.high - today.low) * 0.5;

            // BUY SIGNAL
            if (!position && isUptrend && nearMA20 && lightVolume && bullishCandle) {
                signals.push({
                    date: today.date,
                    ticker,
                    action: 'BUY',
                    price: today.close,
                    reason: `Pullback support MA20. Vol: ${today.volume} vs Avg: ${Math.round(avgVol20[i])}`,
                });
                position = true;
            }

            // SELL SIGNAL (Take profit or Stop loss)
            // Stop Loss: Breaking below MA50 by 2%
            // Take profit: Strong extension away from MA20
            if (position) {
                const stopLoss = ma50[i] * 0.98;
                const takeProfit = ma20[i] * 1.15; // 15% deviation above MA20 (Take profit)

                if (today.close < stopLoss) {
                    signals.push({
                        date: today.date,
                        ticker,
                        action: 'SELL',
                        price: today.close,
                        reason: `Stop-loss: Price broke MA50.`,
                    });
                    position = false;
                } else if (today.close > takeProfit) {
                    signals.push({
                        date: today.date,
                        ticker,
                        action: 'SELL',
                        price: today.close,
                        reason: `Take-profit: Over-extended from moving average.`,
                    });
                    position = false;
                }
            }
        }

        return signals;
    }
}
