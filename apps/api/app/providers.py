import json
import re
from abc import ABC, abstractmethod
from collections import Counter
from openai import AsyncOpenAI
from .config import Settings

class LLMProvider(ABC):
    @abstractmethod
    async def generate_structured(self, task: str, payload: dict, schema: dict) -> dict: ...
    @abstractmethod
    async def generate_text(self, prompt: str) -> str: ...
    @abstractmethod
    async def embed(self, texts: list[str]) -> list[list[float]]: ...

class MockLLMProvider(LLMProvider):
    async def generate_structured(self, task: str, payload: dict, schema: dict) -> dict:
        sources = payload.get("sources", [])
        text = " ".join(s.get("content", "") for s in sources)
        words = [w.lower() for w in re.findall(r"[A-Za-z][A-Za-z0-9-]{3,}", text)]
        common = [w for w, _ in Counter(words).most_common(12) if w not in {"this","that","with","from","your","have","will","https"}]
        name = payload.get("product_name", "Product")
        claims = []
        for source in sources[:5]:
            sentence = next((x.strip() for x in re.split(r"[.!?]", source.get("content", "")) if len(x.strip()) > 25), "")
            if sentence:
                claims.append({"claim": sentence[:240], "source_id": source["id"], "source_quote": sentence[:300], "confidence": 0.75})
        return {
            "product_name": name, "one_liner": f"{name} helps users with {', '.join(common[:3]) or 'their workflow'}.",
            "category": common[0] if common else "software", "target_users": ["teams evaluating this workflow"],
            "jobs_to_be_done": [f"Improve {w}" for w in common[:3]], "pain_points": [f"Difficulty with {w}" for w in common[3:6]],
            "use_cases": common[:5], "competitors": [], "alternatives": ["manual workflow"],
            "recommend_when": [f"Someone explicitly needs {w}" for w in common[:3]],
            "do_not_recommend_when": ["The requested capability is not supported by cited sources"],
            "supported_claims": claims, "unsupported_or_uncertain_claims": [], "pricing_summary": "Not verified",
            "disclosure_identity": f"I'm building {name}",
            "query_graph": {"direct_terms": common[:5], "pain_phrases": [f"looking for {w}" for w in common[:4]],
              "intent_patterns": ["looking for", "any recommendations", "alternative to", "how do I"],
              "competitors": [], "use_cases": common[:5], "negative_terms": []},
        }
    async def generate_text(self, prompt: str) -> str: return "Mock response"
    async def embed(self, texts: list[str]) -> list[list[float]]: return [[float(len(t) % 17) / 17] * 8 for t in texts]

class OpenAICompatibleProvider(LLMProvider):
    def __init__(self, settings: Settings):
        if not settings.llm_api_key or not settings.llm_strong_model:
            raise ValueError("LLM_API_KEY and LLM_STRONG_MODEL are required")
        self.client = AsyncOpenAI(api_key=settings.llm_api_key, base_url=settings.llm_base_url)
        self.model = settings.llm_strong_model
    async def generate_structured(self, task: str, payload: dict, schema: dict) -> dict:
        system = """You are a senior product researcher building a factual Product Brain for an autonomous Reddit growth agent.
Return exactly one JSON object matching the supplied JSON Schema, including every required field.
Analyze what the product actually does, who urgently needs it, their natural-language pain points, use cases, alternatives, competitors, recommendation boundaries, and high-intent search phrases.
Rules:
- Never invent a capability, price, customer, integration, or competitor.
- Every supported_claim must cite one supplied source_id and copy a short source_quote verbatim from that source.
- Search terms must sound like phrases real users write when asking for help; do not use generic page-frequency words.
- Distinguish target users, jobs-to-be-done, pain points, and use cases instead of repeating the same nouns.
- Put uncertain facts in unsupported_or_uncertain_claims.
- Write concise, specific English suitable for retrieval and reply policy decisions.
"""
        response = await self.client.chat.completions.create(model=self.model, temperature=0.1,
          response_format={"type": "json_object"}, messages=[
            {"role":"system","content":f"{system}\nTask: {task}."},
            {"role":"user","content":json.dumps({"input":payload,"required_output_schema":schema}, ensure_ascii=False)}])
        content = (response.choices[0].message.content or "{}").strip()
        if content.startswith("```"):
            content = re.sub(r"^```(?:json)?\s*|\s*```$", "", content, flags=re.IGNORECASE)
        return json.loads(content)
    async def generate_text(self, prompt: str) -> str:
        r = await self.client.chat.completions.create(model=self.model, messages=[{"role":"user","content":prompt}])
        return r.choices[0].message.content or ""
    async def embed(self, texts: list[str]) -> list[list[float]]:
        raise NotImplementedError("Configure a dedicated embedding provider before live reranking")

def provider_for(settings: Settings) -> LLMProvider:
    return MockLLMProvider() if settings.llm_provider == "mock" else OpenAICompatibleProvider(settings)
