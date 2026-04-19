import { NextResponse } from 'next/server';
import { versionStore } from '@/lib/db/projects-store';

// POST /api/versions/compare - Compare two versions
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { versionIdA, versionIdB } = body;

    if (!versionIdA || !versionIdB) {
      return NextResponse.json(
        { error: 'versionIdA and versionIdB are required' },
        { status: 400 }
      );
    }

    const [versionA, versionB] = await Promise.all([
      versionStore.getById(versionIdA),
      versionStore.getById(versionIdB),
    ]);

    if (!versionA || !versionB) {
      return NextResponse.json(
        { error: 'Version not found' },
        { status: 404 }
      );
    }

    // Generate simple diff operations (stub - use diff library in production)
    const diffOperations = generateSimpleDiff(versionA.snapshotContent, versionB.snapshotContent);

    return NextResponse.json({
      data: {
        versionA,
        versionB,
        diffOperations,
      },
    });
  } catch (error) {
    console.error('Error comparing versions:', error);
    return NextResponse.json(
      { error: 'Failed to compare versions' },
      { status: 500 }
    );
  }
}

function generateSimpleDiff(textA: string, textB: string) {
  const operations: { type: 'add' | 'remove' | 'same'; text: string }[] = [];

  if (textA === textB) {
    operations.push({ type: 'same', text: textA });
    return operations;
  }

  // Simple line-by-line diff (stub)
  const linesA = textA.split('\n');
  const linesB = textB.split('\n');

  const maxLen = Math.max(linesA.length, linesB.length);
  for (let i = 0; i < maxLen; i++) {
    const lineA = linesA[i] || '';
    const lineB = linesB[i] || '';

    if (lineA === lineB) {
      operations.push({ type: 'same', text: lineA });
    } else {
      if (lineA) operations.push({ type: 'remove', text: lineA });
      if (lineB) operations.push({ type: 'add', text: lineB });
    }
  }

  return operations;
}
