import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowRightLeft,
  Download,
  Upload,
  Copy,
  Check,
  FileText,
  Hash,
  Shield,
} from "lucide-react";
import { getLoginUrl } from "@/const";
import type { MedfDocument } from "@shared/medf";

const EXAMPLE_MARKDOWN = `# MeDF サンプル文書

## 概要

MeDF（Mutable Expression Description Format）は、テキストの検証可能性を保ちながら、
表現の柔軟性を許容する文書フォーマットです。

## 設計原則

- ブロックベースの不変テキスト
- RFC 8785 JSON正規化
- ハッシュファースト、署名はオプション
- オフライン検証を設計原則とする

## 参照

MEDF: paper-2026-example#methodology を参照してください。
`;

export default function MarkdownConverter() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [markdown, setMarkdown] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [issuer, setIssuer] = useState("");
  const [convertedMedf, setConvertedMedf] = useState<MedfDocument | null>(null);
  const [copied, setCopied] = useState(false);

  const convertMutation = trpc.document.convertMarkdown.useMutation({
    onSuccess: (data) => {
      setConvertedMedf(data.medf as MedfDocument);
      toast.success("変換完了", { description: `${data.medf.blocks.length}ブロックに分割されました` });
    },
    onError: (err) => {
      toast.error("変換エラー", { description: err.message });
    },
  });

  const createMutation = trpc.document.create.useMutation({
    onSuccess: (data) => {
      toast.success("保存完了", { description: `文書ID: ${data.medfId}` });
      setLocation(`/documents/${data.id}`);
    },
    onError: (err) => {
      toast.error("保存エラー", { description: err.message });
    },
  });

  const handleConvert = () => {
    if (!markdown.trim()) {
      toast.error("Markdownを入力してください");
      return;
    }
    if (!user) {
      toast.error("変換するにはログインが必要です");
      return;
    }
    convertMutation.mutate({
      markdown,
      documentId: documentId || undefined,
      issuer: issuer || undefined,
    });
  };

  const handleSave = () => {
    if (!convertedMedf) return;
    if (!user) {
      toast.error("保存するにはログインが必要です");
      return;
    }
    createMutation.mutate({ medfJson: convertedMedf });
  };

  const handleCopy = async () => {
    if (!convertedMedf) return;
    await navigator.clipboard.writeText(JSON.stringify(convertedMedf, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("JSONをコピーしました");
  };

  const handleDownload = () => {
    if (!convertedMedf) return;
    const blob = new Blob([JSON.stringify(convertedMedf, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${convertedMedf.id}.medf.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLoadExample = () => {
    setMarkdown(EXAMPLE_MARKDOWN);
    setDocumentId("medf-sample-doc");
    setIssuer("example-author");
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Markdown → MeDF 変換</h1>
        <p className="text-sm text-muted-foreground mt-1">
          MarkdownファイルをMeDF v0.2.1形式のJSONに変換します。## ヘッダーでブロックに分割されます。
        </p>
      </div>

      {!user && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-center gap-3 py-3">
            <Shield className="h-5 w-5 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800">
              変換・保存するには
              <a href={getLoginUrl()} className="font-medium underline ml-1">
                ログイン
              </a>
              が必要です
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Markdown入力</CardTitle>
                <Button variant="ghost" size="sm" onClick={handleLoadExample}>
                  サンプルを読み込む
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="# タイトル&#10;&#10;## セクション1&#10;&#10;本文テキスト..."
                value={markdown}
                onChange={(e) => setMarkdown(e.target.value)}
                className="min-h-[300px] font-mono text-sm"
              />
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">文書ID（任意）</Label>
                  <Input
                    placeholder="my-document"
                    value={documentId}
                    onChange={(e) => setDocumentId(e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">発行者（任意）</Label>
                  <Input
                    placeholder="issuer-name"
                    value={issuer}
                    onChange={(e) => setIssuer(e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>
              <Button
                onClick={handleConvert}
                disabled={!markdown.trim() || convertMutation.isPending || !user}
                className="w-full gap-2"
              >
                <ArrowRightLeft className="h-4 w-4" />
                {convertMutation.isPending ? "変換中..." : "MeDFに変換"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Output */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">MeDF出力</CardTitle>
                {convertedMedf && (
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={handleCopy} className="gap-1">
                      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied ? "コピー済" : "コピー"}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleDownload} className="gap-1">
                      <Download className="h-3.5 w-3.5" />
                      DL
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {convertedMedf ? (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="gap-1">
                      <FileText className="h-3 w-3" />
                      {convertedMedf.blocks.length}ブロック
                    </Badge>
                    <Badge variant="outline" className="gap-1">
                      <Hash className="h-3 w-3" />
                      v{convertedMedf.medf_version}
                    </Badge>
                    {convertedMedf.doc_hash && (
                      <Badge variant="outline" className="gap-1 font-mono text-xs">
                        <Shield className="h-3 w-3" />
                        {convertedMedf.doc_hash.value.substring(0, 12)}...
                      </Badge>
                    )}
                  </div>

                  <Separator />

                  {/* JSON Preview */}
                  <div className="bg-muted/50 rounded-lg p-3 max-h-[400px] overflow-auto">
                    <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                      {JSON.stringify(convertedMedf, null, 2)}
                    </pre>
                  </div>

                  {/* Save button */}
                  <Button
                    onClick={handleSave}
                    disabled={createMutation.isPending || !user}
                    className="w-full gap-2"
                    variant="default"
                  >
                    <Upload className="h-4 w-4" />
                    {createMutation.isPending ? "保存中..." : "プラットフォームに保存"}
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                  <ArrowRightLeft className="h-10 w-10 mb-3 opacity-30" />
                  <p className="text-sm">左側にMarkdownを入力して変換してください</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
