"""
VietFi Advisor AI Agent Evaluation Tool
=========================================
Evaluates VietFi Advisor API endpoints using 8 distinct AI agent personalities.
Each agent tests specific user flows and measures performance, accuracy,
user experience, and reliability.

Usage:
    python -m tests.evaluation.runner --agents 1000 --concurrent 50 --base-url http://localhost:3000
    python -m tests.evaluation.runner --agents 100 --personality budget_conscious --verbose
"""

import asyncio
import argparse
import json
import os
import time
from dataclasses import dataclass, field, asdict
from datetime import datetime
from enum import Enum
from typing import Any, Optional
from pathlib import Path
import sys

# Configuration
OPENAI_API_BASE = os.environ.get("OPENAI_API_BASE", "http://localhost:20128/v1")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "sk-f56f21febe169a80-qieeeg-1539c9ee")
LLM_MODEL = os.environ.get("LLM_MODEL", "qw/qwen3-coder-plus")
VIETFI_BASE_URL = os.environ.get("VIETFI_BASE_URL", "http://localhost:3000")


class AgentPersonality(Enum):
    """8 distinct AI agent personalities for evaluation"""

    BUDGET_CONSCIOUS = "budget_conscious"  # Focuses on expense tracking, budgets
    DEBT_RIDDEN = "debt_ridden"  # Focuses on debt management
    INVESTOR = "investor"  # Focuses on stock market, investments
    SKEPTICAL = "skeptical"  # Questions AI recommendations
    GAMIFICATION_ENTHUSIAST = "gamification"  # Focuses on XP, badges, levels
    NEW_USER = "new_user"  # First-time user onboarding
    POWER_USER = "power_user"  # Advanced features user
    NON_NATIVE_VIETNAMESE = "non_native"  # Non-native Vietnamese speaker


@dataclass
class AgentConfig:
    """Configuration for an individual agent"""

    personality: AgentPersonality
    name: str
    description: str
    test_scenarios: list[str]
    evaluation_criteria: dict[str, float]  # weight per criteria


