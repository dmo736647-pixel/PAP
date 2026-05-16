import { NextResponse } from 'next/server';
import { createAlphaActionDecision } from '@/lib/pap/alpha-workspace';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const decision = createAlphaActionDecision({ actionId: decodeURIComponent(id), decision: 'rejected' });

  if (!decision) {
    return NextResponse.json({ error: 'Action not found' }, { status: 404 });
  }

  return NextResponse.json(decision);
}
