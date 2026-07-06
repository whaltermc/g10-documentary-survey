# Minecraft Check-In (Vite + Vercel + Firebase)

A secure, anonymous survey app with admin analytics. Built with Vite, deployed on Vercel, backed by Firebase.

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────┐
│   Vercel    │────▶│  Vite SPA   │────▶│  Firebase Auth  │
│  (Hosting)  │     │  (Frontend) │     │  (Client SDK)   │
└─────────────┘     └─────────────┘     └─────────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  Firestore  │
                    │ (responses) │
                    └─────────────┘
                           ▲
                    ┌─────────────┐
                    │ Vercel API  │
                    │  (Serverless)│
                    │  /api/analytics│
                    └─────────────┘
```

- **Survey page** (`/`) — Anyone can submit anonymously via Firebase Client SDK
- **Analytics page** (`/admin` or `/admin.html`) — Password-protected, fetches data through a **serverless API** that uses Firebase Admin SDK
- **No Firebase secrets are exposed to the browser** — Admin access is handled entirely server-side

## Environment Variables

### 1. Frontend (`.env` — Vite prefixes with `VITE_`)

These are **public** and safe to expose in the built bundle:

| Variable | Source |
|----------|--------|
| `VITE_FIREBASE_API_KEY` | Firebase Console → Project Settings → General → Web API Key |
| `VITE_FIREBASE_AUTH_DOMAIN` | `your-project.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Your project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | `your-project.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | From Firebase config |
| `VITE_FIREBASE_APP_ID` | From Firebase config |
| `VITE_FIREBASE_MEASUREMENT_ID` | From Firebase config (optional) |

### 2. Backend (Vercel Environment Variables)

These are **secret** and only exist server-side:

| Variable | How to get it |
|----------|---------------|
| `FIREBASE_PROJECT_ID` | Same as above |
| `FIREBASE_CLIENT_EMAIL` | Firebase Console → Project Settings → Service Accounts → Generate new private key → JSON file → `client_email` field |
| `FIREBASE_PRIVATE_KEY` | Same JSON file → `private_key` field |
| `ANALYTICS_API_KEY` | **You create this yourself** — any strong random string (e.g., `openssl rand -base64 32`) |

## Firebase Setup

### 1. Create Project
- Go to [Firebase Console](https://console.firebase.google.com)
- Create a new project
- Go to **Build → Firestore Database → Create database**
- Start in **test mode** for development, then lock it down

### 2. Firestore Security Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /responses/{doc} {
      allow create: if true;                 // anyone can submit
      allow read: if false;                  // NO client-side reads — only server-side via Admin SDK
      allow update, delete: if false;
    }
  }
}
```

### 3. Get Service Account Key
- Firebase Console → ⚙️ Project Settings → Service Accounts
- Click **Generate new private key**
- Download the JSON file
- Extract `project_id`, `client_email`, and `private_key`

## Local Development

```bash
# 1. Clone and install
npm install

# 2. Create your .env file
cp .env.example .env
# Fill in all the values

# 3. For local API testing, also set these in your shell:
export FIREBASE_PROJECT_ID="your-project-id"
export FIREBASE_CLIENT_EMAIL="firebase-adminsdk-..."
export FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."
export ANALYTICS_API_KEY="your-secret-password"

# 4. Run dev server
npm run dev

# 5. Open http://localhost:3000 for survey
#    Open http://localhost:3000/admin.html for analytics
```

## Deploy to Vercel

### Option A: CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Link project
vercel

# Set environment variables (one-time setup)
vercel env add FIREBASE_PROJECT_ID
vercel env add FIREBASE_CLIENT_EMAIL
vercel env add FIREBASE_PRIVATE_KEY
vercel env add ANALYTICS_API_KEY

# Also add VITE_ prefixed variables
vercel env add VITE_FIREBASE_API_KEY
vercel env add VITE_FIREBASE_AUTH_DOMAIN
vercel env add VITE_FIREBASE_PROJECT_ID
vercel env add VITE_FIREBASE_STORAGE_BUCKET
vercel env add VITE_FIREBASE_MESSAGING_SENDER_ID
vercel env add VITE_FIREBASE_APP_ID
vercel env add VITE_FIREBASE_MEASUREMENT_ID

# Deploy
vercel --prod
```

### Option B: Vercel Dashboard

1. Push code to GitHub
2. Import repo in [Vercel Dashboard](https://vercel.com)
3. Go to **Settings → Environment Variables**
4. Add all backend variables (`FIREBASE_*`, `ANALYTICS_API_KEY`)
5. Add all `VITE_` prefixed variables
6. Redeploy

## File Structure

```
├── api/
│   └── analytics.js          # Serverless function (Firebase Admin SDK)
├── src/
│   ├── main.js               # Entry point, auto-routes to survey or analytics
│   ├── firebase-config.js    # Client Firebase config (uses env vars)
│   ├── survey.js             # Survey logic
│   ├── analytics.js          # Analytics logic (calls /api/analytics)
│   └── style.css             # All styles
├── index.html                # Survey page (Vite entry point)
├── admin.html                # Analytics page (Vite entry point)
├── .env.example              # Template for env vars
├── .gitignore
├── package.json
├── vercel.json               # Vercel deployment config
└── vite.config.js            # Vite build config (multi-page)
```

## Security Model

| Threat | Mitigation |
|--------|------------|
| Firebase config exposed | It's **designed** to be public — only has `create` permissions |
| Unauthorized analytics access | Password gate + server-side Firebase Admin SDK |
| Private key leaked | Stored only in Vercel env vars, never in repo |
| Firestore breached | Security rules block all client-side reads |
| Admin password brute force | Use a strong `ANALYTICS_API_KEY` (32+ chars) |

## Changing the Admin Password

Simply update the `ANALYTICS_API_KEY` environment variable in Vercel and redeploy. No code changes needed.
