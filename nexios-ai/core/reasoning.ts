import type { TaskCategory, KnowledgeResult, ConversationContext } from '../types/index';

interface ResponseTemplate {
  prefix?: string;
  format: 'prose' | 'code' | 'list' | 'mixed';
  maxKnowledge: number;
}

const TEMPLATES: Record<TaskCategory, ResponseTemplate> = {
  coding:   { format: 'code',  maxKnowledge: 5 },
  document: { format: 'prose', maxKnowledge: 4 },
  design:   { format: 'list',  maxKnowledge: 4 },
  chat:     { format: 'prose', maxKnowledge: 3 },
  search:   { format: 'mixed', maxKnowledge: 6 },
  unknown:  { format: 'prose', maxKnowledge: 3 },
};

function buildKnowledgeBlock(results: KnowledgeResult[], maxKnowledge: number): string {
  if (!results.length) return '';
  const top = results.slice(0, maxKnowledge);
  return top.map(r => r.entry.content.slice(0, 600)).join('\n\n---\n\n');
}

function buildContextBlock(ctx?: ConversationContext): string {
  if (!ctx || !ctx.history.length) return '';
  const recent = ctx.history.slice(-6);
  return recent.map(h => `${h.role === 'user' ? 'User' : 'Nexios AI'}: ${h.content}`).join('\n');
}

function codingResponse(input: string, knowledge: KnowledgeResult[]): string {
  const kBlock = buildKnowledgeBlock(knowledge, 5);

  if (kBlock) {
    return `Here is what Nexios AI knows that is relevant to your coding request:\n\n${kBlock}\n\nApplying this to your specific request:\n\n> **"${input}"**\n\nNexios AI is processing this task. As its knowledge base grows through training and Ultra Mode, it will generate complete, working code for this request. Currently it provides the most relevant knowledge entries it has stored.`;
  }

  return `Nexios AI — Coding Assistant\n\nYou asked: **"${input}"**\n\nNexios AI's coding knowledge is still growing. Use Ultra Mode to begin autonomous learning from programming documentation, tutorials, and public datasets. Once trained, Nexios AI will generate complete code solutions, debug errors, and explain algorithms directly — without any external API.`;
}

function documentResponse(input: string, knowledge: KnowledgeResult[]): string {
  const kBlock = buildKnowledgeBlock(knowledge, 4);

  if (kBlock) {
    return `Nexios AI — Document Writing\n\n**Relevant knowledge retrieved:**\n\n${kBlock}\n\n**Responding to your request:** "${input}"\n\nNexios AI will compose a full draft as its language knowledge expands through training. The above knowledge has been retrieved from its internal memory to assist with your document task.`;
  }

  return `Nexios AI — Document Assistant\n\nYou asked: **"${input}"**\n\nNexios AI is ready to assist with document writing. Activate Ultra Mode to enable continuous learning from documentation, writing guides, and educational resources. Once trained, Nexios AI will draft, edit, summarize, and structure full documents for you.`;
}

function designResponse(input: string, knowledge: KnowledgeResult[]): string {
  const kBlock = buildKnowledgeBlock(knowledge, 4);

  if (kBlock) {
    return `Nexios AI — Design Advisor\n\n**Retrieved design knowledge:**\n\n${kBlock}\n\n**Your design request:** "${input}"\n\nNexios AI has provided the most relevant design knowledge from its memory. Its design reasoning will improve as it learns more from design documentation, style guides, and UX resources.`;
  }

  return `Nexios AI — Design Assistant\n\nYou asked: **"${input}"**\n\nNexios AI will provide colour palettes, layout advice, typography recommendations, and UX guidance once its design knowledge base is populated. Start Ultra Mode to begin autonomous learning from design resources and documentation.`;
}

function chatResponse(input: string, knowledge: KnowledgeResult[], ctx?: ConversationContext): string {
  const kBlock = buildKnowledgeBlock(knowledge, 3);
  const ctxBlock = buildContextBlock(ctx);

  const lower = input.toLowerCase();
  if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
    return `Hello! I am **Nexios AI**, the native intelligence system built into this platform.\n\nI can help you with:\n- **Coding** — generate, debug, and explain code\n- **Documents** — write, draft, and edit content\n- **Design** — colour palettes, layouts, UX advice\n- **General chat** — ask me anything\n\nI learn continuously from public datasets and the internet. The more I learn, the smarter I become. You can activate **Ultra Mode** to begin my autonomous learning right now.`;
  }

  if (lower.includes('what are you') || lower.includes('who are you')) {
    return `I am **Nexios AI**, the native built-in AI model of the Nexios platform.\n\nUnlike other AI assistants, I do not rely on external APIs. I run entirely on this server and learn continuously from:\n- Public programming datasets\n- Technical documentation and tutorials\n- Educational web content\n- Conversation and writing examples\n\nI grow smarter over time through my **Ultra Mode** — an autonomous learning engine that runs in the background and continuously expands my knowledge base.`;
  }

  const parts: string[] = ['Nexios AI — General Response\n'];
  if (ctxBlock) parts.push(`**Conversation context:**\n${ctxBlock}\n`);
  if (kBlock) parts.push(`**Relevant knowledge:**\n${kBlock}\n`);
  parts.push(`**Responding to:** "${input}"\n\nNexios AI is processing your query against its current knowledge base. Activate Ultra Mode to expand my knowledge and improve the quality of my responses.`);

  return parts.join('\n');
}

export class ReasoningEngine {
  generateResponse(params: {
    input: string;
    category: TaskCategory;
    knowledge: KnowledgeResult[];
    context?: ConversationContext;
  }): { content: string; confidence: number; sources: string[] } {
    const { input, category, knowledge, context } = params;

    let content: string;
    switch (category) {
      case 'coding':   content = codingResponse(input, knowledge);           break;
      case 'document': content = documentResponse(input, knowledge);         break;
      case 'design':   content = designResponse(input, knowledge);           break;
      default:         content = chatResponse(input, knowledge, context);    break;
    }

    const confidence = knowledge.length > 0
      ? Math.min(0.9, 0.3 + knowledge[0]?.score * 0.6)
      : 0.2;

    const sources = [...new Set(knowledge.slice(0, 5).map(r => r.entry.source))];

    return { content, confidence, sources };
  }
}

let engine: ReasoningEngine | null = null;
export function getReasoning(): ReasoningEngine {
  if (!engine) engine = new ReasoningEngine();
  return engine;
}
