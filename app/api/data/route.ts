import { and, asc, desc, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { feedback, resources, studied, users } from '@/db/schema';

export const dynamic = 'force-dynamic';

type Credentials = { userId?: string; password?: string };

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

async function authenticate(credentials: Credentials) {
  if (!credentials.userId || !credentials.password) return null;
  const db = getDb();
  const [user] = await db.select().from(users).where(and(eq(users.id, credentials.userId), eq(users.password, credentials.password))).limit(1);
  return user ?? null;
}

export async function GET() {
  try {
    const db = getDb();
    const [userRows, resourceRows, studiedRows, feedbackRows] = await Promise.all([
      db.select({ id: users.id, name: users.name, createdAt: users.createdAt }).from(users).orderBy(asc(users.name)),
      db.select().from(resources).orderBy(desc(resources.createdAt)),
      db.select().from(studied),
      db.select({ resourceId: feedback.resourceId, userId: feedback.userId, rating: feedback.rating, comment: feedback.comment, createdAt: feedback.createdAt, updatedAt: feedback.updatedAt, userName: users.name }).from(feedback).innerJoin(users, eq(feedback.userId, users.id)),
    ]);
    return json({
      users: userRows,
      resources: resourceRows.map((resource) => ({
        ...resource,
        studiedBy: studiedRows.filter((row) => row.resourceId === resource.id).map((row) => row.userId),
        feedback: feedbackRows.filter((row) => row.resourceId === resource.id),
      })),
    });
  } catch (error) {
    console.error(error);
    return json({ error: 'No fue posible cargar la biblioteca.' }, 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, string>;
    const db = getDb();

    if (body.action === 'createUser') {
      const name = body.name?.trim();
      if (!name || body.password?.length < 6 || !/^\d{6}$/.test(body.pin ?? '')) return json({ error: 'Datos de usuario incompletos.' }, 400);
      const existing = await db.select({ id: users.id }).from(users).where(eq(users.name, name)).limit(1);
      if (existing.length) return json({ error: 'Ese nombre ya está registrado.' }, 409);
      const user = { id: crypto.randomUUID(), name, password: body.password, pin: body.pin, createdAt: new Date().toISOString() };
      await db.insert(users).values(user);
      return json({ user: { id: user.id, name: user.name, createdAt: user.createdAt } }, 201);
    }

    if (body.action === 'login') {
      const user = await authenticate(body);
      return user ? json({ user: { id: user.id, name: user.name } }) : json({ error: 'La contraseña no coincide.' }, 401);
    }

    if (body.action === 'recover') {
      const [user] = await db.select().from(users).where(and(eq(users.id, body.userId ?? ''), eq(users.pin, body.pin ?? ''))).limit(1);
      return user ? json({ password: user.password }) : json({ error: 'El PIN no coincide.' }, 401);
    }

    const user = await authenticate(body);
    if (!user) return json({ error: 'Tu sesión no es válida. Ingresa nuevamente.' }, 401);

    if (body.action === 'addResource') {
      if (!body.title?.trim() || !['video', 'documento', 'imagen'].includes(body.type)) return json({ error: 'Datos del recurso incompletos.' }, 400);
      const normalizedUrl = /^https?:\/\//i.test(body.url ?? '') ? body.url : `https://${body.url}`;
      try { new URL(normalizedUrl); } catch { return json({ error: 'Escribe un vínculo válido.' }, 400); }
      await db.insert(resources).values({ id: crypto.randomUUID(), title: body.title.trim(), url: normalizedUrl, type: body.type as 'video' | 'documento' | 'imagen', ownerId: user.id, createdAt: new Date().toISOString() });
      return json({ ok: true }, 201);
    }

    if (body.action === 'toggleStudied') {
      const resourceId = body.resourceId ?? '';
      const resourceExists = await db.select({ id: resources.id }).from(resources).where(eq(resources.id, resourceId)).limit(1);
      if (!resourceExists.length) return json({ error: 'El recurso ya no existe.' }, 404);
      const existing = await db.select().from(studied).where(and(eq(studied.resourceId, resourceId), eq(studied.userId, user.id))).limit(1);
      if (existing.length) await db.delete(studied).where(and(eq(studied.resourceId, resourceId), eq(studied.userId, user.id)));
      else await db.insert(studied).values({ resourceId, userId: user.id, studiedAt: new Date().toISOString() });
      return json({ studied: !existing.length });
    }

    if (body.action === 'saveFeedback') {
      const resourceId = body.resourceId ?? '';
      const rating = Number(body.rating);
      const comment = body.comment?.trim() ?? '';
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) return json({ error: 'Selecciona una calificación entre 1 y 5 estrellas.' }, 400);
      if (comment.length > 600) return json({ error: 'El comentario puede tener hasta 600 caracteres.' }, 400);
      const resourceExists = await db.select({ id: resources.id }).from(resources).where(eq(resources.id, resourceId)).limit(1);
      if (!resourceExists.length) return json({ error: 'El recurso ya no existe.' }, 404);
      const existing = await db.select({ resourceId: feedback.resourceId }).from(feedback).where(and(eq(feedback.resourceId, resourceId), eq(feedback.userId, user.id))).limit(1);
      const now = new Date().toISOString();
      if (existing.length) await db.update(feedback).set({ rating, comment, updatedAt: now }).where(and(eq(feedback.resourceId, resourceId), eq(feedback.userId, user.id)));
      else await db.insert(feedback).values({ resourceId, userId: user.id, rating, comment, createdAt: now, updatedAt: now });
      return json({ ok: true });
    }

    if (body.action === 'deleteResource') {
      const [resource] = await db.select().from(resources).where(eq(resources.id, body.resourceId ?? '')).limit(1);
      if (!resource) return json({ error: 'El recurso ya no existe.' }, 404);
      if (resource.ownerId !== user.id) return json({ error: 'Solo quien compartió el recurso puede eliminarlo.' }, 403);
      await db.delete(resources).where(eq(resources.id, resource.id));
      return json({ ok: true });
    }

    return json({ error: 'Acción no reconocida.' }, 400);
  } catch (error) {
    console.error(error);
    return json({ error: 'No fue posible completar la operación.' }, 500);
  }
}
