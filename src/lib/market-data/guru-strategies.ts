/**
 * Guru Strategy Map
 *
 * Ánh xạ từng guru ID → BacktestConfig tương ứng với triết lý đầu tư của họ.
 * Dùng để pre-fill Backtest Pro khi user bấm "Test chiến lược" từ trang Guru.
 */

import type { BacktestConfig, Strategy } from "./backtest-engine";

export interface GuruStrategy {
    guruId: string;
    config: BacktestConfig;
    strategyLabel: string;
    description: string;
    sampleTicker: string; // Mã mẫu để demo performance chart
}

export const GURU_STRATEGIES: Record<string, GuruStrategy> = {
    livermore: {
        guruId: "livermore",
        config: {
            strategy: "breakout-52w" as Strategy,
            capital: 100_000_000,
        },
        strategyLabel: "Breakout Đỉnh 52 Tuần",
        description:
            "Mua khi giá vượt đỉnh 52 tuần (tín hiệu lực mua mạnh), cắt lỗ ngay khi giá quay về -8% dưới điểm mua. Không trung bình giá xuống.",
        sampleTicker: "FPT",
    },
    darvas: {
        guruId: "darvas",
        config: {
            strategy: "breakout-52w" as Strategy,
            capital: 100_000_000,
        },
        strategyLabel: "Hộp Darvas Breakout",
        description:
            "Mua khi giá phá vỡ đỉnh hộp Darvas kèm khối lượng lớn. Bán tự động khi giá phá đáy hộp. Kỷ luật tuyệt đối.",
        sampleTicker: "HPG",
    },
    weinstein: {
        guruId: "weinstein",
        config: {
            strategy: "ma30w-stage2" as Strategy,
            capital: 100_000_000,
        },
        strategyLabel: "MA30 Tuần — Giai Đoạn 2",
        description:
            "Mua khi giá vượt MA30 tuần và MA30 đang hướng lên (Giai đoạn 2). Bán khi giá rơi dưới MA30 tuần và MA30 bắt đầu phẳng hoặc xuống.",
        sampleTicker: "VCB",
    },
    minervini: {
        guruId: "minervini",
        config: {
            strategy: "sma-cross" as Strategy,
            capital: 100_000_000,
            smaFast: 10,
            smaSlow: 30,
        },
        strategyLabel: "VCP — SMA 10/30",
        description:
            "Mua khi SMA10 vượt SMA30 (momentum xác nhận), bán ngay khi SMA10 cắt xuống SMA30. Cắt lỗ kỷ luật 5-8%.",
        sampleTicker: "MBB",
    },
    oneil: {
        guruId: "oneil",
        config: {
            strategy: "sma-cross" as Strategy,
            capital: 100_000_000,
            smaFast: 10,
            smaSlow: 30,
        },
        strategyLabel: "CANSLIM — Cup & Handle",
        description:
            "Mua tại điểm breakout từ nền tảng Cup & Handle. Xác nhận bằng SMA10 > SMA30. Bán tự động khi mất -7% từ điểm mua.",
        sampleTicker: "ACB",
    },
};

/**
 * Lấy strategy config của guru theo ID.
 * Trả null nếu không tìm thấy.
 */
export function getGuruStrategy(guruId: string): GuruStrategy | null {
    return GURU_STRATEGIES[guruId] ?? null;
}
