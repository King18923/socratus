import { useAllHighlights, useBooks, deleteHighlight } from "@/hooks/use-db";
import { Shell } from "@/components/layout/shell";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { Link } from "wouter";
import { type Highlight } from "@/lib/db";

const COLOR_META: Record<string, { label: string; bg: string; border: string; dot: string }> = {
  "#fde047": { label: "Yellow", bg: "bg-yellow-50",  border: "border-yellow-200", dot: "bg-yellow-400" },
  "#86efac": { label: "Green",  bg: "bg-green-50",   border: "border-green-200",  dot: "bg-green-400"  },
  "#f9a8d4": { label: "Pink",   bg: "bg-pink-50",    border: "border-pink-200",   dot: "bg-pink-400"   },
  "#93c5fd": { label: "Blue",   bg: "bg-blue-50",    border: "border-blue-200",   dot: "bg-blue-400"   },
};

const COLOR_ORDER = ["#fde047", "#86efac", "#f9a8d4", "#93c5fd"];

export default function HighlightsPage() {
  const highlights = useAllHighlights();
  const books = useBooks();

  const bookMap = Object.fromEntries(books.map((b) => [b.id!, b]));

  const grouped = COLOR_ORDER.reduce<Record<string, Highlight[]>>((acc, color) => {
    acc[color] = highlights.filter((h) => h.color === color);
    return acc;
  }, {});

  const total = highlights.length;

  return (
    <Shell>
      <ScrollArea className="h-full">
        <div className="p-10 max-w-4xl">
          <div className="mb-10">
            <h1 className="text-3xl font-serif font-medium text-foreground">Highlights</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {total} highlight{total !== 1 ? "s" : ""} across your library
            </p>
          </div>

          {total === 0 ? (
            <div className="text-center py-24 text-muted-foreground">
              <p className="text-lg font-serif">No highlights yet.</p>
              <p className="text-sm mt-2">Select text while reading to add your first highlight.</p>
            </div>
          ) : (
            <div className="space-y-12">
              {COLOR_ORDER.map((color) => {
                const group = grouped[color];
                if (!group.length) return null;
                const meta = COLOR_META[color] ?? {
                  label: "Other", bg: "bg-muted", border: "border-border", dot: "bg-muted-foreground",
                };
                return (
                  <section key={color}>
                    <div className="flex items-center gap-3 mb-5">
                      <span className={`w-3.5 h-3.5 rounded-full ${meta.dot} flex-shrink-0`} />
                      <h2 className="text-lg font-serif font-medium">{meta.label}</h2>
                      <span className="text-sm text-muted-foreground">
                        {group.length} highlight{group.length !== 1 ? "s" : ""}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {group.map((hl) => {
                        const book = bookMap[hl.bookId];
                        return (
                          <div
                            key={hl.id}
                            className={`rounded-xl border ${meta.border} ${meta.bg} p-4 group flex gap-4 items-start`}
                          >
                            <div
                              className="w-1 rounded-full flex-shrink-0 self-stretch mt-0.5"
                              style={{ backgroundColor: color }}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-foreground leading-relaxed font-serif text-[15px]">
                                "{hl.text}"
                              </p>
                              {book && (
                                <div className="mt-2 flex items-center gap-1.5">
                                  <Link href={`/read/${book.id}`}>
                                    <span className="text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer font-medium">
                                      {book.title}
                                    </span>
                                  </Link>
                                  {book.author && (
                                    <>
                                      <span className="text-muted-foreground/40 text-xs">·</span>
                                      <span className="text-xs text-muted-foreground">{book.author}</span>
                                    </>
                                  )}
                                </div>
                              )}
                              {hl.note && (
                                <p className="mt-2 text-sm text-muted-foreground italic border-t border-border/60 pt-2">
                                  {hl.note}
                                </p>
                              )}
                              <p className="text-[11px] text-muted-foreground/50 mt-2">
                                {new Date(hl.createdAt).toLocaleDateString("en-US", {
                                  year: "numeric", month: "short", day: "numeric",
                                })}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="opacity-0 group-hover:opacity-100 h-7 w-7 text-muted-foreground hover:text-destructive flex-shrink-0"
                              onClick={() => hl.id && deleteHighlight(hl.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </ScrollArea>
    </Shell>
  );
}
