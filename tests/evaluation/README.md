# VietFi Advisor AI Agent Evaluation Tool

A production-ready Python tool for evaluating VietFi Advisor API endpoints using 1000 AI agents with distinct personalities.

## Overview

This tool simulates real user interactions with VietFi Advisor through 8 distinct AI agent personalities, each testing specific user flows and measuring performance, accuracy, user experience, and reliability.

## Features

- **8 Distinct AI Agent Personalities**:
  - Budget Conscious (Bà Trâm) - Focuses on expense tracking and budgets
  - Debt Ridden (Anh Minh) - Focuses on debt management and optimization
  - Investor (Chị Hương) - Focuses on stock market and investments
  - Skeptical (Anh Sơn) - Questions AI recommendations
  - Gamification Enthusiast (Em Linh) - Focuses on XP, badges, levels
  - New User (Bạn Nam) - First-time user onboarding
  - Power User (Anh Khoa) - Advanced features and customizations
  - Non-Native Vietnamese (John) - Non-native Vietnamese speaker

- **API Testing**: Tests all VietFi Advisor endpoints:
  - `/api/chat` - 3-tier AI pipeline
  - `/api/market-data` - VN-Index, Gold SJC, USD/VND
  - `/api/news` - CafeF RSS with sentiment
  - `/api/stock-screener` - VN stock filtering
  - `/api/morning-brief` - AI-generated morning brief
  - `/api/tts` - Vietnamese TTS

- **Evaluation Metrics**:
  - Performance (response time, throughput)
  - Accuracy (expense parsing, calculation correctness)
  - User Experience (response quality, engagement)
  - Reliability (error handling, data persistence)

- **Concurrent Execution**: Runs agents in parallel batches for efficient testing
- **Comprehensive Reporting**: Generates detailed JSON reports with aggregated results

## Installation

```bash
# Install dependencies
pip install aiohttp pyyaml pytest pytest-asyncio
```

## Usage

### Basic Usage

```bash
# Run evaluation with default settings (1000 agents, 50 concurrent)
python -m tests.evaluation.runner --agents 1000 --concurrent 50

# Run with custom base URL
python -m tests.evaluation.runner --base-url https://vietfi-advisor.vercel.app

# Run specific personality only
python -m tests.evaluation.runner --personality budget_conscious

# Save report to file
python -m tests.evaluation.runner --output reports/eval_report.json

# Verbose output
python -m tests.evaluation.runner --verbose
```

### Configuration File

```bash
# Run with custom config
python -m tests.evaluation.runner --config config/evaluation_config.yaml
```

### Environment Variables

```bash
# Set OpenAI compatible API (for agent decision-making)
export OPENAI_API_BASE="http://localhost:20128/v1"
export OPENAI_API_KEY="sk-f56f21febe169a80-qieeeg-1539c9ee"
export LLM_MODEL="qw/qwen3-coder-plus"

# Set VietFi base URL
export VIETFI_BASE_URL="http://localhost:3000"
```

## Command Line Options

| Option | Default | Description |
|--------|---------|-------------|
| `--agents` | 1000 | Number of AI agents to deploy |
| `--concurrent` | 50 | Concurrent agents per batch |
| `--base-url` | http://localhost:3000 | VietFi base URL |
| `--personality` | all | Run specific personality |
| `--output` | - | Output JSON file for report |
| `--verbose` | false | Enable verbose output |
| `--quiet` | false | Only print summary |

## Output

The tool generates a comprehensive evaluation report with:

- **Summary**: Total agents, success rates, API call counts
- **Aggregate Metrics**: Average response time, throughput, accuracy, UX, reliability
- **Per-Personality Results**: Breakdown by agent type
- **Per-Endpoint Results**: Breakdown by API endpoint
- **Individual Agent Results**: Detailed results for each agent

### Sample Output

```
============================================================
VietFi Advisor Evaluation Report
============================================================
Generated: 2026-04-12T10:30:00
Total Agents: 1000
Successful: 950 | Failed: 50
Total API Calls: 6000
Success Rate: 95.2%

Aggregate Metrics:
  Avg Response Time: 250.5ms
  Avg Throughput: 4.2 req/s
  Avg Accuracy: 0.85
  Avg UX Score: 0.90
  Avg Reliability: 0.92
  Overall Score: 0.87
```

## Development

### Running Tests

```bash
# Run all tests
python -m pytest tests/evaluation/runner_test.py -v

# Run specific test
python -m pytest tests/evaluation/runner_test.py::TestAgentPersonality -v
```

### Project Structure

```
tests/evaluation/
├── __init__.py          # Package initialization
├── runner.py            # Main evaluation runner
├── runner_test.py      # Unit tests
└── config/
    └── evaluation_config.yaml  # Configuration file
```

## Architecture

### Agent Workflow

1. **Configuration**: Load agent personality configs with test scenarios
2. **Distribution**: Distribute agents evenly across all personalities
3. **Execution**: Run agents in concurrent batches
4. **Testing**: Execute API calls for each agent's test scenarios
5. **Metrics**: Calculate evaluation metrics based on responses
6. **Aggregation**: Aggregate results into comprehensive report

### Key Components

- **APIEndpoints**: URL builder for all VietFi API endpoints
- **call_*_api()**: Async API client functions for each endpoint
- **calculate_metrics()**: Computes evaluation metrics from test results
- **aggregate_results()**: Aggregates all agent results into final report

## License

MIT License