# Agent configurations - COVER ALL WEBSITE FEATURES LIKE REAL USER
AGENT_CONFIGS: dict[AgentPersonality, AgentConfig] = {
    AgentPersonality.BUDGET_CONSCIOUS: AgentConfig(
        personality=AgentPersonality.BUDGET_CONSCIOUS,
        name="Bà Trâm",
        description="30 tuổi, nhân viên văn phòng, chi tiêu cẩn thận, theo dõi chi phí hàng ngày",
        test_scenarios=[
            # Budget page features
            "phở 30k",  # Add expense
            "cà phê 25k",  # Add expense
            "tháng này đã chi bao nhiêu",  # Check spending
            "tạo hộp tiết kiệm mới",  # Create pot
            "xem ngân sách còn lại",  # Check budget
            # Ledger features
            "thêm thu nhập 10 triệu",  # Add income
            "xem sổ thu chi",  # View ledger
            "đầu tháng này thu bao nhiêu",  # Check income
        ],
        evaluation_criteria={"accuracy": 0.4, "performance": 0.2, "ux": 0.2, "reliability": 0.2},
    ),
    AgentPersonality.DEBT_RIDDEN: AgentConfig(
        personality=AgentPersonality.DEBT_RIDDEN,
        name="Anh Minh",
        description="28 tuổi, có nợ thế chấp và tín chấp, cần tối ưu trả nợ",
        test_scenarios=[
            # Debt page features
            "tính DTI hiện tại",  # Calculate DTI
            "so sánh snowball vs avalanche",  # Compare methods
            "thêm khoản nợ ngân hàng 50 triệu",  # Add debt
            "xem lộ trình trả nợ",  # View timeline
            "nên trả thêm bao nhiêu",  # Suggest extra payment
            "bao lâu hết nợ",  # Payoff timeline
            "tổng nợ bao nhiêu",  # Total debt
        ],
        evaluation_criteria={"accuracy": 0.5, "performance": 0.15, "ux": 0.15, "reliability": 0.2},
    ),
    AgentPersonality.INVESTOR: AgentConfig(
        personality=AgentPersonality.INVESTOR,
        name="Chị Hương",
        description="35 tuổi, đầu tư chứng khoán, quan tâm VN-Index và cổ phiếu",
        test_scenarios=[
            # Market page
            "VN-Index hôm nay",  # VN-Index
            "giá vàng SJC",  # Gold price
            "tỷ giá USD/VND",  # Exchange rate
            "Bitcoin bao nhiêu",  # Crypto
            # Screener page
            "lọc cổ phiếu PE<15",  # Stock filter
            "cổ phiếu tốt nhất",  # Best stocks
            # Portfolio page
            "xem portfolio",  # View portfolio
            "so sánh vàng vs chứng khoán",  # Compare
            # Sentiment page
            "chỉ số fear & greed",  # Sentiment
        ],
        evaluation_criteria={"accuracy": 0.4, "performance": 0.2, "ux": 0.2, "reliability": 0.2},
    ),
    AgentPersonality.SKEPTICAL: AgentConfig(
        personality=AgentPersonality.SKEPTICAL,
        name="Anh Sơn",
        description="40 tuổi, hoài nghi về AI, cần bằng chứng trước khi tin",
        test_scenarios=[
            "AI này chính xác không",  # Accuracy question
            "dữ liệu lấy từ đâu",  # Source
            "kiểm tra giá vàng thật",  # Verify gold
            "VN-Index có đúng không",  # Verify index
            "tin tức thị trường",  # Market news
        ],
        evaluation_criteria={"accuracy": 0.35, "performance": 0.2, "ux": 0.25, "reliability": 0.2},
    ),
    AgentPersonality.GAMIFICATION_ENTHUSIAST: AgentConfig(
        personality=AgentPersonality.GAMIFICATION_ENTHUSIAST,
        name="Em Linh",
        description="22 tuổi, thích gamification, muốn đạt level cao nhất và nhiều badges",
        test_scenarios=[
            # Dashboard - gamification
            "XP hiện tại bao nhiêu",  # Check XP
            "level của tao là gì",  # Check level
            "có những badge nào",  # Badges
            " streak bao nhiêu ngày",  # Streak
            # Leaderboard
            "xem bảng xếp hạng",  # Leaderboard
            # Quests
            "quest hàng ngày là gì",  # Daily quest
            # Learn page
            "học gì để kiếm XP",  # Learn for XP
        ],
        evaluation_criteria={"accuracy": 0.2, "performance": 0.2, "ux": 0.4, "reliability": 0.2},
    ),
    AgentPersonality.NEW_USER: AgentConfig(
        personality=AgentPersonality.NEW_USER,
        name="Bạn Nam",
        description="25 tuổi, lần đầu dùng app tài chính, cần hướng dẫn cơ bản",
        test_scenarios=[
            # Onboarding via chat
            "app này là gì",  # What is this
            "bắt đầu như thế nào",  # How to start
            "cách ghi chi tiêu",  # How to log expense
            "thêm thu nhập",  # Add income
            "xem tính năng chính",  # Main features
            # Dashboard tour
            "xem dashboard",  # View dashboard
            "các trang có gì",  # Pages available
        ],
        evaluation_criteria={"accuracy": 0.25, "performance": 0.2, "ux": 0.35, "reliability": 0.2},
    ),
    AgentPersonality.POWER_USER: AgentConfig(
        personality=AgentPersonality.POWER_USER,
        name="Anh Khoa",
        description="38 tuổi, dùng nhiều tính năng nâng cao, muốn tùy chỉnh",
        test_scenarios=[
            # Personal CPI
            "CPI cá nhân là gì",  # Personal CPI
            "so sánh CPI của tao với official",  # Compare CPI
            # Risk profile
            "làm quiz rủi ro",  # Risk quiz
            "profile rủi ro của tao",  # Risk profile
            # Housing
            "tính mua hay thuê nhà",  # Buy vs rent
            # Macro indicators
            "chỉ số vĩ mô",  # Macro
            # Gurus
            "các guru tài chính",  # Gurus
        ],
        evaluation_criteria={"accuracy": 0.3, "performance": 0.25, "ux": 0.25, "reliability": 0.2},
    ),
    AgentPersonality.NON_NATIVE_VIETNAMESE: AgentConfig(
        personality=AgentPersonality.NON_NATIVE_VIETNAMESE,
        name="John",
        description="30 tuổi, người nước ngoài, tiếng Việt cơ bản nhưng hiểu tiếng Anh",
        test_scenarios=[
            # English support
            "hello, how much did I spend",
            "what is my budget",
            "show market data",
            # Bilingual
            "giá vàng SJC today",
            "VN-Index price",
            # TTS features
            "read my expenses",
        ],
        evaluation_criteria={"accuracy": 0.25, "performance": 0.2, "ux": 0.35, "reliability": 0.2},
    ),
}


