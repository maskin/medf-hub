# Project TODO

- [x] Multi-provider OAuth authentication (Google, GitHub, Manus)
- [x] Provider selection login page UI
- [x] Login redirect flow (return to original page after auth)
- [x] Cookie security settings (sameSite: "lax" for local dev)
- [x] Unauthorized error handling with auto-redirect
- [x] Pinata IPFS integration fixed (API key + secret authentication)
- [x] MySQL database setup and migrations
- [x] Database schema design (documents, blocks, comments, references tables)
- [x] Database migration execution
- [x] Backend API: document CRUD (create, read, update, delete)
- [x] Backend API: Markdown to MeDF conversion
- [x] Backend API: block-level comments/discussions
- [x] Backend API: document search and filtering
- [x] Backend API: reference tracking
- [x] Backend API: IPFS CID simulation (SHA-256 based)
- [x] Frontend: Global layout, theme, routing
- [x] Frontend: Document list page with search/filter
- [x] Frontend: Markdown to MeDF converter page
- [x] Frontend: MeDF document editor/creator page
- [x] Frontend: Document viewer with block-level display and TOC
- [x] Frontend: Client-side verification (RFC 8785 JSON canonicalization + hash)
- [x] Frontend: IPFS CID generation simulation
- [x] Frontend: Block-level comment/discussion UI
- [x] Frontend: Reference tracking (MEDF: doc#block auto-detection and linking)
- [x] Frontend: Offline verification capability
- [x] Vitest unit tests
- [x] DB: document_versions table for snapshot history
- [x] DB: Add parentId column to comments table for threading (already exists)
- [x] Backend API: version management (create version, list versions, rollback)
- [x] Backend API: threaded comments (reply to comment, nested display)
- [x] Backend API: Pinata IPFS integration (pin document, unpin, check status)
- [x] Frontend: Version history tab with diff view and rollback
- [x] Frontend: Threaded comment UI with reply functionality
- [x] Frontend: IPFS publish button and gateway link display
- [x] Vitest: tests for new features (versions, threads, IPFS)
- [x] Pinata APIキー環境変数設定 (PINATA_API_KEY, PINATA_API_SECRET)
- [x] 文書エクスポート: HTML形式でのエクスポート
- [x] 文書エクスポート: PDF形式でのエクスポート
- [x] 文書エクスポート: フロントエンドUIにエクスポートボタン追加
- [x] 通知機能: コメント投稿時にオーナーへ通知
- [x] 通知機能: 参照先文書の更新時に通知
- [x] 通知機能: フロントエンドUI（オーナー通知サービス経由）
- [x] Vitest: 新機能のテスト追加


## Vision-Aligned Improvements (Trust & Constructive Discourse)

### Phase 1: Trust & Verification (v1.1.0 - High Priority)
- [ ] GitHub OAuth author verification display enhancement
- [ ] Author badge with verified status, join date
- [ ] Edit history with author attribution display
- [ ] Document signature & hash verification UI
- [ ] Citation auto-detection in comments
- [ ] Citation count per block display
- [ ] Comment flagging system (flag, reason, auto-hide)
- [ ] Basic moderation dashboard

### Phase 2: Constructive Discourse (v1.2.0 - Medium Priority)
- [ ] Enhanced comment threading (voting, replies)
- [ ] Upvote/downvote comment functionality
- [ ] Sort comments by relevance (votes + recency)
- [ ] Consensus visualization (agreement/disagreement)
- [ ] Evidence-based commenting (link claims to sources)
- [ ] Comment quality scoring algorithm
- [ ] Moderation dashboard UI
- [ ] Content policy enforcement

### Phase 3: Transparency & Governance (v1.3.0 - Medium Priority)
- [ ] Document access control (ACL) implementation
- [ ] Role-based permissions (viewer/editor/admin)
- [ ] Change justification/reasoning requirement
- [ ] Collaborative editing with conflict resolution
- [ ] Audit log for sensitive actions
- [ ] Moderation policy documentation

### Phase 4: Social Impact (v2.0.0 - Lower Priority)
- [ ] Topic-level consensus metrics
- [ ] Citation network visualization
- [ ] Credibility scoring system
- [ ] Impact metrics (reach, engagement, citations)
- [ ] Perspective diversity display
- [ ] Trending credible content algorithm
