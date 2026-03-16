# Nexios AI

## Overview

Nexios AI is a Next.js 15 enterprise AI platform with MongoDB/JWT authentication, a Gemini-powered chat interface, and a full dashboard. Built with glass-morphism UI, dark sidebar, model selection, and profile picture support.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS v4
- **Database**: MongoDB (via Mongoose)
- **Auth**: JWT tokens (jsonwebtoken + jose), bcryptjs for password hashing
- **AI**: Google Gemini API (`@google/genai`) — models: `gemini-2.0-flash`, `gemini-1.5-flash`, `gemini-1.5-pro`
- **Icons**: React Icons (hi/bs) + inline SVGs (sidebar/chat use pure SVG)
- **Language**: TypeScript

### Project Structure

```
app/
  api/
    login/route.ts         — POST /api/login
    register/route.ts      — POST /api/register
    upload/route.ts        — POST /api/upload (image uploads)
  components/
    Header.tsx             — Top navigation bar (public pages)
    MenuDropdown.tsx       — Navigation dropdown menu
  dashboard/
    layout.tsx             — Protected dashboard layout (auth check + sidebar offset)
    page.tsx               — Dashboard overview
    chat/page.tsx          — AI chat (full-screen, fixed overlay, bypasses layout sidebar)
    analytics/page.tsx     — Usage analytics (sessions, messages, tokens, model usage)
    documents/page.tsx     — Chat history as documents (searchable, filterable)
    settings/page.tsx      — Settings (model, profile pic, preferences, danger zone)
    profile/page.tsx       — User profile (account details + usage stats)
    components/
      DashboardHeader.tsx  — Dashboard top bar (header for non-chat pages)
      DashboardSidebar.tsx — Dark charcoal sidebar; exports AI_MODELS and ChatSession type
      UserDropdown.tsx     — User profile dropdown
  lib/
    mongodb.ts             — Mongoose connection helper (cached)
    tokenUtils.ts          — JWT verify + URL token utilities
  models/
    user.ts                — Mongoose User schema
  types/
    user.ts                — AppUser interface (_id, id, fullName, username, email, etc.)
  login/page.tsx           — Login page (normalizes id → _id on save)
  register/page.tsx        — Register page (normalizes id → _id on save)
  page.tsx                 — Landing/home page (auto-redirects logged-in users to /dashboard/chat)
  layout.tsx               — Root layout
  globals.css              — Global styles + Tailwind
```

### Key Design Decisions

- **Chat page** uses `fixed inset-0 z-50` to cover the full screen (bypasses dashboard layout)
- **Sidebar** is dark charcoal `#111113` with glass-morphism dropdowns
- **AI_MODELS** is exported from `DashboardSidebar.tsx` and shared by chat + settings pages
- **Profile picture** stored as base64 in `localStorage.profilePicture`; also inside `localStorage.user.profilePicture`
- **Selected model** persisted in `localStorage.selectedModel`
- **Chat sessions** persisted in `localStorage.chatSessions`

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGODB_URI` | MongoDB connection string | Yes (for auth API) |
| `JWT_SECRET` | Secret for signing JWT tokens | Yes (auto-generated) |
| `NEXT_PUBLIC_GEMINI_API_KEY` | Gemini API key for AI chat | Yes (for AI features) |

### Authentication Flow

1. User registers at `/register` → POST `/api/register` → stores hashed password in MongoDB → returns JWT + user (with `id`)
2. User logs in at `/login` → POST `/api/login` → verifies password → returns JWT + user
3. Frontend normalizes `user.id` → `user._id` before storing in localStorage
4. JWT stored in `localStorage.token` and as a cookie `auth_token`
5. Dashboard layout checks `localStorage` for token; redirects to `/login` if absent

### Gemini API Usage

```ts
const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });
const response = await ai.models.generateContent({
  model: 'gemini-2.0-flash',  // or gemini-1.5-flash / gemini-1.5-pro
  contents: [{ role: 'user', parts: [{ text: prompt }, ...imageInlineData] }],
});
const text = response.text;
```

### Running the App

- **Dev server**: `npm run dev` (runs on port 5000, bound to 0.0.0.0 for Replit compatibility)
- **Prod server**: `npm run start` (runs on port 5000, bound to 0.0.0.0)
- **Workflow**: "Start application" — configured to auto-start with `npm run dev`

### Known Notes

- The app's UI works without MongoDB; auth endpoints fail gracefully with a clear error if `MONGODB_URI` is not set
- `JWT_SECRET` is auto-generated and stored as an env var on first setup
- Gemini chat requires `NEXT_PUBLIC_GEMINI_API_KEY` — without it, AI responses show a configuration message
