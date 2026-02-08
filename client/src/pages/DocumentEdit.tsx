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
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { ArrowLeft, Plus, Trash2, Save, Shield } from "lucide-react";
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

export default function DocumentEdit() {
  const [, params] = useRoute("/documents/:id/edit");
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const docId = params?.id ? parseInt(params.id, 10) : null;

  const { data: docData, isLoading } = trpc.document.getById.useQuery(
    { id: docId! },
    { enabled: docId !== null && !isNaN(docId!) }
  );

  const [medfId, setMedfId] = useState("");
  const [issuer, setIssuer] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [blocks, setBlocks] = useState<Array<Omit<MedfBlock, "block_hash">>>([]);

  useEffect(() => {
    if (docData?.medfJson) {
      try {
        const medf = JSON.parse(docData.medfJson) as MedfDocument;
        setMedfId(medf.id);
        setIssuer(medf.issuer);
        setDocumentType(medf.document_type || "");
        setBlocks(
          medf.blocks.map((b) => ({
            block_id: b.block_id,
            role: b.role,
            format: b.format,
            text: b.text,
          }))
        );
      } catch {
        toast.error("文書データの解析に失敗しました");
      }
    }
  }, [docData]);

  const updateMutation = trpc.document.update.useMutation({
    onSuccess: (data) => {
      toast.success("文書を更新しました");
      setLocation(`/documents/${data.id}`);
    },
    onError: (err) => {
      toast.error("更新エラー", { description: err.message });
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
    if (!medfId.trim() || !issuer.trim()) {
      toast.error("文書IDと発行者は必須です");
      return;
    }
    if (blocks.some((b) => !b.text.trim())) {
      toast.error("空のブロックがあります");
      return;
    }

    const medf: MedfDocument = {
      medf_version: "0.2.1",
      id: medfId,
      snapshot: new Date().toISOString(),
      issuer,
      document_type: documentType || undefined,
      blocks: blocks.map((b) => ({ ...b })),
    };

    updateMutation.mutate({ id: docId!, medfJson: medf });
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!docData) {
    return (
      <div className="max-w-4xl mx-auto text-center py-16">
        <p className="text-muted-foreground">文書が見つかりません</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation(`/documents/${docId}`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">文書を編集</h1>
          <p className="text-sm text-muted-foreground mt-1">
            変更を保存すると新しいスナップショットとハッシュが生成されます
          </p>
        </div>
      </div>

      {!user && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-center gap-3 py-3">
            <Shield className="h-5 w-5 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800">
              編集するには
              <a href={getLoginUrl()} className="font-medium underline ml-1">
                ログイン
              </a>
              が必要です
            </p>
          </CardContent>
        </Card>
      )}

      {/* Metadata */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">文書メタデータ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">文書ID</Label>
              <Input value={medfId} onChange={(e) => setMedfId(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">発行者</Label>
              <Input value={issuer} onChange={(e) => setIssuer(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">文書タイプ</Label>
              <Input
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
                  className="min-h-[120px] font-mono text-sm"
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-3 pb-8">
        <Button
          variant="outline"
          onClick={() => setLocation(`/documents/${docId}`)}
        >
          キャンセル
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={updateMutation.isPending || !user}
          className="gap-2"
        >
          <Save className="h-4 w-4" />
          {updateMutation.isPending ? "更新中..." : "変更を保存"}
        </Button>
      </div>
    </div>
  );
}
