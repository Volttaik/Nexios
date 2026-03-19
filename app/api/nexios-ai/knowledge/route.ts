import { NextRequest, NextResponse } from 'next/server';
import { getStorage } from '../../../../nexios-ai/knowledge/storage';
import { getCheckpoints } from '../../../../nexios-ai/checkpoint/checkpoint';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query   = searchParams.get('q') ?? '';
  const cat     = searchParams.get('category');
  const limit   = Math.min(parseInt(searchParams.get('limit') ?? '10', 10), 50);
  const type    = searchParams.get('type') ?? 'query';

  const storage = getStorage();

  if (type === 'checkpoints') {
    return NextResponse.json({ checkpoints: getCheckpoints() });
  }

  if (type === 'stats') {
    return NextResponse.json({
      total: storage.count(),
      byCategory: storage.countByCategory(),
    });
  }

  if (query.trim()) {
    const results = storage.query({
      text: query,
      category: cat as any ?? undefined,
      limit,
      minConfidence: 0.2,
    });
    return NextResponse.json({
      query,
      results: results.map(r => ({
        id: r.entry.id,
        content: r.entry.content.slice(0, 300),
        category: r.entry.category,
        source: r.entry.source,
        confidence: r.entry.confidence,
        score: r.score,
        timestamp: r.entry.timestamp,
      })),
      total: results.length,
    });
  }

  if (cat) {
    const entries = storage.getByCategory(cat as any, limit);
    return NextResponse.json({
      category: cat,
      entries: entries.map(e => ({
        id: e.id,
        content: e.content.slice(0, 300),
        source: e.source,
        confidence: e.confidence,
        timestamp: e.timestamp,
      })),
      total: entries.length,
    });
  }

  return NextResponse.json({
    total: storage.count(),
    byCategory: storage.countByCategory(),
    hint: 'Use ?q=search+term or ?category=programming or ?type=checkpoints',
  });
}
