#!/usr/bin/env bash
# Nexios AI — Runtime environment setup
# Ensures Node.js and Python are available, installing via Nix if needed.

set -euo pipefail

echo "==> Nexios AI environment setup"

# Helper: check if a command exists
has() { command -v "$1" &>/dev/null; }

# ── Node.js ────────────────────────────────────────────────────────────────
if has node; then
  echo "[✓] Node.js $(node --version) found"
else
  echo "[!] Node.js not found — installing via Nix..."
  if has nix-env; then
    nix-env -iA nixpkgs.nodejs_20
    echo "[✓] Node.js installed: $(node --version)"
  else
    echo "[✗] Nix not available. Install Node.js manually: https://nodejs.org"
    exit 1
  fi
fi

# ── npm ────────────────────────────────────────────────────────────────────
if has npm; then
  echo "[✓] npm $(npm --version) found"
else
  echo "[!] npm not found — it should come with Node.js"
fi

# ── Python ────────────────────────────────────────────────────────────────
PYTHON_BIN=""
if has python3; then
  PYTHON_BIN="python3"
elif has python; then
  PYTHON_BIN="python"
fi

if [ -n "$PYTHON_BIN" ]; then
  echo "[✓] Python $($PYTHON_BIN --version) found"
else
  echo "[!] Python not found — installing via Nix..."
  if has nix-env; then
    nix-env -iA nixpkgs.python311
    echo "[✓] Python installed: $(python3 --version)"
  else
    echo "[✗] Nix not available. Install Python manually: https://python.org"
    exit 1
  fi
fi

# ── Go (optional) ─────────────────────────────────────────────────────────
if has go; then
  echo "[✓] Go $(go version | awk '{print $3}') found"
else
  echo "[~] Go not found (optional — only needed for Go projects)"
fi

# ── Workspace directory ────────────────────────────────────────────────────
WORKSPACE_DIR="/tmp/nexios-workspaces"
mkdir -p "$WORKSPACE_DIR"
echo "[✓] Workspace directory: $WORKSPACE_DIR"

echo ""
echo "==> Environment ready"
