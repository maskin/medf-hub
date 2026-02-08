# MeDF Hub: IPFS ベース文書共有・議論プラットフォーム

**バージョン**: 1.0.0  
**言語**: 日本語 | [English](./README.en.md)  
**ライセンス**: MIT

---

## 概要

MeDF Hub は、**IPFS** と **MeDF (Meaning-anchored Document Format) v0.2.1** 仕様に基づいた分散型文書共有・議論プラットフォームです。研究者、チーム、コミュニティが学術文書を公開・検証・議論し、暗号学的整合性を保ちながら参照を追跡できます。

### 主な機能

- **MeDF 文書管理**: MeDF v0.2.1 標準形式での文書作成・編集・保存
- **ブロック単位議論**: 文書の特定セクションへのコメント投稿とスレッド型返信
- **暗号学的検証**: RFC 8785 準拠の JSON 正規化と SHA-256 ハッシング
- **バージョン管理**: 自動スナップショット・差分表示・ロールバック機能
- **IPFS 統合**: Pinata 経由での IPFS 公開とゲートウェイアクセス
- **参照トラッキング**: MEDF 引用の自動検出・可視化・双方向追跡
- **複数形式エクスポート**: HTML・PDF・JSON での出力
- **オフライン検証**: Web Crypto API によるクライアント側検証

---

## アーキテクチャ

### 技術スタック

| レイヤー | 技術 |
|---------|------|
| **フロントエンド** | React 19, TypeScript, Tailwind CSS 4 |
| **バックエンド** | Express 4, tRPC 11, Node.js |
| **データベース** | MySQL/TiDB + Drizzle ORM |
| **ストレージ** | IPFS (Pinata 経由), S3 |
| **認証** | Manus OAuth |
| **テスト** | Vitest (35+ テスト) |

### システムアーキテクチャ

```
┌─────────────────────────────────────────────────────────┐
│                  フロントエンド (React)                  │
│  ┌──────────────┬──────────────┬──────────────────────┐ │
│  │ 文書リスト    │ 文書作成/編集 │ 文書表示             │ │
│  │              │              │ (ブロック、コメント、 │ │
│  │              │              │  バージョン、IPFS)   │ │
│  └──────────────┴──────────────┴──────────────────────┘ │
└────────────────────────┬────────────────────────────────┘
                         │ tRPC
┌────────────────────────▼────────────────────────────────┐
│              バックエンド (Express + tRPC)               │
│  ┌──────────────┬──────────────┬──────────────────────┐ │
│  │ 文書 API     │ コメント API  │ バージョン API       │ │
│  │ IPFS API     │ 参照 API      │ エクスポート API     │ │
│  └──────────────┴──────────────┴──────────────────────┘ │
└────────────────────────┬────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
┌───────▼──────┐  ┌──────▼──────┐  ┌─────▼────────┐
│  データベース │  │ IPFS/Pinata │  │ S3 ストレージ │
│  (MySQL)     │  │ (CID, URLs) │  │ (ファイル)    │
└──────────────┘  └─────────────┘  └──────────────┘
```

---

## コア機能

### 1. 文書管理

**対応形式**:
- Markdown (自動的に MeDF に変換)
- MeDF v0.2.1 JSON (ネイティブ形式)

**操作**:
- 新規文書作成
- 既存 MeDF JSON ファイルのアップロード
- 文書内容とメタデータの編集
- 文書削除（関連データも削除）

**メタデータ**:
- タイトル、説明、著者
- 作成・更新タイムスタンプ
- 文書ハッシュ (RFC 8785)
- IPFS CID (公開時)

### 2. ブロック単位議論

**コメント機能**:
- 文書の特定ブロックへのコメント投稿
- コメントへの返信 (スレッド型)
- MEDF 参照の自動検出 (形式: `MEDF: doc-id#block-id`)
- 参照の可視化とリンク化

**参照形式**:
```
MEDF: document-id#block-id
```

例: `MEDF: doc-001#block-2` は doc-001 のブロック 2 を参照

### 3. 暗号学的検証

**検証方法**:
- **ブロック単位**: 個別ブロックの整合性検証
- **文書単位**: 文書全体の構造検証
- **オフライン**: Web Crypto API によるクライアント側検証

**ハッシュアルゴリズム**:
- RFC 8785 JSON 正規化
- SHA-256 ハッシング
- 決定論的出力 (同じ入力 = 同じハッシュ)

### 4. バージョン管理

**スナップショット管理**:
- 文書更新時に自動的にバージョン作成
- タイムスタンプ付きバージョン履歴
- ブロック単位の差分表示 (追加/削除/変更)
- 任意の過去バージョンへのロールバック

**差分表示**:
- カラーコード化された変更 (緑=追加、赤=削除、黄=変更)
- 左右並べ比較
- 変更サマリー

### 5. IPFS 統合

**公開オプション**:
- **Pinata API**: 永続ピニング (API キー必須)
- **CID シミュレーション**: 決定論的 CID 生成 (API キー不要)

