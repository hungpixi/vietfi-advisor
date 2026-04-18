/**
 * volatility-contraction.ts
 * Strategy A2: Volatility Contraction Breakout (VCP)
 * Bắt điểm Breakout khi chuỗi nến co hẹp biên độ, volume cạn kiệt.
 */
import { OHLCV, calculateATR, calculateSMA } from '../../market-data/indicators';
import { Strategy, Signal } from '../strategy-manager';

export class VCPBreakoutStrategy implements Strategy {
    name = 'Volatility Contraction Breakout';
    description = 'Mua khi biên độ giá co hẹp (ATR giảm) và nổ volume mạnh vượt biên trên.';

    generateSignals(ticker: string, bars: OHLCV[]): Signal[] {
        const signals: Signal[] = [];
        if (bars.length < 50) return signals;

        const atr14 = calculateATR(bars, 14);
        const volumes = bars.map(b => b.volume);
        const avgVol20 = calculateSMA(volumes, 20);

        let position = false;
        let entryPrice = 0;

        for (let i = 50; i < bars.length; i++) {
            const today = bars[i];
            const yesterday = bars[i - 1];

            // Detect Contraction (ATR is dropping, current ATR is smaller than 5 periods ago)
            const isContracting = atr14[i - 1] < atr14[i - 5] * 0.8;

            // Volume burst on breakout
            const isVolumeBurst = today.volume > avgVol20[i - 1] * 1.5; // Tăng vol gấp 1.5 lần TB

            // Breakout candle
            const isBullishBreakout = today.close > yesterday.high && today.close > today.open;

            // BUY SIGNAL
            if (!position && isContracting && isVolumeBurst && isBullishBreakout) {
                entryPrice = today.close;
                signals.push({
                    date: today.date,
                    ticker,
                    action: 'BUY',
                    price: entryPrice,
                    reason: `VCP Breakout: ATR co hẹp, nổ Vol > 1.5x.`,
                });
                position = true;
            }

            // SELL SIGNAL (Trailing Stop or Stop loss)
            if (position) {
                const stopLoss = entryPrice * 0.93; // Fixed 7% cut loss
                const trailingStop = today.low - atr14[i] * 2; // Chandelier Exit or simply 2 ATR below

                if (today.close < stopLoss) {
                    signals.push({
                        date: today.date,
                        ticker,
                        action: 'SELL',
                        price: today.close,
                        reason: `Stop-loss 7% triggered.`,
                    });
                    position = false;
                } else if (today.close < trailingStop) {
                    signals.push({
                        date: today.date,
                        ticker,
                        action: 'SELL',
                        price: today.close,
                        reason: `Trailing Stop hit (2 ATR below).`,
                    });
                    position = false;
                }
            }
        }

        return signals;
    }
}
