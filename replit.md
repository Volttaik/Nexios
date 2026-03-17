# Nexios AI

## Overview

Nexios AI is a Next.js 15 enterprise AI platform with MongoDB/JWT authentication, a multi-provider AI chat interface, VS Code-like code sandbox, and a full dashboard. Features Glass UI / Soft UI / Flat UI customization, background patterns, dark/light mode, and AI support for Gemini, Groq (free), OpenAI, Anthropic, and Mistral.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS v4 + custom CSS variables (glass/soft/flat UI)
- **Database**: MongoDB (via Mongoose)
- **Auth**: JWT tokens (jsonwebtoken + jose), bcryptjs for password hashing
- **AI**: Multi-provider: Google Gemini (`@google/genai`), Groq (OpenAI-compat), OpenAI, Anthropic, Mistral
- **Icons**: Inline SVGs throughout (no react-icons in dashboard/chat)
- **Language**: TypeScript

### Key Features (Post-Overhaul)

1. **Multi-provider AI**: Gemini, Groq (FREE — Llama 3.3, Mixtral, Gemma), OpenAI, Anthropic, Mistral
2. **Glass UI / Soft UI / Flat UI**: Toggle via Settings → Appearance
3. **Background Patterns**: None, Dots, Grid, Lines, Noise, Circuit
4. **Redesigned Sidebar**: Always-dark (#07070a), collapsible, mobile-friendly with scroll lock
5. **Chat Bubbles**: Gradient user bubbles (accent → accent2), card AI bubbles with rounded corners
6. **AI Image Support**: Upload images to vision-capable models (Gemini, GPT-4o, Claude, Llama Vision)
7. **Groq Free Fallback**: Automatically suggested when quota exceeded for paid providers
8. **Login/Register**: Split-panel design, dark decorative left pane, clean form right pane
9. **Projects**: Import files/JSON, search, VS Code-like sandbox
10. **Mobile responsive**: Scroll lock on menu open, X button to close, menu button hides when sidebar open

### Project Structure

```
app/
  layout.tsx               — Root layout with inline theme script (no flash)
  globals.css              — Full design system: tokens, glass/soft/flat, patterns, animations
  context/
    ThemeContext.tsx        — theme (dark/light), uiStyle (flat/glass/soft), bgPattern
    AIContext.tsx           — Multi-provider config: Gemini, Groq, OpenAI, Anthropic, Mistral
  lib/
    ai.ts                  — callAI() dispatcher for all 5 providers, quota error messages
    mongodb.ts             — Mongoose connection helper
    tokenUtils.ts          — JWT verify + URL token utilities
  api/
    login/route.ts         — POST /api/login
    register/route.ts      — POST /api/register
    upload/route.ts        — POST /api/upload
  components/
    Header.tsx             — Top navigation bar (public pages)
  dashboard/
    layout.tsx             — Protected dashboard layout (body scroll lock, sidebar integration)
    page.tsx               — Dashboard overview
    chat/page.tsx          — AI chat (full-screen, fixed overlay, gradient bubbles)
    analytics/page.tsx     — Usage analytics
    documents/page.tsx     — Chat history as documents
    settings/page.tsx      — Settings: API keys, UI style, bg patterns, danger zone
    projects/page.tsx      — Projects grid: create, import (file/JSON), search, VS Code sandbox
    components/
      DashboardSidebar.tsx — Full sidebar: nav, AI model picker, projects, chats, user menu
  login/page.tsx           — Split-panel login: dark features left, clean form right
  register/page.tsx        — Split-panel register with all fields
  models/
    user.ts                — Mongoose User schema
```

### CSS Variable System

```
:root (light):  --bg, --bg2, --bg3, --border, --text, --text2, --text3, --accent, --accent2
.dark:          same tokens with dark values
.ui-glass:      frosted glass overrides (backdrop-filter blur)
.ui-soft:       neumorphic shadow overrides
.pattern-*:     background-image patterns (dots, grid, lines, noise, circuit)
```

### AI Providers

| Provider  | ID         | Free?  | Models                              |
|-----------|------------|--------|-------------------------------------|
| Gemini    | gemini     | Partial| 2.0 Flash, 1.5 Flash, 1.5 Pro       |
| Groq      | groq       | YES    | Llama 3.3 70B, Llama 3.1 8B, Mixtral, Gemma2, Llama Vision |
| OpenAI    | openai     | No     | GPT-4o, GPT-4o Mini, GPT-4 Turbo, GPT-3.5 |
| Anthropic | anthropic  | No     | Claude 3.5 Sonnet, 3.5 Haiku, 3 Haiku |
| Mistral   | mistral    | No     | Mistral Large, Small, Codestral    |

### Chat Bubble Design

- **User**: `linear-gradient(135deg, var(--accent), var(--accent2))` with `border-radius: 20px 20px 4px 20px`
- **AI**: `var(--bg2)` + border with `border-radius: 4px 20px 20px 20px`

### Mobile Sidebar

- Toggle button visible when closed, hidden when open
- X button appears inside the sidebar panel to close
- Body scroll locked via `document.body.classList.add('menu-open')` → `overflow: hidden`
- Mobile overlay dims background with blur

## Running the App

```bash
npm run dev
```

Runs on port 5000. JWT secret and MongoDB URI set in `.env` or Replit Secrets.
