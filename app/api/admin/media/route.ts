import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';
import { uploadMedia } from '@/lib/storage';
import { dimensions, hasSafeSignature, isAllowedMediaType, maxBytesFor, safeFilename } from '@/lib/cms/media';
import { deleteMedia } from '@/lib/storage';

function fail(error: unknown) {
  const message = error instanceof Error ? error.message : 'Request failed';
  if (message === 'BLOB_READ_WRITE_TOKEN is not configured') return NextResponse.json({ error: 'Media storage is not configured. Add BLOB_READ_WRITE_TOKEN to the deployment environment, then try again.' }, { status: 503 });
  if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const url = new URL(request.url);
    const q = url.searchParams.get('q')?.trim() || '';
    const category = url.searchParams.get('category') || undefined;
    const media = await prisma.media.findMany({
      where: { ...(category ? { category: category as never } : {}), ...(q ? { OR: [{ filename: { contains: q, mode: 'insensitive' } }, { originalName: { contains: q, mode: 'insensitive' } }, { alt: { contains: q, mode: 'insensitive' } }] } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return NextResponse.json({ media });
  } catch (e) { return fail(e); }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const form = await request.formData();
    const file = form.get('file');
    const category = String(form.get('category') || 'GENERAL');
    const alt = String(form.get('alt') || '').trim() || null;
    if (!(file instanceof File)) return NextResponse.json({ error: 'File is required' }, { status: 400 });
    if (!isAllowedMediaType(file.type)) return NextResponse.json({ error: 'Unsupported file type' }, { status: 415 });
    if (file.size <= 0 || file.size > maxBytesFor(file.type)) return NextResponse.json({ error: 'File size exceeds the allowed limit' }, { status: 413 });
    const buffer = Buffer.from(await file.arrayBuffer());
    if (!hasSafeSignature(buffer, file.type)) return NextResponse.json({ error: 'File content does not match the declared media type' }, { status: 415 });
    const safe = safeFilename(file.name);
    const pathname = `new-era/${category.toLowerCase()}/${Date.now()}-${safe}`;
    const uploaded = await uploadMedia(file, pathname);
    const size = dimensions(buffer, file.type);
    const media = await prisma.media.create({ data: { filename: safe, originalName: file.name, mimeType: file.type, size: file.size, width: size?.width, height: size?.height, url: uploaded.url, storageKey: uploaded.pathname, category: category as never, alt } });
    return NextResponse.json({ media }, { status: 201 });
  } catch (e) { return fail(e); }
}

export async function PATCH(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json();
    if (!body.id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    const media = await prisma.media.update({ where: { id: body.id }, data: { ...(body.alt !== undefined ? { alt: String(body.alt).slice(0, 20000) || null } : {}), ...(body.category ? { category: body.category } : {}) } });
    return NextResponse.json({ media });
  } catch (e) { return fail(e); }
}

export async function DELETE(request: Request) {
  try {
    await requireAdmin();
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    const media = await prisma.media.findUnique({ where: { id }, include: { desktopHeros: { select: { id: true } }, mobileHeros: { select: { id: true } }, videoHeros: { select: { id: true } }, homepageSections: { select: { id: true } }, siteLogos: { select: { id: true } }, siteFavicons: { select: { id: true } }, siteSocialImages: { select: { id: true } } } });
    if (!media) return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    const referenced = media.desktopHeros.length + media.mobileHeros.length + media.videoHeros.length + media.homepageSections.length + media.siteLogos.length + media.siteFavicons.length + media.siteSocialImages.length;
    if (referenced) return NextResponse.json({ error: 'Media is still referenced by CMS content and cannot be deleted.' }, { status: 409 });
    await prisma.media.delete({ where: { id } });
    await deleteMedia(media.url).catch(() => undefined);
    return NextResponse.json({ ok: true });
  } catch (e) { return fail(e); }
}
