# Nexios AI

## Overview

Nexios AI is a Next.js 15 full-stack AI-powered development platform that combines a Code IDE (Monaco), Design Canvas (Excalidraw), and Document Editor (TipTap). It features a dark glass design system, JWT authentication, a deployment-trained AI assistant (Nexios AI), project workspaces, a sandbox runner, and GitHub/Figma import.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Tech Stack

- **Framework**: Next.js 15.5.13 (App Router)
- **Styling**: Tailwind CSS v4 + CSS custom properties (dual light/dark design system)
- **Database**: MongoDB (via Mongoose)
- **Auth**: JWT tokens (jsonwebtoken + jose), bcryptjs
- **Icons**: React Icons (hi/bs)
- **Code Editor**: @monaco-editor/react (Monaco / VS Code editor)
- **Document Editor**: Tiptap (ProseMirror) — rich text, Word-like
- **Design Editor**: Excalidraw — infinite vector canvas
- **AI Training**: @tensorflow/tfjs-node + natural (deployment-time only)
- **Language**: TypeScript

### Design System

Dual light/dark theme defined in `app/globals.css`:

**Dark mode (default for landing/AI pages):**
- `--bg-primary: #080c14`
- `--accent: #818cf8`

**Light mode (toggled via ThemeContext):**
- `--bg-primary: #f0f2f8`
- `--text-primary: #0f1629`
- `--accent: #5a5fcf`

**Utilities:** `.glass`, `.btn-primary`, `.btn-ghost`, `.input-base`, `.hover-lift`, `.card-glow`
**Animations:** `fadeIn`, `slideUp`, `scaleIn`, `pageIn`, `msgIn`, `orbFloat`, `glow`, `float`, `blink`, `shimmer`

### Project Structure

```
app/
  api/
    login/route.ts               — POST /api/login
    register/route.ts            — POST /api/register
    nexios-ai/
      chat/route.ts              — POST /api/nexios-ai/chat (inference only, always ready)
      status/route.ts            — GET /api/nexios-ai/status (model metrics)
    workspace/[id]/
      files/route.ts             — CRUD file operations
      init/route.ts              — Initialize workspace directory
      run/route.ts               — Smart project runner (Node/Python/HTML/Go)
      terminal/route.ts          — Shell command execution
  components/
    Header.tsx                   — Public nav header
    MenuDropdown.tsx             — Navigation dropdown
    SubdomainHandler.tsx         — Subdomain detection
    LoadingSpinner.tsx           — Loading spinner
    ShareableLink.tsx            — Copy auth link
  context/
    ThemeContext.tsx             — Light/dark mode toggle
  dashboard/
    layout.tsx                   — Protected layout (auth check)
    page.tsx                     — Dashboard overview with stats & activity
    components/
      DashboardHeader.tsx        — Fixed top bar with search, theme toggle, AI status
      DashboardSidebar.tsx       — Sidebar with navigation links
      UserDropdown.tsx           — User profile dropdown
    projects/
      page.tsx                   — Projects list (localStorage, GitHub/Figma import)
      [id]/
        page.tsx                 — Workspace switcher (code/design/document)
        CodeWorkspace.tsx        — Full AI IDE (Monaco + AI agent + terminal)
        DesignEditor.tsx         — Excalidraw vector design canvas
        DocumentEditor.tsx       — Rich text editor (Tiptap)
    nexios-ai/
      page.tsx                   — AI dashboard: always-active chat, model metrics, pipeline diagram
  lib/
    ai.ts                        — Multi-provider AI abstraction (Gemini)
    mongodb.ts                   — Mongoose connection helper
    tokenUtils.ts                — JWT utilities
  models/
    user.ts                      — Mongoose User schema
  types/
    user.ts                      — AppUser interface
  login/page.tsx                 — Login page
  register/page.tsx              — Register page
  page.tsx                       — Landing page (animated hero, scroll animations)
  layout.tsx                     — Root layout
  globals.css                    — Dual-mode design system + animations + Tailwind v4
nexios-ai/
  inference/
    engine.ts                    — NexiosInferenceEngine singleton (always ready)
    knowledge-base.ts            — Cosine-similarity knowledge retrieval
    response-generator.ts        — Response construction + model info
  training/
    datasets.mjs                 — Curated Q&A datasets (5 curriculum areas)
    validator.mjs                — Post-training benchmark validation
  types/
    index.ts                     — Shared TypeScript types
scripts/
  train.mjs                      — Full TF.js deployment-time training pipeline
  setup-env.sh                   — Runtime environment setup
shell.nix                        — Nix development environment
```

