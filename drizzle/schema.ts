import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, bigint } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * MeDF documents table - stores the full MeDF v0.2.1 JSON document
 */
export const documents = mysqlTable("documents", {
  id: int("id").autoincrement().primaryKey(),
  /** MeDF document ID (e.g., "paper-2026-example") */
  medfId: varchar("medfId", { length: 256 }).notNull(),
  /** MeDF version */
  medfVersion: varchar("medfVersion", { length: 16 }).notNull().default("0.2.1"),
  /** Document title extracted from first block or metadata */
  title: varchar("title", { length: 512 }).notNull(),
  /** Issuer identifier */
  issuer: varchar("issuer", { length: 256 }).notNull(),
  /** Document type (e.g., philosophy, report, etc.) */
  documentType: varchar("documentType", { length: 64 }),
  /** ISO 8601 snapshot timestamp */
  snapshot: varchar("snapshot", { length: 64 }).notNull(),
  /** Language code */
  language: varchar("language", { length: 8 }).default("ja"),
  /** Full MeDF JSON stored as text */
  medfJson: text("medfJson").notNull(),
  /** Document hash (sha-256) */
  docHash: varchar("docHash", { length: 128 }),
  /** Simulated IPFS CID */
  ipfsCid: varchar("ipfsCid", { length: 128 }),
  /** User who uploaded/created the document */
  userId: int("userId").notNull(),
  /** Number of blocks */
  blockCount: int("blockCount").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

/**
 * MeDF blocks table - stores individual blocks for search and reference
 */
export const blocks = mysqlTable("blocks", {
  id: int("id").autoincrement().primaryKey(),
  /** FK to documents table */
  documentId: int("documentId").notNull(),
  /** Block ID within the MeDF document */
  blockId: varchar("blockId", { length: 256 }).notNull(),
  /** Block role (body, abstract, methodology, etc.) */
  role: varchar("role", { length: 64 }).notNull(),
  /** Block format (markdown, plain, etc.) */
  format: varchar("format", { length: 32 }).notNull().default("markdown"),
  /** Block text content */
  textContent: text("textContent").notNull(),
  /** Block hash (sha-256) */
  blockHash: varchar("blockHash", { length: 128 }),
  /** Order within the document */
  sortOrder: int("sortOrder").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Block = typeof blocks.$inferSelect;
export type InsertBlock = typeof blocks.$inferInsert;

/**
 * Comments/discussions on specific blocks
 */
export const comments = mysqlTable("comments", {
  id: int("id").autoincrement().primaryKey(),
  /** FK to documents table */
  documentId: int("documentId").notNull(),
  /** Block ID being commented on (nullable for document-level comments) */
  blockId: varchar("blockId", { length: 256 }),
  /** FK to parent comment for threading */
  parentId: int("parentId"),
  /** FK to users table */
  userId: int("userId").notNull(),
  /** Comment content (supports markdown) */
  content: text("content").notNull(),
  /** MEDF citation format (e.g., "MEDF: doc#block") */
  citation: varchar("citation", { length: 512 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Comment = typeof comments.$inferSelect;
export type InsertComment = typeof comments.$inferInsert;

/**
 * Reference tracking between documents/blocks
 */
export const references = mysqlTable("doc_references", {
  id: int("id").autoincrement().primaryKey(),
  /** Source document ID (FK) */
  sourceDocId: int("sourceDocId").notNull(),
  /** Source block ID within the document */
  sourceBlockId: varchar("sourceBlockId", { length: 256 }),
  /** Target MeDF document ID string */
  targetMedfId: varchar("targetMedfId", { length: 256 }).notNull(),
  /** Target block ID */
  targetBlockId: varchar("targetBlockId", { length: 256 }),
  /** Full citation string */
  citation: varchar("citation", { length: 512 }).notNull(),
  /** Whether the target document exists in our system */
  resolved: int("resolved").notNull().default(0),
  /** Target document ID (FK, nullable if unresolved) */
  targetDocId: int("targetDocId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Reference = typeof references.$inferSelect;
export type InsertReference = typeof references.$inferInsert;
