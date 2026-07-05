import { useState, useEffect } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, Quote, BookOpen, Pencil, Plus, Trash2 } from "lucide-react";
import { type Book } from "@/lib/db";
import { useNotes, useHighlights, addNote, deleteNote } from "@/hooks/use-db";
import { Link } from "wouter";

// ── Google Books API ───────────────────────────────────────────────────────
interface GBVolume {
  volumeInfo: {
    title: string;
    authors?: string[];
    description?: string;
    averageRating?: number;
    ratingsCount?: number;
    pageCount?: number;
    categories?: string[];
    publisher?: string;
    publishedDate?: string;
    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
    previewLink?: string;
  };
  searchInfo?: { textSnippet?: string };
}

async function fetchGoogleBooks(title: string, author: string): Promise<GBVolume | null> {
  try {
    const q = encodeURIComponent(`intitle:${title} inauthor:${author}`);
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=3&printType=books`
    );
    const data = await res.json();
    return data.items?.[0] ?? null;
  } catch {
    return null;
  }
}

// ── Quotable API ───────────────────────────────────────────────────────────
interface QuoteResult {
  _id: string;
  content: string;
  author: string;
}

async function fetchQuotes(author: string): Promise<QuoteResult[]> {
  try {
    const slug = author.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const res = await fetch(
      `https://api.quotable.io/quotes?author=${encodeURIComponent(slug)}&limit=5`
    );
    if (!res.ok) throw new Error("not ok");
    const data = await res.json();
    return data.results ?? [];
  } catch {
    return [];
  }
}

