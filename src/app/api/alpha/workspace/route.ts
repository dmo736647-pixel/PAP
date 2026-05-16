import { NextResponse } from 'next/server';
import { alphaIntegrationStatus, createAlphaWorkspaceSnapshot } from '@/lib/pap/alpha-workspace';

export function GET() {
  return NextResponse.json({
    integrationStatus: alphaIntegrationStatus,
    workspace: createAlphaWorkspaceSnapshot(),
  });
}
