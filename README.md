# 🧠 Secure Multi-Agent AI Platform

A production-ready full-stack web app where users log in via **Auth0**, connect **Gmail / GitHub / Google Calendar** via OAuth, and control them through a beautiful **AI chat interface** powered by **Groq + Gemini**.

---

## 📸 Features

| Feature | Details |
|---|---|
| **Auth** | Auth0 (email/password, Google SSO, Phone OTP) |
| **Services** | Gmail, GitHub, Google Calendar via OAuth |
| **AI Agents** | Email Agent, Coding Agent, Scheduling Agent |
| **Orchestrator** | LLM-driven intent routing (multi-agent support) |
| **LLM** | Groq (primary) → Gemini (fallback) |
| **UI** | React + Vite + Tailwind + Three.js neural network background |
| **Admin** | `/home/admin` — users, logs, stats |
| **DB** | MongoDB (no tokens stored) |

---

## 🗂️ Project Structure

```
auth-hackathon/
├── backend/
│   ├── agents/
│   │   ├── emailAgent.js        # Gmail: read, send, summarize
│   │   ├── codingAgent.js       # GitHub: repos, issues
│   │   └── schedulingAgent.js   # Calendar: list, create events
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── chatController.js
│   │   ├── servicesController.js
│   │   └── adminController.js
│   ├── middleware/
│   │   ├── auth.js              # Auth0 JWT verification
│   │   └── adminAuth.js         # Admin Basic Auth
│   ├── models/
│   │   ├── User.js
│   │   ├── Chat.js
│   │   └── Log.js
│   ├── orchestrator/
│   │   └── orchestrator.js      # Intent routing + multi-agent dispatch
│   ├── routes/
│   │   ├── auth.js
│   │   ├── services.js
│   │   ├── chat.js
│   │   └── admin.js
│   ├── services/
│   │   ├── llmService.js        # Groq → Gemini fallback
│   │   └── intermediary.js      # Auth0 Token Vault fetching
│   ├── server.js
│   ├── .env.example
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── ThreeBackground.jsx  # Neural network animation
    │   │   ├── Navbar.jsx
    │   │   └── TypingIndicator.jsx
    │   ├── pages/
    │   │   ├── Login.jsx            # Auth0 login buttons
    │   │   ├── ServiceSelection.jsx # Connect Gmail/GitHub/Calendar
    │   │   ├── Dashboard.jsx        # Service status + chat CTA
    │   │   ├── Chat.jsx             # Full AI chat UI
    │   │   └── Admin.jsx            # Admin panel
    │   ├── services/
    │   │   └── api.js               # All API calls
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    ├── .env.example
    └── package.json
```

---

## ⚙️ Setup Guide

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- An Auth0 tenant

---

### 1. Auth0 Setup

1. Create an account at [auth0.com](https://auth0.com)
2. Create a new **Single Page Application (SPA)** — this is your frontend app
3. In Application Settings, set:
   - **Allowed Callback URLs**: `http://localhost:5173`
   - **Allowed Logout URLs**: `http://localhost:5173`
   - **Allowed Web Origins**: `http://localhost:5173`
4. Create a new **API** under Auth0 Dashboard → APIs:
   - **Name**: Secure AI Platform API
   - **Identifier (Audience)**: `https://api.secure-ai-platform.com`
5. Create a **Machine to Machine (M2M) Application** for the backend Management API:
   - Authorize it for the **Auth0 Management API**
   - Grant scopes: `read:users`, `read:user_idp_tokens`
6. Enable **Social Connections** under Authentication → Social:
   - Google (for Gmail + Calendar)
   - GitHub

---

### 2. Backend Setup

```bash
cd backend
cp .env.example .env
# Fill in all values in .env
npm install
npm run dev
```

**`.env` values you need:**
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/secure_ai_platform

AUTH0_DOMAIN=your-tenant.us.auth0.com
AUTH0_AUDIENCE=https://api.secure-ai-platform.com
AUTH0_CLIENT_ID=your_spa_client_id
AUTH0_CLIENT_SECRET=your_spa_client_secret
AUTH0_MGMT_CLIENT_ID=your_m2m_client_id
AUTH0_MGMT_CLIENT_SECRET=your_m2m_client_secret

GROQ_API_KEY=your_groq_key        # Get free at console.groq.com
GEMINI_API_KEY=your_gemini_key    # Get at aistudio.google.com

ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=YourStrongPassword!

FRONTEND_URL=http://localhost:5173
```

---

### 3. Frontend Setup

```bash
cd frontend
cp .env.example .env
# Fill in Auth0 values
npm install
npm run dev
```

**`.env` values:**
```env
VITE_AUTH0_DOMAIN=your-tenant.us.auth0.com
VITE_AUTH0_CLIENT_ID=your_spa_client_id
VITE_AUTH0_AUDIENCE=https://api.secure-ai-platform.com
VITE_API_URL=http://localhost:5000
```

---

### 4. Open the App

- Frontend: [http://localhost:5173](http://localhost:5173)
- Backend: [http://localhost:5000](http://localhost:5000)
- Admin Panel: [http://localhost:5173/home/admin](http://localhost:5173/home/admin)

---

## 🔄 System Flow

```
User types: "Send email to john@example.com and schedule a meeting for tomorrow"

1. POST /api/chat/message (with Auth0 JWT)
2. Orchestrator calls LLM to classify intent → ["email", "calendar"]
3. Email Agent + Scheduling Agent run in parallel
4. Intermediary fetches tokens from Auth0 Management API
5. Gmail API sends email
6. Calendar API creates event
7. LLM generates a friendly unified response
8. Response sent back to frontend
```

---

## 🔐 Security Design

| Concern | Solution |
|---|---|
| Auth | Auth0 JWT validated on every protected route |
| OAuth Tokens | Never stored in DB — fetched live from Auth0 per request |
| Admin access | Basic Auth from `.env` variables only |
| Secrets | All in `.env`, never hardcoded |
| Rate limiting | 200 req/15min per IP via `express-rate-limit` |
| CORS | Only allows the configured `FRONTEND_URL` |

---

## 💬 Example Chat Prompts

| Prompt | Agents Used |
|---|---|
| "Summarize my inbox" | Email |
| "Create issue 'Fix login bug' in my repo" | GitHub |
| "Schedule a meeting tomorrow at 2pm with alice@email.com" | Calendar |
| "Send an email to bob saying hi, then list my repos" | Email + GitHub |
| "What events do I have this week?" | Calendar |

---

## 🛠 Tech Stack

**Backend**: Node.js, Express, MongoDB/Mongoose, Auth0 (JWT), Groq SDK, Google Generative AI, Google APIs, Octokit  
**Frontend**: React 18, Vite, Tailwind CSS 3, Three.js, Auth0 React SDK, Axios, React Router v6
