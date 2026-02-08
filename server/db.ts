import { eq, desc, like, and, or, sql, asc, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  documents, InsertDocument, Document,
  blocks, InsertBlock, Block,
  comments, InsertComment, Comment,
  references, InsertReference, Reference,
  documentVersions, InsertDocumentVersion, DocumentVersion,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── User Helpers ───────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Document Helpers ───────────────────────────────────────

export async function createDocument(doc: InsertDocument): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(documents).values(doc);
  return result[0].insertId;
}

export async function getDocumentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getDocumentByMedfId(medfId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(documents).where(eq(documents.medfId, medfId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function listDocuments(opts: {
  search?: string;
  issuer?: string;
  documentType?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };

  const conditions = [];
  if (opts.search) {
    conditions.push(
      or(
        like(documents.title, `%${opts.search}%`),
        like(documents.medfId, `%${opts.search}%`),
        like(documents.issuer, `%${opts.search}%`)
      )
    );
  }
  if (opts.issuer) {
    conditions.push(eq(documents.issuer, opts.issuer));
  }
  if (opts.documentType) {
    conditions.push(eq(documents.documentType, opts.documentType));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [items, countResult] = await Promise.all([
    db
      .select({
        id: documents.id,
        medfId: documents.medfId,
        medfVersion: documents.medfVersion,
        title: documents.title,
        issuer: documents.issuer,
        documentType: documents.documentType,
        snapshot: documents.snapshot,
        language: documents.language,
        docHash: documents.docHash,
        ipfsCid: documents.ipfsCid,
        userId: documents.userId,
        blockCount: documents.blockCount,
        createdAt: documents.createdAt,
        updatedAt: documents.updatedAt,
      })
      .from(documents)
      .where(whereClause)
      .orderBy(desc(documents.createdAt))
      .limit(opts.limit ?? 20)
      .offset(opts.offset ?? 0),
    db
      .select({ count: sql<number>`count(*)` })
      .from(documents)
      .where(whereClause),
  ]);

  return { items, total: countResult[0]?.count ?? 0 };
}

export async function updateDocument(id: number, data: Partial<InsertDocument>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(documents).set(data).where(eq(documents.id, id));
}

export async function deleteDocument(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(blocks).where(eq(blocks.documentId, id));
  await db.delete(comments).where(eq(comments.documentId, id));
  await db.delete(references).where(eq(references.sourceDocId, id));
  await db.delete(documentVersions).where(eq(documentVersions.documentId, id));
  await db.delete(documents).where(eq(documents.id, id));
}

// ─── Block Helpers ──────────────────────────────────────────

export async function createBlocks(blockList: InsertBlock[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (blockList.length === 0) return;
  await db.insert(blocks).values(blockList);
}

export async function getBlocksByDocumentId(documentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(blocks)
    .where(eq(blocks.documentId, documentId))
    .orderBy(blocks.sortOrder);
}

export async function deleteBlocksByDocumentId(documentId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(blocks).where(eq(blocks.documentId, documentId));
}

// ─── Comment Helpers ────────────────────────────────────────

export async function createComment(comment: InsertComment): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(comments).values(comment);
  return result[0].insertId;
}

export async function getCommentsByDocument(documentId: number, blockId?: string) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(comments.documentId, documentId)];
  if (blockId) {
    conditions.push(eq(comments.blockId, blockId));
  }

  const rows = await db
    .select({
      id: comments.id,
      documentId: comments.documentId,
      blockId: comments.blockId,
      parentId: comments.parentId,
      userId: comments.userId,
      content: comments.content,
      citation: comments.citation,
      createdAt: comments.createdAt,
      updatedAt: comments.updatedAt,
      userName: users.name,
    })
    .from(comments)
    .leftJoin(users, eq(comments.userId, users.id))
    .where(and(...conditions))
    .orderBy(asc(comments.createdAt));

  return rows;
}

export async function getCommentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(comments).where(eq(comments.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function deleteComment(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(comments).where(and(eq(comments.id, id), eq(comments.userId, userId)));
}

// ─── Reference Helpers ──────────────────────────────────────

export async function createReferences(refs: InsertReference[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (refs.length === 0) return;
  await db.insert(references).values(refs);
}

export async function getReferencesByDocument(documentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(references)
    .where(eq(references.sourceDocId, documentId))
    .orderBy(references.createdAt);
}

export async function getIncomingReferences(medfId: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: references.id,
      sourceDocId: references.sourceDocId,
      sourceBlockId: references.sourceBlockId,
      targetMedfId: references.targetMedfId,
      targetBlockId: references.targetBlockId,
      citation: references.citation,
      resolved: references.resolved,
      targetDocId: references.targetDocId,
      createdAt: references.createdAt,
      sourceTitle: documents.title,
      sourceMedfId: documents.medfId,
    })
    .from(references)
    .leftJoin(documents, eq(references.sourceDocId, documents.id))
    .where(eq(references.targetMedfId, medfId))
    .orderBy(references.createdAt);
}

export async function resolveReferences(targetMedfId: string, targetDocId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(references)
    .set({ resolved: 1, targetDocId })
    .where(eq(references.targetMedfId, targetMedfId));
}

export async function deleteReferencesByDocument(documentId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(references).where(eq(references.sourceDocId, documentId));
}

// ─── Document Version Helpers ───────────────────────────────

export async function createDocumentVersion(version: InsertDocumentVersion): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(documentVersions).values(version);
  return result[0].insertId;
}

export async function getVersionsByDocumentId(documentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: documentVersions.id,
      documentId: documentVersions.documentId,
      versionNumber: documentVersions.versionNumber,
      medfId: documentVersions.medfId,
      title: documentVersions.title,
      issuer: documentVersions.issuer,
      snapshot: documentVersions.snapshot,
      docHash: documentVersions.docHash,
      ipfsCid: documentVersions.ipfsCid,
      blockCount: documentVersions.blockCount,
      changeSummary: documentVersions.changeSummary,
      userId: documentVersions.userId,
      createdAt: documentVersions.createdAt,
    })
    .from(documentVersions)
    .where(eq(documentVersions.documentId, documentId))
    .orderBy(desc(documentVersions.versionNumber));
}

export async function getVersionById(versionId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(documentVersions).where(eq(documentVersions.id, versionId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getLatestVersionNumber(documentId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db
    .select({ maxVersion: sql<number>`COALESCE(MAX(${documentVersions.versionNumber}), 0)` })
    .from(documentVersions)
    .where(eq(documentVersions.documentId, documentId));
  return result[0]?.maxVersion ?? 0;
}
