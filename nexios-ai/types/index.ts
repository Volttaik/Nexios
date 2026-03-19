export type TaskCategory =
  | 'coding'
  | 'document'
  | 'design'
  | 'chat'
  | 'search'
  | 'unknown';

export type KnowledgeCategory =
  | 'programming'
  | 'documentation'
  | 'design'
  | 'conversation'
  | 'science'
  | 'mathematics'
  | 'general'
  | 'web_content'
  | 'dataset';

export interface KnowledgeEntry {
  id: string;
  content: string;
  category: KnowledgeCategory;
  source: string;
  timestamp: number;
  confidence: number;
  keywords: string[];
  metadata?: Record<string, unknown>;
}

export interface KnowledgeQuery {
  text: string;
  category?: KnowledgeCategory;
  limit?: number;
  minConfidence?: number;
}

export interface KnowledgeResult {
  entry: KnowledgeEntry;
  score: number;
}

export interface TaskRequest {
  id: string;
  input: string;
  category: TaskCategory;
  context?: ConversationContext;
  sessionId?: string;
  timestamp: number;
}

export interface TaskResponse {
  id: string;
  requestId: string;
  content: string;
  category: TaskCategory;
  confidence: number;
  sources: string[];
  timestamp: number;
  processingMs: number;
  knowledgeEntriesUsed: number;
}

export interface ConversationContext {
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  sessionId: string;
}

export interface TrainingDataset {
  id: string;
  name: string;
  source: string;
  category: KnowledgeCategory;
  entryCount: number;
  processedAt?: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface Checkpoint {
  id: string;
  timestamp: number;
  knowledgeEntryCount: number;
  datasetsProcessed: number;
  improvements: string[];
  version: string;
  ultraModeCycles?: number;
}

export interface CrawledPage {
  url: string;
  title: string;
  content: string;
  extractedAt: number;
  wordCount: number;
  isValid: boolean;
  category: KnowledgeCategory;
}

export interface UltraModeStatus {
  active: boolean;
  cyclesCompleted: number;
  lastCycleAt?: number;
  nextCycleAt?: number;
  pagesCollected: number;
  entriesAdded: number;
  currentPhase?: string;
}

export interface SystemStatus {
  version: string;
  knowledgeEntries: number;
  checkpoints: number;
  datasetsProcessed: number;
  ultraMode: UltraModeStatus;
  uptime: number;
  startedAt: number;
}

export interface ValidationResult {
  valid: boolean;
  score: number;
  reasons: string[];
}

export interface SecurityContext {
  action: string;
  targetFile?: string;
  requestedBy: string;
  approved: boolean;
}
