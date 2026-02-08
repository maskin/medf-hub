# MeDF Hub: IPFS-Based Document Sharing & Discussion Platform

**Version**: 1.0.0  
**Language**: English | [日本語](./README.md)  
**License**: MIT

---

## Overview

MeDF Hub is a decentralized document sharing and discussion platform built on **IPFS** and the **MeDF (Meaning-anchored Document Format) v0.2.1** specification. It enables researchers, teams, and communities to publish, verify, discuss, and track scholarly documents with cryptographic integrity.

### Key Features

- **MeDF Document Management**: Create, edit, and store documents in the standardized MeDF v0.2.1 format
- **Block-Level Discussion**: Comment on specific document sections with threaded replies
- **Cryptographic Verification**: RFC 8785-compliant JSON canonicalization and SHA-256 hashing
- **Version Control**: Automatic snapshots with diff tracking and rollback capability
- **IPFS Integration**: Publish to IPFS via Pinata with gateway access
- **Reference Tracking**: Auto-detect and visualize MEDF citations between documents
- **Multiple Export Formats**: Export as HTML, PDF, or JSON
- **Offline Verification**: Client-side verification using Web Crypto API

---

## Architecture

### Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, TypeScript, Tailwind CSS 4 |
| **Backend** | Express 4, tRPC 11, Node.js |
| **Database** | MySQL/TiDB with Drizzle ORM |
| **Storage** | IPFS (via Pinata), S3 |
| **Authentication** | Manus OAuth |
| **Testing** | Vitest (35+ tests) |

### System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
│  ┌──────────────┬──────────────┬──────────────────────┐ │
│  │ Document     │ Document     │ Document View        │ │
│  │ List         │ Create/Edit  │ (Blocks, Comments,   │ │
│  │              │              │  Versions, IPFS)     │ │
│  └──────────────┴──────────────┴──────────────────────┘ │
└────────────────────────┬────────────────────────────────┘
                         │ tRPC
┌────────────────────────▼────────────────────────────────┐
│                  Backend (Express + tRPC)               │
│  ┌──────────────┬──────────────┬──────────────────────┐ │
│  │ Document API │ Comment API  │ Version API          │ │
│  │ IPFS API     │ Reference API│ Export API           │ │
│  └──────────────┴──────────────┴──────────────────────┘ │
└────────────────────────┬────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
┌───────▼──────┐  ┌──────▼──────┐  ┌─────▼────────┐
│   Database   │  │ IPFS/Pinata │  │ S3 Storage   │
│   (MySQL)    │  │ (CID, URLs) │  │ (Files)      │
└──────────────┘  └─────────────┘  └──────────────┘
```

---

## Core Capabilities

### 1. Document Management

**Supported Formats**:
- Markdown (auto-converted to MeDF)
- MeDF v0.2.1 JSON (native format)

**Operations**:
- Create new documents
- Upload existing MeDF JSON files
- Edit document content and metadata
- Delete documents with cascade cleanup

**Metadata**:
- Title, description, author
- Creation/update timestamps
- Document hash (RFC 8785)
- IPFS CID (when published)

### 2. Block-Level Discussion

**Comment Features**:
- Post comments on specific document blocks
- Reply to comments (threaded)
- Auto-detect MEDF references (format: `MEDF: doc-id#block-id`)
- Reference visualization and linking

**Reference Format**:
```
MEDF: document-id#block-id
```

Example: `MEDF: doc-001#block-2` references block 2 of document doc-001

### 3. Cryptographic Verification

**Verification Methods**:
- **Block-level**: Verify individual block integrity
- **Document-level**: Verify complete document structure
- **Offline**: Client-side verification using Web Crypto API

**Hash Algorithm**:
- RFC 8785 JSON canonicalization
- SHA-256 hashing
- Deterministic output (same input = same hash)

### 4. Version Control

**Snapshot Management**:
- Automatic version creation on document updates
- Version history with timestamps
- Block-level diff display (added/deleted/modified)
- Rollback to any previous version

**Diff Visualization**:
- Color-coded changes (green=added, red=deleted, yellow=modified)
- Side-by-side comparison
- Change summary

### 5. IPFS Integration

**Publishing Options**:
- **Pinata API**: Persistent pinning (requires API key)
- **CID Simulation**: Deterministic CID generation (no API key needed)