// ── Star rating display ────────────────────────────────────────────────────
function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`w-3.5 h-3.5 ${n <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
}

// ── Quick note form ────────────────────────────────────────────────────────
function QuickNoteForm({ bookId, quote, onSaved }: { bookId: number; quote?: string; onSaved: () => void }) {
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!noteContent.trim()) return;
    setSaving(true);
    const now = new Date();
    await addNote({
      bookId,
      title: noteTitle,
      quote: quote || undefined,
      content: noteContent,
      createdAt: now,
      updatedAt: now,
    });
    setSaving(false);
    setNoteTitle("");
    setNoteContent("");
    onSaved();
  };

  return (
    <div className="space-y-3 border border-border rounded-xl p-4 bg-muted/30">
      <Input
        placeholder="Note title (optional)"
        value={noteTitle}
        onChange={(e) => setNoteTitle(e.target.value)}
        className="text-sm"
      />
      {quote && (
        <blockquote className="text-xs text-muted-foreground italic border-l-2 border-primary/40 pl-2 font-serif line-clamp-2">
          "{quote}"
        </blockquote>
      )}
      <Textarea
        placeholder="Write your thoughts…"
        value={noteContent}
        onChange={(e) => setNoteContent(e.target.value)}
        rows={3}
        className="text-sm"
      />
      <div className="flex justify-end gap-2">
        <Button size="sm" onClick={handleSave} disabled={saving || !noteContent.trim()}>
          {saving ? "Saving…" : "Save Note"}
        </Button>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
interface BookDetailsModalProps {
  book: Book | null;
  open: boolean;
  onClose: () => void;
}

export function BookDetailsModal({ book, open, onClose }: BookDetailsModalProps) {
  const [gbData, setGbData] = useState<GBVolume | null>(null);
  const [quotes, setQuotes] = useState<QuoteResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingNoteFor, setAddingNoteFor] = useState<string | undefined>();

  const notes = useNotes(book?.id);
  const highlights = useHighlights(book?.id ?? 0);

  useEffect(() => {
    if (!open || !book) return;
    let cancelled = false;
    setGbData(null);
    setQuotes([]);
    setLoading(true);

    Promise.all([
      fetchGoogleBooks(book.title, book.author),
      fetchQuotes(book.author),
    ]).then(([gb, qs]) => {
      if (cancelled) return;
      setGbData(gb);
      setQuotes(qs);
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [open, book?.id]);

  if (!book) return null;

  const vi = gbData?.volumeInfo;
  const description = vi?.description?.replace(/<[^>]*>/g, "") ?? null;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl p-0 flex flex-col"
      >
        {/* Cover + title header */}
        <div className="flex gap-5 p-6 pb-4 border-b border-border flex-shrink-0">
          <div className="w-20 h-28 rounded-lg overflow-hidden shadow-md flex-shrink-0 bg-muted">
            {book.coverUrl ? (
              <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
            ) : vi?.imageLinks?.thumbnail ? (
              <img
                src={vi.imageLinks.thumbnail.replace("http:", "https:")}
                alt={book.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className="w-full h-full flex items-end p-2"
                style={{
                  background: `linear-gradient(135deg, hsl(${Math.abs(book.title.charCodeAt(0) * 37) % 360}, 40%, 30%), hsl(${Math.abs(book.title.charCodeAt(0) * 37 + 40) % 360}, 50%, 20%))`,
                }}
              >
                <span className="text-white text-[10px] font-serif leading-tight line-clamp-3">
                  {book.title}
                </span>
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 pt-1">
            <SheetTitle className="font-serif text-base leading-tight line-clamp-3 pr-6">
              {book.title}
            </SheetTitle>
            <p className="text-sm text-muted-foreground mt-1">{book.author}</p>

            {vi?.averageRating && (
              <div className="flex items-center gap-2 mt-2">
                <Stars rating={vi.averageRating} />
                <span className="text-xs text-muted-foreground">
                  {vi.averageRating.toFixed(1)} · {vi.ratingsCount?.toLocaleString()} ratings
                </span>
              </div>
            )}

            <div className="flex flex-wrap gap-2 mt-3">
              {vi?.pageCount && (
                <span className="text-xs bg-muted px-2 py-1 rounded-md text-muted-foreground">
                  {vi.pageCount} pages
                </span>
              )}
              {vi?.publishedDate && (
                <span className="text-xs bg-muted px-2 py-1 rounded-md text-muted-foreground">
                  {vi.publishedDate.slice(0, 4)}
                </span>
              )}
              {vi?.categories?.[0] && (
                <span className="text-xs bg-muted px-2 py-1 rounded-md text-muted-foreground">
                  {vi.categories[0]}
                </span>
              )}
            </div>

            <Link href={`/read/${book.id}`}>
              <Button size="sm" className="mt-3 gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                Open Book
              </Button>
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="about" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-6 mt-4 flex-shrink-0 h-9">
            <TabsTrigger value="about"   className="text-xs flex-1">About</TabsTrigger>
            <TabsTrigger value="quotes"  className="text-xs flex-1">Quotes</TabsTrigger>
            <TabsTrigger value="highlights" className="text-xs flex-1">
              Highlights {highlights.length > 0 && `(${highlights.length})`}
            </TabsTrigger>
            <TabsTrigger value="notes"   className="text-xs flex-1">
              Notes {notes.length > 0 && `(${notes.length})`}
            </TabsTrigger>
          </TabsList>

          {/* ── About ── */}
          <TabsContent value="about" className="flex-1 overflow-hidden mt-0">
            <ScrollArea className="h-full px-6 py-4">
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-4/6" />
                  <Skeleton className="h-4 w-full mt-4" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ) : (
                <div className="space-y-5 pb-6">
                  {description ? (
                    <>
                      <div>
                        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                          About this Book
                        </h3>
                        <p className="text-sm text-foreground leading-relaxed">{description}</p>
                      </div>

                      <div>
                        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                          What You Stand to Gain
                        </h3>
                        <div className="space-y-2">
                          {vi?.categories?.map((cat) => (
                            <div key={cat} className="flex items-start gap-2">
                              <span className="text-primary mt-0.5">›</span>
                              <p className="text-sm text-foreground/80">
                                Deep understanding of <span className="font-medium">{cat.toLowerCase()}</span> concepts from a critically-acclaimed perspective.
                              </p>
                            </div>
                          ))}
                          {vi?.averageRating && vi.averageRating >= 4 && (
                            <div className="flex items-start gap-2">
                              <span className="text-primary mt-0.5">›</span>
                              <p className="text-sm text-foreground/80">
                                Highly rated by over {vi.ratingsCount?.toLocaleString()} readers — consistently praised for practical insight and lasting value.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {vi?.publisher && (
                        <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                          Published by <span className="font-medium text-foreground">{vi.publisher}</span>
                          {vi.publishedDate ? ` in ${vi.publishedDate.slice(0, 4)}` : ""}
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground italic py-6 text-center">
                      No additional details found for this book.
                    </p>
                  )}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* ── Quotes ── */}
          <TabsContent value="quotes" className="flex-1 overflow-hidden mt-0">
            <ScrollArea className="h-full px-6 py-4">
              <div className="space-y-4 pb-6">
                {loading && (
                  <div className="space-y-3">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                )}

                {!loading && quotes.length > 0 && (
                  <>
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                      Notable Quotes by {book.author}
                    </h3>
                    {quotes.map((q) => (
                      <div key={q._id} className="group border border-border rounded-xl p-4 bg-card space-y-2">
                        <div className="flex items-start gap-3">
                          <Quote className="w-4 h-4 text-primary/50 flex-shrink-0 mt-0.5" />
                          <p className="font-serif text-sm text-foreground leading-relaxed italic">
                            {q.content}
                          </p>
                        </div>
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-muted-foreground gap-1 opacity-0 group-hover:opacity-100"
                            onClick={() => setAddingNoteFor(addingNoteFor === q._id ? undefined : q._id)}
                          >
                            <Pencil className="w-3 h-3" />
                            Add note
                          </Button>
                        </div>
                        {addingNoteFor === q._id && (
                          <QuickNoteForm
                            bookId={book.id!}
                            quote={q.content}
                            onSaved={() => setAddingNoteFor(undefined)}
                          />
                        )}
                      </div>
                    ))}
                  </>
                )}

                {!loading && quotes.length === 0 && highlights.length > 0 && (
                  <>
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                      Your Highlights from this Book
                    </h3>
                    {highlights.slice(0, 6).map((hl) => (
                      <div key={hl.id} className="group border border-border rounded-xl p-4 bg-card space-y-2">
                        <div className="flex items-start gap-3">
                          <span
                            className="w-1 rounded-full flex-shrink-0 self-stretch"
                            style={{ backgroundColor: hl.color }}
                          />
                          <p className="font-serif text-sm text-foreground leading-relaxed italic">
                            "{hl.text}"
                          </p>
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {!loading && quotes.length === 0 && highlights.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8 italic">
                    No quotes found. Highlight passages while reading to build your quote collection.
                  </p>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ── Highlights ── */}
          <TabsContent value="highlights" className="flex-1 overflow-hidden mt-0">
            <ScrollArea className="h-full px-6 py-4">
              <div className="space-y-3 pb-6">
                {highlights.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8 italic">
                    No highlights yet. Select text while reading to highlight passages.
                  </p>
                ) : (
                  highlights.map((hl) => (
                    <div key={hl.id} className="group flex gap-3 items-start border border-border rounded-xl p-4 bg-card">
                      <span
                        className="w-1 rounded-full flex-shrink-0 self-stretch"
                        style={{ backgroundColor: hl.color }}
                      />
                      <p className="font-serif text-sm text-foreground leading-relaxed flex-1 italic">
                        "{hl.text}"
                      </p>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ── Notes ── */}
          <TabsContent value="notes" className="flex-1 overflow-hidden mt-0">
            <ScrollArea className="h-full px-6 py-4">
              <div className="space-y-3 pb-6">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full gap-2 mb-2"
                  onClick={() => setAddingNoteFor(addingNoteFor === "new" ? undefined : "new")}
                >
                  <Plus className="w-3.5 h-3.5" />
                  New Note
                </Button>

                {addingNoteFor === "new" && (
                  <QuickNoteForm
                    bookId={book.id!}
                    onSaved={() => setAddingNoteFor(undefined)}
                  />
                )}

                {notes.length === 0 && addingNoteFor !== "new" ? (
                  <p className="text-sm text-muted-foreground text-center py-6 italic">
                    No notes yet for this book.
                  </p>
                ) : (
                  notes.map((note) => (
                    <div key={note.id} className="group border border-border rounded-xl p-4 bg-card space-y-2">
                      {note.title && (
                        <h4 className="font-serif font-medium text-sm">{note.title}</h4>
                      )}
                      {note.quote && (
                        <blockquote className="text-xs text-muted-foreground italic border-l-2 border-primary/40 pl-2 font-serif">
                          "{note.quote}"
                        </blockquote>
                      )}
                      <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                        {note.content}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground/50">
                          {new Date(note.updatedAt).toLocaleDateString("en-US", {
                            month: "short", day: "numeric", year: "numeric",
                          })}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:text-destructive"
                          onClick={() => note.id && deleteNote(note.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
