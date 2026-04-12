"""
VietFi Advisor Evaluation Package
"""

__version__ = "1.0.0"
__author__ = "VietFi Advisor Team"

from .runner import (
    AgentPersonality,
    AgentConfig,
    AGENT_CONFIGS as AGENT_CONFIGS,
    EvaluationMetrics,
    APITestResult,
    AgentTestResult,
    EvaluationReport,
    APIEndpoints,
    calculate_metrics,
    aggregate_results,
    run_evaluation,
)
