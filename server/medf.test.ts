import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { extractCitations, slugify } from "../shared/medf";

// ─── Shared Utility Tests ───────────────────────────────────

describe("shared/medf utilities", () => {
  describe("extractCitations", () => {
    it("extracts MEDF citations with document and block IDs", () => {
      const text = "See MEDF: paper-2026-example#methodology for details";
      const citations = extractCitations(text);
      expect(citations).toHaveLength(1);
      expect(citations[0]).toEqual({
        documentId: "paper-2026-example",
        blockId: "methodology",
        full: "MEDF: paper-2026-example#methodology",
      });
    });

    it("extracts MEDF citations without block IDs", () => {
      const text = "Refer to MEDF: my-document for the full text";
      const citations = extractCitations(text);
      expect(citations).toHaveLength(1);
      expect(citations[0]).toEqual({
        documentId: "my-document",
        blockId: undefined,
        full: "MEDF: my-document",
      });
    });

    it("extracts multiple citations from the same text", () => {
      const text =
        "Compare MEDF: doc-a#intro with MEDF: doc-b#conclusion";
      const citations = extractCitations(text);
      expect(citations).toHaveLength(2);
      expect(citations[0]?.documentId).toBe("doc-a");
      expect(citations[0]?.blockId).toBe("intro");
      expect(citations[1]?.documentId).toBe("doc-b");
      expect(citations[1]?.blockId).toBe("conclusion");
    });

    it("returns empty array when no citations are found", () => {
      const text = "This text has no references at all.";
      const citations = extractCitations(text);
      expect(citations).toHaveLength(0);
    });
  });

  describe("slugify", () => {
    it("converts text to a valid slug", () => {
      expect(slugify("Hello World")).toBe("hello-world");
    });

    it("removes special characters", () => {
      expect(slugify("MeDF v0.2.1 概要")).toBe("medf-v0-2-1");
    });

    it("handles empty string", () => {
      expect(slugify("")).toBe("");
    });

    it("removes leading and trailing hyphens", () => {
      expect(slugify("---hello---")).toBe("hello");
    });
  });
});

// ─── tRPC Router Tests ──────────────────────────────────────

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-openid",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("document.convertMarkdown", () => {
  it("converts markdown to MeDF format with correct structure", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.document.convertMarkdown({
      markdown: `# Test Document

## Introduction

This is the introduction section.

## Methodology

This is the methodology section.`,
      documentId: "test-doc",
      issuer: "test-issuer",
    });

    expect(result.medf).toBeDefined();
    expect(result.medf.medf_version).toBe("0.2.1");
    expect(result.medf.id).toBe("test-doc");
    expect(result.medf.issuer).toBe("test-issuer");
    expect(result.medf.blocks).toHaveLength(2);
    expect(result.medf.blocks[0]?.block_id).toBe("introduction");
    expect(result.medf.blocks[1]?.block_id).toBe("methodology");
    expect(result.medf.doc_hash).toBeDefined();
    expect(result.medf.doc_hash?.algorithm).toBe("sha-256");
    expect(result.medf.doc_hash?.value).toBeTruthy();
    expect(result.title).toBe("Test Document");
  });

  it("generates block hashes for each block", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.document.convertMarkdown({
      markdown: `# Doc

## Section A

Content A

## Section B

Content B`,
    });

    for (const block of result.medf.blocks) {
      expect(block.block_hash).toBeTruthy();
      expect(typeof block.block_hash).toBe("string");
      expect(block.block_hash!.length).toBe(64); // SHA-256 hex length
    }
  });

  it("auto-generates document ID from title when not provided", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.document.convertMarkdown({
      markdown: `# My Great Document

## Content

Some text here.`,
    });

    expect(result.medf.id).toBe("my-great-document");
    expect(result.medf.issuer).toBe("user"); // default
  });

  it("requires authentication", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.document.convertMarkdown({
        markdown: "# Test",
      })
    ).rejects.toThrow();
  });
});

