import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Search, FileText, Plus, Clock, User, Hash, Layers } from "lucide-react";
import { useState, useMemo } from "react";

export default function DocumentList() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const limit = 12;

  // Debounce search
  useMemo(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading } = trpc.document.list.useQuery({
    search: debouncedSearch || undefined,
    limit,
    offset: page * limit,
  });

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">文書一覧</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {data ? `${data.total}件の文書` : "読み込み中..."}
          </p>
        </div>
        <Link href="/documents/create">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            新規作成
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="タイトル、ID、発行者で検索..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          className="pl-9"
        />
      </div>

      {/* Document Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : data?.items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">文書がありません</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              {search ? "検索条件に一致する文書が見つかりませんでした" : "最初の文書を作成してみましょう"}
            </p>
            {!search && (
              <Link href="/documents/create">
                <Button variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" />
                  新規作成
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data?.items.map((doc) => (
              <Link key={doc.id} href={`/documents/${doc.id}`}>
                <Card className="h-full hover:shadow-md transition-all hover:border-primary/30 cursor-pointer group">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base leading-snug group-hover:text-primary transition-colors line-clamp-2">
                        {doc.title}
                      </CardTitle>
                      {doc.documentType && (
                        <Badge variant="secondary" className="shrink-0 text-xs">
                          {doc.documentType}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Hash className="h-3 w-3" />
                      <span className="font-mono truncate">{doc.medfId}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span>{doc.issuer}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{new Date(doc.snapshot).toLocaleString("ja-JP")}</span>
                    </div>
                    <div className="flex items-center gap-4 pt-1">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Layers className="h-3 w-3" />
                        <span>{doc.blockCount}ブロック</span>
                      </div>
                      {doc.ipfsCid && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <span className="font-mono truncate max-w-[120px]">
                            CID: {doc.ipfsCid.substring(0, 16)}...
                          </span>
                        </div>
                      )}
                    </div>
                    {doc.docHash && (
                      <div className="pt-1">
                        <span className="text-xs font-mono text-muted-foreground/70 truncate block">
                          sha256:{doc.docHash.substring(0, 24)}...
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
              >
                前へ
              </Button>
              <span className="text-sm text-muted-foreground px-2">
                {page + 1} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage(page + 1)}
              >
                次へ
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