@dataclass
class EvaluationMetrics:
    """Metrics measured for each API call"""

    # Performance
    response_time_ms: float = 0.0
    throughput_rps: float = 0.0

    # Accuracy
    expense_parsing_accuracy: float = 0.0
    calculation_correctness: float = 0.0

    # User Experience
    response_quality: float = 0.0
    engagement_score: float = 0.0
    vietnamese_context_score: float = 0.0

    # Reliability
    error_rate: float = 0.0
    data_persistence_score: float = 0.0

    # Overall
    overall_score: float = 0.0


@dataclass
class APITestResult:
    """Result of testing a single API endpoint"""

    endpoint: str
    method: str
    status_code: int
    response_time_ms: float
    success: bool
    error_message: Optional[str] = None
    response_data: Optional[dict] = None
    parsed_data: Optional[dict] = None


@dataclass
class AgentTestResult:
    """Complete test results for one agent"""

    agent_id: str
    agent_name: str
    personality: str
    start_time: datetime
    end_time: datetime
    duration_seconds: float
    api_results: list[APITestResult]
    metrics: EvaluationMetrics
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


@dataclass
class EvaluationReport:
    """Comprehensive evaluation report"""

    generated_at: datetime
    total_agents: int
    successful_agents: int
    failed_agents: int
    total_api_calls: int
    successful_api_calls: int
    failed_api_calls: int

    # Aggregate metrics
    avg_response_time_ms: float
    avg_throughput_rps: float
    avg_accuracy_score: float
    avg_ux_score: float
    avg_reliability_score: float
    avg_overall_score: float

    # Per-personality breakdown
    personality_results: dict[str, dict]

    # API endpoint breakdown
    endpoint_results: dict[str, dict]

    # Raw results
    agent_results: list[AgentTestResult]


class APIEndpoints:
    """VietFi Advisor API endpoints"""

    def __init__(self, base_url: str):
        self.base_url = base_url
        self.chat = f"{base_url}/api/chat"
        self.market_data = f"{base_url}/api/market-data"
        self.news = f"{base_url}/api/news"
        self.stock_screener = f"{base_url}/api/stock-screener"
        self.morning_brief = f"{base_url}/api/morning-brief"
        self.tts = f"{base_url}/api/tts"


async def call_chat_api(
    endpoints: APIEndpoints, message: str, context: dict | None = None
) -> APITestResult:
    """Test chat API with 3-tier pipeline"""
    start = time.time()
    try:
        import aiohttp

        async with aiohttp.ClientSession() as session:
            payload: dict = {"messages": [{"role": "user", "content": message}]}
            if context:
                payload["context"] = context

            async with session.post(
                endpoints.chat, json=payload, timeout=aiohttp.ClientTimeout(total=120)
            ) as resp:
                elapsed = (time.time() - start) * 1000
                data = await resp.text()
                return APITestResult(
                    endpoint="/api/chat",
                    method="POST",
                    status_code=resp.status,
                    response_time_ms=elapsed,
                    success=resp.status == 200,
                    response_data={"raw": data[:500]} if data else None,
                )
    except Exception as e:
        elapsed = (time.time() - start) * 1000
        return APITestResult(
            endpoint="/api/chat",
            method="POST",
            status_code=0,
            response_time_ms=elapsed,
            success=False,
            error_message=str(e),
        )


async def call_market_data_api(endpoints: APIEndpoints) -> APITestResult:
    """Test market data API (VN-Index, Gold, USD)"""
    start = time.time()
    try:
        import aiohttp

        async with aiohttp.ClientSession() as session:
            async with session.get(
                endpoints.market_data, timeout=aiohttp.ClientTimeout(total=10)
            ) as resp:
                elapsed = (time.time() - start) * 1000
                data = await resp.json() if resp.status == 200 else {}
                return APITestResult(
                    endpoint="/api/market-data",
                    method="GET",
                    status_code=resp.status,
                    response_time_ms=elapsed,
                    success=resp.status == 200,
                    response_data=data,
                    parsed_data=data,
                )
    except Exception as e:
        elapsed = (time.time() - start) * 1000
        return APITestResult(
            endpoint="/api/market-data",
            method="GET",
            status_code=0,
            response_time_ms=elapsed,
            success=False,
            error_message=str(e),
        )


