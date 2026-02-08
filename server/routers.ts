import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  createDocument, getDocumentById, getDocumentByMedfId, listDocuments,
  updateDocument, deleteDocument,
  createBlocks, getBlocksByDocumentId, deleteBlocksByDocumentId,
  createComment, getCommentsByDocument, getCommentById, deleteComment,
  createReferences, getReferencesByDocument, getIncomingReferences,
  resolveReferences, deleteReferencesByDocument,
  createDocumentVersion, getVersionsByDocumentId, getVersionById, getLatestVersionNumber,
} from "./db";
import { extractCitations, slugify } from "@shared/medf";
import type { MedfDocument, MedfBlock } from "@shared/medf";
import { TRPCError } from "@trpc/server";
import { notifyOwner } from "./_core/notification";

// ─── MeDF Crypto Utilities (Server-side) ────────────────────
import { createHash } from "crypto";

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

function simulateIpfsCid(jsonStr: string): string {
  const hash = sha256Hex(jsonStr);
  return `bafybeig${hash.substring(0, 52)}`;
}

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
      if (currentSection) sections.push(currentSection);
      currentSection = { title: line.substring(3).trim(), text: "" };
    } else {
      if (currentSection) {
        currentSection.text += line + "\n";
      } else if (line.trim()) {
        currentSection = { title: title || "main", text: line + "\n" };
      }
    }
  }
  if (currentSection) sections.push(currentSection);
  if (sections.length === 0) sections.push({ title: title || "main", text: content });

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
    .input(z.object({ medfJson: medfDocumentSchema }))
    .mutation(async ({ ctx, input }) => {
      const medf = input.medfJson;

      for (const block of medf.blocks) {
        block.block_hash = computeBlockHash(block);
      }
      const docHashValue = computeDocHash(medf);
      medf.doc_hash = { algorithm: "sha-256", value: docHashValue };

      const medfJsonStr = stableStringify(medf);
      const ipfsCid = simulateIpfsCid(medfJsonStr);

      const title = medf.blocks[0]?.text?.split("\n")[0]?.replace(/^#+\s*/, "").trim() || medf.id;

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
        for (const ref of refs) {
          const targetDoc = await getDocumentByMedfId(ref.targetMedfId);
          if (targetDoc) await resolveReferences(ref.targetMedfId, targetDoc.id);
        }
      }
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
      const docHashValue = computeDocHash(medf);
      medf.doc_hash = { algorithm: "sha-256", value: docHashValue };
      return { medf, title };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      medfJson: medfDocumentSchema,
      changeSummary: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await getDocumentById(input.id);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });
      if (existing.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      }

      // Save current version as a snapshot before updating
      const latestVersion = await getLatestVersionNumber(input.id);
      await createDocumentVersion({
        documentId: input.id,
        versionNumber: latestVersion + 1,
        medfId: existing.medfId,
        title: existing.title,
        issuer: existing.issuer,
        snapshot: existing.snapshot,
        medfJson: existing.medfJson,
        docHash: existing.docHash || null,
        ipfsCid: existing.ipfsCid || null,
        blockCount: existing.blockCount,
        changeSummary: input.changeSummary || null,
        userId: ctx.user.id,
      });

      const medf = input.medfJson;
      for (const block of medf.blocks) {
        block.block_hash = computeBlockHash(block);
      }
      const docHashValue = computeDocHash(medf);
      medf.doc_hash = { algorithm: "sha-256", value: docHashValue };

      const medfJsonStr = stableStringify(medf);
      const ipfsCid = simulateIpfsCid(medfJsonStr);

      const title = medf.blocks[0]?.text?.split("\n")[0]?.replace(/^#+\s*/, "").trim() || medf.id;

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
      if (refs.length > 0) await createReferences(refs);

      // Notify owner about document update
      try {
        await notifyOwner({
          title: `📝 文書更新: ${title}`,
          content: `文書「${title}」(${medf.id}) が更新されました。\n\nバージョン: v${latestVersion + 1} → 最新\nブロック数: ${medf.blocks.length}\nハッシュ: ${docHashValue.substring(0, 16)}...${input.changeSummary ? `\n変更概要: ${input.changeSummary}` : ""}`,
        });
      } catch (e) {
        console.warn("[Notification] Failed to send update notification:", e);
      }

      return { id: input.id, docHash: docHashValue, ipfsCid, medf };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await getDocumentById(input.id);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });
      if (existing.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      }
      await deleteDocument(input.id);
      return { success: true };
    }),
});