**Gateway Access**:
- ipfs.io
- gateway.pinata.cloud
- cloudflare-ipfs.com

**Status Monitoring**:
- Check if document is available on IPFS
- Unpin documents when needed

### 6. Reference Tracking

**Auto-Detection**:
- Scans document content for MEDF references
- Automatically creates reference records
- Builds citation graph

**Reference Graph**:
- Incoming references (documents citing this one)
- Outgoing references (documents this one cites)
- Bidirectional tracking

### 7. Export Capabilities

**Formats**:
- **HTML**: Full metadata, TOC, block hashes, verification info
- **PDF**: Via browser print dialog
- **JSON**: MeDF format for re-import

---

## Getting Started

### Prerequisites

- Node.js 16+ and npm/pnpm
- MySQL 5.7+ or TiDB
- (Optional) Pinata account for IPFS pinning

### Installation

```bash
# Clone repository
git clone https://github.com/maskin/medf-hub.git
cd medf-hub

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database URL and API keys

# Run migrations
pnpm db:push

# Start development server
pnpm dev
```

### Quick Start (5 Minutes)

1. **Open the app**: Navigate to http://localhost:3000
2. **Create a document**: Click "New Document" → Choose format (Markdown or MeDF JSON)
3. **Add content**: Enter title, author, and content
4. **View document**: Click on document to see blocks and verification info
5. **Add comment**: Click on a block → Type comment → Post
6. **Publish to IPFS**: Click "Publish to IPFS" button (optional, requires API key)

---

## API Reference

### Document Operations

#### Create Document
```typescript
documents.create({
  title: string,
  content: string,
  format: "markdown" | "medf-json",
  description?: string
})
```

#### Get Document
```typescript
documents.get(id: string)
// Returns: { id, title, author, blocks[], hash, ipfsCid, ... }
```

#### List Documents
```typescript
documents.list({
  search?: string,
  author?: string,
  limit?: number,
  offset?: number
})
```

#### Update Document
```typescript
documents.update(id: string, {
  title?: string,
  content?: string
})
```

#### Delete Document
```typescript
documents.delete(id: string)
```

### Comment Operations

#### Create Comment
```typescript
comments.create({
  documentId: string,
  blockId: string,
  content: string,
  parentId?: string  // For replies
})
```

#### List Comments
```typescript
comments.list(documentId: string, blockId: string)
```

#### Reply to Comment
```typescript
comments.reply(commentId: string, content: string)
```

### Version Management

#### Create Version
```typescript
versions.create(documentId: string)
```

#### List Versions
```typescript
versions.list(documentId: string)
```

#### Get Diff
```typescript
versions.diff(
  documentId: string,
  versionId1: string,
  versionId2: string
)
```

#### Rollback
```typescript
versions.rollback(documentId: string, versionId: string)
```

### IPFS Operations

#### Pin Document
```typescript
ipfs.pin(documentId: string)
// Returns: { cid, urls: { ipfs, pinata, cloudflare } }
```

#### Unpin Document
```typescript
ipfs.unpin(documentId: string)
```

#### Get Status
```typescript
ipfs.getStatus(cid: string)
// Returns: { available: boolean, urls: {...} }
```

### Export Operations

#### Export to HTML
```typescript
export.html(documentId: string)
// Returns: HTML file download
```

#### Export to PDF
```typescript
export.pdf(documentId: string)
// Triggers browser print dialog
```

#### Export to JSON
```typescript
export.json(documentId: string)
// Returns: MeDF JSON file download
```

---

## File Structure