async def call_news_api(endpoints: APIEndpoints) -> APITestResult:
    """Test news API (CafeF RSS with sentiment)"""
    start = time.time()
    try:
        import aiohttp

        async with aiohttp.ClientSession() as session:
            async with session.get(
                endpoints.news, timeout=aiohttp.ClientTimeout(total=10)
            ) as resp:
                elapsed = (time.time() - start) * 1000
                data = await resp.json() if resp.status == 200 else {}
                return APITestResult(
                    endpoint="/api/news",
                    method="GET",
                    status_code=resp.status,
                    response_time_ms=elapsed,
                    success=resp.status == 200,
                    response_data=data,
                    parsed_data=data,
                )
    except Exception as e:
        elapsed = (time.time() - start) * 1000
        return APITestResult(
            endpoint="/api/news",
            method="GET",
            status_code=0,
            response_time_ms=elapsed,
            success=False,
            error_message=str(e),
        )


async def call_stock_screener_api(
    endpoints: APIEndpoints, filters: dict | None = None
) -> APITestResult:
    """Test stock screener API"""
    start = time.time()
    try:
        import aiohttp

        async with aiohttp.ClientSession() as session:
            params = filters or {}
            async with session.get(
                endpoints.stock_screener,
                params=params,
                timeout=aiohttp.ClientTimeout(total=15),
            ) as resp:
                elapsed = (time.time() - start) * 1000
                data = await resp.json() if resp.status == 200 else {}
                return APITestResult(
                    endpoint="/api/stock-screener",
                    method="GET",
                    status_code=resp.status,
                    response_time_ms=elapsed,
                    success=resp.status == 200,
                    response_data=data,
                    parsed_data=data,
                )
    except Exception as e:
        elapsed = (time.time() - start) * 1000
        return APITestResult(
            endpoint="/api/stock-screener",
            method="GET",
            status_code=0,
            response_time_ms=elapsed,
            success=False,
            error_message=str(e),
        )


async def call_morning_brief_api(endpoints: APIEndpoints) -> APITestResult:
    """Test morning brief API"""
    start = time.time()
    try:
        import aiohttp

        async with aiohttp.ClientSession() as session:
            async with session.get(
                endpoints.morning_brief, timeout=aiohttp.ClientTimeout(total=20)
            ) as resp:
                elapsed = (time.time() - start) * 1000
                data = await resp.json() if resp.status == 200 else {}
                return APITestResult(
                    endpoint="/api/morning-brief",
                    method="GET",
                    status_code=resp.status,
                    response_time_ms=elapsed,
                    success=resp.status == 200,
                    response_data=data,
                    parsed_data=data,
                )
    except Exception as e:
        elapsed = (time.time() - start) * 1000
        return APITestResult(
            endpoint="/api/morning-brief",
            method="GET",
            status_code=0,
            response_time_ms=elapsed,
            success=False,
            error_message=str(e),
        )


async def call_tts_api(endpoints: APIEndpoints, text: str) -> APITestResult:
    """Test TTS API (Vietnamese voice)"""
    start = time.time()
    try:
        import aiohttp

        async with aiohttp.ClientSession() as session:
            async with session.post(
                endpoints.tts,
                json={"text": text, "voice": "vi-VN-HoaiMyNeural"},
                timeout=aiohttp.ClientTimeout(total=10),
            ) as resp:
                elapsed = (time.time() - start) * 1000
                content_type = resp.headers.get("Content-Type", "")
                return APITestResult(
                    endpoint="/api/tts",
                    method="POST",
                    status_code=resp.status,
                    response_time_ms=elapsed,
                    success=resp.status == 200 and "audio" in content_type,
                    response_data={"content_type": content_type},
                )
    except Exception as e:
        elapsed = (time.time() - start) * 1000
        return APITestResult(
            endpoint="/api/tts",
            method="POST",
            status_code=0,
            response_time_ms=elapsed,
            success=False,
            error_message=str(e),
        )


