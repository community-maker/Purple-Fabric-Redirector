# EnterpriseGPT Purple Fabric Agent Directory

Minimal React website that fetches agents from a Purple Fabric workspace and opens the selected agent/version in Purple Fabric chat.

## Prerequisites

- Node.js 20+
- npm
- Purple Fabric platform credentials for the target workspace

## 1. Configure The Backend

From the project root:

```bash
cd backend
copy .env.example .env
```

Edit `backend/.env` and provide the Purple Fabric values:

```bash
PURPLE_FABRIC_ENDPOINT=https://api.in.intellectseecstag.com
PURPLE_FABRIC_WEB_BASE_URL=https://in.intellectseecstag.com
PURPLE_FABRIC_API_KEY=magicplatform.xxxxx
PURPLE_FABRIC_USERNAME=your-user
PURPLE_FABRIC_PASSWORD=your-password
PURPLE_FABRIC_WORKSPACE_ID=your-workspace-id
PURPLE_FABRIC_TENANT=idx
PORT=4000
CORS_ORIGIN=http://localhost:5173
```

`PURPLE_FABRIC_ASSET_VERSION_ID` can stay blank because the website fetches the available agents and versions dynamically.

## 2. Install Dependencies

Run this once for the frontend:

```bash
npm install
```

Then run this once for the backend:

```bash
cd backend
npm install
```

## 3. Start The Backend

In one terminal:

```bash
cd backend
npm run dev
```

The backend runs at:

```text
http://localhost:4000
```

## 4. Start The Website

In a second terminal, from the project root:

```bash
npm run dev
```

Open the Vite URL shown in the terminal, usually:

```text
http://localhost:5173
```

## Useful Checks

Build the frontend:

```bash
npm run build
```

Lint the frontend:

```bash
npm run lint
```

Check the backend agent endpoint:

```bash
curl http://localhost:4000/api/v1/agents
```
