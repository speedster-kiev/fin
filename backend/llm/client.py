import json
import os
from datetime import datetime, timezone

import litellm

_MODEL = "openrouter/openai/gpt-oss-120b"
_API_BASE = "https://openrouter.ai/api/v1"

_MOCK_RESPONSE = {
    "message": (
        "Based on your portfolio, you have a solid tech-heavy allocation. "
        "NVDA and TSLA are showing strong momentum. Consider diversifying "
        "into defensive positions like JPM for balance."
    ),
    "trades": None,
    "watchlist_changes": None,
}

_SYSTEM_TEMPLATE = """You are FinAlly, an AI-powered trading assistant.

Current portfolio:
{portfolio_json}

Today: {today}

Respond ONLY with valid JSON matching this exact schema:
{{
  "message": "<your response to the user>",
  "trades": [
    {{"ticker": "AAPL", "quantity": 10, "side": "buy"}}
  ],
  "watchlist_changes": {{
    "add": ["TICKER"],
    "remove": ["TICKER"]
  }}
}}

- Always include "message".
- Include "trades" only when the user explicitly requests trade execution.
- Include "watchlist_changes" only when the user asks to add/remove tickers.
- Omit or null out fields that don't apply.
- Never fabricate market data; use the portfolio context provided."""


async def chat_with_llm(
    messages: list[dict[str, str]],
    portfolio_context: dict,
) -> dict:
    if os.getenv("LLM_MOCK", "").lower() == "true":
        return dict(_MOCK_RESPONSE)

    system = _SYSTEM_TEMPLATE.format(
        portfolio_json=json.dumps(portfolio_context, indent=2),
        today=datetime.now(timezone.utc).strftime("%Y-%m-%d"),
    )
    full_messages = [{"role": "system", "content": system}, *messages]

    response = await litellm.acompletion(
        model=_MODEL,
        messages=full_messages,
        response_format={"type": "json_object"},
        api_key=os.getenv("OPENROUTER_API_KEY"),
        api_base=_API_BASE,
    )

    content = response.choices[0].message.content or ""
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        return {"message": content, "trades": None, "watchlist_changes": None}
