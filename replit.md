# Nexios AI

## Overview

Nexios AI is a Next.js 15 enterprise AI platform featuring a dark glass design system, user authentication, an AI chat assistant, and a full AI-powered coding workspace (IDE) with Monaco editor, TipTap rich-text document editor (Word-like), a custom Tiptap-powered vector design canvas (CorelDRAW-like), AI code agent with project-type specialisation, sandboxed terminal, GitHub/Figma import, and API search.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Tech Stack

- **Framework**: Next.js 15.5.13 (App Router)
- **Styling**: Tailwind CSS v4 + CSS custom properties (dark glass design system)
- **Database**: MongoDB (via Mongoose)
- **Auth**: JWT tokens (jsonwebtoken + jose), bcryptjs
- **Icons**: React Icons (hi/bs)
- **Code Editor**: @monaco-editor/react (Monaco / VS Code editor)
- **Document Editor**: Tiptap (ProseMirror) — rich text, Word-like
- **Design Editor**: Tiptap (ProseMirror) + custom SVG canvas — CorelDRAW-like vector design
- **Language**: TypeScript

### Design System

Dark glass theme defined in `app/globals.css`:
- `--bg-primary: #080c14` — page background
- `--accent: #818cf8` — indigo accent, glows/buttons
- `--glass-border` — semi-transparent borders
- `.glass` — glass card utility (backdrop-blur, semi-transparent bg)
- `.btn-primary`, `.btn-ghost` — button utilities
- `.input-base` — dark input with focus glow
- Icons always placed on the **RIGHT** side of input fields
- Animations: fadeIn, slideUp, scaleIn, glow, float

### Project Structure

```
app/
  api/
    login/route.ts             — POST /api/login
    register/route.ts          — POST /api/register
    workspace/[id]/
      files/route.ts           — CRUD file operations
      init/route.ts            — Initialize workspace directory
      run/route.ts             — Smart project runner (Node/Python/HTML/Go)
      terminal/route.ts        — Shell command execution
  components/
    Header.tsx                 — Public nav header
    MenuDropdown.tsx           — Navigation dropdown
    SubdomainHandler.tsx       — Subdomain detection
    LoadingSpinner.tsx         — Loading spinner
    ShareableLink.tsx          — Copy auth link
  dashboard/
    layout.tsx                 — Protected layout (auth check, dark bg)
    page.tsx                   — Dashboard overview with stats & activity
    components/
      DashboardHeader.tsx      — Fixed top bar with search & user
      DashboardSidebar.tsx     — Dark glass sidebar with Projects link
      UserDropdown.tsx         — User profile dropdown
    projects/
      page.tsx                 — Projects list (localStorage, GitHub/Figma import)
      [id]/
        page.tsx               — Workspace switcher (code/design/document)
        CodeWorkspace.tsx      — Full AI IDE (Monaco + AI agent + terminal)
        DesignEditor.tsx       — Vector design canvas (Tiptap + SVG canvas)
        DocumentEditor.tsx     — Rich text editor (Tiptap)
  lib/
    ai.ts                      — Multi-provider AI abstraction
    mongodb.ts                 — Mongoose connection helper
    tokenUtils.ts              — JWT utilities
  models/
    user.ts                    — Mongoose User schema
  types/
    user.ts                    — AppUser interface
  login/page.tsx               — Dark glass login
  register/page.tsx            — Dark glass register
  page.tsx                     — Landing page
  layout.tsx                   — Root layout
  globals.css                  — Dark glass design system + Tailwind v4
scripts/
  setup-env.sh                 — Runtime environment setup (Node/Python/Nix)
shell.nix                      — Nix development environment definition
```

### Editor Architecture

Both the **Document Editor** and **Design Editor** share the same core editing infrastructure:
- Both use `useEditor` from `@tiptap/react`
- Both use `@tiptap/starter-kit` as the base engine (ProseMirror underneath)
- Both use Tiptap's extension system for additional capabilities
- **DocumentEditor**: text extensions (Underline, TextAlign, Highlight, Color, FontFamily, Image, Link, Placeholder)
- **DesignEditor**: `DesignCanvasExtension` (custom extension for shape storage/undo-redo) + SVG canvas rendering

The difference is in the tools exposed and the rendering layer — not the editing engine itself.

### Docker-Inspired Sandbox System (`lib/sandbox/`)

The execution system is architected like Docker but runs on the available Nix runtimes:

**Files:**
- `lib/sandbox/types.ts` — TypeScript interfaces (ExecutionPlan, ContainerInstance, SandboxEvent, ExecResult)
- `lib/sandbox/RuntimeRegistry.ts` — Auto-discovers binary paths (node, npm, python3, pip3, go, bash) via `which`
- `lib/sandbox/SmartRunner.ts` — Project type detection → ExecutionPlan (image, setupCommands, runCommand)
- `lib/sandbox/SandboxManager.ts` — Process-based "container" management with SSE streaming, timeouts, cleanup
- `lib/sandbox/dockerfiles/nodejs.Dockerfile` — Node.js 20 image definition
- `lib/sandbox/dockerfiles/python.Dockerfile` — Python 3.11 image definition
- `lib/sandbox/dockerfiles/static.Dockerfile` — Static web server image definition

