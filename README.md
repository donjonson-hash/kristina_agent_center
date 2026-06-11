# Kristina Agent Command Center

AI-powered agent management dashboard with Palantir-style architecture.

## 🚀 Quick Start

```bash
# Clone repository
git clone https://github.com/donjonson-hash/kristina_agent_center.git
cd kristina_agent_center

# Start Action Service
pip install -r requirements.txt
python action_service.py &

# Start frontend
cd app
npm install
npm run dev
# Test Action Service
curl http://localhost:8000/api/actions/health

# Test execute endpoint
curl -X POST http://localhost:8000/api/actions/execute \
  -H "Content-Type: application/json" \
  -d '{"action":"test","target":"Test","agent_id":"devops","requires_approval":false}'
 CI/CD Status
Workflow	Status
Test Action Service	https://github.com/donjonson-hash/kristina_agent_center/actions/workflows/test-action-service.yml/badge.svg
Lint Python	https://github.com/donjonson-hash/kristina_agent_center/actions/workflows/lint-python.yml/badge.svg
Validate Ontology	https://github.com/donjonson-hash/kristina_agent_center/actions/workflows/validate-ontology.yml/badge.svg
🏗️ Architecture
    Action Service - Palantir-style gateway (FastAPI)

    Frontend - React/TypeScript dashboard

    Ontology - YAML-based entity definitions

    Audit Log - Immutable action logging

    OpenClaw - Browser automation integration

📝 License

MIT
