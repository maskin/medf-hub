# MeDF Hub

**MeDF Hubは、MeDF（Mutable Expression Description Format）v0.2.1仕様に準拠した、ブロック単位で検証可能な文書共有・議論プラットフォームです。**

IPFSと組み合わせることで、改ざん防止と分散公開を実現しています。

---

## 🚀 主な機能

### 📄 文書管理
- **Markdown → MeDF変換**: GitHub Flavored Markdown をブロック単位で自動分割
- **ブロック検証**: RFC 8785準拠のJSON正規化 + SHA-256ハッシュ
- **バージョン管理**: 更新履歴の自動保存・差分表示・ロールバック

### 💬 議論機能
- **ブロック単位コメント**: 特定のブロックに対する参照付きコメント
- **スレッド型議論**: コメントへの返信機能
- **参照トラッキング**: MEDF引用の自動検出・リンク化・双方向追跡

### 🌐 IPFS統合
- **CID生成**: SHA-256ベースのIPFS互換CID生成
- **Pinata連携**: 実際のIPFSネットワークへの公開
- **ゲートウェイアクセス**: ipfs.io・Pinata Gateway対応

### 📤 エクスポート
- **HTML出力**: メタデータ・TOC・ハッシュ表示付き
- **PDF出力**: ブラウザ印刷ダイアログ経由
- **JSON形式**: MeDF JSON のダウンロード

### 🔔 通知機能
- **コメント通知**: 新規コメント投稿時にオーナーへ通知
- **更新通知**: 文書更新時にオーナーへ通知
- **Manus Notification Service**: 組み込み通知API

---

## 📋 ドキュメント

| ドキュメント | 対象者 | 内容 |
|------------|-------|------|
| [技術仕様書](./docs/SPECIFICATION.md) | 開発者・アーキテクト | システムアーキテクチャ・データモデル・セキュリティ |
| [ユーザーマニュアル](./docs/USER_MANUAL.md) | 一般ユーザー | 基本操作・文書作成・議論・IPFS公開 |
| [API リファレンス](./docs/API_REFERENCE.md) | 開発者 | API仕様・型定義・使用例 |

---

## 🛠 技術スタック

| レイヤー | 技術 | バージョン |
|---------|------|-----------|
| フロントエンド | React 19 + Tailwind CSS 4 | 19.2.1 |
| バックエンド | Express 4 + tRPC 11 | 4.21.2 / 11.6.0 |
| データベース | MySQL/TiDB | 3.15.0 |
| 認証 | Manus OAuth | - |
| IPFS連携 | Pinata API | v1 |

---

## 🚀 クイックスタート

### 1. ログイン

ホームページの「ログイン」ボタンをクリックし、Manus OAuth認証を完了してください。

### 2. 文書を作成

**Markdownから作成（推奨）**:

```markdown
# 文書タイトル

## Introduction

このセクションが最初のブロックになります。

## Methodology

このセクションが2番目のブロックになります。
```

1. 「新規作成」→「Markdownを変換」
2. Markdownを入力
3. 「変換」→「保存」

### 3. コメントを投稿

1. 文書詳細ページでブロックを選択
2. 「コメント」セクションにテキストを入力
3. 「送信」をクリック

### 4. IPFSに公開

1. 文書詳細ページの「IPFS」ボタンをクリック
2. 「公開」を確認
3. CID・ゲートウェイリンクが表示されます

詳細は [ユーザーマニュアル](./docs/USER_MANUAL.md) を参照してください。

---

## 🏗 システムアーキテクチャ

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

---

## 📊 データモデル

### 主要テーブル

| テーブル | 説明 |
|---------|------|
| `documents` | 文書メタデータ |
| `blocks` | ブロック内容・ハッシュ |
| `comments` | コメント・スレッド |
| `references` | 参照グラフ |
| `document_versions` | バージョン履歴 |

