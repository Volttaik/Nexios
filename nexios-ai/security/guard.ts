import type { SecurityContext } from '../types/index';
import fs from 'fs';
import path from 'path';
import { DATA_DIR } from '../utils/paths';

const AUDIT_LOG = path.join(DATA_DIR, 'security-audit.log');

const PROTECTED_PATHS = [
  'nexios-ai/core/',
  'nexios-ai/security/',
  'nexios-ai/types/',
  'app/api/',
  'app/context/',
  'package.json',
  'tsconfig.json',
  'next.config',
];

const ALLOWED_WRITE_PATHS = [
  'data/nexios-ai/',
  '/tmp/nexios-ai/',
];

const KNOWLEDGE_MODIFIERS = new Set([
  'ultra-mode',
  'trainer',
  'engine',
  'crawler',
  'coding-agent',
  'self-improving',
  'orchestrator',
]);

export class SecurityGuard {
  private static auditLog: Array<{ timestamp: number; context: SecurityContext }> = [];

  private static writeAuditLog(context: SecurityContext): void {
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      const line = `[${new Date().toISOString()}] ${context.approved ? 'ALLOWED' : 'BLOCKED'} ${context.action} by ${context.requestedBy}${context.targetFile ? ` on ${context.targetFile}` : ''}\n`;
      fs.appendFileSync(AUDIT_LOG, line);
    } catch { /* never let security logging crash the system */ }
  }

  static canWrite(filePath: string, requestedBy: string): SecurityContext {
    const isProtected = PROTECTED_PATHS.some(p => filePath.includes(p));
    const isAllowed   = ALLOWED_WRITE_PATHS.some(p => filePath.includes(p));

    const ctx: SecurityContext = {
      action:      'write',
      targetFile:  filePath,
      requestedBy,
      approved:    !isProtected && isAllowed,
    };

    this.auditLog.push({ timestamp: Date.now(), context: ctx });
    this.writeAuditLog(ctx);

    if (isProtected) {
      console.warn(`[SecurityGuard] BLOCKED write to protected path: ${filePath} by ${requestedBy}`);
    }

    return ctx;
  }

  static canModifyKnowledge(requestedBy: string): boolean {
    const allowed = KNOWLEDGE_MODIFIERS.has(requestedBy);
    if (!allowed) {
      console.warn(`[SecurityGuard] BLOCKED knowledge modification by: ${requestedBy}`);
      this.writeAuditLog({ action: 'modify-knowledge', requestedBy, approved: false });
    }
    return allowed;
  }

  static canModifyCore(_requestedBy: string): boolean {
    console.warn('[SecurityGuard] Core modification is ALWAYS blocked — requires developer action.');
    this.writeAuditLog({ action: 'modify-core', requestedBy: _requestedBy, approved: false });
    return false;
  }

  static getAuditLog() {
    return [...this.auditLog];
  }
}
