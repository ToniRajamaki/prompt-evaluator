"""Minimal PydanticAI chat backend.

Exposes POST /api/chat which takes the conversation so far and returns the
assistant's next reply. The OpenAI key and model are read from the environment
(see .env.example).
"""

from __future__ import annotations

import os

from collections.abc import AsyncIterator

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from pydantic_ai import Agent
from pydantic_ai.messages import (
    ModelMessage,
    ModelRequest,
    ModelResponse,
    TextPart,
    UserPromptPart,
)

load_dotenv()

MODEL = os.getenv("OPENAI_MODEL", "openai:gpt-4o-mini")
SYSTEM_PROMPT = os.getenv(
    "SYSTEM_PROMPT",
    "You are a helpful assistant inside a PDF notebook app. "
    "Answer the user's questions clearly and concisely.",
)

agent: Agent | None = None


def get_agent() -> Agent:
    """Build the agent lazily so the server can start before the key is set."""
    global agent
    if agent is None:
        agent = Agent(MODEL, system_prompt=SYSTEM_PROMPT)
    return agent

app = FastAPI(title="Prompt Evaluator Chat")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class Message(BaseModel):
    role: str  # "user" | "assistant"
    text: str


class ChatRequest(BaseModel):
    messages: list[Message]


class ChatResponse(BaseModel):
    reply: str


def _to_history(messages: list[Message]) -> list[ModelMessage]:
    """Convert prior turns into PydanticAI message history."""
    history: list[ModelMessage] = []
    for msg in messages:
        if msg.role == "user":
            history.append(ModelRequest(parts=[UserPromptPart(content=msg.text)]))
        else:
            history.append(ModelResponse(parts=[TextPart(content=msg.text)]))
    return history


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "model": MODEL}


@app.post("/api/chat", response_model=ChatResponse)
async def chat(req: ChatRequest) -> ChatResponse:
    if not os.getenv("OPENAI_API_KEY"):
        raise HTTPException(500, "OPENAI_API_KEY is not set. Fill in backend/.env")
    if not req.messages or req.messages[-1].role != "user":
        raise HTTPException(400, "Last message must be from the user.")

    prompt = req.messages[-1].text
    history = _to_history(req.messages[:-1])

    try:
        result = await get_agent().run(prompt, message_history=history)
    except Exception as exc:  # surface a clean error to the UI
        raise HTTPException(502, f"Model error: {exc}") from exc

    return ChatResponse(reply=result.output)


@app.post("/api/chat/stream")
async def chat_stream(req: ChatRequest) -> StreamingResponse:
    """Stream the assistant reply as plain-text deltas as the model produces them."""
    if not os.getenv("OPENAI_API_KEY"):
        raise HTTPException(500, "OPENAI_API_KEY is not set. Fill in backend/.env")
    if not req.messages or req.messages[-1].role != "user":
        raise HTTPException(400, "Last message must be from the user.")

    prompt = req.messages[-1].text
    history = _to_history(req.messages[:-1])

    async def gen() -> AsyncIterator[str]:
        try:
            async with get_agent().run_stream(
                prompt, message_history=history
            ) as result:
                async for delta in result.stream_text(delta=True):
                    yield delta
        except Exception as exc:  # surface a clean error mid-stream
            yield f"\n\n[stream error: {exc}]"

    return StreamingResponse(gen(), media_type="text/plain; charset=utf-8")
