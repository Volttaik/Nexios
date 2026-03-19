import { NextRequest, NextResponse } from 'next/server';
import { getTrainer } from '../../../../nexios-ai/learning/trainer';
import { getStorage } from '../../../../nexios-ai/knowledge/storage';
import { getDatasets } from '../../../../nexios-ai/learning/dataset-loader';

export async function POST(req: NextRequest) {
  try {
    await req.json().catch(() => ({}));

    const trainer = getTrainer();
    if (trainer.isRunning()) {
      return NextResponse.json({ message: 'Training already in progress' }, { status: 409 });
    }

    const result = await trainer.trainBuiltinDatasets();
    const storage = getStorage();

    return NextResponse.json({
      success: true,
      message: `Training complete. Added ${result.added} entries across ${result.datasets} datasets.`,
      totalKnowledgeEntries: storage.count(),
      datasets: result.datasets,
      entriesAdded: result.added,
    });
  } catch (e) {
    console.error('[/api/nexios-ai/train]', e);
    return NextResponse.json({ error: 'Training failed' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    datasets: getDatasets(),
    totalDatasets: getDatasets().length,
    completedDatasets: getDatasets().filter(d => d.status === 'completed').length,
  });
}
