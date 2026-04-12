# AI Endpoint Performance Tradeoffs

## The Insight
When evaluating AI-powered endpoints for a Vietnamese finance app, the choice between local vs cloud inference depends on hardware constraints rather than just speed.

## Why This Matters
The evaluation benchmark showed:
- Local Ollama 3B: ~3s response but limited by VRAM (needs 8GB+ GPU)
- Ollama Cloud: 10-20s due to network latency (not model size)
- Cloud API timeouts cause cascading test failures

## Recognition Pattern
- Server returns 504/429 under concurrent load
- Response times spike >10s for "simple" queries
- Local model loads fail with OOM errors

## The Approach
Decision heuristic for AI provider selection:
1. **Development/Testing**: Use cloud APIs with generous timeouts (60-120s)
2. **Production with GPU**: Use local Ollama with quantized models (Q4_K_M)
3. **Production without GPU**: Use Gemini or OpenAI APIs
4. **Hybrid**: Scripted responses for 80% of queries, AI for 20%

## Example
Local config (.env):
```
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434/v1
OLLAMA_MODEL=llama3.2:3b
```

Cloud config:
```
AI_PROVIDER=ollama-cloud
OLLAMA_API_KEY=sk-...
OLLAMA_MODEL=qwen2.5:14b
```