```
medf-hub/
├── client/                          # Frontend React application
│   ├── src/
│   │   ├── pages/                  # Page components
│   │   │   ├── Home.tsx
│   │   │   ├── DocumentList.tsx
│   │   │   ├── DocumentView.tsx
│   │   │   ├── DocumentCreate.tsx
│   │   │   ├── DocumentEdit.tsx
│   │   │   └── MarkdownConverter.tsx
│   │   ├── components/             # Reusable components
│   │   ├── lib/                    # Utilities (medf-crypto, trpc)
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   └── package.json
├── server/                          # Backend Express + tRPC
│   ├── routers.ts                  # tRPC procedure definitions
│   ├── db.ts                       # Database query helpers
│   ├── storage.ts                  # S3 storage helpers
│   └── _core/                      # Framework plumbing
├── drizzle/                         # Database schema & migrations
│   ├── schema.ts
│   └── migrations/
├── shared/                          # Shared types and utilities
│   ├── medf.ts                     # MeDF types and utilities
│   └── const.ts
├── docs/                            # Documentation
│   ├── SPECIFICATION.md            # Technical specification
│   ├── USER_MANUAL.md              # User guide
│   ├── API_REFERENCE.md            # API documentation
│   └── SIMILAR_PROJECTS.md         # Comparison with other projects
├── README.md                        # Japanese README
├── README.en.md                     # English README
└── package.json
```

---

## Testing

### Run Tests

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test -- server/medf.test.ts

# Watch mode
pnpm test -- --watch
```

### Test Coverage

- 35+ Vitest unit tests
- Document creation and conversion
- Hash verification (RFC 8785)
- Comment threading
- Version management
- Reference detection
- IPFS operations

---

## Development Workflow

### 1. Create Database Schema

Edit `drizzle/schema.ts`, then:

```bash
pnpm drizzle-kit generate
# Review generated migration SQL
pnpm db:push  # Apply migration
```

### 2. Add Backend API

Add procedures to `server/routers.ts`:

```typescript
myFeature: protectedProcedure
  .input(z.object({ /* ... */ }))
  .mutation(async ({ input, ctx }) => {
    // Implementation
  })
```

### 3. Add Frontend UI

Create component in `client/src/pages/` or `client/src/components/`:

```typescript
const { data } = trpc.myFeature.useQuery();
const mutation = trpc.myFeature.useMutation();
```

### 4. Write Tests

Add tests to `server/*.test.ts`:

```typescript
describe('myFeature', () => {
  test('should work', () => {
    // Test implementation
  });
});
```

### 5. Create Checkpoint

```bash
# After completing a feature
pnpm build
# Verify everything works
# Then create checkpoint via UI
```

---

## Deployment

### Prerequisites

- Manus hosting account
- Custom domain (optional)
- Pinata API keys (optional, for IPFS)

### Deployment Steps

1. **Create checkpoint**: Ensure all changes are committed
2. **Click Publish button**: In Management UI
3. **Configure domain**: Set custom domain or use auto-generated
4. **Set environment variables**: Via Settings panel
5. **Monitor**: Check Dashboard for traffic and errors

### Environment Variables

```bash
# Database
DATABASE_URL=mysql://user:pass@host/database

# OAuth
VITE_APP_ID=your_app_id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://login.manus.im

# IPFS (optional)
PINATA_API_KEY=your_pinata_key
PINATA_API_SECRET=your_pinata_secret

# Storage
BUILT_IN_FORGE_API_URL=https://forge.manus.im
BUILT_IN_FORGE_API_KEY=your_forge_key
```

---

## Troubleshooting

### Hash Verification Fails

**Problem**: Document hash doesn't match  
**Solution**: Ensure RFC 8785 canonicalization is applied consistently. Check for whitespace, key order, and number formatting differences.

### IPFS CID Generation Differs

**Problem**: CID from Pinata differs from local calculation  
**Solution**: Verify you're using SHA-256 and correct CID format. Pinata uses CIDv1; ensure consistency with your implementation.

### Comments Not Appearing

**Problem**: Comments created but not visible  
**Solution**: Check that block IDs are stable and don't change on document updates. Use deterministic ID generation.

### Reference Detection Missing Citations

**Problem**: Some MEDF references not detected  
**Solution**: Verify regex pattern matches your reference format exactly. Test with sample documents.

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Related Projects

- **[OrbitDB](https://orbitdb.org/)**: Serverless P2P database
- **[Ceramic Protocol](https://ceramic.network/)**: Decentralized event streams
- **[MeDF Specification](https://github.com/maskin/medf)**: Document format specification

---

## Support

For issues, questions, or suggestions:

1. Check [FAQ](docs/USER_MANUAL.md#faq)
2. Review [API Reference](docs/API_REFERENCE.md)
3. Open an issue on GitHub
4. Contact: [support@example.com]

---

**Made with ❤️ by Manus AI**  
**Last Updated**: 2026-02-08