### Nexios AI Architecture

The Nexios AI system uses a **deployment-time training** model. Training happens ONCE during `npm run build`, not at runtime.

#### Training Pipeline (`scripts/train.mjs`)

Runs via `node scripts/train.mjs && next build`:

1. **Load Datasets** — Curated Q&A pairs from `nexios-ai/training/datasets.mjs`
2. **Process & Tokenise** — Text normalisation and tokenisation via `natural`
3. **Train Model** — TensorFlow.js training with multiple passes
4. **Validate** — Benchmark tests across all curriculum categories (blocks deploy if pass rate < 50%)
5. **Export** — Model weights saved to `nexios-ai/trained-model/`

#### Inference Engine (`nexios-ai/inference/engine.ts`)

- Singleton `NexiosInferenceEngine` — initialised once on first request
- Uses cosine similarity against embedded training data
- Always operational — no lifecycle manager, no "Start AI" required
- Returns: `content`, `category`, `confidence`, `processingMs`, `modelVersion`

#### Curriculum Categories

| Category | Topics |
|----------|--------|
| `general` | Greetings, platform info, general chat |
| `programming` | JS, TS, React, Node, Git, algorithms |
| `design` | UI/UX, typography, color theory, design systems |
| `mathematics` | Calculus, probability, matrices, number theory |
| `science` | Physics, biology, chemistry, earth science |

#### Chat API (`/api/nexios-ai/chat`)

- `POST` — Always available, no lifecycle check needed
- Body: `{ message: string }`
- Response: `{ content, category, confidence, processingMs, modelVersion, status: "operational" }`

#### Status API (`/api/nexios-ai/status`)

- `GET` — Returns model version, build date, architecture, performance metrics
- Response: `{ status, model: { version, buildDate, architecture, trainingPhases }, performance: { requestCount, avgResponseMs, uptimeMs, knowledgeEntries }, ready }`

### Nexios AI Dashboard (`app/dashboard/nexios-ai/page.tsx`)

Completely redesigned — no Start AI / Stop AI / Learning Toggle buttons:

- **Metrics row**: Model version, avg response time, knowledge entries, request count
- **Training phases strip**: All 5 curriculum phases shown as validated badges
- **Always-active chat**: Chat panel works immediately — no activation required
- **Model info card**: Version, architecture, build date, validation status
- **Capabilities card**: 5 domain icons with descriptions
- **Pipeline diagram**: Build-time training stages (Load → Process → Train → Validate → Deploy)

### Landing Page (`app/page.tsx`)

Enhanced with animations:
- Floating gradient orb background (animated)
- Scroll-triggered section reveals (`AnimatedSection` component)
- Staggered hero element animations (badge → h1 → subtitle → CTAs → stats)
- Hover lift + glow effects on feature cards
- Mode selector tabs with active glow
- CTA star icon with float animation

### Editor Architecture

**Document Editor**: Tiptap with Underline, TextAlign, Highlight, Color, FontFamily, Image, Link, Placeholder extensions — Word-like ribbon toolbar, white page canvas.

**Design Editor**: Excalidraw — infinite vector canvas, all drawing tools, layers, AI design assistant sidebar.

**Code Editor**: Monaco with file tree, terminal panel, AI agent, GitHub import, ZIP export, run/preview button.

### Docker-Inspired Sandbox System

| Image | Runtime | Description |
|-------|---------|-------------|
| `nexios/nodejs:20` | Node.js v20 | Node.js, npm, full ecosystem |
| `nexios/python:3.11` | Python 3.11 | Python, pip, venv isolation |
| `nexios/go:1.24` | Go 1.24 | Go compiler and tools |
| `nexios/static:serve` | Browser | HTML iframe preview |
| `nexios/shell:bash` | Bash | Generic shell commands |

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGODB_URI` | MongoDB connection string | Yes (auth) |
| `JWT_SECRET` | JWT signing secret | Yes (auto-generated) |

### Running the App

- **Dev server**: `npm run dev` (port 5000)
- **Build + train**: `npm run build` (runs training pipeline then Next.js build)
- **Training only**: `npm run train`
- **Workflow**: "Start application"
