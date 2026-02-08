/**
 * MeDF v0.2.1 Types and Utilities
 * Shared between server and client
 */

export interface MedfBlock {
  block_id: string;
  role: string;
  format: string;
  text: string;
  block_hash?: string;
}

export interface MedfHash {
  algorithm: string;
  value: string;
}

export interface MedfSignature {
  algorithm: string;
  value: string;
  public_key: string;
  signed_at: string;
  signer?: string;
}

export interface MedfDocument {
  medf_version: string;
  id: string;
  snapshot: string;
  issuer: string;
  document_type?: string;
  blocks: MedfBlock[];
  doc_hash?: MedfHash;
  signature?: MedfSignature;
  index?: Record<string, unknown>;
}

/** MEDF citation regex: MEDF: document-id#block-id */
export const MEDF_CITATION_REGEX = /MEDF:\s*([a-zA-Z0-9_-]+)(?:#([a-zA-Z0-9_-]+))?/g;

/** Extract all MEDF citations from text */
export function extractCitations(text: string): Array<{ documentId: string; blockId?: string; full: string }> {
  const results: Array<{ documentId: string; blockId?: string; full: string }> = [];
  const regex = new RegExp(MEDF_CITATION_REGEX.source, 'g');
  let match;
  while ((match = regex.exec(text)) !== null) {
    results.push({
      documentId: match[1],
      blockId: match[2] || undefined,
      full: match[0],
    });
  }
  return results;
}

/** Convert text to a valid block_id slug */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
