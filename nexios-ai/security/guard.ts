import type { SecurityContext } from '../types/index';

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
];

export class SecurityGuard {
  private static auditLog: Array<{ timestamp: number; context: SecurityContext }> = [];

  static canWrite(filePath: string, requestedBy: string): SecurityContext {
    const isProtected = PROTECTED_PATHS.some(p => filePath.includes(p));
    const isAllowed = ALLOWED_WRITE_PATHS.some(p => filePath.includes(p));

    const ctx: SecurityContext = {
      action: 'write',
      targetFile: filePath,
      requestedBy,
      approved: !isProtected && isAllowed,
    };

    this.auditLog.push({ timestamp: Date.now(), context: ctx });

    if (isProtected) {
      console.warn(`[SecurityGuard] BLOCKED write to protected path: ${filePath} by ${requestedBy}`);
    }

    return ctx;
  }

  static canModifyKnowledge(requestedBy: string): boolean {
    const allowed = ['ultra-mode', 'trainer', 'engine', 'crawler'].includes(requestedBy);
    if (!allowed) {
      console.warn(`[SecurityGuard] BLOCKED knowledge modification by: ${requestedBy}`);
    }
    return allowed;
  }

  static canModifyCore(_requestedBy: string): boolean {
    console.warn(`[SecurityGuard] Core modification is ALWAYS blocked — requires developer action.`);
    return false;
  }

  static getAuditLog() {
    return [...this.auditLog];
  }
}