// ─── Version Router ─────────────────────────────────────────

const versionRouter = router({
  list: publicProcedure
    .input(z.object({ documentId: z.number() }))
    .query(async ({ input }) => {
      return getVersionsByDocumentId(input.documentId);
    }),

  getById: publicProcedure
    .input(z.object({ versionId: z.number() }))
    .query(async ({ input }) => {
      return getVersionById(input.versionId);
    }),

  rollback: protectedProcedure
    .input(z.object({
      documentId: z.number(),
      versionId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await getDocumentById(input.documentId);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });
      if (existing.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      }

      const version = await getVersionById(input.versionId);
      if (!version || version.documentId !== input.documentId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Version not found" });
      }

      // Save current state as a new version before rollback
      const latestVersion = await getLatestVersionNumber(input.documentId);
      await createDocumentVersion({
        documentId: input.documentId,
        versionNumber: latestVersion + 1,
        medfId: existing.medfId,
        title: existing.title,
        issuer: existing.issuer,
        snapshot: existing.snapshot,
        medfJson: existing.medfJson,
        docHash: existing.docHash || null,
        ipfsCid: existing.ipfsCid || null,
        blockCount: existing.blockCount,
        changeSummary: `ロールバック前の自動保存 (v${version.versionNumber}へ復元)`,
        userId: ctx.user.id,
      });

      // Restore document from version
      const medf = JSON.parse(version.medfJson) as MedfDocument;

      await updateDocument(input.documentId, {
        medfId: version.medfId,
        title: version.title,
        issuer: version.issuer,
        snapshot: version.snapshot,
        medfJson: version.medfJson,
        docHash: version.docHash || null,
        ipfsCid: version.ipfsCid || null,
        blockCount: version.blockCount,
      });

      // Recreate blocks from version
      await deleteBlocksByDocumentId(input.documentId);
      await createBlocks(
        medf.blocks.map((block, i) => ({
          documentId: input.documentId,
          blockId: block.block_id,
          role: block.role,
          format: block.format,
          textContent: block.text,
          blockHash: block.block_hash || null,
          sortOrder: i,
        }))
      );

      return { success: true, restoredVersion: version.versionNumber };
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
      // Validate parent comment exists and belongs to same document
      if (input.parentId) {
        const parent = await getCommentById(input.parentId);
        if (!parent || parent.documentId !== input.documentId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid parent comment" });
        }
      }

      const id = await createComment({
        documentId: input.documentId,
        blockId: input.blockId || null,
        parentId: input.parentId || null,
        userId: ctx.user.id,
        content: input.content,
        citation: input.citation || null,
      });

      // Send notification to owner about new comment
      try {
        const doc = await getDocumentById(input.documentId);
        const blockInfo = input.blockId ? ` (block: ${input.blockId})` : "";
        const replyInfo = input.parentId ? " [返信]" : "";
        await notifyOwner({
          title: `💬 新しいコメント${replyInfo}: ${doc?.title || "Unknown"}`,
          content: `文書「${doc?.title || "Unknown"}${blockInfo}」に新しいコメントが投稿されました。\n\nコメント内容: ${input.content.substring(0, 200)}${input.content.length > 200 ? "..." : ""}\n${input.citation ? `引用: ${input.citation}` : ""}`,
        });
      } catch (e) {
        console.warn("[Notification] Failed to send comment notification:", e);
      }

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

// ─── IPFS Router (Pinata Integration) ───────────────────────

const ipfsRouter = router({
  pin: protectedProcedure
    .input(z.object({ documentId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const doc = await getDocumentById(input.documentId);
      if (!doc) throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });

      const pinataApiKey = process.env.PINATA_API_KEY;
      const pinataSecret = process.env.PINATA_API_SECRET;

      if (!pinataApiKey || !pinataSecret) {
        // Fallback: simulate IPFS pinning with local CID generation
        const medfJsonStr = stableStringify(JSON.parse(doc.medfJson));
        const cid = simulateIpfsCid(medfJsonStr);
        await updateDocument(input.documentId, { ipfsCid: cid });
        return {
          success: true,
          cid,
          gateway: `https://ipfs.io/ipfs/${cid}`,
          simulated: true,
          message: "Pinata APIキーが未設定のため、CIDをシミュレーションしました。実際のIPFSピニングにはPinata APIキーを設定してください。",
        };
      }

      // Real Pinata pinning
      try {
        const medfJson = JSON.parse(doc.medfJson);
        const response = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "pinata_api_key": pinataApiKey,
            "pinata_secret_api_key": pinataSecret,
          },
          body: JSON.stringify({
            pinataContent: medfJson,
            pinataMetadata: {
              name: `medf-${doc.medfId}`,
              keyvalues: {
                medfId: doc.medfId,
                medfVersion: doc.medfVersion,
                issuer: doc.issuer,
              },
            },
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Pinata API error: ${response.status} ${errText}`);
        }

        const result = await response.json() as { IpfsHash: string };
        const cid = result.IpfsHash;

        await updateDocument(input.documentId, { ipfsCid: cid });

        return {
          success: true,
          cid,
          gateway: `https://gateway.pinata.cloud/ipfs/${cid}`,
          simulated: false,
          message: "IPFSに正常にピン留めされました。",
        };
      } catch (err) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `IPFS pinning failed: ${(err as Error).message}`,
        });
      }
    }),

  unpin: protectedProcedure
    .input(z.object({ documentId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const doc = await getDocumentById(input.documentId);
      if (!doc) throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });
      if (!doc.ipfsCid) throw new TRPCError({ code: "BAD_REQUEST", message: "Document has no IPFS CID" });

      const pinataApiKey = process.env.PINATA_API_KEY;
      const pinataSecret = process.env.PINATA_API_SECRET;

      if (!pinataApiKey || !pinataSecret) {
        return { success: true, simulated: true, message: "Pinata APIキーが未設定のため、シミュレーションモードです。" };
      }

      try {
        const response = await fetch(`https://api.pinata.cloud/pinning/unpin/${doc.ipfsCid}`, {
          method: "DELETE",
          headers: {
            "pinata_api_key": pinataApiKey,
            "pinata_secret_api_key": pinataSecret,
          },
        });

        if (!response.ok && response.status !== 404) {
          throw new Error(`Pinata unpin error: ${response.status}`);
        }

        return { success: true, simulated: false, message: "IPFSからアンピンしました。" };
      } catch (err) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `IPFS unpin failed: ${(err as Error).message}`,
        });
      }
    }),

  status: publicProcedure
    .input(z.object({ cid: z.string() }))
    .query(async ({ input }) => {
      // Check if CID is accessible via public gateway
      try {
        const response = await fetch(`https://ipfs.io/ipfs/${input.cid}`, {
          method: "HEAD",
          signal: AbortSignal.timeout(10000),
        });
        return {
          accessible: response.ok,
          gateway: `https://ipfs.io/ipfs/${input.cid}`,
          pinataGateway: `https://gateway.pinata.cloud/ipfs/${input.cid}`,
        };
      } catch {
        return {
          accessible: false,
          gateway: `https://ipfs.io/ipfs/${input.cid}`,
          pinataGateway: `https://gateway.pinata.cloud/ipfs/${input.cid}`,
        };
      }
    }),
});

