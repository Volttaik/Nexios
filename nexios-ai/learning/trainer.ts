import { getStorage } from '../knowledge/storage';
import { createCheckpoint } from '../checkpoint/checkpoint';
import { BUILTIN_DATASETS, registerDataset, updateDatasetStatus, getCompletedCount } from './dataset-loader';
import type { TrainingDataset } from '../types/index';


export class TrainingPipeline {
  private running = false;

  async trainBuiltinDatasets(): Promise<{ added: number; datasets: number }> {
    if (this.running) {
      console.log('[Trainer] Already running — skipping');
      return { added: 0, datasets: 0 };
    }
    this.running = true;

    const storage = getStorage();
    let totalAdded = 0;
    let datasetsProcessed = 0;

    for (const ds of BUILTIN_DATASETS) {
      const id = `ds_builtin_${ds.name.toLowerCase().replace(/\s+/g, '_')}`;
      const dataset: TrainingDataset = {
        id,
        name: ds.name,
        source: 'builtin',
        category: ds.category,
        entryCount: ds.entries.length,
        status: 'processing',
      };
      registerDataset(dataset);

      try {
        const added = storage.storeMany(
          ds.entries.map(e => ({
            content: e.content,
            category: ds.category,
            source: `builtin:${ds.name}`,
            confidence: e.confidence,
          }))
        );
        totalAdded += added;
        datasetsProcessed++;
        updateDatasetStatus(id, 'completed', added);
        console.log(`[Trainer] ✓ ${ds.name}: ${added} entries added`);
      } catch (e) {
        updateDatasetStatus(id, 'failed');
        console.error(`[Trainer] ✗ ${ds.name}: ${e}`);
      }
    }

    storage.flush();

    createCheckpoint({
      knowledgeEntryCount: storage.count(),
      datasetsProcessed: datasetsProcessed + getCompletedCount(),
      improvements: [`Trained on ${datasetsProcessed} built-in datasets`, `Added ${totalAdded} knowledge entries`],
    });

    this.running = false;
    return { added: totalAdded, datasets: datasetsProcessed };
  }

  async ingestCrawledContent(pages: Array<{
    content: string;
    category: import('../types/index.js').KnowledgeCategory;
    source: string;
    confidence: number;
  }>): Promise<number> {
    const storage = getStorage();
    const added = storage.storeMany(pages);
    if (added > 0) storage.flush();
    return added;
  }

  isRunning(): boolean { return this.running; }
}

let pipeline: TrainingPipeline | null = null;
export function getTrainer(): TrainingPipeline {
  if (!pipeline) pipeline = new TrainingPipeline();
  return pipeline;
}
