import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useState } from "react";
import { useLocation } from "wouter";
import { Plus, Trash2, ArrowLeft, Upload, Shield } from "lucide-react";
import { getLoginUrl } from "@/const";
import type { MedfBlock, MedfDocument } from "@shared/medf";

const BLOCK_ROLES = [
  "body",
  "abstract",
  "methodology",
  "conclusion",
  "appendix",
  "reference",
  "note",
];

export default function DocumentCreate() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const [docId, setDocId] = useState("");
  const [issuer, setIssuer] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [blocks, setBlocks] = useState<Array<Omit<MedfBlock, "block_hash">>>([
    { block_id: "introduction", role: "body", format: "markdown", text: "" },
  ]);
  const [jsonUpload, setJsonUpload] = useState("");

  const createMutation = trpc.document.create.useMutation({
    onSuccess: (data) => {
      toast.success("文書を作成しました", { description: `ID: ${data.medfId}` });
      setLocation(`/documents/${data.id}`);
    },
    onError: (err) => {
      toast.error("作成エラー", { description: err.message });
    },
  });

  const addBlock = () => {
    setBlocks([
      ...blocks,
      {
        block_id: `block-${blocks.length + 1}`,
        role: "body",
        format: "markdown",
        text: "",
      },
    ]);
  };

  const removeBlock = (index: number) => {
    if (blocks.length <= 1) return;
    setBlocks(blocks.filter((_, i) => i !== index));
  };

  const updateBlock = (index: number, field: string, value: string) => {
    const updated = [...blocks];
    (updated[index] as Record<string, string>)[field] = value;
    setBlocks(updated);
  };

  const handleSubmit = () => {
    if (!user) {
      toast.error("ログインが必要です");
      return;
    }
    if (!docId.trim()) {
      toast.error("文書IDを入力してください");
      return;
    }
    if (!issuer.trim()) {
      toast.error("発行者を入力してください");
      return;
    }
    if (blocks.some((b) => !b.text.trim())) {
      toast.error("空のブロックがあります");
      return;
    }

    const medf: MedfDocument = {
      medf_version: "0.2.1",
      id: docId,
      snapshot: new Date().toISOString(),
      issuer,
      document_type: documentType || undefined,
      blocks: blocks.map((b) => ({ ...b })),
    };

    createMutation.mutate({ medfJson: medf });
  };

  const handleJsonUpload = () => {
    if (!user) {
      toast.error("ログインが必要です");
      return;
    }
    try {
      const parsed = JSON.parse(jsonUpload) as MedfDocument;
      if (!parsed.medf_version || !parsed.id || !parsed.blocks) {
        toast.error("有効なMeDF文書ではありません");
        return;
      }
      createMutation.mutate({ medfJson: parsed });
    } catch {
      toast.error("JSONの解析に失敗しました");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setJsonUpload(text);
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/documents")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">新規文書作成</h1>
          <p className="text-sm text-muted-foreground mt-1">
            MeDF v0.2.1形式の文書を作成またはアップロード
          </p>
        </div>
      </div>

      {!user && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-center gap-3 py-3">
            <Shield className="h-5 w-5 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800">
              文書を作成するには
              <a href={getLoginUrl()} className="font-medium underline ml-1">ログイン</a>
              が必要です
            </p>
          </CardContent>
        </Card>
      )}

      {/* JSON Upload Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">JSONファイルをアップロード</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-3">
            <Input
              type="file"
              accept=".json,.medf"
              onChange={handleFileUpload}
              className="flex-1"
            />
            <Button
              onClick={handleJsonUpload}
              disabled={!jsonUpload || createMutation.isPending || !user}
              className="gap-2 shrink-0"
            >
              <Upload className="h-4 w-4" />
              アップロード
            </Button>
          </div>
          {jsonUpload && (
            <div className="bg-muted/50 rounded-lg p-3 max-h-[150px] overflow-auto">
              <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                {jsonUpload.substring(0, 500)}
                {jsonUpload.length > 500 ? "..." : ""}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">または手動で作成</span>
        <Separator className="flex-1" />
      </div>

      {/* Manual Creation */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">文書メタデータ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">文書ID *</Label>
              <Input
                placeholder="my-document-2026"
                value={docId}
                onChange={(e) => setDocId(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">発行者 *</Label>
              <Input
                placeholder="issuer-name"
                value={issuer}
                onChange={(e) => setIssuer(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">文書タイプ</Label>
              <Input
                placeholder="philosophy, report..."
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Blocks */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">ブロック ({blocks.length})</h2>
          <Button variant="outline" size="sm" onClick={addBlock} className="gap-1">
            <Plus className="h-3.5 w-3.5" />
            ブロック追加
          </Button>
        </div>

        {blocks.map((block, index) => (
          <Card key={index}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  ブロック {index + 1}
                </span>
                {blocks.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeBlock(index)}
                    className="text-destructive hover:text-destructive h-7 w-7 p-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">ブロックID</Label>
                  <Input
                    value={block.block_id}
                    onChange={(e) => updateBlock(index, "block_id", e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">ロール</Label>
                  <Select
                    value={block.role}
                    onValueChange={(v) => updateBlock(index, "role", v)}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BLOCK_ROLES.map((role) => (
                        <SelectItem key={role} value={role}>
                          {role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">フォーマット</Label>
                  <Select
                    value={block.format}
                    onValueChange={(v) => updateBlock(index, "format", v)}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="markdown">markdown</SelectItem>
                      <SelectItem value="plain">plain</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">テキスト</Label>
                <Textarea
                  value={block.text}
                  onChange={(e) => updateBlock(index, "text", e.target.value)}
                  placeholder="ブロックの内容を入力..."
                  className="min-h-[120px] font-mono text-sm"
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-3 pb-8">
        <Button variant="outline" onClick={() => setLocation("/documents")}>
          キャンセル
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={createMutation.isPending || !user}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          {createMutation.isPending ? "作成中..." : "文書を作成"}
        </Button>
      </div>
    </div>
  );
}