詳細は [技術仕様書](./docs/SPECIFICATION.md#データモデル) を参照してください。

---

## 🔐 セキュリティ

### 認証・認可
- **Manus OAuth**: セッションクッキーベース認証
- **ロールベース**: user / admin ロール
- **所有権チェック**: 文書所有者のみ編集・削除可能

### データ検証
- **入力検証**: Zod スキーマによる型チェック
- **ハッシュ検証**: RFC 8785準拠のJSON正規化
- **IPFS連携**: Pinata API キー認証

詳細は [技術仕様書](./docs/SPECIFICATION.md#セキュリティ) を参照してください。

---

## 📈 パフォーマンス

### 応答時間目標

| 操作 | 目標 |
|-----|------|
| 文書取得 | < 100ms |
| 文書一覧（10件） | < 200ms |
| コメント一覧 | < 150ms |
| ハッシュ検証（クライアント） | < 50ms |
| IPFS ピン | < 5s |

### 推奨インデックス

```sql
CREATE INDEX idx_documents_userId ON documents(userId);
CREATE INDEX idx_documents_medfId ON documents(medfId);
CREATE INDEX idx_blocks_documentId ON blocks(documentId);
CREATE INDEX idx_comments_documentId ON comments(documentId);
CREATE INDEX idx_references_sourceDocId ON references(sourceDocId);
```

---

## 🧪 テスト

### Vitest ユニットテスト

```bash
# すべてのテストを実行
pnpm test

# 特定のテストファイルを実行
pnpm test server/medf.test.ts

# ウォッチモード
pnpm test --watch
```

### テスト対象

- ✅ 文書変換（Markdown → MeDF）
- ✅ ハッシュ検証（RFC 8785）
- ✅ コメント管理（スレッド）
- ✅ バージョン管理（ロールバック）
- ✅ IPFS連携（Pinata）
- ✅ エクスポート（HTML/PDF）
- ✅ 通知機能（グレースフル処理）

**テスト数**: 35+ テスト  
**カバレッジ**: コア機能 100%

---

## 🔧 開発ガイド

### セットアップ

```bash
# リポジトリをクローン
git clone https://github.com/your-org/medf-hub.git
cd medf-hub

# 依存関係をインストール
pnpm install

# 環境変数を設定
cp .env.example .env.local

# データベースマイグレーション
pnpm drizzle-kit generate
pnpm drizzle-kit migrate

# 開発サーバーを起動
pnpm dev
```

### ファイル構成

```
medf-hub/
├── client/                 # フロントエンド
│   ├── src/
│   │   ├── pages/         # ページコンポーネント
│   │   ├── components/    # UI コンポーネント
│   │   ├── lib/           # ユーティリティ
│   │   └── App.tsx        # ルーティング
│   └── index.html
├── server/                 # バックエンド
│   ├── routers.ts         # tRPC ルーター
│   ├── db.ts              # DB ヘルパー
│   └── _core/             # 内部フレームワーク
├── drizzle/               # データベーススキーマ
│   └── schema.ts
├── shared/                # 共有型・ユーティリティ
│   └── medf.ts
├── docs/                  # ドキュメント
│   ├── SPECIFICATION.md   # 技術仕様書
│   ├── USER_MANUAL.md     # ユーザーマニュアル
│   └── API_REFERENCE.md   # API リファレンス
└── README.md
```

### 開発ワークフロー

1. **スキーマ更新**: `drizzle/schema.ts` を編集
2. **マイグレーション生成**: `pnpm drizzle-kit generate`
3. **DB ヘルパー追加**: `server/db.ts` に関数を追加
4. **API 実装**: `server/routers.ts` に tRPC ルーターを追加
5. **UI 実装**: `client/src/pages/` にコンポーネントを追加
6. **テスト作成**: `server/*.test.ts` に Vitest テストを追加
7. **テスト実行**: `pnpm test`

詳細は [API リファレンス](./docs/API_REFERENCE.md) を参照してください。

---

## 🐛 トラブルシューティング

### よくある問題

**Q: ログインできない**  
A: ブラウザのクッキーが有効になっているか確認してください。プライベートブラウジングモードを使用している場合は、通常モードで試してください。

**Q: ハッシュが検証できない**  
A: JSON形式が RFC 8785 に準拠しているか確認してください。スペース・改行・キーの順序が異なるとハッシュが変わります。

**Q: IPFSに公開できない**  
A: Pinata APIキーが正しく設定されているか確認してください。APIキー未設定時はシミュレーション値を返します。

詳細は [ユーザーマニュアル](./docs/USER_MANUAL.md#トラブルシューティング) を参照してください。

---

## 📝 ライセンス

MIT License - 詳細は [LICENSE](./LICENSE) を参照してください。

---

## 👥 貢献

プルリクエスト・Issue報告・機能リクエストを歓迎します。

---

## 📞 サポート

- **バグ報告**: GitHub Issues
- **機能リクエスト**: GitHub Discussions
- **その他**: オーナー通知機能を使用してお問い合わせください

---

## 🔗 関連リンク

- [MeDF 仕様](https://github.com/maskin/medf)
- [IPFS](https://ipfs.io/)
- [Pinata Cloud](https://www.pinata.cloud/)
- [RFC 8785 - JSON Canonicalization Scheme](https://tools.ietf.org/html/rfc8785)

---

**作成者**: Manus AI  
**バージョン**: 1.0  
**最終更新**: 2026年2月8日