**Container Images (virtual):**

| Image | Runtime | Description |
|-------|---------|-------------|
| `nexios/nodejs:20` | Node.js v20.20.0 | Node.js, npm 10, full npm ecosystem |
| `nexios/python:3.11` | Python 3.11.13 | Python 3.11, pip 25, venv isolation |
| `nexios/go:1.24` | Go 1.24 | Go compiler and tools |
| `nexios/static:serve` | Browser | Static HTML — no execution, iframe preview |
| `nexios/shell:bash` | Bash | Generic shell commands |

**Container Lifecycle:**
1. SmartRunner analyzes project files → produces ExecutionPlan
2. SandboxManager "pulls" the appropriate image (log message)
3. SandboxManager "mounts" workspace directory as `/workspace` volume
4. Setup commands run (`npm install`, `python3 -m venv .venv`, `pip install`)
5. Main command spawns with SSE streaming of stdout/stderr
6. Container auto-stops on exit or timeout
7. Container ID tracked in in-memory registry

**Python Dependency Management:**
When `requirements.txt` is detected, the sandbox creates a `.venv` virtual environment inside the workspace and installs packages with `pip`. The venv is reused on subsequent runs. This avoids the Nix immutable store restriction.

**Real-time Streaming:**
The `/api/workspace/[id]/run` POST endpoint returns `text/event-stream` (SSE) instead of JSON. Each event is a JSON object with `type`, `text`, and `timestamp`:
- `info` — Container lifecycle messages
- `setup` — Setup command output
- `stdout` — Process standard output
- `stderr` — Process standard error
- `exit` — Container exit with code

The frontend reads the stream via `fetch()` + `ReadableStream.getReader()` and appends each event to the terminal in real time.

### Smart Run System (`/api/workspace/[id]/run`)

The run API intelligently detects project type and runs it correctly:

| Detection | Entry Point | Action |
|-----------|-------------|--------|
| `package.json` present | `npm start` / `npm run dev` / `node <main>` | Runs Node.js |
| `main.py`, `app.py`, or `*.py` | `python3 <file>` | Runs Python |
| `index.html` or `*.html` selected | — | Returns `browser-preview` response |
| `go.mod` present | `go run .` | Runs Go |
| `*.sh` file | `bash <file>` | Runs Shell |

HTML files **never** execute as shell scripts. The CodeWorkspace renders HTML in an `<iframe>` with a browser-style preview UI when `type: 'browser-preview'` is returned.

### NixOS Environment

- `shell.nix` — Nix shell definition with Node.js 20, Python 3.11, Go, and tools
- `scripts/setup-env.sh` — Bootstrap script that verifies/installs Node.js and Python via Nix
- Runtime PATH includes `/nix/var/nix/profiles/default/bin` for Nix-installed tools

### Design Canvas Features

Vector design environment similar to CorelDRAW, built on Tiptap:
- **Tools**: Select, Node Edit, Rectangle, Ellipse, Star, Polygon, Line, Arrow, Text, Freehand
- **SVG Canvas**: Interactive SVG rendering with pointer-based drawing and drag-to-move
- **Right Panel**: AI assistant, Layers (visibility/lock/delete), Color palette + gradients
- **Object Properties**: X/Y/W/H coordinates, opacity slider, alignment tools
- **Export**: SVG and PNG export
- **Persistence**: Auto-saved to localStorage, synced to Tiptap storage
- **Undo/Redo**: Via Tiptap editor commands

### Document AI Behavior

The document AI auto-inserts content directly into the editor:
- No confirmation step required
- When AI generates text with `---INSERT---` blocks, content is immediately written into the document
- Chat shows `✓ Inserted N words into your document.`

### Run Button UI

A single clean circular play button (`⏵`) in the CodeWorkspace top bar:
- Green circle with play triangle icon
- Spinning indicator while running
- Tooltip explains auto-detection behavior

### Project Workspace Features

**Code Workspace (`CodeWorkspace.tsx`):**
- Left sidebar: File tree, collapsible, create/delete/rename files
- Center: Monaco editor + terminal panel (200px)
- Right panel: Chat / Activity / Terminal tabs
- Top bar: Project name, play button, AI status, export, model selector
- Browser preview: HTML files open in an iframe overlay instead of executing

**Design Workspace (`DesignEditor.tsx`):**
- Top: Toolbar with all shape tools + fill/stroke color pickers
- Center: SVG canvas with grid, drawing, and drag-to-move
- Right panel: AI assistant / Layers / Colors tabs
- Status bar: Tool, object count, layer count, selected object info

**Document Workspace (`DocumentEditor.tsx`):**
- Full Word-like ribbon toolbar
- White page canvas with zoom
- Right: AI writing assistant (auto-inserts generated content)

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGODB_URI` | MongoDB connection string | Yes (auth endpoints) |
| `JWT_SECRET` | JWT signing secret | Yes (auto-generated) |

### Running the App

- **Dev server**: `npm run dev` (port 5000)
- **Workflow**: "Start application"

### GitHub Repository

- URL: `https://github.com/Volttaik/Nexios`
- Note: Git push requires the Replit project task system or manual CLI push
