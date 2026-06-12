import { NextResponse, type NextRequest } from 'next/server';
import { syncRealScores } from '@/lib/scoreSync';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
  const expectedToken = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET || authHeader !== expectedToken) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const result = await syncRealScores();
    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    console.error('Error durante la sincronización cron:', err);
    return NextResponse.json(
      { 
        success: false, 
        error: err.message || 'Error interno del servidor durante la sincronización.' 
      },
      { status: 500 }
    );
  }
}

