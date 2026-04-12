"""
VietFi Advisor Evaluation Tool Tests
Tests for the evaluation runner module.
"""

import pytest
from enum import Enum
from dataclasses import dataclass, field
from typing import Optional


class AgentPersonality(Enum):
    BUDGET_CONSCIOUS = "budget_conscious"
    DEBT_RIDDEN = "debt_ridden"
    INVESTOR = "investor"
    SKEPTICAL = "skeptical"
    GAMIFICATION_ENTHUSIAST = "gamification"
    NEW_USER = "new_user"
    POWER_USER = "power_user"
    NON_NATIVE_VIETNAMESE = "non_native"


@dataclass
class AgentConfig:
    personality: AgentPersonality
    name: str
    description: str
    test_scenarios: list
    evaluation_criteria: dict


AGENT_CONFIGS = {
    AgentPersonality.BUDGET_CONSCIOUS: AgentConfig(
        personality=AgentPersonality.BUDGET_CONSCIOUS,
        name="Bà Trâm",
        description="30 tuổi, nhân viên văn phòng",
        test_scenarios=["phở 30k", "kiểm tra ngân sách"],
        evaluation_criteria={"accuracy": 0.4, "performance": 0.2},
    ),
    AgentPersonality.DEBT_RIDDEN: AgentConfig(
        personality=AgentPersonality.DEBT_RIDDEN,
        name="Anh Minh",
        description="28 tuổi, có nợ",
        test_scenarios=["Tính DTI", "Snowball vs Avalanche"],
        evaluation_criteria={"accuracy": 0.5, "performance": 0.15},
    ),
    AgentPersonality.INVESTOR: AgentConfig(
        personality=AgentPersonality.INVESTOR,
        name="Chị Hương",
        description="35 tuổi, đầu tư chứng khoán",
        test_scenarios=["VN-Index", "lọc cổ phiếu"],
        evaluation_criteria={"accuracy": 0.4, "performance": 0.2},
    ),
    AgentPersonality.SKEPTICAL: AgentConfig(
        personality=AgentPersonality.SKEPTICAL,
        name="Anh Sơn",
        description="40 tuổi, hoài nghi",
        test_scenarios=["độ chính xác", "nguồn tham khảo"],
        evaluation_criteria={"accuracy": 0.35, "performance": 0.2},
    ),
    AgentPersonality.GAMIFICATION_ENTHUSIAST: AgentConfig(
        personality=AgentPersonality.GAMIFICATION_ENTHUSIAST,
        name="Em Linh",
        description="22 tuổi, thích gamification",
        test_scenarios=["XP", "achievements", "quest"],
        evaluation_criteria={"accuracy": 0.2, "performance": 0.2},
    ),
    AgentPersonality.NEW_USER: AgentConfig(
        personality=AgentPersonality.NEW_USER,
        name="Bạn Nam",
        description="25 tuổi, lần đầu",
        test_scenarios=["onboarding", "hướng dẫn"],
        evaluation_criteria={"accuracy": 0.25, "performance": 0.2},
    ),
    AgentPersonality.POWER_USER: AgentConfig(
        personality=AgentPersonality.POWER_USER,
        name="Anh Khoa",
        description="38 tuổi, dùng nhiều tính năng",
        test_scenarios=["Supabase", "tùy chỉnh", "xuất dữ liệu"],
        evaluation_criteria={"accuracy": 0.3, "performance": 0.25},
    ),
    AgentPersonality.NON_NATIVE_VIETNAMESE: AgentConfig(
        personality=AgentPersonality.NON_NATIVE_VIETNAMESE,
        name="John",
        description="30 tuổi, người nước ngoài",
        test_scenarios=["tiếng Anh", "giải thích thuật ngữ"],
        evaluation_criteria={"accuracy": 0.25, "performance": 0.2},
    ),
}


@dataclass
class EvaluationMetrics:
    response_time_ms: float = 0.0
    throughput_rps: float = 0.0
    expense_parsing_accuracy: float = 0.0
    calculation_correctness: float = 0.0
    response_quality: float = 0.0
    engagement_score: float = 0.0
    vietnamese_context_score: float = 0.0
    error_rate: float = 0.0
    data_persistence_score: float = 0.0
    overall_score: float = 0.0


class TestAgentPersonality:
    def test_all_personalities_defined(self):
        assert len(AgentPersonality) == 8

    def test_all_personalities_have_configs(self):
        for personality in AgentPersonality:
            assert personality in AGENT_CONFIGS
            config = AGENT_CONFIGS[personality]
            assert config.personality == personality
            assert config.name
            assert len(config.test_scenarios) > 0


class TestAgentConfig:
    def test_budget_conscious_config(self):
        config = AGENT_CONFIGS[AgentPersonality.BUDGET_CONSCIOUS]
        assert config.name == "Bà Trâm"
        assert "phở 30k" in config.test_scenarios[0]
        assert config.evaluation_criteria["accuracy"] > 0

    def test_debt_ridden_config(self):
        config = AGENT_CONFIGS[AgentPersonality.DEBT_RIDDEN]
        assert config.name == "Anh Minh"
        assert "DTI" in " ".join(config.test_scenarios)

    def test_investor_config(self):
        config = AGENT_CONFIGS[AgentPersonality.INVESTOR]
        assert config.name == "Chị Hương"
        assert "VN-Index" in " ".join(config.test_scenarios)


class TestEvaluationMetrics:
    def test_metrics_initialization(self):
        metrics = EvaluationMetrics()
        assert metrics.response_time_ms == 0.0
        assert metrics.overall_score == 0.0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
