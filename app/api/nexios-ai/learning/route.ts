import { NextResponse } from 'next/server';
import { getStructuredLearner } from '../../../../nexios-ai/learning/structured-learner';
import { syncToGitHub } from '../../../../nexios-ai/utils/github-sync';

export async function GET() {
  const learner = getStructuredLearner();
  const progress = learner.getProgress();

  return NextResponse.json({
    currentSection: progress.currentSection
      ? {
          id:          progress.currentSection.id,
          name:        progress.currentSection.name,
          description: progress.currentSection.description,
          minEntries:  progress.currentSection.minEntries,
          topics:      progress.currentSection.topics,
        }
      : null,
    currentIndex:    progress.currentIndex,
    totalSections:   progress.totalSections,
    percentComplete: progress.percentComplete,
    allSections:     progress.allSections,
  });
}

export async function POST() {
  const result = await syncToGitHub('Manual sync triggered via API');
  return NextResponse.json(result);
}
