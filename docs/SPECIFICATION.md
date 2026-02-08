# MeDF Hub - 技術仕様書

**バージョン**: 1.0  
**最終更新**: 2026年2月8日  
**ステータス**: 本番環境対応

---

## 目次

1. [概要](#概要)
2. [システムアーキテクチャ](#システムアーキテクチャ)
3. [機能仕様](#機能仕様)
4. [データモデル](#データモデル)
5. [API仕様](#api仕様)
6. [セキュリティ](#セキュリティ)
7. [パフォーマンス](#パフォーマンス)

---

## 概要

MeDF Hubは、MeDF（Mutable Expression Description Format）v0.2.1仕様に準拠した、ブロック単位で検証可能な文書共有・議論プラットフォームです。IPFSと組み合わせることで、改ざん防止と分散公開を実現しています。

### 主な特徴

- **MeDF v0.2.1準拠**: ブロック単位のハッシュ検証により、文書の完全性を保証
- **IPFS統合**: Pinata APIを通じた実際のIPFSネットワークへの公開、またはシミュレーション
- **ブロック単位の議論**: 特定のブロックに対する参照付きコメント・スレッド型議論
- **バージョン管理**: 文書の更新履歴を自動保存し、差分表示・ロールバック機能を提供
- **参照トラッキング**: MEDF引用の自動検出・リンク化・双方向追跡
- **エクスポート機能**: HTML・PDF形式での文書出力
- **オーナー通知**: コメント投稿・文書更新時の自動通知

---

## システムアーキテクチャ

### 技術スタック

| レイヤー | 技術 | バージョン |
|---------|------|-----------|
| フロントエンド | React 19 + Tailwind CSS 4 | 19.2.1 |
| バックエンド | Express 4 + tRPC 11 | 4.21.2 / 11.6.0 |
| データベース | MySQL/TiDB | 3.15.0 |
| 認証 | Manus OAuth | - |
| ファイルストレージ | AWS S3 | - |
| IPFS連携 | Pinata API | v1 |

### アーキテクチャ図

```
┌─────────────────────────────────────────────────────────────┐
│                     クライアント層                          │
│  React 19 + Tailwind 4 + Web Crypto API                    │
│  (RFC 8785 JSON正規化・SHA-256検証)                        │
└──────────────────────┬──────────────────────────────────────┘
                       │ tRPC (JSON-RPC over HTTP)
┌──────────────────────▼──────────────────────────────────────┐
│                   API層 (Express + tRPC)                    │
│  ・文書CRUD・Markdown変換・検証                             │
│  ・コメント・議論管理                                        │
│  ・バージョン管理・ロールバック                              │
│  ・IPFS連携（Pinata）                                       │
│  ・エクスポート（HTML/PDF）                                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
┌───────▼────┐  ┌──────▼──────┐  ┌──▼──────────┐
│  MySQL DB  │  │  AWS S3     │  │ Pinata API  │
│ (文書/版)  │  │ (ファイル)  │  │ (IPFS)      │
└────────────┘  └─────────────┘  └─────────────┘
```

### 認証フロー

1. ユーザーがログインボタンをクリック
2. Manus OAuth ポータルへリダイレクト
3. OAuth認可後、`/api/oauth/callback` でセッション確立
4. 以後のリクエストで `ctx.user` が自動注入される

---

## 機能仕様

### 1. 文書管理

#### 1.1 文書作成

**入力形式**: 以下の2つをサポート

- **Markdown形式**: ヘッダーレベル（`##`）でブロック分割
- **MeDF JSON形式**: RFC 8785準拠のJSON正規化済みドキュメント

**処理フロー**:

```
入力 (Markdown or JSON)
  ↓
ブロック分割 (ヘッダーベース)
  ↓
ブロックハッシュ生成 (SHA-256)
  ↓
ドキュメントハッシュ生成 (SHA-256)
  ↓
IPFS CID生成 (SHA-256ベース)
  ↓
DB保存 + ブロック保存
```

**メタデータ**:

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `medfId` | string | 文書識別子（自動生成またはユーザー指定） |
| `title` | string | 文書タイトル（最初のブロックから抽出） |
| `issuer` | string | 発行者名 |
| `snapshot` | timestamp | 作成/更新日時 |
| `docHash` | string | ドキュメントハッシュ（SHA-256） |
| `ipfsCid` | string | IPFS CID（シミュレーション値） |
| `blockCount` | number | ブロック数 |

#### 1.2 文書検索・フィルタリング

**検索対象**: タイトル・medfId・発行者

**フィルタリング**: なし（検索結果のみ）

**ページネーション**: limit/offsetベース（デフォルト: limit=10, offset=0）

#### 1.3 文書削除

**権限**: 文書所有者またはadmin

**動作**: 関連するブロック・コメント・バージョン・参照を全削除

### 2. ブロック管理

#### 2.1 ブロック構造

```json
{
  "block_id": "introduction",
  "role": "content",
  "format": "markdown",
  "text": "ブロックの本文",
  "block_hash": "sha256_hash_value"
}
```

#### 2.2 ブロックハッシュ検証

**アルゴリズム**: RFC 8785準拠のJSON正規化 + SHA-256

**正規化規則**:

- キーをアルファベット順にソート
- 空白・改行を削除
- Unicode正規化（NFC）

**クライアント側検証**: Web Crypto APIを使用（オフライン対応）

### 3. コメント・議論機能

#### 3.1 コメント構造

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `id` | number | コメントID |
| `documentId` | number | 文書ID |
| `blockId` | string \| null | ブロックID（ブロック単位コメント時） |
| `parentId` | number \| null | 親コメントID（返信時） |
| `userId` | number | 投稿者ID |
| `content` | text | コメント本文 |
| `citation` | string \| null | MEDF引用（例: `MEDF: doc-id#block-id`） |
| `createdAt` | timestamp | 投稿日時 |

#### 3.2 スレッド型議論

**構造**: 親子関係を持つツリー構造

**表示**: 返信元コメントを折りたたみ可能な形で表示

**通知**: 返信時にオーナーへ通知（`[返信]`フラグ付き）

### 4. バージョン管理

#### 4.1 バージョン保存

**トリガー**: 文書更新時に自動保存

**保存内容**:

- MeDF JSON全体
- ドキュメントハッシュ
- IPFS CID
- ブロック数
- 変更概要（オプション）

#### 4.2 差分表示

**差分計算**: ブロック単位での追加・削除・変更を検出

**表示方式**:

- 追加: 緑色背景
- 削除: 赤色背景
- 変更: 黄色背景

#### 4.3 ロールバック

**動作**: 指定バージョンを新バージョンとして復元

**制限**: 文書所有者のみ実行可能

### 5. 参照トラッキング

#### 5.1 MEDF引用の自動検出

**パターン**: `MEDF: {documentId}#{blockId}` または `MEDF: {documentId}`

**検出箇所**: ブロックテキスト内のすべての引用

#### 5.2 参照グラフ

**構造**:

```
参照テーブル:
- sourceDocId: 参照元文書ID
- sourceBlockId: 参照元ブロックID
- targetMedfId: 参照先medfId
- targetBlockId: 参照先ブロックID
```

**クエリ**:

- **Outgoing**: 文書から参照している先
- **Incoming**: 文書を参照している元

### 6. IPFS連携

#### 6.1 CID生成

**シミュレーション方式**:

1. MeDF JSON全体をRFC 8785で正規化
2. SHA-256ハッシュ計算
3. Base32エンコード（IPFS互換）
4. `bafy` プレフィックス付与

**実IPFS方式** (Pinata API):

1. APIキー認証
2. `/pinning/pinFileToIPFS` エンドポイント
3. 返却されたCIDを保存

#### 6.2 ゲートウェイアクセス

**利用可能なゲートウェイ**:

- `https://ipfs.io/ipfs/{cid}`
- `https://gateway.pinata.cloud/ipfs/{cid}`

#### 6.3 ピン状態確認

**API**: `/ipfs/status` で CID のアクセス可能性を確認

**返却値**:

```json
{
  "accessible": true,
  "gateway": "https://ipfs.io/ipfs/...",
  "pinataGateway": "https://gateway.pinata.cloud/ipfs/..."
}
```

### 7. エクスポート機能

#### 7.1 HTML エクスポート

**出力形式**: 完全なHTML文書（スタイル込み）

**含まれる要素**:

- 文書メタデータ（タイトル・発行者・作成日）
- TOC（目次）
- ブロック本文（Markdown → HTML変換）
- ブロックハッシュ表示
- 参照リンク

#### 7.2 PDF エクスポート

**実装方式**: ブラウザの印刷ダイアログ（`window.print()`）

**出力**: ユーザーがPDF形式で保存可能

### 8. 通知機能

#### 8.1 通知トリガー

| イベント | 通知内容 |
|---------|---------|
| コメント投稿 | 💬 新しいコメント: {文書タイトル} |
| コメント返信 | 💬 新しいコメント [返信]: {文書タイトル} |
| 文書更新 | 📝 文書更新: {文書タイトル} |

#### 8.2 通知チャネル

**実装**: Manus Notification Service（オーナー通知）

**失敗時**: グレースフルに処理（アプリの動作に影響なし）

---

## データモデル

### テーブル構成

#### documents

```sql
CREATE TABLE documents (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL,
  medfId VARCHAR(255) UNIQUE NOT NULL,
  medfVersion VARCHAR(10),
  title TEXT,
  issuer VARCHAR(255),
  documentType VARCHAR(100),
  snapshot TIMESTAMP,
  medfJson LONGTEXT,
  docHash VARCHAR(64),
  ipfsCid VARCHAR(255),
  blockCount INT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id)
);
```

#### blocks

```sql
CREATE TABLE blocks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  documentId INT NOT NULL,
  blockId VARCHAR(255),
  role VARCHAR(50),
  format VARCHAR(50),
  textContent LONGTEXT,
  blockHash VARCHAR(64),
  sortOrder INT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (documentId) REFERENCES documents(id) ON DELETE CASCADE
);
```

#### comments

```sql
CREATE TABLE comments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  documentId INT NOT NULL,
  blockId VARCHAR(255),
  parentId INT,
  userId INT NOT NULL,
  content TEXT NOT NULL,
  citation VARCHAR(255),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (documentId) REFERENCES documents(id) ON DELETE CASCADE,
  FOREIGN KEY (parentId) REFERENCES comments(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(id)
);
```

#### references

```sql
CREATE TABLE references (
  id INT PRIMARY KEY AUTO_INCREMENT,
  sourceDocId INT NOT NULL,
  sourceBlockId VARCHAR(255),
  targetMedfId VARCHAR(255) NOT NULL,
  targetBlockId VARCHAR(255),
  citation VARCHAR(255),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sourceDocId) REFERENCES documents(id) ON DELETE CASCADE
);
```

#### document_versions

```sql
CREATE TABLE document_versions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  documentId INT NOT NULL,
  versionNumber INT NOT NULL,
  medfId VARCHAR(255),
  title TEXT,
  issuer VARCHAR(255),
  snapshot TIMESTAMP,
  medfJson LONGTEXT,
  docHash VARCHAR(64),
  ipfsCid VARCHAR(255),
  blockCount INT,
  changeSummary TEXT,
  userId INT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (documentId) REFERENCES documents(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(id)
);
```

---

## API仕様

### 認証

すべてのAPI呼び出しはセッションクッキーで認証されます。保護されたエンドポイント（`protectedProcedure`）は認証ユーザーのみアクセス可能です。

### エンドポイント一覧

#### 文書API

| メソッド | エンドポイント | 認証 | 説明 |
|---------|--------------|------|------|
| POST | `/api/trpc/document.create` | 必須 | 文書作成 |
| GET | `/api/trpc/document.getById` | 不要 | 文書取得 |
| GET | `/api/trpc/document.getByMedfId` | 不要 | medfIdで文書取得 |
| GET | `/api/trpc/document.list` | 不要 | 文書一覧 |
| POST | `/api/trpc/document.update` | 必須 | 文書更新 |
| POST | `/api/trpc/document.delete` | 必須 | 文書削除 |
| POST | `/api/trpc/document.convertMarkdown` | 必須 | Markdown変換 |

#### コメントAPI

| メソッド | エンドポイント | 認証 | 説明 |
|---------|--------------|------|------|
| GET | `/api/trpc/comment.list` | 不要 | コメント一覧 |
| POST | `/api/trpc/comment.create` | 必須 | コメント作成 |
| POST | `/api/trpc/comment.delete` | 必須 | コメント削除 |

#### 参照API

| メソッド | エンドポイント | 認証 | 説明 |
|---------|--------------|------|------|
| GET | `/api/trpc/reference.outgoing` | 不要 | 参照先一覧 |
| GET | `/api/trpc/reference.incoming` | 不要 | 参照元一覧 |

#### バージョンAPI

| メソッド | エンドポイント | 認証 | 説明 |
|---------|--------------|------|------|
| GET | `/api/trpc/version.list` | 不要 | バージョン一覧 |
| GET | `/api/trpc/version.getById` | 不要 | バージョン取得 |
| POST | `/api/trpc/version.rollback` | 必須 | ロールバック |

#### IPFSAPI

| メソッド | エンドポイント | 認証 | 説明 |
|---------|--------------|------|------|
| POST | `/api/trpc/ipfs.pin` | 必須 | 文書をIPFSにピン |
| POST | `/api/trpc/ipfs.unpin` | 必須 | ピン解除 |
| GET | `/api/trpc/ipfs.status` | 不要 | CID状態確認 |

#### エクスポートAPI

| メソッド | エンドポイント | 認証 | 説明 |
|---------|--------------|------|------|
| GET | `/api/trpc/export.html` | 不要 | HTML出力 |
| GET | `/api/trpc/export.pdf` | 不要 | PDF用HTML出力 |

---

## セキュリティ

### 認証・認可

- **認証**: Manus OAuth（セッションクッキー）
- **認可**: ユーザーID + ロール（user/admin）チェック
- **保護**: 文書所有者のみ更新・削除可能（admin除く）

### データ検証

- **入力検証**: Zod スキーマによる型チェック
- **JSON検証**: MeDF v0.2.1 スキーマ準拠確認
- **ハッシュ検証**: クライアント側で RFC 8785 準拠

### IPFS連携

- **API認証**: Pinata API キー（環境変数）
- **エラーハンドリング**: APIキー未設定時はシミュレーション
- **レート制限**: Pinata API の制限に準拠

---

## パフォーマンス

### キャッシング

- **クライアント**: tRPC React Query（自動キャッシング）
- **サーバー**: なし（リアルタイム性重視）

### データベースインデックス

推奨インデックス:

```sql
CREATE INDEX idx_documents_userId ON documents(userId);
CREATE INDEX idx_documents_medfId ON documents(medfId);
CREATE INDEX idx_blocks_documentId ON blocks(documentId);
CREATE INDEX idx_comments_documentId ON comments(documentId);
CREATE INDEX idx_comments_blockId ON comments(blockId);
CREATE INDEX idx_references_sourceDocId ON references(sourceDocId);
CREATE INDEX idx_references_targetMedfId ON references(targetMedfId);
```

### 応答時間目標

| 操作 | 目標 |
|-----|------|
| 文書取得 | < 100ms |
| 文書一覧（10件） | < 200ms |
| コメント一覧 | < 150ms |
| ハッシュ検証（クライアント） | < 50ms |
| IPFS ピン | < 5s |

---

## 付録

### MeDF v0.2.1 スキーマ例

```json
{
  "medf_version": "0.2.1",
  "id": "example-doc-2026",
  "issuer": "author-name",
  "snapshot": "2026-02-08T06:00:00Z",
  "document_type": "article",
  "blocks": [
    {
      "block_id": "introduction",
      "role": "content",
      "format": "markdown",
      "text": "# Introduction\n\nThis is the introduction.",
      "block_hash": "sha256_hash_value"
    }
  ],
  "doc_hash": {
    "algorithm": "sha-256",
    "value": "sha256_hash_value"
  }
}
```

### エラーコード

| コード | メッセージ | 説明 |
|-------|-----------|------|
| 400 | BAD_REQUEST | 入力値が不正 |
| 401 | UNAUTHORIZED | 認証が必要 |
| 403 | FORBIDDEN | 権限がない |
| 404 | NOT_FOUND | リソースが見つからない |
| 500 | INTERNAL_SERVER_ERROR | サーバーエラー |

---

**作成者**: Manus AI  
**ライセンス**: MIT