**ゲートウェイアクセス**:
- ipfs.io
- gateway.pinata.cloud
- cloudflare-ipfs.com

**ステータス監視**:
- 文書が IPFS で利用可能かどうかを確認
- 必要に応じて文書をアンピン

### 6. 参照トラッキング

**自動検出**:
- 文書内容から MEDF 参照をスキャン
- 自動的に参照レコードを作成
- 引用グラフを構築

**参照グラフ**:
- 受信参照 (この文書を引用している文書)
- 送信参照 (この文書が引用している文書)
- 双方向追跡

### 7. エクスポート機能

**形式**:
- **HTML**: メタデータ、目次、ブロックハッシュ、検証情報を含む
- **PDF**: ブラウザ印刷ダイアログ経由
- **JSON**: 再インポート用 MeDF 形式

---

## クイックスタート

### 前提条件

- Node.js 16+ と npm/pnpm
- MySQL 5.7+ または TiDB
- (オプション) IPFS ピニング用 Pinata アカウント

### インストール

```bash
# リポジトリをクローン
git clone https://github.com/maskin/medf-hub.git
cd medf-hub

# 依存関係をインストール
pnpm install

# 環境変数をセットアップ
cp .env.example .env
# .env をデータベース URL と API キーで編集

# マイグレーションを実行
pnpm db:push

# 開発サーバーを起動
pnpm dev
```

### 5 分でできる基本操作

1. **アプリを開く**: http://localhost:3000 にアクセス
2. **文書を作成**: 「新規文書」をクリック → 形式を選択 (Markdown または MeDF JSON)
3. **内容を入力**: タイトル、著者、内容を入力
4. **文書を表示**: 文書をクリックしてブロックと検証情報を表示
5. **コメントを追加**: ブロックをクリック → コメントを入力 → 投稿
6. **IPFS に公開**: 「IPFS に公開」ボタンをクリック (オプション、API キー必須)

---

## API リファレンス

### 文書操作

#### 文書作成
```typescript
documents.create({
  title: string,
  content: string,
  format: "markdown" | "medf-json",
  description?: string
})
```

#### 文書取得
```typescript
documents.get(id: string)
// 戻り値: { id, title, author, blocks[], hash, ipfsCid, ... }
```

#### 文書リスト
```typescript
documents.list({
  search?: string,
  author?: string,
  limit?: number,
  offset?: number
})
```

#### 文書更新
```typescript
documents.update(id: string, {
  title?: string,
  content?: string
})
```

#### 文書削除
```typescript
documents.delete(id: string)
```

### コメント操作

#### コメント作成
```typescript
comments.create({
  documentId: string,
  blockId: string,
  content: string,
  parentId?: string  // 返信の場合
})
```

#### コメント一覧
```typescript
comments.list(documentId: string, blockId: string)
```

#### コメントに返信
```typescript
comments.reply(commentId: string, content: string)
```

### バージョン管理

#### バージョン作成
```typescript
versions.create(documentId: string)
```

#### バージョン一覧
```typescript
versions.list(documentId: string)
```

#### 差分取得
```typescript
versions.diff(
  documentId: string,
  versionId1: string,
  versionId2: string
)
```

#### ロールバック
```typescript
versions.rollback(documentId: string, versionId: string)
```

### IPFS 操作

#### 文書をピン
```typescript
ipfs.pin(documentId: string)
// 戻り値: { cid, urls: { ipfs, pinata, cloudflare } }
```

#### 文書をアンピン
```typescript
ipfs.unpin(documentId: string)
```

#### ステータス取得
```typescript
ipfs.getStatus(cid: string)
// 戻り値: { available: boolean, urls: {...} }
```

### エクスポート操作

#### HTML にエクスポート
```typescript
export.html(documentId: string)
// 戻り値: HTML ファイルダウンロード
```

#### PDF にエクスポート
```typescript
export.pdf(documentId: string)
// ブラウザ印刷ダイアログを表示
```

#### JSON にエクスポート
```typescript
export.json(documentId: string)
// 戻り値: MeDF JSON ファイルダウンロード
```

---

## ファイル構成

```
medf-hub/
├── client/                          # フロントエンド React アプリケーション
│   ├── src/
│   │   ├── pages/                  # ページコンポーネント
│   │   │   ├── Home.tsx
│   │   │   ├── DocumentList.tsx
│   │   │   ├── DocumentView.tsx
│   │   │   ├── DocumentCreate.tsx
│   │   │   ├── DocumentEdit.tsx
│   │   │   └── MarkdownConverter.tsx
│   │   ├── components/             # 再利用可能なコンポーネント
│   │   ├── lib/                    # ユーティリティ (medf-crypto, trpc)
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   └── package.json
├── server/                          # バックエンド Express + tRPC
│   ├── routers.ts                  # tRPC プロシージャ定義
│   ├── db.ts                       # データベースクエリヘルパー
│   ├── storage.ts                  # S3 ストレージヘルパー
│   └── _core/                      # フレームワークプラミング
├── drizzle/                         # データベーススキーマ・マイグレーション
│   ├── schema.ts
│   └── migrations/
├── shared/                          # 共有型とユーティリティ
│   ├── medf.ts                     # MeDF 型とユーティリティ
│   └── const.ts
├── docs/                            # ドキュメント
│   ├── SPECIFICATION.md            # 技術仕様書
│   ├── USER_MANUAL.md              # ユーザーマニュアル
│   ├── API_REFERENCE.md            # API リファレンス
│   └── SIMILAR_PROJECTS.md         # 関連プロジェクト比較
├── README.md                        # 日本語 README
├── README.en.md                     # 英語 README
└── package.json
```

