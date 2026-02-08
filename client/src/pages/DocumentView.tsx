import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { useState, useEffect, useCallback } from "react";
import { useRoute, Link, useLocation } from "wouter";
import {
  ArrowLeft,
  Shield,
  ShieldCheck,
  ShieldX,
  Hash,
  Copy,
  Download,
  Edit,
  MessageSquare,
  Link2,
  Clock,
  User,
  FileText,
  Layers,
  ChevronDown,
  ChevronRight,
  Send,
  ExternalLink,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import { verifyDocument, simulateIpfsCid, stableStringify } from "@/lib/medf-crypto";
import { Streamdown } from "streamdown";
import type { MedfDocument } from "@shared/medf";
import { MEDF_CITATION_REGEX } from "@shared/medf";
import { getLoginUrl } from "@/const";

function CitationLink({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  const regex = new RegExp(MEDF_CITATION_REGEX.source, "g");
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const docId = match[1];
    const blockId = match[2];
    parts.push(
      <Link
        key={match.index}
        href={`/documents/${docId}${blockId ? `#${blockId}` : ""}`}
        className="text-primary hover:underline font-mono text-xs bg-primary/5 px-1 py-0.5 rounded"
      >
        {match[0]}
      </Link>
    );
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return <>{parts}</>;
}

function VerificationBadge({
  valid,
  label,
}: {
  valid: boolean | null;
  label: string;
}) {
  if (valid === null) {
    return (
      <Badge variant="outline" className="gap-1 text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        {label}
      </Badge>
    );
  }
  return valid ? (
    <Badge variant="outline" className="gap-1 text-green-700 border-green-300 bg-green-50">
      <CheckCircle className="h-3 w-3" />
      {label}
    </Badge>
  ) : (
    <Badge variant="outline" className="gap-1 text-red-700 border-red-300 bg-red-50">
      <XCircle className="h-3 w-3" />
      {label}
    </Badge>
  );
}

export default function DocumentView() {
  const [, params] = useRoute("/documents/:id");
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const docId = params?.id ? parseInt(params.id, 10) : null;

  const { data: docData, isLoading } = trpc.document.getById.useQuery(
    { id: docId! },
    { enabled: docId !== null && !isNaN(docId!) }
  );

  const { data: commentsData, refetch: refetchComments } =
    trpc.comment.list.useQuery(
      { documentId: docId! },
      { enabled: docId !== null && !isNaN(docId!) }
    );

  const { data: outgoingRefs } = trpc.reference.outgoing.useQuery(
    { documentId: docId! },
    { enabled: docId !== null && !isNaN(docId!) }
  );

  const { data: incomingRefs } = trpc.reference.incoming.useQuery(
    { medfId: docData?.medfId ?? "" },
    { enabled: !!docData?.medfId }
  );

  const [verification, setVerification] = useState<{
    valid: boolean | null;
    blockResults: Array<{
      blockId: string;
      expected: string | undefined;
      computed: string;
      valid: boolean;
    }>;
    docHashResult: { expected: string | undefined; computed: string; valid: boolean } | null;
    ipfsCid: string | null;
  }>({ valid: null, blockResults: [], docHashResult: null, ipfsCid: null });

  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());
  const [commentBlockId, setCommentBlockId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [activeTab, setActiveTab] = useState("content");

  const createCommentMutation = trpc.comment.create.useMutation({
    onSuccess: () => {
      setCommentText("");
      setCommentBlockId(null);
      refetchComments();
      toast.success("コメントを投稿しました");
    },
    onError: (err) => toast.error(err.message),
  });

  // Run verification when document loads
  const runVerification = useCallback(async () => {
    if (!docData?.medfJson) return;
    try {
      const medf = JSON.parse(docData.medfJson) as MedfDocument;
      const result = await verifyDocument(medf);
      const cid = await simulateIpfsCid(stableStringify(medf));
      setVerification({
        valid: result.valid,
        blockResults: result.blockResults,
        docHashResult: result.docHashResult,
        ipfsCid: cid,
      });
    } catch (err) {
      console.error("Verification failed:", err);
      setVerification({ valid: false, blockResults: [], docHashResult: null, ipfsCid: null });
    }
  }, [docData?.medfJson]);

  useEffect(() => {
    runVerification();
  }, [runVerification]);

  const toggleBlock = (blockId: string) => {
    setExpandedBlocks((prev) => {
      const next = new Set(prev);
      if (next.has(blockId)) next.delete(blockId);
      else next.add(blockId);
      return next;
    });
  };

  const handleCopyJson = async () => {
    if (!docData?.medfJson) return;
    await navigator.clipboard.writeText(
      JSON.stringify(JSON.parse(docData.medfJson), null, 2)
    );
    toast.success("JSONをコピーしました");
  };

  const handleDownload = () => {
    if (!docData?.medfJson) return;
    const blob = new Blob(
      [JSON.stringify(JSON.parse(docData.medfJson), null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${docData.medfId}.medf.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSubmitComment = (blockId?: string) => {
    if (!user) {
      toast.error("コメントするにはログインが必要です");
      return;
    }
    if (!commentText.trim()) return;
    const citation = blockId
      ? `MEDF: ${docData?.medfId}#${blockId}`
      : `MEDF: ${docData?.medfId}`;
    createCommentMutation.mutate({
      documentId: docId!,
      blockId: blockId || undefined,
      content: commentText,
      citation,
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!docData) {
    return (
      <div className="max-w-4xl mx-auto text-center py-16">
        <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
        <h2 className="text-lg font-medium">文書が見つかりません</h2>
        <Link href="/documents">
          <Button variant="outline" className="mt-4">
            文書一覧に戻る
          </Button>
        </Link>
      </div>
    );
  }

  const medf = JSON.parse(docData.medfJson) as MedfDocument;
  const blockCommentCounts: Record<string, number> = {};
  commentsData?.forEach((c) => {
    if (c.blockId) {
      blockCommentCounts[c.blockId] = (blockCommentCounts[c.blockId] || 0) + 1;
    }
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/documents")}
            className="mt-1"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">{docData.title}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="gap-1 font-mono text-xs">
                <Hash className="h-3 w-3" />
                {docData.medfId}
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <User className="h-3 w-3" />
                {docData.issuer}
              </Badge>
              {docData.documentType && (
                <Badge variant="secondary">{docData.documentType}</Badge>
              )}
              <Badge variant="outline" className="gap-1 text-xs">
                <Clock className="h-3 w-3" />
                {new Date(docData.snapshot).toLocaleString("ja-JP")}
              </Badge>
              <Badge variant="outline" className="gap-1 text-xs">
                <Layers className="h-3 w-3" />
                {docData.blockCount}ブロック
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={handleCopyJson} className="gap-1">
            <Copy className="h-3.5 w-3.5" />
            JSON
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload} className="gap-1">
            <Download className="h-3.5 w-3.5" />
          </Button>
          {user && docData.userId === user.id && (
            <Link href={`/documents/${docData.id}/edit`}>
              <Button variant="outline" size="sm" className="gap-1">
                <Edit className="h-3.5 w-3.5" />
                編集
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Verification Banner */}
      <Card
        className={`border ${
          verification.valid === null
            ? ""
            : verification.valid
            ? "border-green-200 bg-green-50/50"
            : "border-red-200 bg-red-50/50"
        }`}
      >
        <CardContent className="flex flex-wrap items-center gap-3 py-3">
          {verification.valid === null ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : verification.valid ? (
            <ShieldCheck className="h-5 w-5 text-green-600" />
          ) : (
            <ShieldX className="h-5 w-5 text-red-600" />
          )}
          <span className="text-sm font-medium">
            {verification.valid === null
              ? "検証中..."
              : verification.valid
              ? "すべてのハッシュが一致しています"
              : "ハッシュの不一致が検出されました"}
          </span>
          <div className="flex flex-wrap gap-2 ml-auto">
            <VerificationBadge
              valid={verification.docHashResult?.valid ?? null}
              label="ドキュメントハッシュ"
            />
            <VerificationBadge
              valid={
                verification.blockResults.length > 0
                  ? verification.blockResults.every((r) => r.valid)
                  : null
              }
              label={`ブロックハッシュ (${verification.blockResults.length})`}
            />
          </div>
          {docData.ipfsCid && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="gap-1 font-mono text-xs cursor-help">
                  CID: {docData.ipfsCid.substring(0, 20)}...
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-mono text-xs">{docData.ipfsCid}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="content" className="gap-1">
            <FileText className="h-3.5 w-3.5" />
            コンテンツ
          </TabsTrigger>
          <TabsTrigger value="discussion" className="gap-1">
            <MessageSquare className="h-3.5 w-3.5" />
            議論 ({commentsData?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="references" className="gap-1">
            <Link2 className="h-3.5 w-3.5" />
            参照 ({(outgoingRefs?.length || 0) + (incomingRefs?.length || 0)})
          </TabsTrigger>
          <TabsTrigger value="verification" className="gap-1">
            <Shield className="h-3.5 w-3.5" />
            検証詳細
          </TabsTrigger>
          <TabsTrigger value="json" className="gap-1">
            <Hash className="h-3.5 w-3.5" />
            JSON
          </TabsTrigger>
        </TabsList>

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-3 mt-4">
          {/* TOC */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">目次</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {medf.blocks.map((block, i) => (
                  <li key={block.block_id}>
                    <button
                      onClick={() => {
                        const el = document.getElementById(`block-${block.block_id}`);
                        el?.scrollIntoView({ behavior: "smooth" });
                      }}
                      className="text-sm text-primary hover:underline flex items-center gap-2"
                    >
                      <span className="text-muted-foreground text-xs w-6">{i + 1}.</span>
                      <span>{block.block_id}</span>
                      <Badge variant="outline" className="text-xs h-5">
                        {block.role}
                      </Badge>
                    </button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Blocks */}
          {medf.blocks.map((block, i) => {
            const blockVerification = verification.blockResults.find(
              (r) => r.blockId === block.block_id
            );
            const isExpanded = expandedBlocks.has(block.block_id);
            const commentCount = blockCommentCounts[block.block_id] || 0;

            return (
              <Card key={block.block_id} id={`block-${block.block_id}`} className="scroll-mt-20">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleBlock(block.block_id)}
                        className="p-0.5 hover:bg-accent rounded"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                      <span className="text-sm font-medium">{block.block_id}</span>
                      <Badge variant="outline" className="text-xs h-5">
                        {block.role}
                      </Badge>
                      <Badge variant="outline" className="text-xs h-5">
                        {block.format}
                      </Badge>
                      {blockVerification && (
                        <VerificationBadge
                          valid={blockVerification.valid}
                          label=""
                        />
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {commentCount > 0 && (
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <MessageSquare className="h-3 w-3" />
                          {commentCount}
                        </Badge>
                      )}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(
                                `MEDF: ${docData.medfId}#${block.block_id}`
                              );
                              toast.success("引用をコピーしました");
                            }}
                            className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-mono text-xs">
                            MEDF: {docData.medfId}#{block.block_id}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                      <button
                        onClick={() => {
                          setCommentBlockId(block.block_id);
                          setActiveTab("discussion");
                        }}
                        className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none">
                    {block.format === "markdown" ? (
                      <Streamdown>{block.text}</Streamdown>
                    ) : (
                      <p className="whitespace-pre-wrap">
                        <CitationLink text={block.text} />
                      </p>
                    )}
                  </div>
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t space-y-2">
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>
                          <strong>ブロックハッシュ:</strong>{" "}
                          <span className="font-mono">
                            {block.block_hash || "未計算"}
                          </span>
                        </p>
                        {blockVerification && (
                          <p>
                            <strong>計算済みハッシュ:</strong>{" "}
                            <span className="font-mono">
                              {blockVerification.computed}
                            </span>
                          </p>
                        )}
                        <p>
                          <strong>引用形式:</strong>{" "}
                          <span className="font-mono">
                            MEDF: {docData.medfId}#{block.block_id}
                          </span>
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* Discussion Tab */}
        <TabsContent value="discussion" className="space-y-4 mt-4">
          {/* Comment form */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                {commentBlockId
                  ? `ブロック "${commentBlockId}" へのコメント`
                  : "文書全体へのコメント"}
              </CardTitle>
              {commentBlockId && (
                <button
                  onClick={() => setCommentBlockId(null)}
                  className="text-xs text-primary hover:underline"
                >
                  文書全体にコメントする
                </button>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {user ? (
                <>
                  <Textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="コメントを入力... (MEDF: doc#block 形式で引用可能)"
                    className="min-h-[80px] text-sm"
                  />
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-muted-foreground">
                      引用: MEDF: {docData.medfId}
                      {commentBlockId ? `#${commentBlockId}` : ""}
                    </p>
                    <Button
                      size="sm"
                      onClick={() => handleSubmitComment(commentBlockId || undefined)}
                      disabled={!commentText.trim() || createCommentMutation.isPending}
                      className="gap-1"
                    >
                      <Send className="h-3.5 w-3.5" />
                      投稿
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  コメントするには
                  <a href={getLoginUrl()} className="text-primary hover:underline ml-1">
                    ログイン
                  </a>
                  してください
                </p>
              )}
            </CardContent>
          </Card>

          {/* Comments list */}
          {!commentsData || commentsData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">まだコメントはありません</p>
            </div>
          ) : (
            <div className="space-y-3">
              {commentsData.map((comment) => (
                <Card key={comment.id}>
                  <CardContent className="py-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {comment.userName || "匿名"}
                        </span>
                        {comment.blockId && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Hash className="h-2.5 w-2.5" />
                            {comment.blockId}
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(comment.createdAt).toLocaleString("ja-JP")}
                      </span>
                    </div>
                    <div className="text-sm">
                      <CitationLink text={comment.content} />
                    </div>
                    {comment.citation && (
                      <p className="text-xs text-muted-foreground font-mono">
                        {comment.citation}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* References Tab */}
        <TabsContent value="references" className="space-y-4 mt-4">
          {/* Outgoing */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                この文書からの参照 ({outgoingRefs?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!outgoingRefs || outgoingRefs.length === 0 ? (
                <p className="text-sm text-muted-foreground">参照なし</p>
              ) : (
                <ul className="space-y-2">
                  {outgoingRefs.map((ref) => (
                    <li key={ref.id} className="flex items-center gap-2 text-sm">
                      <span className="font-mono text-xs text-muted-foreground">
                        {ref.sourceBlockId && `#${ref.sourceBlockId} →`}
                      </span>
                      <Link
                        href={`/documents/${ref.targetDocId || ref.targetMedfId}`}
                        className="text-primary hover:underline font-mono text-xs"
                      >
                        {ref.citation}
                      </Link>
                      {ref.resolved ? (
                        <Badge variant="outline" className="text-xs text-green-600 border-green-300">
                          解決済
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                          未解決
                        </Badge>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Incoming */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                この文書への参照 ({incomingRefs?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!incomingRefs || incomingRefs.length === 0 ? (
                <p className="text-sm text-muted-foreground">被参照なし</p>
              ) : (
                <ul className="space-y-2">
                  {incomingRefs.map((ref) => (
                    <li key={ref.id} className="flex items-center gap-2 text-sm">
                      <Link
                        href={`/documents/${ref.sourceDocId}`}
                        className="text-primary hover:underline"
                      >
                        {ref.sourceTitle || ref.sourceMedfId}
                      </Link>
                      <span className="text-xs text-muted-foreground font-mono">
                        {ref.sourceBlockId && `#${ref.sourceBlockId}`}
                        {ref.targetBlockId && ` → #${ref.targetBlockId}`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Verification Tab */}
        <TabsContent value="verification" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">ドキュメントハッシュ検証</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="grid grid-cols-[100px_1fr] gap-2">
                <span className="text-muted-foreground">アルゴリズム:</span>
                <span className="font-mono">sha-256</span>
                <span className="text-muted-foreground">期待値:</span>
                <span className="font-mono text-xs break-all">
                  {verification.docHashResult?.expected || "なし"}
                </span>
                <span className="text-muted-foreground">計算値:</span>
                <span className="font-mono text-xs break-all">
                  {verification.docHashResult?.computed || "計算中..."}
                </span>
                <span className="text-muted-foreground">結果:</span>
                <VerificationBadge
                  valid={verification.docHashResult?.valid ?? null}
                  label={verification.docHashResult?.valid ? "一致" : "不一致"}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">IPFS CIDシミュレーション</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="grid grid-cols-[100px_1fr] gap-2">
                <span className="text-muted-foreground">保存CID:</span>
                <span className="font-mono text-xs break-all">
                  {docData.ipfsCid || "なし"}
                </span>
                <span className="text-muted-foreground">計算CID:</span>
                <span className="font-mono text-xs break-all">
                  {verification.ipfsCid || "計算中..."}
                </span>
                <span className="text-muted-foreground">一致:</span>
                <VerificationBadge
                  valid={
                    verification.ipfsCid
                      ? docData.ipfsCid === verification.ipfsCid
                      : null
                  }
                  label={
                    verification.ipfsCid && docData.ipfsCid === verification.ipfsCid
                      ? "一致"
                      : "不一致"
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                ブロックハッシュ検証 ({verification.blockResults.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {verification.blockResults.map((result) => (
                  <div
                    key={result.blockId}
                    className="flex items-center justify-between py-1.5 border-b last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono">{result.blockId}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground max-w-[200px] truncate">
                        {result.computed.substring(0, 16)}...
                      </span>
                      <VerificationBadge
                        valid={result.valid}
                        label={result.valid ? "OK" : "NG"}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">RFC 8785 JSON正規化</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>
                この検証はクライアントサイドで実行されています。RFC 8785に準拠したJSON正規化
                （Canonical JSON）とWeb Crypto APIによるSHA-256ハッシュ計算を使用しています。
              </p>
              <ul className="list-disc pl-4 space-y-1 text-xs">
                <li>オブジェクトキーは辞書順にソート</li>
                <li>不要な空白は除去</li>
                <li>数値は正規化された表現を使用</li>
                <li>ネットワーク接続なしで検証可能</li>
              </ul>
              <Button variant="outline" size="sm" onClick={runVerification} className="gap-1 mt-2">
                <Shield className="h-3.5 w-3.5" />
                再検証
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* JSON Tab */}
        <TabsContent value="json" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">MeDF JSON (v{medf.medf_version})</CardTitle>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={handleCopyJson} className="gap-1">
                    <Copy className="h-3.5 w-3.5" />
                    コピー
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleDownload} className="gap-1">
                    <Download className="h-3.5 w-3.5" />
                    ダウンロード
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/50 rounded-lg p-4 max-h-[600px] overflow-auto">
                <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                  {JSON.stringify(medf, null, 2)}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
