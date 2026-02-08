import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  createDocument, getDocumentById, getDocumentByMedfId, listDocuments,
  updateDocument, deleteDocument,
  createBlocks, getBlocksByDocumentId, deleteBlocksByDocumentId,
  createComment, getCommentsByDocument, deleteComment,
  createReferences, getReferencesByDocument, getIncomingReferences,
  resolveReferences, deleteReferencesByDocument,
} from "./db";
import { extractCitations, slugify } from "@shared/medf";
import type { MedfDocument, MedfBlock } from "@shared/medf";

// ─── MeDF Crypto Utilities (Server-side) ────────────────────
import { createHash } from "crypto";

function canonicalJson(obj: unknown): string {
  return JSON.stringify(obj, Object.keys(obj as object).sort(), undefined)
    .replace(/[\u0000-\u001f]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
}

function canonicalJsonRfc8785(obj: unknown): string {
  // RFC 8785 compliant: sorted keys, no whitespace, ensure_ascii=false
  return JSON.stringify(obj, (_, v) => v, undefined)
    ? stableStringify(obj)
    : "";
}

function stableStringify(obj: unknown): string {
  if (obj === null || obj === undefined) return "null";
  if (typeof obj === "boolean") return obj ? "true" : "false";
  if (typeof obj === "number") return String(obj);
  if (typeof obj === "string") return JSON.stringify(obj);
  if (Array.isArray(obj)) {
    return "[" + obj.map(stableStringify).join(",") + "]";
  }
  if (typeof obj === "object") {
    const keys = Object.keys(obj as Record<string, unknown>).sort();
    const pairs = keys.map(k => {
      const val = (obj as Record<string, unknown>)[k];
      if (val === undefined) return null;
      return JSON.stringify(k) + ":" + stableStringify(val);
    }).filter(Boolean);
    return "{" + pairs.join(",") + "}";
  }
  return String(obj);
}

function sha256Hex(data: string): string {
  return createHash("sha256").update(data, "utf-8").digest("hex");
}

function computeBlockHash(block: MedfBlock): string {
  const blockSrc = {
    block_id: block.block_id,
    role: block.role,
    format: block.format,
    text: block.text,
  };
  return sha256Hex(stableStringify(blockSrc));
}

function computeDocHash(doc: MedfDocument): string {
  const docSrc: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(doc)) {
    if (k !== "doc_hash" && k !== "signature" && k !== "index") {
      docSrc[k] = v;
    }
  }
  return sha256Hex(stableStringify(docSrc));
}

/** Simulate IPFS CID using SHA-256 of canonical JSON */
function simulateIpfsCid(jsonStr: string): string {
  const hash = sha256Hex(jsonStr);
  // Simulate CIDv1 format: bafy + base32-like encoding of hash prefix
  return `bafybeig${hash.substring(0, 52)}`;
}

/** Convert Markdown to MeDF blocks */
function markdownToBlocks(content: string): { title: string; blocks: MedfBlock[] } {
  const lines = content.split("\n");
  let title = "";
  const sections: Array<{ title: string; text: string }> = [];
  let currentSection: { title: string; text: string } | null = null;

  for (const line of lines) {
    if (line.startsWith("# ") && !title) {
      title = line.substring(2).trim();
      continue;
    }
    if (line.startsWith("## ")) {
      if (currentSection) {
        sections.push(currentSection);
      }
      currentSection = { title: line.substring(3).trim(), text: "" };
    } else {
      if (currentSection) {
        currentSection.text += line + "\n";
      } else if (line.trim()) {
        // Content before first ## header
        currentSection = { title: title || "main", text: line + "\n" };
      }
    }
  }
  if (currentSection) {
    sections.push(currentSection);
  }

  // If no sections found, treat entire content as one block
  if (sections.length === 0) {
    sections.push({ title: title || "main", text: content });
  }

  const medfBlocks: MedfBlock[] = sections.map((section) => ({
    block_id: slugify(section.title),
    role: "body",
    format: "markdown",
    text: section.text.trim(),
  }));

  return { title: title || "Untitled", blocks: medfBlocks };
}

// ─── Zod Schemas ────────────────────────────────────────────