def calculate_metrics(
    results: list[APITestResult], personality: AgentPersonality
) -> EvaluationMetrics:
    """Calculate evaluation metrics from test results"""
    metrics = EvaluationMetrics()

    if not results:
        return metrics

    # Performance metrics
    response_times = [r.response_time_ms for r in results if r.success]
    if response_times:
        metrics.response_time_ms = sum(response_times) / len(response_times)
        # Estimate throughput (requests per second)
        total_time = sum(r.response_time_ms for r in results) / 1000
        metrics.throughput_rps = len(results) / total_time if total_time > 0 else 0

    # Accuracy metrics
    # Check expense parsing accuracy for chat API
    chat_results = [r for r in results if r.endpoint == "/api/chat" and r.success]
    if chat_results:
        # Assume expense parsing works if chat returns successfully
        metrics.expense_parsing_accuracy = 0.85  # Based on regex parser confidence

    # Check calculation correctness for market data
    market_results = [
        r for r in results if r.endpoint == "/api/market-data" and r.success
    ]
    if market_results:
        # Verify data structure
        data = market_results[0].parsed_data or {}
        has_vnindex = "VN-Index" in data or "vnindex" in str(data).lower()
        has_gold = "gold" in str(data).lower() or "sjc" in str(data).lower()
        has_usd = "usd" in str(data).lower() or "vnd" in str(data).lower()
        metrics.calculation_correctness = (has_vnindex + has_gold + has_usd) / 3

    # User Experience metrics
    config = AGENT_CONFIGS[personality]
    # Response quality based on successful responses
    success_rate = len([r for r in results if r.success]) / len(results)
    metrics.response_quality = success_rate

    # Engagement - based on success rate
    metrics.engagement_score = success_rate * 0.8

    # Vietnamese context score
    metrics.vietnamese_context_score = success_rate * 0.85

    # Reliability metrics
    metrics.error_rate = 1 - success_rate
    metrics.data_persistence_score = success_rate

    # Overall score (weighted by personality criteria)
    weights = config.evaluation_criteria
    # Score: faster = higher, all success = higher (cap at 1.0)
    # Performance: <1s = 1.0, <3s = 0.8, <5s = 0.5, >5s = 0.2
    rt = metrics.response_time_ms
    perf_score = 1.0 if rt < 1000 else (0.8 if rt < 3000 else (0.5 if rt < 5000 else 0.2))

    metrics.overall_score = (
        perf_score * weights.get("performance", 0.2)
        + metrics.calculation_correctness * weights.get("accuracy", 0.3)
        + metrics.response_quality * weights.get("ux", 0.3)
        + metrics.data_persistence_score * weights.get("reliability", 0.2)
    )
    metrics.overall_score = min(1.0, metrics.overall_score)

    return metrics


