import type { TaskRequest, TaskResponse, KnowledgeCategory } from '../types/index';
import { getRouter } from './router';
import { getReasoning } from './reasoning';
import { getStorage } from '../knowledge/storage';
import { getMemory } from '../knowledge/memory';
import { getClarityAgent } from '../agents/clarity-agent';
import { getStructuredLearner } from '../learning/structured-learner';

const CATEGORY_MAP: Record<string, KnowledgeCategory> = {
  coding:   'programming',
  document: 'documentation',
  design:   'design',
  chat:     'general',
  search:   'general',
  unknown:  'general',
};

export class NexiosAIEngine {
  private startedAt = Date.now();
  private requestCount = 0;

  async process(input: string, sessionId = 'default'): Promise<TaskResponse> {
    const t0 = Date.now();
    this.requestCount++;

    const router   = getRouter();
    const storage  = getStorage();
    const memory   = getMemory();
    const reason   = getReasoning();
    const clarity  = getClarityAgent();
    const learner  = getStructuredLearner();

    const request: TaskRequest = router.buildRequest(input, sessionId);
    memory.push(sessionId, 'user', input);

    const knowledgeCategory = CATEGORY_MAP[request.category] as KnowledgeCategory;
    const results = storage.query({
      text:          input,
      category:      knowledgeCategory,
      limit:         8,
      minConfidence: 0.3,
    });

    const context = memory.getOrCreate(sessionId);
    const { content: rawContent, confidence, sources } = reason.generateResponse({
      input,
      category:  request.category,
      knowledge: results,
      context,
    });

    const content = clarity.filter({
      rawContent,
      userInput:  input,
      confidence,
      knowledge:  results,
      category:   request.category,
    });

    memory.push(sessionId, 'assistant', content);

    learner.checkAndAdvance(storage.count());

    const response: TaskResponse = {
      id:                  `res_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      requestId:           request.id,
      content,
      category:            request.category,
      confidence,
      sources,
      timestamp:           Date.now(),
      processingMs:        Date.now() - t0,
      knowledgeEntriesUsed: results.length,
    };

    return response;
  }

  getStats() {
    const storage = getStorage();
    const learner = getStructuredLearner();
    return {
      requestCount:        this.requestCount,
      knowledgeEntries:    storage.count(),
      knowledgeByCategory: storage.countByCategory(),
      uptimeMs:            Date.now() - this.startedAt,
      startedAt:           this.startedAt,
      learningProgress:    learner.getProgress(),
    };
  }
}

let engine: NexiosAIEngine | null = null;
export function getEngine(): NexiosAIEngine {
  if (!engine) engine = new NexiosAIEngine();
  return engine;
}
