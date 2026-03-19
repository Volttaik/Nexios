import type { ConversationContext } from '../types/index';

const MAX_HISTORY = 20;

class WorkingMemory {
  private sessions = new Map<string, ConversationContext>();

  getOrCreate(sessionId: string): ConversationContext {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, { sessionId, history: [] });
    }
    return this.sessions.get(sessionId)!;
  }

  push(sessionId: string, role: 'user' | 'assistant', content: string) {
    const ctx = this.getOrCreate(sessionId);
    ctx.history.push({ role, content });
    if (ctx.history.length > MAX_HISTORY) {
      ctx.history = ctx.history.slice(-MAX_HISTORY);
    }
  }

  getHistory(sessionId: string) {
    return this.getOrCreate(sessionId).history;
  }

  getContextWindow(sessionId: string, maxTokens = 1500): string {
    const history = this.getHistory(sessionId);
    const lines: string[] = [];
    let chars = 0;
    for (const h of [...history].reverse()) {
      const line = `${h.role === 'user' ? 'User' : 'Nexios'}: ${h.content}`;
      chars += line.length;
      if (chars > maxTokens * 4) break;
      lines.unshift(line);
    }
    return lines.join('\n');
  }

  clear(sessionId: string) {
    this.sessions.delete(sessionId);
  }

  activeSessions(): number {
    return this.sessions.size;
  }
}

let mem: WorkingMemory | null = null;
export function getMemory(): WorkingMemory {
  if (!mem) mem = new WorkingMemory();
  return mem;
}
