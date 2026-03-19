import type { TaskCategory, TaskRequest } from '../types/index';

interface IntentPattern {
  category: TaskCategory;
  keywords: string[];
  weight: number;
}

const INTENT_PATTERNS: IntentPattern[] = [
  {
    category: 'coding',
    weight: 1.5,
    keywords: [
      'code','function','class','variable','debug','error','fix','implement','write','build',
      'javascript','typescript','python','rust','go','java','c++','html','css','react','node',
      'api','endpoint','database','sql','query','algorithm','array','object','loop','async',
      'refactor','optimize','bug','test','lint','compile','import','export','module','library',
      'npm','package','component','hook','state','props','interface','type','generic','template',
      'git','commit','branch','merge','deploy','docker','server','client','fetch','request',
    ],
  },
  {
    category: 'document',
    weight: 1.4,
    keywords: [
      'write','draft','document','paragraph','essay','article','blog','report','proposal',
      'summarize','summary','outline','introduction','conclusion','section','chapter','note',
      'letter','email','content','text','sentence','grammar','spelling','edit','proofread',
      'readme','documentation','changelog','specification','requirement','user story',
      'format','heading','bullet','list','table','citation','reference',
    ],
  },
  {
    category: 'design',
    weight: 1.3,
    keywords: [
      'design','color','palette','font','typography','layout','ui','ux','wireframe','mockup',
      'icon','logo','button','card','navbar','hero','banner','style','theme','dark','light',
      'spacing','padding','margin','grid','flex','responsive','mobile','animation','gradient',
      'shadow','border','radius','accent','primary','secondary','contrast','accessibility',
      'figma','sketch','adobe','vector','svg','canvas','shape','layer',
    ],
  },
  {
    category: 'chat',
    weight: 1.0,
    keywords: [
      'hello','hi','hey','what','how','why','when','who','explain','tell','describe',
      'help','question','understand','mean','difference','compare','example','list',
      'show','give','can you','could you','please','thanks','thank','yes','no','ok',
      'great','good','bad','best','worst','recommend','suggest','opinion','think',
    ],
  },
];

export class TaskRouter {
  classify(input: string): TaskCategory {
    const lower = input.toLowerCase();
    const scores: Record<TaskCategory, number> = {
      coding: 0,
      document: 0,
      design: 0,
      chat: 0,
      search: 0,
      unknown: 0,
    };

    for (const pattern of INTENT_PATTERNS) {
      for (const kw of pattern.keywords) {
        if (lower.includes(kw)) {
          scores[pattern.category] += pattern.weight;
        }
      }
    }

    const top = (Object.entries(scores) as [TaskCategory, number][])
      .filter(([k]) => k !== 'unknown' && k !== 'search')
      .sort((a, b) => b[1] - a[1]);

    if (top[0][1] === 0) return 'chat';
    if (top[0][1] > 0 && top[1] && top[0][1] === top[1][1]) return 'chat';
    return top[0][0];
  }

  buildRequest(input: string, sessionId?: string): TaskRequest {
    return {
      id: `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      input,
      category: this.classify(input),
      sessionId: sessionId ?? 'default',
      timestamp: Date.now(),
    };
  }
}

let router: TaskRouter | null = null;
export function getRouter(): TaskRouter {
  if (!router) router = new TaskRouter();
  return router;
}
