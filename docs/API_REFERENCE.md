# MeDF Hub - API リファレンス

**バージョン**: 1.0  
**ベースURL**: `https://your-domain.manus.space/api/trpc`  
**認証**: Session Cookie (Manus OAuth)

---

## 目次

1. [認証](#認証)
2. [エラーハンドリング](#エラーハンドリング)
3. [文書API](#文書api)
4. [コメントAPI](#コメントapi)
5. [参照API](#参照api)
6. [バージョンAPI](#バージョンapi)
7. [IPFSAPI](#ipfsapi)
8. [エクスポートAPI](#エクスポートapi)
9. [型定義](#型定義)

---

## 認証

### セッションベース認証

すべてのAPI呼び出しはセッションクッキーで認証されます。

```javascript
// クライアント側（自動処理）
const response = await trpc.document.getById.useQuery({ id: 1 });

// サーバー側でユーザー情報を取得
const { user } = ctx; // ctx.user は自動注入
```

### 保護されたエンドポイント

`protectedProcedure` で定義されたエンドポイントは認証が必須です。

```typescript
// 認証が必要
export const protectedRouter = router({
  create: protectedProcedure
    .input(z.object({ title: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // ctx.user は常に存在
      const userId = ctx.user.id;
      // ...
    }),
});

// 認証不要
export const publicRouter = router({
  list: publicProcedure
    .input(z.object({ limit: z.number() }))
    .query(async ({ input }) => {
      // ctx.user は null の可能性あり
      // ...
    }),
});
```

---

## エラーハンドリング

### エラーレスポンス形式

```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "Invalid input: title is required"
  }
}
```

### エラーコード一覧

| コード | HTTP | 説明 |
|-------|------|------|
| `BAD_REQUEST` | 400 | 入力値が不正 |
| `UNAUTHORIZED` | 401 | 認証が必要 |
| `FORBIDDEN` | 403 | 権限がない |
| `NOT_FOUND` | 404 | リソースが見つからない |
| `INTERNAL_SERVER_ERROR` | 500 | サーバーエラー |

### エラーハンドリング例

```typescript
try {
  const result = await trpc.document.create.mutate({
    medfJson: invalidJson,
  });
} catch (error) {
  if (error.data?.code === 'BAD_REQUEST') {
    console.error('入力値が不正です:', error.message);
  } else if (error.data?.code === 'UNAUTHORIZED') {
    console.error('ログインが必要です');
  }
}
```

---

## 文書API

### document.create

新しい文書を作成します。

**エンドポイント**: `POST /api/trpc/document.create`

**認証**: 必須

**リクエスト**:

```typescript
{
  medfJson: MedfDocument; // MeDF v0.2.1 形式
}
```

**レスポンス**:

```typescript
{
  id: number;
  medfId: string;
  title: string;
  docHash: string;
  ipfsCid: string;
  blockCount: number;
}
```

**例**:

```javascript
const result = await trpc.document.create.mutate({
  medfJson: {
    medf_version: "0.2.1",
    id: "my-document",
    issuer: "author",
    snapshot: new Date().toISOString(),
    blocks: [
      {
        block_id: "intro",
        role: "content",
        format: "markdown",
        text: "# Introduction\n\nContent here",
      },
    ],
  },
});

console.log(result.id); // 1
console.log(result.docHash); // "abc123..."
```

### document.getById

IDで文書を取得します。

**エンドポイント**: `GET /api/trpc/document.getById`

**認証**: 不要

**リクエスト**:

```typescript
{
  id: number;
}
```

**レスポンス**:

```typescript
{
  id: number;
  userId: number;
  medfId: string;
  title: string;
  issuer: string;
  documentType: string | null;
  snapshot: Date;
  medfJson: string; // JSON文字列
  docHash: string;
  ipfsCid: string;
  blockCount: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### document.getByMedfId

medfIdで文書を取得します。

**エンドポイント**: `GET /api/trpc/document.getByMedfId`

**認証**: 不要

**リクエスト**:

```typescript
{
  medfId: string;
}
```

**レスポンス**: `document.getById` と同じ

### document.list

文書一覧を取得します。

**エンドポイント**: `GET /api/trpc/document.list`

**認証**: 不要

**リクエスト**:

```typescript
{
  search?: string;      // タイトル・ID・発行者で検索
  limit?: number;       // デフォルト: 10
  offset?: number;      // デフォルト: 0
}
```

**レスポンス**:

```typescript
{
  items: Array<{
    id: number;
    medfId: string;
    title: string;
    issuer: string;
    snapshot: Date;
    blockCount: number;
  }>;
  total: number;
}
```

**例**:

```javascript
const result = await trpc.document.list.useQuery({
  search: "introduction",
  limit: 20,
  offset: 0,
});

console.log(result.items.length); // 最大20件
console.log(result.total); // 全体の件数
```

### document.update

文書を更新します。

**エンドポイント**: `POST /api/trpc/document.update`

**認証**: 必須

**リクエスト**:

```typescript
{
  id: number;
  medfJson: MedfDocument;
  changeSummary?: string; // 変更概要（オプション）
}
```

**レスポンス**:

```typescript
{
  id: number;
  docHash: string;
  ipfsCid: string;
  medf: MedfDocument;
}
```

**注意**: 更新時に前のバージョンが自動保存されます。

### document.delete

文書を削除します。

**エンドポイント**: `POST /api/trpc/document.delete`

**認証**: 必須（所有者のみ）

**リクエスト**:

```typescript
{
  id: number;
}
```

**レスポンス**:

```typescript
{
  success: boolean;
}
```

### document.convertMarkdown

Markdownを MeDF 形式に変換します。

**エンドポイント**: `POST /api/trpc/document.convertMarkdown`

**認証**: 必須

**リクエスト**:

```typescript
{
  markdown: string;           // Markdown テキスト
  documentId?: string;        // 自動生成（オプション）
  issuer?: string;            // デフォルト: "user"
  documentType?: string;      // オプション
}
```

**レスポンス**:

```typescript
{
  medf: MedfDocument;
  title: string;
  blockCount: number;
}
```

**例**:

```javascript
const result = await trpc.document.convertMarkdown.mutate({
  markdown: `# My Document\n\n## Section 1\n\nContent here`,
  documentId: "my-doc",
  issuer: "author-name",
});

console.log(result.medf.blocks.length); // ブロック数
```

---

## コメントAPI

### comment.list

コメント一覧を取得します。

**エンドポイント**: `GET /api/trpc/comment.list`

**認証**: 不要

**リクエスト**:

```typescript
{
  documentId: number;
  blockId?: string; // ブロック指定時のみそのブロックのコメント
}
```

**レスポンス**:

```typescript
Array<{
  id: number;
  documentId: number;
  blockId: string | null;
  parentId: number | null;
  userId: number;
  content: string;
  citation: string | null;
  createdAt: Date;
  user: {
    id: number;
    name: string;
  };
  replies?: Array<...>; // ネストされた返信
}>
```

### comment.create

コメントを作成します。

**エンドポイント**: `POST /api/trpc/comment.create`

**認証**: 必須

**リクエスト**:

```typescript
{
  documentId: number;
  blockId?: string;         // ブロック指定（オプション）
  parentId?: number;        // 返信時に親コメントID
  content: string;          // コメント本文
  citation?: string;        // MEDF引用（オプション）
}
```

**レスポンス**:

```typescript
{
  id: number;
}
```

**例**:

```javascript
// ブロック単位のコメント
const result = await trpc.comment.create.mutate({
  documentId: 1,
  blockId: "introduction",
  content: "Great introduction!",
});

// 返信
const reply = await trpc.comment.create.mutate({
  documentId: 1,
  parentId: result.id,
  content: "I agree!",
});

// 引用付きコメント
const cited = await trpc.comment.create.mutate({
  documentId: 1,
  content: "See MEDF: other-doc#section for more details",
  citation: "MEDF: other-doc#section",
});
```

### comment.delete

コメントを削除します。

**エンドポイント**: `POST /api/trpc/comment.delete`

**認証**: 必須（投稿者のみ）

**リクエスト**:

```typescript
{
  id: number;
}
```

**レスポンス**:

```typescript
{
  success: boolean;
}
```

---

## 参照API

### reference.outgoing

文書から参照している先を取得します。

**エンドポイント**: `GET /api/trpc/reference.outgoing`

**認証**: 不要

**リクエスト**:

```typescript
{
  documentId: number;
}
```

**レスポンス**:

```typescript
Array<{
  id: number;
  sourceDocId: number;
  sourceBlockId: string | null;
  targetMedfId: string;
  targetBlockId: string | null;
  citation: string;
}>
```

### reference.incoming

文書を参照している元を取得します。

**エンドポイント**: `GET /api/trpc/reference.incoming`

**認証**: 不要

**リクエスト**:

```typescript
{
  medfId: string;
}
```

**レスポンス**:

```typescript
Array<{
  id: number;
  sourceDocId: number;
  sourceBlockId: string | null;
  targetMedfId: string;
  targetBlockId: string | null;
  citation: string;
}>
```

---

## バージョンAPI

### version.list

バージョン一覧を取得します。

**エンドポイント**: `GET /api/trpc/version.list`

**認証**: 不要

**リクエスト**:

```typescript
{
  documentId: number;
}
```

**レスポンス**:

```typescript
Array<{
  id: number;
  documentId: number;
  versionNumber: number;
  title: string;
  docHash: string;
  blockCount: number;
  changeSummary: string | null;
  createdAt: Date;
}>
```

### version.getById

特定バージョンを取得します。

**エンドポイント**: `GET /api/trpc/version.getById`

**認証**: 不要

**リクエスト**:

```typescript
{
  versionId: number;
}
```

**レスポンス**:

```typescript
{
  id: number;
  documentId: number;
  versionNumber: number;
  medfJson: string;
  docHash: string;
  ipfsCid: string;
  blockCount: number;
  changeSummary: string | null;
  createdAt: Date;
}
```

### version.rollback

指定バージョンに戻します。

**エンドポイント**: `POST /api/trpc/version.rollback`

**認証**: 必須（所有者のみ）

**リクエスト**:

```typescript
{
  documentId: number;
  versionId: number;
}
```

**レスポンス**:

```typescript
{
  success: boolean;
  newVersionNumber: number;
}
```

---

## IPFSAPI

### ipfs.pin

文書をIPFSにピンします。

**エンドポイント**: `POST /api/trpc/ipfs.pin`

**認証**: 必須

**リクエスト**:

```typescript
{
  documentId: number;
}
```

**レスポンス**:

```typescript
{
  success: boolean;
  cid: string;
  gateway: string;
  pinataGateway: string;
}
```

**注意**: Pinata APIキーが設定されていない場合、シミュレーション値を返します。

### ipfs.unpin

ピンを解除します。

**エンドポイント**: `POST /api/trpc/ipfs.unpin`

**認証**: 必須

**リクエスト**:

```typescript
{
  documentId: number;
}
```

**レスポンス**:

```typescript
{
  success: boolean;
}
```

### ipfs.status

CIDの状態を確認します。

**エンドポイント**: `GET /api/trpc/ipfs.status`

**認証**: 不要

**リクエスト**:

```typescript
{
  cid: string;
}
```

**レスポンス**:

```typescript
{
  accessible: boolean;
  gateway: string;
  pinataGateway: string;
}
```

---

## エクスポートAPI

### export.html

HTML形式で出力します。

**エンドポイント**: `GET /api/trpc/export.html`

**認証**: 不要

**リクエスト**:

```typescript
{
  documentId: number;
}
```

**レスポンス**:

```typescript
{
  html: string;
  filename: string;
}
```

### export.pdf

PDF用HTML形式で出力します。

**エンドポイント**: `GET /api/trpc/export.pdf`

**認証**: 不要

**リクエスト**:

```typescript
{
  documentId: number;
}
```

**レスポンス**:

```typescript
{
  html: string;
  filename: string;
}
```

---

## 型定義

### MedfDocument

```typescript
interface MedfDocument {
  medf_version: "0.2.1";
  id: string;
  issuer: string;
  snapshot: string; // ISO 8601
  document_type?: string;
  blocks: MedfBlock[];
  doc_hash?: {
    algorithm: "sha-256";
    value: string;
  };
}

interface MedfBlock {
  block_id: string;
  role: string;
  format: string;
  text: string;
  block_hash?: string;
}
```

### User

```typescript
interface User {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  role: "user" | "admin";
  createdAt: Date;
  updatedAt: Date;
  lastSignedIn: Date;
}
```

### Document

```typescript
interface Document {
  id: number;
  userId: number;
  medfId: string;
  medfVersion: string;
  title: string;
  issuer: string;
  documentType: string | null;
  snapshot: Date;
  medfJson: string;
  docHash: string;
  ipfsCid: string;
  blockCount: number;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 開発者向けガイド

### tRPC クライアントの使用

```typescript
import { trpc } from "@/lib/trpc";

// クエリ（読み取り）
const { data, isLoading } = trpc.document.getById.useQuery(
  { id: 1 },
  { enabled: true }
);

// ミューテーション（書き込み）
const createMutation = trpc.document.create.useMutation({
  onSuccess: (data) => {
    console.log("Created:", data.id);
  },
  onError: (error) => {
    console.error("Error:", error.message);
  },
});

createMutation.mutate({ medfJson: {...} });
```

### エラーハンドリング

```typescript
try {
  const result = await trpc.document.create.mutate({
    medfJson: {...},
  });
} catch (error) {
  const code = error.data?.code;
  const message = error.message;
  
  switch (code) {
    case 'BAD_REQUEST':
      // 入力値の検証エラー
      break;
    case 'UNAUTHORIZED':
      // ログインが必要
      break;
    case 'FORBIDDEN':
      // 権限がない
      break;
    case 'NOT_FOUND':
      // リソースが見つからない
      break;
  }
}
```

### キャッシング

```typescript
const utils = trpc.useUtils();

// キャッシュを無効化
await utils.document.list.invalidate();

// キャッシュを更新
utils.document.getById.setData(
  { id: 1 },
  (old) => ({ ...old, title: "New Title" })
);
```

---

**作成者**: Manus AI  
**ライセンス**: MIT  
**最終更新**: 2026年2月8日
