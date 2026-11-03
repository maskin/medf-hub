# Project Tasks & Roadmap | プロジェクトタスク・ロードマップ

**English** | [日本語](#日本語)

---

## English

### Version 1.0.0 (Current Release)

#### Core Features ✅

- [x] Document management (create, read, update, delete)
- [x] Markdown to MeDF conversion
- [x] Block-level structure with hashing
- [x] RFC 8785 JSON canonicalization
- [x] SHA-256 hash verification
- [x] Block-level comments with threading
- [x] Document version control with snapshots
- [x] Version diff display and rollback
- [x] IPFS CID generation (simulation)
- [x] Pinata API integration
- [x] IPFS gateway URLs
- [x] Reference tracking (auto-detection)
- [x] Reference graph visualization
- [x] Export to HTML
- [x] Export to PDF
- [x] Export to JSON
- [x] Offline verification (Web Crypto API)
- [x] User authentication (Manus OAuth)
- [x] Document search and filtering
- [x] Owner notifications

#### Testing ✅

- [x] 35+ Vitest unit tests
- [x] Database query tests
- [x] Hash verification tests
- [x] Comment threading tests
- [x] Version management tests
- [x] Reference detection tests
- [x] IPFS operation tests

#### Documentation ✅

- [x] Technical specification (SPECIFICATION.md)
- [x] User manual (USER_MANUAL.md)
- [x] API reference (API_REFERENCE.md)
- [x] Similar projects comparison (SIMILAR_PROJECTS.md)
- [x] English README (README.en.md)
- [x] Japanese README (README.ja.md)
- [x] Development guide (DEVELOPMENT.md)
- [x] Task list (TASKS.md)

---

### Version 1.1.0 (Planned)

#### Document Templates

- [ ] Create template system for common document types
- [ ] Pre-built templates: Research Paper, Meeting Minutes, Report
- [ ] Template customization UI
- [ ] Template sharing between users
- [ ] Template versioning

#### User Profiles

- [ ] User profile page with activity history
- [ ] Document list by user
- [ ] Comment history
- [ ] Activity statistics (documents created, comments posted)
- [ ] User reputation/karma system
- [ ] Follow/unfollow functionality

#### Access Control

- [ ] Document visibility settings (public/private/unlisted)
- [ ] Share document with specific users
- [ ] Collaborative editing permissions
- [ ] Role-based access control (viewer/editor/admin)
- [ ] Audit log for document access

#### Advanced Features

- [ ] Full-text search with Elasticsearch
- [ ] Document tagging system
- [ ] Favorites/bookmarks
- [ ] Document recommendations
- [ ] Trending documents

---

### Version 1.2.0 (Future)

#### Real-time Collaboration

- [ ] Real-time document editing (WebSocket)
- [ ] Live cursor positions
- [ ] Collaborative conflict resolution
- [ ] Change history with user attribution
- [ ] Live comment notifications

#### Enhanced IPFS

- [ ] Direct IPFS node integration (optional)
- [ ] Multiple pinning service support
- [ ] IPFS cluster support
- [ ] Distributed backup system
- [ ] Content replication across nodes

#### API & Integration

- [ ] Public REST API
- [ ] GraphQL API
- [ ] Webhook support
- [ ] Third-party integrations (Slack, Discord)
- [ ] OAuth provider for external apps

#### Analytics & Insights

- [ ] Document analytics (views, engagement)
- [ ] Citation metrics
- [ ] Author impact metrics
- [ ] Network visualization
- [ ] Trend analysis

---

### Version 2.0.0 (Long-term Vision)

#### Blockchain Integration

- [ ] Document timestamp on blockchain
- [ ] Digital signatures
- [ ] Proof of authorship
- [ ] Smart contracts for licensing
- [ ] NFT certificates

#### Advanced Verification

- [ ] Digital signature verification
- [ ] Multi-signature support
- [ ] Timestamp authority integration
- [ ] Notarization service
- [ ] Legal document support

#### Community Features

- [ ] Discussion forums
- [ ] Document review system
- [ ] Peer review workflow
- [ ] Community voting
- [ ] Moderation tools

#### Monetization

- [ ] Document monetization
- [ ] Subscription tiers
- [ ] Premium features
- [ ] Author rewards
- [ ] Marketplace for templates

---

## Maintenance & Operations

### Regular Tasks

- [ ] Weekly: Review error logs
- [ ] Weekly: Check IPFS gateway availability
- [ ] Monthly: Database optimization
- [ ] Monthly: Security audit
- [ ] Quarterly: Performance review
- [ ] Quarterly: Dependency updates

### Known Issues

- [ ] IPFS gateway timeouts (implement retry logic)
- [ ] Large document performance (implement pagination)
- [ ] Database query optimization needed
- [ ] Reference detection edge cases

### Technical Debt

- [ ] Refactor export logic to separate module
- [ ] Consolidate crypto utilities
- [ ] Improve error handling in API
- [ ] Add rate limiting
- [ ] Implement caching layer

---

## Bug Tracking

### Reported Issues

- [ ] Issue #1: Comments sometimes not loading (low priority)
- [ ] Issue #2: PDF export formatting issues (medium priority)
- [ ] Issue #3: IPFS CID validation needed (low priority)

### Performance Issues

- [ ] Large documents (>1000 blocks) load slowly
- [ ] Search performance degrades with many documents
- [ ] Comment loading times increase with thread depth

---

## Testing Roadmap

### Unit Tests

- [x] Core MeDF operations
- [x] Hash verification
- [x] Database queries
- [ ] Export functionality
- [ ] IPFS operations

### Integration Tests

- [ ] Document creation workflow
- [ ] Comment threading workflow
- [ ] Version management workflow
- [ ] IPFS publishing workflow

### End-to-End Tests

- [ ] User registration and login
- [ ] Document creation and sharing
- [ ] Comment and discussion
- [ ] Version management
- [ ] IPFS publishing

### Performance Tests

- [ ] Large document handling
- [ ] Concurrent user load
- [ ] Database query performance
- [ ] API response times

---

## Documentation Roadmap

### User Documentation

- [x] Quick start guide
- [x] User manual
- [x] FAQ
- [ ] Video tutorials
- [ ] Troubleshooting guide

### Developer Documentation

- [x] API reference
- [x] Development guide
- [x] Architecture overview
- [ ] Contributing guidelines
- [ ] Code examples
- [ ] Plugin development guide

### Deployment Documentation

- [ ] Deployment guide
- [ ] Configuration guide
- [ ] Backup and recovery
- [ ] Scaling guide
- [ ] Monitoring guide

---

## Release Schedule

| Version | Target Date | Status |
|---------|-------------|--------|
| 1.0.0 | 2026-02-08 | ✅ Released |
| 1.1.0 | 2026-04-30 | 📋 Planned |
| 1.2.0 | 2026-08-31 | 📋 Planned |
| 2.0.0 | 2027-Q1 | 🔮 Vision |

---

---

## 日本語

### バージョン 1.0.0 (現在のリリース)

#### コア機能 ✅

- [x] 文書管理 (作成、読取、更新、削除)
- [x] Markdown から MeDF への変換
- [x] ハッシング付きブロック単位構造
- [x] RFC 8785 JSON 正規化
- [x] SHA-256 ハッシュ検証
- [x] スレッド型ブロック単位コメント
- [x] スナップショット付き文書バージョン管理
- [x] バージョン差分表示とロールバック
- [x] IPFS CID 生成 (シミュレーション)
- [x] Pinata API 統合
- [x] IPFS ゲートウェイ URL
- [x] 参照トラッキング (自動検出)
- [x] 参照グラフ可視化
- [x] HTML へのエクスポート
- [x] PDF へのエクスポート
- [x] JSON へのエクスポート
- [x] オフライン検証 (Web Crypto API)
- [x] ユーザー認証 (Manus OAuth)
- [x] 文書検索とフィルタリング
- [x] オーナー通知

#### テスト ✅

- [x] 35+ Vitest ユニットテスト
- [x] データベースクエリテスト
- [x] ハッシュ検証テスト
- [x] コメントスレッドテスト
- [x] バージョン管理テスト
- [x] 参照検出テスト
- [x] IPFS 操作テスト

#### ドキュメント ✅

- [x] 技術仕様書 (SPECIFICATION.md)
- [x] ユーザーマニュアル (USER_MANUAL.md)
- [x] API リファレンス (API_REFERENCE.md)
- [x] 関連プロジェクト比較 (SIMILAR_PROJECTS.md)
- [x] 英語 README (README.en.md)
- [x] 日本語 README (README.ja.md)
- [x] 開発ガイド (DEVELOPMENT.md)
- [x] タスクリスト (TASKS.md)

---

### バージョン 1.1.0 (計画中)

#### 文書テンプレート

- [ ] 一般的な文書タイプ用テンプレートシステムを作成
- [ ] 事前構築テンプレート: 研究論文、会議議事録、レポート
- [ ] テンプレートカスタマイズ UI
- [ ] ユーザー間のテンプレート共有
- [ ] テンプレートバージョニング

#### ユーザープロフィール

- [ ] アクティビティ履歴付きユーザープロフィールページ
- [ ] ユーザー別文書リスト
- [ ] コメント履歴
- [ ] アクティビティ統計 (作成文書数、投稿コメント数)
- [ ] ユーザー評判/カルマシステム
- [ ] フォロー/アンフォロー機能

#### アクセス制御

- [ ] 文書可視性設定 (公開/非公開/未掲載)
- [ ] 特定ユーザーとの文書共有
- [ ] 協調編集権限
- [ ] ロールベースアクセス制御 (閲覧者/編集者/管理者)
- [ ] 文書アクセスの監査ログ

#### 高度な機能

- [ ] Elasticsearch による全文検索
- [ ] 文書タグシステム
- [ ] お気に入り/ブックマーク
- [ ] 文書推奨システム
- [ ] トレンド文書

---

### バージョン 1.2.0 (将来)

#### リアルタイム協調編集

- [ ] リアルタイム文書編集 (WebSocket)
- [ ] ライブカーソル位置
- [ ] 協調競合解決
- [ ] ユーザー帰属付き変更履歴
- [ ] ライブコメント通知

#### 高度な IPFS

- [ ] 直接 IPFS ノード統合 (オプション)
- [ ] 複数ピニングサービスサポート
- [ ] IPFS クラスタサポート
- [ ] 分散バックアップシステム
- [ ] ノード間のコンテンツレプリケーション

#### API と統合

- [ ] パブリック REST API
- [ ] GraphQL API
- [ ] Webhook サポート
- [ ] サードパーティ統合 (Slack, Discord)
- [ ] 外部アプリ用 OAuth プロバイダー

#### 分析とインサイト

- [ ] 文書分析 (ビュー、エンゲージメント)
- [ ] 引用メトリクス
- [ ] 著者インパクトメトリクス
- [ ] ネットワーク可視化
- [ ] トレンド分析

---

### バージョン 2.0.0 (長期ビジョン)

#### ブロックチェーン統合

- [ ] ブロックチェーンへの文書タイムスタンプ
- [ ] デジタル署名
- [ ] 著者権の証明
- [ ] ライセンス用スマートコントラクト
- [ ] NFT 証明書

#### 高度な検証

- [ ] デジタル署名検証
- [ ] マルチシグネチャサポート
- [ ] タイムスタンプオーソリティ統合
- [ ] 公証サービス
- [ ] 法的文書サポート

#### コミュニティ機能

- [ ] ディスカッションフォーラム
- [ ] 文書レビューシステム
- [ ] ピアレビューワークフロー
- [ ] コミュニティ投票
- [ ] モデレーションツール

#### マネタイゼーション

- [ ] 文書マネタイゼーション
- [ ] サブスクリプションティア
- [ ] プレミアム機能
- [ ] 著者報酬
- [ ] テンプレートマーケットプレイス

---

## メンテナンス・運用

### 定期タスク

- [ ] 週次: エラーログの確認
- [ ] 週次: IPFS ゲートウェイ可用性の確認
- [ ] 月次: データベース最適化
- [ ] 月次: セキュリティ監査
- [ ] 四半期: パフォーマンスレビュー
- [ ] 四半期: 依存関係の更新

### 既知の問題

- [ ] IPFS ゲートウェイタイムアウト (リトライロジック実装が必要)
- [ ] 大規模文書のパフォーマンス (ページネーション実装が必要)
- [ ] データベースクエリ最適化が必要
- [ ] 参照検出のエッジケース

### 技術的負債

- [ ] エクスポートロジックを別モジュールにリファクタリング
- [ ] 暗号ユーティリティを統合
- [ ] API のエラーハンドリングを改善
- [ ] レート制限を実装
- [ ] キャッシングレイヤーを実装

---

## バグ追跡

### 報告済みの問題

- [ ] Issue #1: コメントが読み込まれないことがある (低優先度)
- [ ] Issue #2: PDF エクスポート形式の問題 (中優先度)
- [ ] Issue #3: IPFS CID 検証が必要 (低優先度)

### パフォーマンス問題

- [ ] 大規模文書 (>1000 ブロック) の読み込みが遅い
- [ ] 多くの文書がある場合、検索パフォーマンスが低下
- [ ] スレッド深度が増加するとコメント読み込み時間が増加

---

## テストロードマップ

### ユニットテスト

- [x] コア MeDF 操作
- [x] ハッシュ検証
- [x] データベースクエリ
- [ ] エクスポート機能
- [ ] IPFS 操作

### 統合テスト

- [ ] 文書作成ワークフロー
- [ ] コメントスレッドワークフロー
- [ ] バージョン管理ワークフロー
- [ ] IPFS 公開ワークフロー

### エンドツーエンドテスト

- [ ] ユーザー登録とログイン
- [ ] 文書作成と共有
- [ ] コメントと議論
- [ ] バージョン管理
- [ ] IPFS 公開

### パフォーマンステスト

- [ ] 大規模文書処理
- [ ] 同時ユーザー負荷
- [ ] データベースクエリパフォーマンス
- [ ] API レスポンスタイム

---

## ドキュメントロードマップ

### ユーザードキュメント

- [x] クイックスタートガイド
- [x] ユーザーマニュアル
- [x] FAQ
- [ ] ビデオチュートリアル
- [ ] トラブルシューティングガイド

### 開発者ドキュメント

- [x] API リファレンス
- [x] 開発ガイド
- [x] アーキテクチャ概要
- [ ] 貢献ガイドライン
- [ ] コード例
- [ ] プラグイン開発ガイド

### デプロイメントドキュメント

- [ ] デプロイメントガイド
- [ ] 設定ガイド
- [ ] バックアップと復旧
- [ ] スケーリングガイド
- [ ] 監視ガイド

---

## リリーススケジュール

| バージョン | ターゲット日 | ステータス |
|-----------|-----------|----------|
| 1.0.0 | 2026-02-08 | ✅ リリース済み |
| 1.1.0 | 2026-04-30 | 📋 計画中 |
| 1.2.0 | 2026-08-31 | 📋 計画中 |
| 2.0.0 | 2027-Q1 | 🔮 ビジョン |

---

**Last Updated**: 2026-02-08