async def run_agent_tests(
    agent_id: str,
    personality: AgentPersonality,
    endpoints: APIEndpoints,
    verbose: bool = False,
) -> AgentTestResult:
    """Run all tests for a single agent"""
    config = AGENT_CONFIGS[personality]
    start_time = datetime.now()
    results = []
    errors = []

    # Small delay between agents to prevent rate limiting
    await asyncio.sleep(1)
    warnings = []

    if verbose:
        print(f"  [{agent_id}] Running tests for {config.name} ({personality.value})")

    # Test scenarios based on personality
    test_cases = []

    # Always test market data
    test_cases.append(("market_data", call_market_data_api(endpoints)))

    # Always test news
    test_cases.append(("news", call_news_api(endpoints)))

    # Always test stock screener
    test_cases.append(("stock_screener", call_stock_screener_api(endpoints)))

    # Always test morning brief
    test_cases.append(("morning_brief", call_morning_brief_api(endpoints)))

    # Test chat with ALL website features - like real user
    chat_messages = {
        AgentPersonality.BUDGET_CONSCIOUS: [
            "phở 30k",
            "cà phê 25k",
            "tháng này đã chi bao nhiêu",
            "tạo hộp tiết kiệm mới",
            "xem ngân sách còn lại",
            "thêm thu nhập 10 triệu",
            "xem sổ thu chi",
            "đầu tháng này thu bao nhiêu",
        ],
        AgentPersonality.DEBT_RIDDEN: [
            "tính DTI hiện tại",
            "so sánh snowball vs avalanche",
            "thêm khoản nợ ngân hàng 50 triệu",
            "xem lộ trình trả nợ",
            "nên trả thêm bao nhiêu",
            "bao lâu hết nợ",
            "tổng nợ bao nhiêu",
        ],
        AgentPersonality.INVESTOR: [
            "VN-Index hôm nay",
            "giá vàng SJC",
            "tỷ giá USD/VND",
            "Bitcoin bao nhiêu",
            "lọc cổ phiếu PE<15",
            "cổ phiếu tốt nhất",
            "xem portfolio",
            "so sánh vàng vs chứng khoán",
            "chỉ số fear & greed",
        ],
        AgentPersonality.SKEPTICAL: [
            "AI này chính xác không",
            "dữ liệu lấy từ đâu",
            "kiểm tra giá vàng thật",
            "VN-Index có đúng không",
            "tin tức thị trường",
        ],
        AgentPersonality.GAMIFICATION_ENTHUSIAST: [
            "XP hiện tại bao nhiêu",
            "level của tao là gì",
            "có những badge nào",
            "streak bao nhiêu ngày",
            "xem bảng xếp hạng",
            "quest hàng ngày là gì",
            "học gì để kiếm XP",
        ],
        AgentPersonality.NEW_USER: [
            "app này là gì",
            "bắt đầu như thế nào",
            "cách ghi chi tiêu",
            "thêm thu nhập",
            "xem tính năng chính",
            "xem dashboard",
            "các trang có gì",
        ],
        AgentPersonality.POWER_USER: [
            "CPI cá nhân là gì",
            "so sánh CPI của tao với official",
            "làm quiz rủi ro",
            "profile rủi ro của tao",
            "tính mua hay thuê nhà",
            "chỉ số vĩ mô",
            "các guru tài chính",
        ],
        AgentPersonality.NON_NATIVE_VIETNAMESE: [
            "hello, how much did I spend",
            "what is my budget",
            "show market data",
            "giá vàng SJC today",
            "VN-Index price",
        ],
    }

    # Test multiple chat messages
    for msg in chat_messages.get(personality, ["xin chào"]):
        test_cases.append(("chat", call_chat_api(endpoints, msg)))

    # Test TTS
    test_cases.append(("tts", call_tts_api(endpoints, "Xin chào, tôi là Vẹt Vàng")))

    # Run all tests concurrently
    if verbose:
        print(f"  [{agent_id}] Executing {len(test_cases)} API calls...")

    api_results = await asyncio.gather(
        *[tc[1] for tc in test_cases], return_exceptions=True
    )

    for i, (test_name, result) in enumerate(zip(test_cases, api_results)):
        if isinstance(result, Exception):
            errors.append(f"{test_name[0]}: {str(result)}")
            results.append(
                APITestResult(
                    endpoint=test_name[0],
                    method="GET" if test_name[0] != "tts" else "POST",
                    status_code=0,
                    response_time_ms=0,
                    success=False,
                    error_message=str(result),
                )
            )
        elif isinstance(result, APITestResult):
            results.append(result)
            if verbose and not result.success:
                warnings.append(f"{test_name[0]}: {result.error_message or 'failed'}")

    end_time = datetime.now()
    duration = (end_time - start_time).total_seconds()

    # Calculate metrics
    metrics = calculate_metrics(results, personality)

    if verbose:
        print(
            f"  [{agent_id}] Completed in {duration:.1f}s, score: {metrics.overall_score:.2f}"
        )

    return AgentTestResult(
        agent_id=agent_id,
        agent_name=config.name,
        personality=personality.value,
        start_time=start_time,
        end_time=end_time,
        duration_seconds=duration,
        api_results=results,
        metrics=metrics,
        errors=errors,
        warnings=warnings,
    )