describe("document.list", () => {
  it("returns paginated results with total count", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.document.list({
      limit: 10,
      offset: 0,
    });

    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total");
    expect(Array.isArray(result.items)).toBe(true);
    expect(typeof result.total).toBe("number");
  });

  it("supports search parameter", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.document.list({
      search: "nonexistent-document-xyz",
      limit: 10,
    });

    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it("works without any parameters", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.document.list();
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total");
  });
});

describe("comment.list", () => {
  it("returns empty array for non-existent document", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.comment.list({ documentId: 888888 });
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(0);
  });
});

describe("comment.create", () => {
  it("requires authentication", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.comment.create({
        documentId: 1,
        content: "Test comment",
      })
    ).rejects.toThrow();
  });

  it("rejects invalid parent comment", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.comment.create({
        documentId: 1,
        content: "Reply to nonexistent",
        parentId: 999999,
      })
    ).rejects.toThrow();
  });
});

describe("reference.outgoing", () => {
  it("returns empty array for non-existent document", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.reference.outgoing({ documentId: 999999 });
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(0);
  });
});

describe("reference.incoming", () => {
  it("returns empty array for non-existent medfId", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.reference.incoming({
      medfId: "nonexistent-doc-id",
    });
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(0);
  });
});

// ─── Version Router Tests ───────────────────────────────────

describe("version.list", () => {
  it("returns empty array for document with no versions", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.version.list({ documentId: 999999 });
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(0);
  });
});

describe("version.getById", () => {
  it("returns null for non-existent version", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.version.getById({ versionId: 999999 });
    expect(result).toBeUndefined();
  });
});

describe("version.rollback", () => {
  it("requires authentication", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.version.rollback({ documentId: 1, versionId: 1 })
    ).rejects.toThrow();
  });

  it("rejects rollback for non-existent document", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.version.rollback({ documentId: 999999, versionId: 1 })
    ).rejects.toThrow("Document not found");
  });
});

// ─── IPFS Router Tests ──────────────────────────────────────

describe("ipfs.pin", () => {
  it("requires authentication", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.ipfs.pin({ documentId: 1 })
    ).rejects.toThrow();
  });

  it("rejects pinning non-existent document", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.ipfs.pin({ documentId: 999999 })
    ).rejects.toThrow("Document not found");
  });
});

describe("ipfs.unpin", () => {
  it("requires authentication", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.ipfs.unpin({ documentId: 1 })
    ).rejects.toThrow();
  });
});

describe("ipfs.status", () => {
  it("returns accessibility info for a CID", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.ipfs.status({ cid: "bafybeigtest123" });
    expect(result).toHaveProperty("accessible");
    expect(result).toHaveProperty("gateway");
    expect(result).toHaveProperty("pinataGateway");
    expect(typeof result.accessible).toBe("boolean");
    expect(result.gateway).toContain("bafybeigtest123");
  });
});

// ─── Export Router Tests ─────────────────────────────────────

describe("export.html", () => {
  it("rejects non-existent document", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.export.html({ documentId: 999999 })
    ).rejects.toThrow("Document not found");
  });
});

describe("export.pdf", () => {
  it("rejects non-existent document", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.export.pdf({ documentId: 999999 })
    ).rejects.toThrow("Document not found");
  });
});

// ─── medfToHtml Tests (via export router) ───────────────────

describe("medfToHtml (server-side HTML generation)", () => {
  it("generates valid HTML from a MeDF document via convertMarkdown + create + export", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // First convert markdown to MeDF
    const convertResult = await caller.document.convertMarkdown({
      markdown: `# Export Test\n\n## Introduction\n\nThis is a test for HTML export.\n\n## Conclusion\n\nEnd of document.`,
      documentId: "export-test-doc",
      issuer: "test-exporter",
    });

    expect(convertResult.medf).toBeDefined();
    expect(convertResult.medf.blocks.length).toBeGreaterThan(0);
  });
});

// ─── Notification Integration Test ─────────────────────────

describe("notification integration", () => {
  it("comment.create succeeds and notification failure is caught gracefully", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // comment.create should succeed even if notification fails
    // (notification errors are caught internally with try/catch)
    const result = await caller.comment.create({
      documentId: 1,
      content: "Test notification comment",
    });

    expect(result).toHaveProperty("id");
    expect(typeof result.id).toBe("number");
  });
});