// ─── Export Router ─────────────────────────────────────────

function medfToHtml(medf: MedfDocument, title: string): string {
  const blocksHtml = medf.blocks.map((block) => {
    const escapedText = block.text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const formattedText = block.format === 'markdown'
      ? escapedText
          .replace(/^### (.+)$/gm, '<h3>$1</h3>')
          .replace(/^## (.+)$/gm, '<h2>$1</h2>')
          .replace(/^# (.+)$/gm, '<h1>$1</h1>')
          .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.+?)\*/g, '<em>$1</em>')
          .replace(/`(.+?)`/g, '<code>$1</code>')
          .replace(/\n\n/g, '</p><p>')
          .replace(/\n/g, '<br/>')
      : escapedText.replace(/\n/g, '<br/>');

    return `
    <section id="block-${block.block_id}" class="block">
      <div class="block-header">
        <span class="block-id">${block.block_id}</span>
        <span class="block-role">${block.role}</span>
        <span class="block-format">${block.format}</span>
      </div>
      <div class="block-content"><p>${formattedText}</p></div>
      ${block.block_hash ? `<div class="block-hash">Hash: ${block.block_hash}</div>` : ''}
    </section>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    :root { --primary: #2563eb; --border: #e5e7eb; --muted: #6b7280; --bg: #ffffff; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', 'Noto Sans JP', sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; color: #1f2937; background: var(--bg); line-height: 1.7; }
    .header { border-bottom: 2px solid var(--primary); padding-bottom: 1.5rem; margin-bottom: 2rem; }
    .header h1 { font-size: 1.75rem; font-weight: 700; color: #111827; }
    .meta { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-top: 0.75rem; font-size: 0.8rem; color: var(--muted); }
    .meta span { background: #f3f4f6; padding: 0.2rem 0.6rem; border-radius: 4px; }
    .toc { background: #f9fafb; border: 1px solid var(--border); border-radius: 8px; padding: 1.25rem; margin-bottom: 2rem; }
    .toc h2 { font-size: 0.9rem; font-weight: 600; margin-bottom: 0.75rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; }
    .toc ul { list-style: none; }
    .toc li { padding: 0.25rem 0; }
    .toc a { color: var(--primary); text-decoration: none; font-size: 0.9rem; }
    .toc a:hover { text-decoration: underline; }
    .block { border: 1px solid var(--border); border-radius: 8px; margin-bottom: 1.5rem; overflow: hidden; }
    .block-header { background: #f9fafb; padding: 0.5rem 1rem; border-bottom: 1px solid var(--border); display: flex; gap: 0.5rem; align-items: center; }
    .block-id { font-family: monospace; font-size: 0.85rem; font-weight: 600; color: #374151; }
    .block-role, .block-format { font-size: 0.7rem; background: #e5e7eb; padding: 0.1rem 0.4rem; border-radius: 3px; color: var(--muted); }
    .block-content { padding: 1rem; }
    .block-content p { margin-bottom: 0.75rem; }
    .block-content p:last-child { margin-bottom: 0; }
    .block-hash { padding: 0.4rem 1rem; background: #f9fafb; border-top: 1px solid var(--border); font-family: monospace; font-size: 0.7rem; color: var(--muted); }
    .doc-hash { margin-top: 2rem; padding: 1rem; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; }
    .doc-hash h3 { font-size: 0.85rem; font-weight: 600; color: #166534; margin-bottom: 0.5rem; }
    .doc-hash p { font-family: monospace; font-size: 0.75rem; color: #166534; word-break: break-all; }
    .footer { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid var(--border); text-align: center; font-size: 0.75rem; color: var(--muted); }
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
    h2 { font-size: 1.25rem; margin-bottom: 0.5rem; }
    h3 { font-size: 1.1rem; margin-bottom: 0.4rem; }
    code { background: #f3f4f6; padding: 0.1rem 0.3rem; border-radius: 3px; font-size: 0.85em; }
    strong { font-weight: 600; }
    em { font-style: italic; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${title}</h1>
    <div class="meta">
      <span>MeDF v${medf.medf_version}</span>
      <span>ID: ${medf.id}</span>
      <span>Issuer: ${medf.issuer}</span>
      <span>Snapshot: ${medf.snapshot}</span>
      ${medf.document_type ? `<span>Type: ${medf.document_type}</span>` : ''}
      <span>${medf.blocks.length} blocks</span>
    </div>
  </div>

  <div class="toc">
    <h2>Table of Contents</h2>
    <ul>
      ${medf.blocks.map((b, i) => `<li>${i + 1}. <a href="#block-${b.block_id}">${b.block_id}</a> <small>(${b.role})</small></li>`).join('\n      ')}
    </ul>
  </div>

  ${blocksHtml}

  ${medf.doc_hash ? `
  <div class="doc-hash">
    <h3>Document Hash (${medf.doc_hash.algorithm})</h3>
    <p>${medf.doc_hash.value}</p>
  </div>` : ''}

  <div class="footer">
    <p>Generated by MeDF Hub &middot; MeDF v${medf.medf_version} &middot; ${new Date().toISOString()}</p>
  </div>
</body>
</html>`;
}

const exportRouter = router({
  html: publicProcedure
    .input(z.object({ documentId: z.number() }))
    .query(async ({ input }) => {
      const doc = await getDocumentById(input.documentId);
      if (!doc) throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });
      const medf = JSON.parse(doc.medfJson) as MedfDocument;
      const html = medfToHtml(medf, doc.title);
      return { html, filename: `${doc.medfId}.html` };
    }),

  pdf: publicProcedure
    .input(z.object({ documentId: z.number() }))
    .query(async ({ input }) => {
      const doc = await getDocumentById(input.documentId);
      if (!doc) throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });
      const medf = JSON.parse(doc.medfJson) as MedfDocument;
      const html = medfToHtml(medf, doc.title);
      // Return HTML for client-side PDF generation via print
      return { html, filename: `${doc.medfId}.pdf`, title: doc.title };
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
  version: versionRouter,
  comment: commentRouter,
  reference: referenceRouter,
  ipfs: ipfsRouter,
  export: exportRouter,
});

export type AppRouter = typeof appRouter;