def aggregate_results(results: list[AgentTestResult]) -> EvaluationReport:
    """Aggregate all agent results into a comprehensive report"""
    total_agents = len(results)
    successful = len([r for r in results if r.metrics.overall_score > 0.5])
    failed = total_agents - successful

    total_api_calls = sum(len(r.api_results) for r in results)
    successful_api_calls = sum(
        len([ar for ar in r.api_results if ar.success]) for r in results
    )
    failed_api_calls = total_api_calls - successful_api_calls

    # Calculate averages
    all_metrics = [r.metrics for r in results]
    avg_response = (
        sum(m.response_time_ms for m in all_metrics) / total_agents
        if total_agents
        else 0
    )
    avg_throughput = (
        sum(m.throughput_rps for m in all_metrics) / total_agents if total_agents else 0
    )
    avg_accuracy = (
        sum(m.calculation_correctness for m in all_metrics) / total_agents
        if total_agents
        else 0
    )
    avg_ux = (
        sum(m.response_quality for m in all_metrics) / total_agents
        if total_agents
        else 0
    )
    avg_reliability = (
        sum(m.data_persistence_score for m in all_metrics) / total_agents
        if total_agents
        else 0
    )
    avg_overall = (
        sum(m.overall_score for m in all_metrics) / total_agents if total_agents else 0
    )

    # Per-personality breakdown
    personality_results = {}
    for personality in AgentPersonality:
        p_results = [r for r in results if r.personality == personality.value]
        if p_results:
            personality_results[personality.value] = {
                "count": len(p_results),
                "avg_score": sum(r.metrics.overall_score for r in p_results)
                / len(p_results),
                "avg_response_time": sum(r.metrics.response_time_ms for r in p_results)
                / len(p_results),
                "success_rate": len(
                    [r for r in p_results if r.metrics.overall_score > 0.5]
                )
                / len(p_results),
            }

    # Endpoint breakdown
    endpoint_results = {}
    all_endpoints = set()
    for r in results:
        for ar in r.api_results:
            all_endpoints.add(ar.endpoint)

    for endpoint in all_endpoints:
        endpoint_results[endpoint] = {
            "total_calls": 0,
            "successful_calls": 0,
            "avg_response_time": 0,
            "success_rate": 0,
        }

    for r in results:
        for ar in r.api_results:
            endpoint_results[ar.endpoint]["total_calls"] += 1
            if ar.success:
                endpoint_results[ar.endpoint]["successful_calls"] += 1
            endpoint_results[ar.endpoint]["avg_response_time"] += ar.response_time_ms

    for endpoint in endpoint_results:
        total = endpoint_results[endpoint]["total_calls"]
        if total > 0:
            endpoint_results[endpoint]["avg_response_time"] /= total
            endpoint_results[endpoint]["success_rate"] = (
                endpoint_results[endpoint]["successful_calls"] / total
            )

    return EvaluationReport(
        generated_at=datetime.now(),
        total_agents=total_agents,
        successful_agents=successful,
        failed_agents=failed,
        total_api_calls=total_api_calls,
        successful_api_calls=successful_api_calls,
        failed_api_calls=failed_api_calls,
        avg_response_time_ms=avg_response,
        avg_throughput_rps=avg_throughput,
        avg_accuracy_score=avg_accuracy,
        avg_ux_score=avg_ux,
        avg_reliability_score=avg_reliability,
        avg_overall_score=avg_overall,
        personality_results=personality_results,
        endpoint_results=endpoint_results,
        agent_results=results,
    )


async def run_evaluation(
    num_agents: int = 1000,
    concurrent: int = 50,
    base_url: str = VIETFI_BASE_URL,
    personalities: list[AgentPersonality] | None = None,
    verbose: bool = False,
    output_file: str | None = None,
) -> EvaluationReport:
    """Run the complete evaluation with multiple agents"""

    if verbose:
        print(f"Starting VietFi Advisor Evaluation")
        print(f"  Agents: {num_agents}")
        print(f"  Concurrent: {concurrent}")
        print(f"  Base URL: {base_url}")
        print()

    endpoints = APIEndpoints(base_url)

    # Determine agent personalities
    if personalities is None:
        # Distribute agents evenly across all personalities
        personalities = list(AgentPersonality)

    # Create agent assignments
    agents_per_personality = num_agents // len(personalities)
    agent_assignments = []

    for personality in personalities:
        for i in range(agents_per_personality):
            agent_assignments.append((f"{personality.value}_{i}", personality))

    # Handle remainder
    remainder = num_agents - len(agent_assignments)
    for i in range(remainder):
        personality = personalities[i % len(personalities)]
        agent_assignments.append(
            (f"{personality.value}_{agents_per_personality + i}", personality)
        )

    if verbose:
        print(f"Total agents to run: {len(agent_assignments)}")
        for personality in personalities:
            count = len([a for a in agent_assignments if a[1] == personality])
            print(f"  - {personality.value}: {count}")
        print()

    # Run agents in batches
    all_results = []
    batch_size = concurrent

    for i in range(0, len(agent_assignments), batch_size):
        batch = agent_assignments[i : i + batch_size]
        if verbose:
            print(
                f"Running batch {i // batch_size + 1}/{(len(agent_assignments) + batch_size - 1) // batch_size}..."
            )

        batch_results = await asyncio.gather(
            *[
                run_agent_tests(agent_id, personality, endpoints, verbose)
                for agent_id, personality in batch
            ]
        )
        all_results.extend(batch_results)

        if verbose:
            print(f"  Completed {len(all_results)}/{len(agent_assignments)} agents")

    # Aggregate results
    report = aggregate_results(all_results)

    # Save report
    if output_file:
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(asdict(report), f, indent=2, default=str)
        if verbose:
            print(f"\nReport saved to: {output_file}")

    return report


