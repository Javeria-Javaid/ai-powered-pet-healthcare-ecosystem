import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import {
  isStorageConfigured,
  ensureBucket,
  uploadObject,
  createSignedUrl,
  deleteObject,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  StorageError,
} from '@/lib/storage';

// GET /api/pets/[petId]/documents - List a pet's medical documents with signed view URLs
// POST /api/pets/[petId]/documents - Upload a healthcare document (owner-only)
// Files are stored in Supabase Storage; the database only keeps metadata.
// Ownership is resolved server-side from the pet record — client-supplied
// petIds are only ever used to look up the pet, never to decide access.

const MIME_EXTENSIONS: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
};

// Storage object paths get a safe ASCII filename; the DB keeps the original display name.
function sanitizeFileName(name: string, fileType: string) {
  const base = (name.split(/[\\/]/).pop() || '').trim();
  const cleaned = base
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '');
  if (!cleaned || cleaned === '.') {
    return `document${MIME_EXTENSIONS[fileType] || ''}`;
  }
  return cleaned.slice(0, 120);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ petId: string }> }
) {
  try {
    const user = await requireAuth();
    const { petId } = await params;

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

    const documents = await prisma.document.findMany({
      where: { petId },
      include: { uploader: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
    });

    // Signing is best-effort: the list stays useful when storage is unreachable.
    const canSign = isStorageConfigured();
    const payload = await Promise.all(
      documents.map(async (doc) => {
        let signedUrl: string | null = null;
        if (canSign) {
          try {
            signedUrl = await createSignedUrl(doc.ossKey, 3600);
          } catch (err) {
            console.error('Failed to sign document URL:', err);
          }
        }
        return {
          id: doc.id,
          fileName: doc.fileName,
          fileType: doc.fileType,
          createdAt: doc.createdAt,
          uploaderName: [doc.uploader?.firstName, doc.uploader?.lastName].filter(Boolean).join(' ') || 'Unknown',
          signedUrl,
        };
      })
    );

    return NextResponse.json({ success: true, documents: payload });
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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ petId: string }> }
) {
  try {
    const user = await requireAuth();
    const { petId } = await params;

    if (user.role !== 'PET_OWNER') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Only pet owners can upload documents.' } },
        { status: 403 }
      );
    }

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

    if (!isStorageConfigured()) {
      return NextResponse.json(
        { success: false, error: { code: 'STORAGE_NOT_CONFIGURED', message: 'Document storage is not configured on the server.' } },
        { status: 503 }
      );
    }

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Expected a multipart form upload.' } },
        { status: 400 }
      );
    }

    const file = formData.get('file');
    if (!file || typeof file === 'string') {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'No file was provided.' } },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'File exceeds the 10 MB limit.' } },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Unsupported file type. Allowed: PDF, PNG, JPEG, WebP.' } },
        { status: 400 }
      );
    }

    const documentId = randomUUID();
    const safeName = sanitizeFileName(file.name, file.type);
    const ossKey = `pets/${pet.id}/${documentId}/${safeName}`;

    await ensureBucket();
    await uploadObject(ossKey, await file.arrayBuffer(), file.type);

    try {
      const document = await prisma.document.create({
        data: {
          id: documentId,
          petId,
          uploaderId: user.id,
          ossKey,
          fileName: file.name.trim().slice(0, 255) || safeName,
          fileType: file.type,
        },
      });
      return NextResponse.json({ success: true, document }, { status: 201 });
    } catch (dbErr) {
      // Do not leave an orphaned object in storage when the metadata row fails.
      try {
        await deleteObject(ossKey);
      } catch (cleanupErr) {
        console.error('Failed to clean up uploaded object:', cleanupErr);
      }
      throw dbErr;
    }
  } catch (err: any) {
    if (err.message === 'UNAUTHENTICATED') {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not logged in.' } },
        { status: 401 }
      );
    }
    if (err.name === 'StorageError') {
      return NextResponse.json(
        { success: false, error: { code: 'STORAGE_ERROR', message: 'Storing the file failed. Check server storage configuration.' } },
        { status: 502 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'An error occurred.' } },
      { status: 500 }
    );
  }
}
