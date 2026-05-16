import { NextResponse } from 'next/server';
import { alphaIntegrationStatus } from '@/lib/pap/alpha-workspace';

export function GET() {
  return NextResponse.json({
    status: alphaIntegrationStatus,
    readOnlyFirst: true,
    liveActionsEnabled: false,
  });
}
