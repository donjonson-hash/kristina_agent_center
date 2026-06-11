from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any
import hashlib
import json
import time
import asyncio
import logging
import os
import subprocess
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

OPENCLAW_API_KEY = os.getenv("OPENCLAW_API_KEY", "sk-295ca99ac1e74ad7a8db90d4e84a1145")
SSH_HOST = os.getenv("SSH_HOST", "195.245.112.66")
SSH_USER = os.getenv("SSH_USER", "root")
SSH_PORT = os.getenv("SSH_PORT", "3333")
SSH_KEY = os.getenv("SSH_KEY_PATH", "/home/avatar/.ssh/id_ed25519")

app = FastAPI(title="Kristina Action Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ActionRequest(BaseModel):
    action: str
    target: str
    agent_id: str
    params: Optional[Dict[str, Any]] = {}
    requires_approval: bool = False

class ActionResponse(BaseModel):
    status: str
    action_id: str
    message: str

audit_log = []

def log_action(action_req: ActionRequest, status: str, result: str = ""):
    entry = {
        "action_id": hashlib.md5(f"{time.time()}{action_req.action}".encode()).hexdigest()[:8],
        "agent_id": action_req.agent_id,
        "action": action_req.action,
        "target": action_req.target,
        "params": action_req.params,
        "timestamp": time.time(),
        "status": status,
        "result": result,
    }
    audit_log.append(entry)
    logger.info(f"AUDIT: {entry}")
    return entry["action_id"]

def ssh_base():
    return ["ssh", "-p", SSH_PORT, "-i", SSH_KEY, "-o", "ConnectTimeout=15", "-o", "StrictHostKeyChecking=no"]

async def execute_real_status(target: str, params: dict) -> str:
    service_name = params.get("service", f"{target}")
    cmd = f"systemctl status {service_name} --no-pager -l | head -30"
    
    full_cmd = ssh_base() + [f"{SSH_USER}@{SSH_HOST}", cmd]
    try:
        result = subprocess.run(full_cmd, capture_output=True, text=True, timeout=30)
        return result.stdout if result.returncode == 0 else result.stderr
    except Exception as e:
        return f"❌ Error: {str(e)}"

async def execute_real_logs(target: str, params: dict) -> str:
    service_name = params.get("service", f"{target}")
    lines = params.get("lines", 50)
    cmd = f"journalctl -u {service_name} -n {lines} --no-pager"
    
    full_cmd = ssh_base() + [f"{SSH_USER}@{SSH_HOST}", cmd]
    try:
        result = subprocess.run(full_cmd, capture_output=True, text=True, timeout=30)
        return result.stdout if result.returncode == 0 else result.stderr
    except Exception as e:
        return f"❌ Error: {str(e)}"

async def execute_real_deploy(target: str, params: dict) -> str:
    project_dir = params.get("project_dir", f"/opt/{target}")
    service_name = params.get("service", f"{target}")
    branch = params.get("branch", "main")
    
    cmds = [
        f"cd {project_dir} && git fetch origin {branch}",
        f"cd {project_dir} && git reset --hard origin/{branch}",
        f"cd {project_dir} && git pull origin {branch}",
        f"systemctl restart {service_name}",
        f"systemctl status {service_name} --no-pager -l | head -20"
    ]
    
    results = []
    for cmd in cmds:
        full_cmd = ssh_base() + [f"{SSH_USER}@{SSH_HOST}", cmd]
        try:
            result = subprocess.run(full_cmd, capture_output=True, text=True, timeout=60)
            if result.returncode == 0:
                results.append(f"✅ {cmd[:50]}...\n{result.stdout[:200]}")
            else:
                results.append(f"⚠️ {cmd[:50]}...\nERROR: {result.stderr[:300]}")
                break
        except Exception as e:
            results.append(f"❌ {str(e)}")
            break
    
    return "\n---\n".join(results)

async def execute_action(action: str, target: str, params: dict) -> str:
    if action == "status":
        return await execute_real_status(target, params)
    elif action == "logs":
        return await execute_real_logs(target, params)
    elif action == "deploy":
        return await execute_real_deploy(target, params)
    return f"Unknown action: {action}"

@app.post("/api/actions/execute", response_model=ActionResponse)
async def execute(request: ActionRequest):
    logger.info(f"REQUEST: {request.agent_id} -> {request.action} on {request.target}")
    
    if request.requires_approval and request.action == "deploy":
        action_id = log_action(request, "pending_approval")
        return ActionResponse(status="pending_approval", action_id=action_id, message="Awaiting approval")
    
    try:
        result = await execute_action(request.action, request.target, request.params)
        action_id = log_action(request, "executed", result)
        return ActionResponse(status="executed", action_id=action_id, message=result)
    except Exception as e:
        action_id = log_action(request, "failed", str(e))
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/actions/health")
async def health():
    return {"status": "ok", "ssh_host": SSH_HOST, "ssh_key": SSH_KEY}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
