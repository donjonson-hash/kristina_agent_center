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
```

Deploy actions use the evidence-gated proposal and approval flow. See [Action Service Decision Gate](docs/ACTION_SERVICE_DECISION_GATE.md) for request examples.

## CI/CD Status

- [Test Action Service](https://github.com/donjonson-hash/kristina_agent_center/actions/workflows/test-action-service.yml)
- [Lint Python](https://github.com/donjonson-hash/kristina_agent_center/actions/workflows/lint-python.yml)
- [Validate Ontology](https://github.com/donjonson-hash/kristina_agent_center/actions/workflows/validate-ontology.yml)

## 🏗️ Architecture

- Action Service - Palantir-style gateway (FastAPI)
- Frontend - React/TypeScript dashboard
- Ontology - YAML-based entity definitions
- Audit log - immutable in-memory action logging for the current MVP stage
- OpenClaw - browser automation integration

## 📝 License

MIT
