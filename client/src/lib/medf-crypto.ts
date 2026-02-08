/**
 * Client-side MeDF verification utilities
 * RFC 8785 compliant JSON Canonicalization + SHA-256 hashing
 */

import type { MedfDocument, MedfBlock } from "@shared/medf";

/**
 * RFC 8785 compliant stable JSON stringify
 * - Sorted keys (lexical order)
 * - No whitespace
 * - Unicode preserved
 */
export function stableStringify(obj: unknown): string {
  if (obj === null || obj === undefined) return "null";
  if (typeof obj === "boolean") return obj ? "true" : "false";
  if (typeof obj === "number") {
    if (Object.is(obj, -0)) return "0";
    return String(obj);
  }
  if (typeof obj === "string") return JSON.stringify(obj);
  if (Array.isArray(obj)) {
    return "[" + obj.map(stableStringify).join(",") + "]";
  }
  if (typeof obj === "object") {
    const keys = Object.keys(obj as Record<string, unknown>).sort();
    const pairs = keys
      .map((k) => {
        const val = (obj as Record<string, unknown>)[k];
        if (val === undefined) return null;
        return JSON.stringify(k) + ":" + stableStringify(val);
      })
      .filter(Boolean);
    return "{" + pairs.join(",") + "}";
  }
  return String(obj);
}

/**
 * SHA-256 hash using Web Crypto API (works offline)
 */
export async function sha256Hex(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Compute block hash (SHA-256 of canonical JSON of block fields)
 */
export async function computeBlockHash(block: MedfBlock): Promise<string> {
  const blockSrc = {
    block_id: block.block_id,
    role: block.role,
    format: block.format,
    text: block.text,
  };
  return sha256Hex(stableStringify(blockSrc));
}

/**
 * Compute document hash (SHA-256 of canonical JSON excluding doc_hash, signature, index)
 */
export async function computeDocHash(doc: MedfDocument): Promise<string> {
  const docSrc: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(doc)) {
    if (k !== "doc_hash" && k !== "signature" && k !== "index") {
      docSrc[k] = v;
    }
  }
  return sha256Hex(stableStringify(docSrc));
}

/**
 * Simulate IPFS CID using SHA-256 of canonical JSON
 */
export async function simulateIpfsCid(jsonStr: string): Promise<string> {
  const hash = await sha256Hex(jsonStr);
  return `bafybeig${hash.substring(0, 52)}`;
}

/**
 * Full document verification
 * Returns detailed results for each block and the document hash
 */
export async function verifyDocument(doc: MedfDocument): Promise<{
  valid: boolean;
  blockResults: Array<{
    blockId: string;
    expected: string | undefined;
    computed: string;
    valid: boolean;
  }>;
  docHashResult: {
    expected: string | undefined;
    computed: string;
    valid: boolean;
  };
}> {
  // Verify each block
  const blockResults = await Promise.all(
    doc.blocks.map(async (block) => {
      const computed = await computeBlockHash(block);
      return {
        blockId: block.block_id,
        expected: block.block_hash,
        computed,
        valid: !block.block_hash || block.block_hash === computed,
      };
    })
  );

  // Verify document hash
  const computedDocHash = await computeDocHash(doc);
  const docHashResult = {
    expected: doc.doc_hash?.value,
    computed: computedDocHash,
    valid: !doc.doc_hash?.value || doc.doc_hash.value === computedDocHash,
  };

  const allBlocksValid = blockResults.every((r) => r.valid);
  const valid = allBlocksValid && docHashResult.valid;

  return { valid, blockResults, docHashResult };
}
