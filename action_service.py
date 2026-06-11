import httpx
from typing import Optional, Dict, Any, List
import time
import uuid
import json
import logging

# ... (остальные импорты и код)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Новая интеграция с OpenClaw ---

OPENCLAW_GATEWAY_URL = "http://localhost:18789"
# Ваш API-ключ из переменной окружения
OPENCLAW_API_KEY = "sk-295ca99ac1e74ad7a8db90d4e84a1145"
# Или можно получить из переменных окружения, если вы их используете
# OPENCLAW_API_KEY = os.getenv("OPENCLAW_API_KEY")

# Клиент для HTTP-запросов
client = httpx.Client(timeout=30.0)

async def execute_action_with_openclaw(action: str, target: str, params: dict) -> str:
    """
    Направляет запрос Action Service в OpenClaw для выполнения.
    Использует HTTP API `/tools/invoke`.
    """
    # Убедимся, что API-ключ задан
    if not OPENCLAW_API_KEY:
        return "❌ OpenClaw API key not configured. Cannot execute action."

    # Создаём заголовки с авторизацией
    headers = {
        "Authorization": f"Bearer {OPENCLAW_API_KEY}",
        "Content-Type": "application/json",
    }

    # Формируем тело запроса для OpenClaw
    # Поле "tool" определяет, какое действие выполнить
    openclaw_tool = "agent.message"
    openclaw_args = {
        "message": f"Execute the following action: {action} on {target} with parameters {params}. Provide a concise result.",
        "session_key": f"action-{target}-{int(time.time())}"
    }

    # --- Пример маппинга ваших действий на инструменты OpenClaw ---
    if action == "deploy":
        openclaw_tool = "agent.deploy"
        openclaw_args = {"environment": target, "params": params}
    elif action == "browser.navigate":
        openclaw_tool = "browser.navigate"
        openclaw_args = {"url": params.get("url")}
    # Добавьте сюда другие типы действий по аналогии

    payload = {
        "tool": openclaw_tool,
        "args": openclaw_args,
        "sessionKey": f"action-session-{target}"
    }

    logger.info(f"Invoking OpenClaw tool '{openclaw_tool}' with payload: {payload}")
    logger.info(f"Using API Key: {OPENCLAW_API_KEY[:10]}...")

    # Путь к API инструментов OpenClaw
    invoke_url = f"{OPENCLAW_GATEWAY_URL}/tools/invoke"

    try:
        # Отправляем POST-запрос к OpenClaw
        response = client.post(invoke_url, json=payload, headers=headers)
        response.raise_for_status() # Вызовет исключение для кодов 4xx/5xx

        result = response.json()
        logger.info(f"OpenClaw response: {result}")

        # Извлекаем результат в зависимости от ответа OpenClaw
        if "result" in result:
            return f"✅ OpenClaw executed {action}: {str(result['result'])}"
        elif "message" in result:
            return f"✅ OpenClaw executed {action}: {result['message']}"
        else:
            return f"✅ OpenClaw executed {action}. Response: {result}"

    except httpx.HTTPStatusError as e:
        error_detail = f"HTTP {e.response.status_code}"
        try:
            error_body = e.response.json()
            error_detail = f"{error_detail}: {error_body.get('error', error_body)}"
        except:
            error_detail = f"{error_detail}: {e.response.text}"
        logger.error(f"OpenClaw API error: {error_detail}")
        return f"⚠️ OpenClaw error: {error_detail}"
    except Exception as e:
        logger.exception(f"Unexpected error during OpenClaw invocation: {e}")
        return f"⚠️ Unexpected error: {str(e)}"

# ... (остальной код)