---

## テスト

### テスト実行

```bash
# すべてのテストを実行
pnpm test

# 特定のテストファイルを実行
pnpm test -- server/medf.test.ts

# ウォッチモード
pnpm test -- --watch
```

### テストカバレッジ

- 35+ Vitest ユニットテスト
- 文書作成と変換
- ハッシュ検証 (RFC 8785)
- コメントスレッド
- バージョン管理
- 参照検出
- IPFS 操作

---

## 開発ワークフロー

### 1. データベーススキーマを作成

`drizzle/schema.ts` を編集してから:

```bash
pnpm drizzle-kit generate
# 生成されたマイグレーション SQL を確認
pnpm db:push  # マイグレーションを適用
```

### 2. バックエンド API を追加

`server/routers.ts` にプロシージャを追加:

```typescript
myFeature: protectedProcedure
  .input(z.object({ /* ... */ }))
  .mutation(async ({ input, ctx }) => {
    // 実装
  })
```

### 3. フロントエンド UI を追加

`client/src/pages/` または `client/src/components/` にコンポーネントを作成:

```typescript
const { data } = trpc.myFeature.useQuery();
const mutation = trpc.myFeature.useMutation();
```

### 4. テストを作成

`server/*.test.ts` にテストを追加:

```typescript
describe('myFeature', () => {
  test('should work', () => {
    // テスト実装
  });
});
```

### 5. チェックポイントを作成

```bash
# 機能完成後
pnpm build
# すべてが動作することを確認
# その後 UI でチェックポイントを作成
```

---

## デプロイ

### 前提条件

- Manus ホスティングアカウント
- カスタムドメイン (オプション)
- Pinata API キー (オプション、IPFS 用)

### デプロイ手順

1. **チェックポイントを作成**: すべての変更がコミットされていることを確認
2. **公開ボタンをクリック**: Management UI で
3. **ドメインを設定**: カスタムドメインまたは自動生成ドメインを使用
4. **環境変数を設定**: Settings パネルで
5. **監視**: Dashboard でトラフィックとエラーを確認

### 環境変数

```bash
# データベース
DATABASE_URL=mysql://user:pass@host/database

# OAuth
VITE_APP_ID=your_app_id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://login.manus.im

# IPFS (オプション)
PINATA_API_KEY=your_pinata_key
PINATA_API_SECRET=your_pinata_secret

# ストレージ
BUILT_IN_FORGE_API_URL=https://forge.manus.im
BUILT_IN_FORGE_API_KEY=your_forge_key
```

---

## トラブルシューティング

### ハッシュ検証が失敗する

**問題**: 文書ハッシュが一致しない  
**解決策**: RFC 8785 正規化が一貫して適用されていることを確認してください。空白、キー順序、数値形式の違いをチェックしてください。

### IPFS CID 生成が異なる

**問題**: Pinata の CID とローカル計算の CID が異なる  
**解決策**: SHA-256 と正しい CID 形式を使用していることを確認してください。Pinata は CIDv1 を使用しており、実装との一貫性を確保してください。

### コメントが表示されない

**問題**: コメントが作成されたが表示されない  
**解決策**: ブロック ID が安定していて、文書更新時に変わらないことを確認してください。決定論的 ID 生成を使用してください。

### 参照検出が漏れている

**問題**: 一部の MEDF 参照が検出されない  
**解決策**: 正規表現パターンが参照形式と正確に一致していることを確認してください。サンプル文書でテストしてください。

---

## 貢献

1. リポジトリをフォーク
2. 機能ブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを開く

---

## ライセンス

このプロジェクトは MIT ライセンスの下でライセンスされています。詳細は [LICENSE](LICENSE) ファイルを参照してください。

---

## 関連プロジェクト

- **[OrbitDB](https://orbitdb.org/)**: サーバーレス P2P データベース
- **[Ceramic Protocol](https://ceramic.network/)**: 分散型イベントストリーム
- **[MeDF Specification](https://github.com/maskin/medf)**: 文書形式仕様

---

## サポート

問題、質問、提案については:

1. [FAQ](docs/USER_MANUAL.md#faq) を確認
2. [API リファレンス](docs/API_REFERENCE.md) を確認
3. GitHub で issue を開く
4. 連絡: [support@example.com]

---

**❤️ Manus AI により作成**  
**最終更新**: 2026-02-08
