import { NextRequest, NextResponse } from 'next/server';
import { removeDependency } from '@/lib/dependency-service';

// DELETE /api/dependencies/[id] — remove a task dependency
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid dependency id' }, { status: 400 });
    }
    removeDependency(id);
    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('[API] DELETE /api/dependencies/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