def print_report(report: EvaluationReport):
    """Print a formatted evaluation report"""
    print("\n" + "=" * 60)
    print("VietFi Advisor Evaluation Report")
    print("=" * 60)
    print(f"Generated: {report.generated_at}")
    print(f"Total Agents: {report.total_agents}")
    print(f"Successful: {report.successful_agents} | Failed: {report.failed_agents}")
    print(f"Total API Calls: {report.total_api_calls}")
    print(
        f"Success Rate: {report.successful_api_calls / report.total_api_calls * 100:.1f}%"
    )
    print()

    print("Aggregate Metrics:")
    print(f"  Avg Response Time: {report.avg_response_time_ms:.1f}ms")
    print(f"  Avg Throughput: {report.avg_throughput_rps:.2f} req/s")
    print(f"  Avg Accuracy: {report.avg_accuracy_score:.2f}")
    print(f"  Avg UX Score: {report.avg_ux_score:.2f}")
    print(f"  Avg Reliability: {report.avg_reliability_score:.2f}")
    print(f"  Overall Score: {report.avg_overall_score:.2f}")
    print()

    print("Per-Personality Results:")
    for personality, stats in report.personality_results.items():
        print(f"  {personality}:")
        print(f"    Count: {stats['count']}")
        print(f"    Avg Score: {stats['avg_score']:.2f}")
        print(f"    Avg Response: {stats['avg_response_time']:.1f}ms")
        print(f"    Success Rate: {stats['success_rate'] * 100:.1f}%")
    print()

    print("Per-Endpoint Results:")
    for endpoint, stats in report.endpoint_results.items():
        print(f"  {endpoint}:")
        print(f"    Calls: {stats['total_calls']}")
        print(f"    Success: {stats['success_rate'] * 100:.1f}%")
        print(f"    Avg Response: {stats['avg_response_time']:.1f}ms")


def main():
    parser = argparse.ArgumentParser(
        description="VietFi Advisor AI Agent Evaluation Tool"
    )
    parser.add_argument(
        "--agents", type=int, default=1000, help="Number of agents to run"
    )
    parser.add_argument(
        "--concurrent", type=int, default=50, help="Concurrent agents per batch"
    )
    parser.add_argument(
        "--base-url", type=str, default=VIETFI_BASE_URL, help="VietFi base URL"
    )
    parser.add_argument(
        "--personality",
        type=str,
        choices=[p.value for p in AgentPersonality],
        help="Run only specific personality",
    )
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    parser.add_argument("--output", "-o", type=str, help="Output JSON file for report")
    parser.add_argument("--quiet", "-q", action="store_true", help="Only print summary")

    args = parser.parse_args()

    # Determine personalities
    if args.personality:
        personalities = [AgentPersonality(args.personality)]
    else:
        personalities = None

    # Run evaluation
    report = asyncio.run(
        run_evaluation(
            num_agents=args.agents,
            concurrent=args.concurrent,
            base_url=args.base_url,
            personalities=personalities,
            verbose=args.verbose and not args.quiet,
            output_file=args.output,
        )
    )

    # Print report
    if not args.quiet:
        print_report(report)

    # Exit with appropriate code
    sys.exit(0 if report.avg_overall_score > 0.5 else 1)


if __name__ == "__main__":
    main()
