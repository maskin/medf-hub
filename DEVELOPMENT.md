# Development Guide | 開発ガイド

**English** | [日本語](#日本語)

---

## English

### Development Setup

#### Prerequisites
- Node.js 16+ and pnpm
- MySQL 5.7+ or TiDB
- Git

#### Initial Setup

```bash
# Clone repository
git clone https://github.com/maskin/medf-hub.git
cd medf-hub

# Install dependencies
pnpm install

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
pnpm db:push

# Start development server
pnpm dev
```

The development server runs on http://localhost:3000

### Project Structure

```
medf-hub/
├── client/                 # React frontend
│   ├── src/
│   │   ├── pages/         # Page components
│   │   ├── components/    # Reusable components
│   │   ├── lib/           # Utilities and helpers
│   │   ├── contexts/      # React contexts
│   │   ├── hooks/         # Custom hooks
│   │   ├── App.tsx        # Main app component
│   │   └── main.tsx       # Entry point
│   ├── index.html         # HTML template
│   └── package.json
├── server/                # Express + tRPC backend
│   ├── routers.ts         # tRPC procedure definitions
│   ├── db.ts              # Database query helpers
│   ├── storage.ts         # S3 storage helpers
│   ├── pinata.test.ts     # Pinata API tests
│   └── _core/             # Framework plumbing
├── drizzle/               # Database schema
│   ├── schema.ts          # Table definitions
│   └── migrations/        # SQL migrations
├── shared/                # Shared code
│   ├── medf.ts            # MeDF types and utilities
│   └── const.ts           # Constants
├── docs/                  # Documentation
├── package.json           # Root package.json
└── pnpm-workspace.yaml    # Workspace configuration
```

### Development Workflow

#### 1. Adding a New Feature

**Step 1: Update Database Schema**

Edit `drizzle/schema.ts`:

```typescript
export const myTable = mysqlTable('my_table', {
  id: int('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('createdAt').defaultNow(),
});
```

Generate migration:
```bash
pnpm drizzle-kit generate
```

Review and apply migration:
```bash
pnpm db:push
```

**Step 2: Add Database Helpers**

Edit `server/db.ts`:

```typescript
export async function getMyData(id: number) {
  const db = await getDb();
  return db.select().from(myTable).where(eq(myTable.id, id));
}
```

**Step 3: Add tRPC Procedures**

Edit `server/routers.ts`:

```typescript
myFeature: router({
  get: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return db.getMyData(input.id);
    }),

  create: protectedProcedure
    .input(z.object({ name: z.string() }))
    .mutation(async ({ input, ctx }) => {
      return db.createMyData(input.name, ctx.user.id);
    })
})
```

**Step 4: Add Frontend Components**

Create `client/src/pages/MyFeature.tsx`:

```typescript
import { trpc } from '@/lib/trpc';

export default function MyFeature() {
  const { data, isLoading } = trpc.myFeature.get.useQuery({ id: 1 });
  const mutation = trpc.myFeature.create.useMutation();

  return (
    <div>
      {isLoading ? 'Loading...' : <p>{data?.name}</p>}
      <button onClick={() => mutation.mutate({ name: 'New Item' })}>
        Create
      </button>
    </div>
  );
}
```

**Step 5: Write Tests**

Add to `server/medf.test.ts`:

```typescript
describe('myFeature', () => {
  test('should get data', async () => {
    const result = await db.getMyData(1);
    expect(result).toBeDefined();
  });
});
```

Run tests:
```bash
pnpm test
```

**Step 6: Create Checkpoint**

```bash
pnpm build
# Verify everything works
# Create checkpoint via UI
```

#### 2. Code Style

**TypeScript**:
- Use strict mode
- Avoid `any` type
- Use interfaces for object types
- Use enums for constants

**React**:
- Functional components only
- Use hooks for state management
- Prefer composition over inheritance
- Use TypeScript for props

**Naming**:
- camelCase for variables and functions
- PascalCase for components and types
- UPPER_SNAKE_CASE for constants

#### 3. Testing Guidelines

**Unit Tests**:
- Test pure functions
- Test database queries
- Test business logic

**Test Structure**:
```typescript
describe('Feature Name', () => {
  beforeEach(() => {
    // Setup
  });

  test('should do something', () => {
    // Arrange
    const input = ...;
    
    // Act
    const result = ...;
    
    // Assert
    expect(result).toBe(...);
  });
});
```

**Run Tests**:
```bash
# All tests
pnpm test

# Specific file
pnpm test -- server/medf.test.ts

# Watch mode
pnpm test -- --watch

# Coverage
pnpm test -- --coverage
```

#### 4. Database Migrations

**Generate Migration**:
```bash
# After editing drizzle/schema.ts
pnpm drizzle-kit generate
```

**Review Migration**:
```bash
# Check generated SQL in drizzle/migrations/
cat drizzle/XXXX_name.sql
```

**Apply Migration**:
```bash
pnpm db:push
```

**Rollback** (if needed):
```bash
# Use webdev_rollback_checkpoint to restore previous state
```

#### 5. Environment Variables

**Development** (`.env`):
```bash
DATABASE_URL=mysql://user:pass@localhost/medf_hub
VITE_APP_ID=dev_app_id
PINATA_API_KEY=optional_for_dev
```

**Production** (via Manus Settings):
- Set via Management UI
- Never commit to repository
- Use strong, unique values

#### 6. Debugging

**Browser DevTools**:
- React DevTools extension
- Network tab for API calls
- Console for errors

**Server Logs**:
```bash
# Check .manus-logs/ directory
tail -f .manus-logs/devserver.log
tail -f .manus-logs/browserConsole.log
```

**Database Debugging**:
```bash
# Connect to database
mysql -u user -p database

# Check tables
SHOW TABLES;
DESCRIBE documents;
```

### Common Tasks

#### Add a New Page

1. Create `client/src/pages/NewPage.tsx`
2. Add route in `client/src/App.tsx`
3. Add navigation link in `client/src/components/AppLayout.tsx`

#### Add a New API Endpoint

1. Add procedure to `server/routers.ts`
2. Call from frontend with `trpc.*.useQuery/useMutation`
3. Add tests to `server/medf.test.ts`

#### Update Database Schema

1. Edit `drizzle/schema.ts`
2. Run `pnpm drizzle-kit generate`
3. Review and apply migration with `pnpm db:push`
4. Update `server/db.ts` helpers
5. Update `server/routers.ts` procedures

#### Deploy Changes

1. Ensure all tests pass: `pnpm test`
2. Build: `pnpm build`
3. Create checkpoint via UI
4. Click Publish button

### Performance Tips

- Use React.memo for expensive components
- Implement pagination for large lists
- Cache database queries with Redis
- Use CDN for static assets
- Optimize images before upload

### Security Checklist

- ✅ Validate all user input
- ✅ Use parameterized queries (Drizzle ORM)
- ✅ Implement rate limiting
- ✅ Use HTTPS in production
- ✅ Sanitize HTML output
- ✅ Implement CORS properly
- ✅ Use secure session cookies
- ✅ Validate file uploads

---

## 日本語

### 開発環境セットアップ

#### 前提条件
- Node.js 16+ と pnpm
- MySQL 5.7+ または TiDB
- Git

#### 初期セットアップ

```bash
# リポジトリをクローン
git clone https://github.com/maskin/medf-hub.git
cd medf-hub

# 依存関係をインストール
pnpm install

# 環境をセットアップ
cp .env.example .env
# .env を設定で編集

# データベースマイグレーションを実行
pnpm db:push

# 開発サーバーを起動
pnpm dev
```

開発サーバーは http://localhost:3000 で実行されます

### プロジェクト構成

```
medf-hub/
├── client/                 # React フロントエンド
│   ├── src/
│   │   ├── pages/         # ページコンポーネント
│   │   ├── components/    # 再利用可能なコンポーネント
│   │   ├── lib/           # ユーティリティとヘルパー
│   │   ├── contexts/      # React コンテキスト
│   │   ├── hooks/         # カスタムフック
│   │   ├── App.tsx        # メインアプリコンポーネント
│   │   └── main.tsx       # エントリーポイント
│   ├── index.html         # HTML テンプレート
│   └── package.json
├── server/                # Express + tRPC バックエンド
│   ├── routers.ts         # tRPC プロシージャ定義
│   ├── db.ts              # データベースクエリヘルパー
│   ├── storage.ts         # S3 ストレージヘルパー
│   ├── pinata.test.ts     # Pinata API テスト
│   └── _core/             # フレームワークプラミング
├── drizzle/               # データベーススキーマ
│   ├── schema.ts          # テーブル定義
│   └── migrations/        # SQL マイグレーション
├── shared/                # 共有コード
│   ├── medf.ts            # MeDF 型とユーティリティ
│   └── const.ts           # 定数
├── docs/                  # ドキュメント
├── package.json           # ルート package.json
└── pnpm-workspace.yaml    # ワークスペース設定
```

### 開発ワークフロー

#### 1. 新機能を追加する

**ステップ 1: データベーススキーマを更新**

`drizzle/schema.ts` を編集:

```typescript
export const myTable = mysqlTable('my_table', {
  id: int('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('createdAt').defaultNow(),
});
```

マイグレーションを生成:
```bash
pnpm drizzle-kit generate
```

マイグレーションを確認して適用:
```bash
pnpm db:push
```

**ステップ 2: データベースヘルパーを追加**

`server/db.ts` を編集:

```typescript
export async function getMyData(id: number) {
  const db = await getDb();
  return db.select().from(myTable).where(eq(myTable.id, id));
}
```

**ステップ 3: tRPC プロシージャを追加**

`server/routers.ts` を編集:

```typescript
myFeature: router({
  get: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return db.getMyData(input.id);
    }),

  create: protectedProcedure
    .input(z.object({ name: z.string() }))
    .mutation(async ({ input, ctx }) => {
      return db.createMyData(input.name, ctx.user.id);
    })
})
```

**ステップ 4: フロントエンドコンポーネントを追加**

`client/src/pages/MyFeature.tsx` を作成:

```typescript
import { trpc } from '@/lib/trpc';

export default function MyFeature() {
  const { data, isLoading } = trpc.myFeature.get.useQuery({ id: 1 });
  const mutation = trpc.myFeature.create.useMutation();

  return (
    <div>
      {isLoading ? 'Loading...' : <p>{data?.name}</p>}
      <button onClick={() => mutation.mutate({ name: 'New Item' })}>
        Create
      </button>
    </div>
  );
}
```

**ステップ 5: テストを作成**

`server/medf.test.ts` に追加:

```typescript
describe('myFeature', () => {
  test('should get data', async () => {
    const result = await db.getMyData(1);
    expect(result).toBeDefined();
  });
});
```

テストを実行:
```bash
pnpm test
```

**ステップ 6: チェックポイントを作成**

```bash
pnpm build
# すべてが動作することを確認
# UI でチェックポイントを作成
```

#### 2. コードスタイル

**TypeScript**:
- strict モードを使用
- `any` 型を避ける
- オブジェクト型にはインターフェースを使用
- 定数には enum を使用

**React**:
- 関数型コンポーネントのみ
- 状態管理にはフックを使用
- 継承より合成を優先
- props には TypeScript を使用

**命名規則**:
- 変数と関数: camelCase
- コンポーネントと型: PascalCase
- 定数: UPPER_SNAKE_CASE

#### 3. テストガイドライン

**ユニットテスト**:
- 純粋関数をテスト
- データベースクエリをテスト
- ビジネスロジックをテスト

**テスト構造**:
```typescript
describe('Feature Name', () => {
  beforeEach(() => {
    // セットアップ
  });

  test('should do something', () => {
    // Arrange
    const input = ...;
    
    // Act
    const result = ...;
    
    // Assert
    expect(result).toBe(...);
  });
});
```

**テストを実行**:
```bash
# すべてのテスト
pnpm test

# 特定のファイル
pnpm test -- server/medf.test.ts

# ウォッチモード
pnpm test -- --watch

# カバレッジ
pnpm test -- --coverage
```

#### 4. データベースマイグレーション

**マイグレーションを生成**:
```bash
# drizzle/schema.ts を編集後
pnpm drizzle-kit generate
```

**マイグレーションを確認**:
```bash
# drizzle/migrations/ で生成された SQL を確認
cat drizzle/XXXX_name.sql
```

**マイグレーションを適用**:
```bash
pnpm db:push
```

**ロールバック** (必要な場合):
```bash
# webdev_rollback_checkpoint を使用して前の状態に戻す
```

#### 5. 環境変数

**開発** (`.env`):
```bash
DATABASE_URL=mysql://user:pass@localhost/medf_hub
VITE_APP_ID=dev_app_id
PINATA_API_KEY=optional_for_dev
```

**本番** (Manus Settings 経由):
- Management UI で設定
- リポジトリにコミットしない
- 強力でユニークな値を使用

#### 6. デバッグ

**ブラウザ DevTools**:
- React DevTools 拡張機能
- ネットワークタブで API 呼び出しを確認
- コンソールでエラーを確認

**サーバーログ**:
```bash
# .manus-logs/ ディレクトリを確認
tail -f .manus-logs/devserver.log
tail -f .manus-logs/browserConsole.log
```

**データベースデバッグ**:
```bash
# データベースに接続
mysql -u user -p database

# テーブルを確認
SHOW TABLES;
DESCRIBE documents;
```

### よくあるタスク

#### 新しいページを追加

1. `client/src/pages/NewPage.tsx` を作成
2. `client/src/App.tsx` にルートを追加
3. `client/src/components/AppLayout.tsx` にナビゲーションリンクを追加

#### 新しい API エンドポイントを追加

1. `server/routers.ts` にプロシージャを追加
2. フロントエンドから `trpc.*.useQuery/useMutation` で呼び出し
3. `server/medf.test.ts` にテストを追加

#### データベーススキーマを更新

1. `drizzle/schema.ts` を編集
2. `pnpm drizzle-kit generate` を実行
3. マイグレーションを確認して `pnpm db:push` で適用
4. `server/db.ts` ヘルパーを更新
5. `server/routers.ts` プロシージャを更新

#### 変更をデプロイ

1. すべてのテストが通ることを確認: `pnpm test`
2. ビルド: `pnpm build`
3. UI でチェックポイントを作成
4. 公開ボタンをクリック

### パフォーマンスのヒント

- React.memo を使用して高コストなコンポーネントをメモ化
- 大規模なリストにはページネーションを実装
- Redis でデータベースクエリをキャッシュ
- 静的アセットに CDN を使用
- アップロード前に画像を最適化

### セキュリティチェックリスト

- ✅ すべてのユーザー入力を検証
- ✅ パラメータ化クエリを使用 (Drizzle ORM)
- ✅ レート制限を実装
- ✅ 本番環境で HTTPS を使用
- ✅ HTML 出力をサニタイズ
- ✅ CORS を適切に実装
- ✅ セキュアなセッションクッキーを使用
- ✅ ファイルアップロードを検証

---

**Last Updated**: 2026-02-08
