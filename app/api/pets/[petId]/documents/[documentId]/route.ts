import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { isStorageConfigured, deleteObject } from '@/lib/storage';

// DELETE /api/pets/[petId]/documents/[documentId] - Remove a document's metadata
// row and its stored file (owner-only). Storage deletion is best-effort so a
// storage hiccup can never leave the owner unable to remove the record.

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ petId: string; documentId: string }> }
) {
  try {
    const user = await requireAuth();
    const { petId, documentId } = await params;

    const pet = await prisma.pet.findUnique({ where: { id: petId } });
    if (!pet) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Pet not found.' } },
        { status: 404 }
      );
    }
    if (pet.ownerId !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'You do not own this pet.' } },
        { status: 403 }
      );
    }

    // Scope the lookup to this pet so a document id from another pet can never be targeted.
    const document = await prisma.document.findFirst({
      where: { id: documentId, petId: pet.id },
    });
    if (!document) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Document not found.' } },
        { status: 404 }
      );
    }

    if (isStorageConfigured()) {
      try {
        await deleteObject(document.ossKey);
      } catch (storageErr) {
        console.error('Failed to delete stored document file:', storageErr);
      }
    }

    await prisma.document.delete({ where: { id: document.id } });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err.message === 'UNAUTHENTICATED') {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not logged in.' } },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'An error occurred.' } },
      { status: 500 }
    );
  }
}
