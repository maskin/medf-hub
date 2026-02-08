import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import {
  FileText,
  Shield,
  Hash,
  MessageSquare,
  ArrowRightLeft,
  Search,
  Link2,
  Wifi,
} from "lucide-react";

const features = [
  {
    icon: ArrowRightLeft,
    title: "Markdown → MeDF変換",
    description: "Markdownファイルからブロック単位のMeDF v0.2.1形式JSONを自動生成",
  },
  {
    icon: FileText,
    title: "文書管理",
    description: "MeDF文書のアップロード・作成・編集をブラウザ上で完結",
  },
  {
    icon: Hash,
    title: "IPFS CIDシミュレーション",
    description: "SHA-256ベースのCID生成で分散型ストレージを模擬",
  },
  {
    icon: Shield,
    title: "検証・閲覧",
    description: "RFC 8785準拠のJSON正規化によるブロック・ドキュメントハッシュ検証",
  },
  {
    icon: MessageSquare,
    title: "ブロック単位の議論",
    description: "MEDF: doc#block形式での引用とスレッド型コメント",
  },
  {
    icon: Search,
    title: "検索・フィルタリング",
    description: "タイトル、発行者、タイムスタンプによる文書検索",
  },
  {
    icon: Link2,
    title: "参照トラッキング",
    description: "MEDF: doc#block形式の参照を自動検出・リンク化",
  },
  {
    icon: Wifi,
    title: "オフライン検証",
    description: "Web Crypto APIによるクライアントサイド完結の整合性検証",
  },
];

export default function Home() {
  return (
    <div className="space-y-16">
      {/* Hero */}
      <section className="pt-12 pb-4 text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-sm text-muted-foreground bg-muted/50">
          <Shield className="h-3.5 w-3.5" />
          MeDF v0.2.1 対応
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight">
          検証可能な文書を
          <br />
          <span className="text-primary">共有し、議論する</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          MeDF（Mutable Expression Description Format）とIPFSを組み合わせた
          分散型文書共有・議論プラットフォーム。テキストの不変性を保証しながら、
          ブロック単位での参照・議論を可能にします。
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link href="/documents">
            <Button size="lg" className="gap-2">
              <FileText className="h-4 w-4" />
              文書を閲覧
            </Button>
          </Link>
          <Link href="/convert">
            <Button size="lg" variant="outline" className="gap-2">
              <ArrowRightLeft className="h-4 w-4" />
              Markdownを変換
            </Button>
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section className="space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">主な機能</h2>
          <p className="text-muted-foreground">
            MeDFの思想に基づいた文書管理・検証・議論の統合プラットフォーム
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((feature) => (
            <Card key={feature.title} className="border bg-card hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-base">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* MeDF Concept */}
      <section className="max-w-3xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">MeDFとは</h2>
        </div>
        <Card className="bg-muted/30 border">
          <CardContent className="pt-6 space-y-4 text-sm leading-relaxed text-muted-foreground">
            <p>
              <strong className="text-foreground">MeDF（Mutable Expression Description Format）</strong>は、
              テキストの検証可能性を保ちながら、表現の柔軟性を許容する文書フォーマットです。
            </p>
            <div className="bg-background rounded-lg p-4 font-mono text-xs border">
              <pre className="whitespace-pre-wrap">{`{
  "medf_version": "0.2.1",
  "id": "document-id",
  "snapshot": "2026-02-08T10:00:00Z",
  "issuer": "issuer-code",
  "blocks": [
    {
      "block_id": "introduction",
      "role": "body",
      "format": "markdown",
      "text": "...",
      "block_hash": "sha256:..."
    }
  ],
  "doc_hash": { "algorithm": "sha-256", "value": "..." }
}`}</pre>
            </div>
            <ul className="space-y-1.5 pl-4">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">●</span>
                <span><strong className="text-foreground">ブロックベース</strong> — セクション単位でハッシュ化・参照可能</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">●</span>
                <span><strong className="text-foreground">RFC 8785準拠</strong> — JSON正規化による再現可能なハッシュ</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">●</span>
                <span><strong className="text-foreground">オフラインファースト</strong> — 中央サーバー不要で検証可能</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t pt-8 pb-4 text-center text-sm text-muted-foreground">
        <p>
          Powered by{" "}
          <a
            href="https://github.com/maskin/medf"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            MeDF
          </a>{" "}
          — Mutable Expression Description Format
        </p>
      </footer>
    </div>
  );
}