const medfBlockSchema = z.object({
  block_id: z.string(),
  role: z.string(),
  format: z.string(),
  text: z.string(),
  block_hash: z.string().optional(),
});

const medfDocumentSchema = z.object({
  medf_version: z.string(),
  id: z.string(),
  snapshot: z.string(),
  issuer: z.string(),
  document_type: z.string().optional(),
  blocks: z.array(medfBlockSchema),
  doc_hash: z.object({ algorithm: z.string(), value: z.string() }).optional(),
  signature: z.object({
    algorithm: z.string(),
    value: z.string(),
    public_key: z.string(),
    signed_at: z.string(),
    signer: z.string().optional(),
  }).optional(),
  index: z.record(z.string(), z.unknown()).optional(),
});

// ─── Document Router ────────────────────────────────────────

const documentRouter = router({
  list: publicProcedure
    .input(z.object({
      search: z.string().optional(),
      issuer: z.string().optional(),
      documentType: z.string().optional(),
      limit: z.number().min(1).max(100).optional(),
      offset: z.number().min(0).optional(),
    }).optional())
    .query(async ({ input }) => {
      return listDocuments(input ?? {});
    }),

  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const doc = await getDocumentById(input.id);
      if (!doc) return null;
      const docBlocks = await getBlocksByDocumentId(input.id);
      return { ...doc, blocks: docBlocks };
    }),

  getByMedfId: publicProcedure
    .input(z.object({ medfId: z.string() }))
    .query(async ({ input }) => {
      const doc = await getDocumentByMedfId(input.medfId);
      if (!doc) return null;
      const docBlocks = await getBlocksByDocumentId(doc.id);
      return { ...doc, blocks: docBlocks };
    }),

  create: protectedProcedure
    .input(z.object({
      medfJson: medfDocumentSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      const medf = input.medfJson;

      // Compute block hashes
      for (const block of medf.blocks) {
        block.block_hash = computeBlockHash(block);
      }

      // Compute doc hash
      const docHashValue = computeDocHash(medf);
      medf.doc_hash = { algorithm: "sha-256", value: docHashValue };

      const medfJsonStr = stableStringify(medf);
      const ipfsCid = simulateIpfsCid(medfJsonStr);

      // Extract title from first block or id
      const title = medf.blocks[0]?.text?.split("\n")[0]?.replace(/^#+\s*/, "").trim()
        || medf.id;

      const docId = await createDocument({
        medfId: medf.id,
        medfVersion: medf.medf_version,
        title,
        issuer: medf.issuer,
        documentType: medf.document_type || null,
        snapshot: medf.snapshot,
        language: "ja",
        medfJson: JSON.stringify(medf),
        docHash: docHashValue,
        ipfsCid,
        userId: ctx.user.id,
        blockCount: medf.blocks.length,
      });

      // Store blocks
      await createBlocks(
        medf.blocks.map((block, i) => ({
          documentId: docId,
          blockId: block.block_id,
          role: block.role,
          format: block.format,
          textContent: block.text,
          blockHash: block.block_hash || null,
          sortOrder: i,
        }))
      );

      // Extract and store references
      const refs = [];
      for (const block of medf.blocks) {
        const citations = extractCitations(block.text);
        for (const cit of citations) {
          refs.push({
            sourceDocId: docId,
            sourceBlockId: block.block_id,
            targetMedfId: cit.documentId,
            targetBlockId: cit.blockId || null,
            citation: cit.full,
          });
        }
      }
      if (refs.length > 0) {
        await createReferences(refs);
        // Try to resolve references
        for (const ref of refs) {
          const targetDoc = await getDocumentByMedfId(ref.targetMedfId);
          if (targetDoc) {
            await resolveReferences(ref.targetMedfId, targetDoc.id);
          }
        }
      }

      // Resolve any existing unresolved references pointing to this document
      await resolveReferences(medf.id, docId);

      return { id: docId, medfId: medf.id, docHash: docHashValue, ipfsCid, medf };
    }),

  convertMarkdown: protectedProcedure
    .input(z.object({
      markdown: z.string(),
      documentId: z.string().optional(),
      issuer: z.string().optional(),
      documentType: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { title, blocks } = markdownToBlocks(input.markdown);

      // Compute block hashes
      for (const block of blocks) {
        block.block_hash = computeBlockHash(block);
      }

      const docId = input.documentId || slugify(title);
      const snapshot = new Date().toISOString();

      const medf: MedfDocument = {
        medf_version: "0.2.1",
        id: docId,
        snapshot,
        issuer: input.issuer || "user",
        document_type: input.documentType,
        blocks,
      };

      // Compute doc hash
      const docHashValue = computeDocHash(medf);
      medf.doc_hash = { algorithm: "sha-256", value: docHashValue };

      return { medf, title };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      medfJson: medfDocumentSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await getDocumentById(input.id);
      if (!existing) throw new Error("Document not found");
      if (existing.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new Error("Not authorized");
      }

      const medf = input.medfJson;

      // Recompute hashes
      for (const block of medf.blocks) {
        block.block_hash = computeBlockHash(block);
      }
      const docHashValue = computeDocHash(medf);
      medf.doc_hash = { algorithm: "sha-256", value: docHashValue };

      const medfJsonStr = stableStringify(medf);
      const ipfsCid = simulateIpfsCid(medfJsonStr);

      const title = medf.blocks[0]?.text?.split("\n")[0]?.replace(/^#+\s*/, "").trim()
        || medf.id;

      await updateDocument(input.id, {
        medfId: medf.id,
        medfVersion: medf.medf_version,
        title,
        issuer: medf.issuer,
        documentType: medf.document_type || null,
        snapshot: medf.snapshot,
        medfJson: JSON.stringify(medf),
        docHash: docHashValue,
        ipfsCid,
        blockCount: medf.blocks.length,
      });

      // Recreate blocks
      await deleteBlocksByDocumentId(input.id);
      await createBlocks(
        medf.blocks.map((block, i) => ({
          documentId: input.id,
          blockId: block.block_id,
          role: block.role,
          format: block.format,
          textContent: block.text,
          blockHash: block.block_hash || null,
          sortOrder: i,
        }))
      );

      // Recreate references
      await deleteReferencesByDocument(input.id);
      const refs = [];
      for (const block of medf.blocks) {
        const citations = extractCitations(block.text);
        for (const cit of citations) {
          refs.push({
            sourceDocId: input.id,
            sourceBlockId: block.block_id,
            targetMedfId: cit.documentId,
            targetBlockId: cit.blockId || null,
            citation: cit.full,
          });
        }
      }
      if (refs.length > 0) {
        await createReferences(refs);
      }

      return { id: input.id, docHash: docHashValue, ipfsCid, medf };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await getDocumentById(input.id);
      if (!existing) throw new Error("Document not found");
      if (existing.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new Error("Not authorized");
      }
      await deleteDocument(input.id);
      return { success: true };
    }),
});

// ─── Comment Router ─────────────────────────────────────────

const commentRouter = router({
  list: publicProcedure
    .input(z.object({
      documentId: z.number(),
      blockId: z.string().optional(),
    }))
    .query(async ({ input }) => {
      return getCommentsByDocument(input.documentId, input.blockId);
    }),

  create: protectedProcedure
    .input(z.object({
      documentId: z.number(),
      blockId: z.string().optional(),
      parentId: z.number().optional(),
      content: z.string().min(1),
      citation: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const id = await createComment({
        documentId: input.documentId,
        blockId: input.blockId || null,
        parentId: input.parentId || null,
        userId: ctx.user.id,
        content: input.content,
        citation: input.citation || null,
      });
      return { id };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await deleteComment(input.id, ctx.user.id);
      return { success: true };
    }),
});

// ─── Reference Router ───────────────────────────────────────

const referenceRouter = router({
  outgoing: publicProcedure
    .input(z.object({ documentId: z.number() }))
    .query(async ({ input }) => {
      return getReferencesByDocument(input.documentId);
    }),

  incoming: publicProcedure
    .input(z.object({ medfId: z.string() }))
    .query(async ({ input }) => {
      return getIncomingReferences(input.medfId);
    }),
});

// ─── Main Router ────────────────────────────────────────────

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  document: documentRouter,
  comment: commentRouter,
  reference: referenceRouter,
});

export type AppRouter = typeof appRouter;
