import { useEffect, useRef, useState, useCallback } from "react";
import ePub, { type Rendition, type Book as EPubBook } from "epubjs";
import { type Book } from "@/lib/db";
import { updateReadingProgress, useHighlights, addHighlight } from "@/hooks/use-db";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { List } from "lucide-react";

interface EPUBReaderProps {
  book: Book;
  theme: "day" | "sepia" | "night";
}

const THEME_STYLES = {
  day: {
    body: { background: "transparent !important", color: "#2d2621" },
    "::selection": { background: "rgba(255, 212, 0, 0.4)" },
  },
  sepia: {
    body: { background: "transparent !important", color: "#3a2a18" },
    "::selection": { background: "rgba(255, 212, 0, 0.4)" },
  },
  night: {
    body: { background: "transparent !important", color: "#d4cfc9" },
    "::selection": { background: "rgba(255, 212, 0, 0.4)" },
  },
};

export function EPUBReader({ book, theme }: EPUBReaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const epubBookRef = useRef<EPubBook | null>(null);

  const [chapterTitle, setChapterTitle] = useState("");
  const [progress, setProgress] = useState("");
  const [toc, setToc] = useState<{ label: string; href: string }[]>([]);
  const [selection, setSelection] = useState<{
    cfiRange: string;
    contents: any;
    rect: DOMRect | null;
  } | null>(null);

  const highlights = useHighlights(book.id!);

  // Re-apply highlights whenever the list changes or the rendition relocates
  const applyHighlights = useCallback(
    (rendition: Rendition, hls: typeof highlights) => {
      if (!hls) return;
      hls.forEach((hl) => {
        try {
          rendition.annotations.add(
            "highlight",
            hl.cfi,
            {},
            undefined,
            "hl",
            { fill: hl.color, "fill-opacity": "0.35" }
          );
        } catch {
          // annotation may already exist or CFI may be out of current section
        }
      });
    },
    []
  );

  useEffect(() => {
    if (!renditionRef.current || !highlights) return;
    applyHighlights(renditionRef.current, highlights);
  }, [highlights, applyHighlights]);

  // Theme changes after initial render
  useEffect(() => {
    if (!renditionRef.current) return;
    renditionRef.current.themes.select(theme);
  }, [theme]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clone the buffer — epubjs consumes it
    const buffer = book.fileData instanceof ArrayBuffer
      ? book.fileData.slice(0)
      : book.fileData;

    const epubBook = ePub();
    epubBookRef.current = epubBook;
    let isMounted = true;

    const init = async () => {
      try {
        await epubBook.open(buffer as ArrayBuffer);
        if (!isMounted) return;

        // Wait for the spine to be fully parsed before doing anything
        await epubBook.loaded.spine;
        if (!isMounted) return;

        const rendition = epubBook.renderTo(containerRef.current!, {
          width: "100%",
          height: "100%",
          spread: "always",
          flow: "paginated",
          // Do NOT set manager:"continuous" — it conflicts with paginated+spread
        });
        renditionRef.current = rendition;

        // Register and select themes
        Object.entries(THEME_STYLES).forEach(([name, styles]) => {
          rendition.themes.register(name, styles);
        });
        rendition.themes.select(theme);

        // Track relocated position
        rendition.on("relocated", (location: any) => {
          if (!isMounted) return;
          if (book.id) {
            updateReadingProgress(book.id, location.start.cfi).catch(() => {});
          }

          // Chapter title from navigation
          try {
            const navItem = epubBook.navigation?.get(location.start.href);
            if (navItem) setChapterTitle(navItem.label.trim());
          } catch {
            // navigation may not be ready yet
          }

          // Progress percentage
          try {
            if (epubBook.locations && epubBook.locations.length() > 0) {
              const pct = epubBook.locations.percentageFromCfi(location.start.cfi);
              setProgress(`${Math.round(pct * 100)}%`);
            }
          } catch {
            // locations not generated yet
          }
        });

        // Text selection → highlight picker
        rendition.on("selected", (cfiRange: string, contents: any) => {
          if (!isMounted) return;
          try {
            const sel = contents.window.getSelection();
            if (!sel || sel.rangeCount === 0) return;
            const rect = sel.getRangeAt(0).getBoundingClientRect();
            setSelection({ cfiRange, contents, rect });
          } catch {
            // ignore
          }
        });

        // Load table of contents
        epubBook.loaded.navigation
          .then((nav) => {
            if (isMounted) setToc(nav.toc as { label: string; href: string }[]);
          })
          .catch(() => {});

        // Display at saved position or beginning
        await rendition.display(book.currentLocation || undefined);
        if (!isMounted) return;

        // Generate locations for progress — only after display is ready,
        // wrapped in try/catch since it's non-critical
        try {
          await epubBook.locations.generate(1600);
        } catch {
          // Locations are a nice-to-have; don't break the reader if this fails
        }
      } catch (err) {
        console.error("EPUB init error:", err);
      }
    };

    init();

    return () => {
      isMounted = false;
      try { renditionRef.current?.destroy(); } catch {}
      try { epubBookRef.current?.destroy(); } catch {}
      renditionRef.current = null;
      epubBookRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book.id]);

  // Arrow key navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") renditionRef.current?.next();
      if (e.key === "ArrowLeft") renditionRef.current?.prev();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const handleSaveHighlight = async (color: string) => {
    if (!selection || !book.id) return;
    try {
      const text = selection.contents.window.getSelection()?.toString() ?? "";
      await addHighlight({
        bookId: book.id,
        cfi: selection.cfiRange,
        text,
        color,
        createdAt: new Date(),
      });
      renditionRef.current?.annotations.add(
        "highlight",
        selection.cfiRange,
        {},
        undefined,
        "hl",
        { fill: color, "fill-opacity": "0.35" }
      );
      selection.contents.window.getSelection()?.removeAllRanges();
    } catch (err) {
      console.error("Failed to save highlight:", err);
    }
    setSelection(null);
  };

  return (
    <div className="w-full h-full relative flex items-center justify-center">
      {/* Click zones for prev/next */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[10%] z-10 cursor-pointer"
        onClick={() => renditionRef.current?.prev()}
      />
      <div
        className="absolute right-0 top-0 bottom-0 w-[10%] z-10 cursor-pointer"
        onClick={() => renditionRef.current?.next()}
      />

      {/* EPUB render target */}
      <div ref={containerRef} className="w-full h-[85vh] max-w-6xl px-8" />

      {/* Bottom bar: TOC + chapter + progress */}
      <div className="absolute bottom-5 left-10 right-10 flex items-center justify-between z-20 pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full opacity-50 hover:opacity-100">
                <List className="w-4 h-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px]">
              <SheetHeader>
                <SheetTitle className="font-serif text-base">Table of Contents</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-1 overflow-y-auto max-h-[80vh] pr-2">
                {toc.map((item, idx) => (
                  <button
                    key={idx}
                    className="w-full text-left text-sm py-1.5 px-2 rounded hover:bg-muted transition-colors line-clamp-1"
                    onClick={() => renditionRef.current?.display(item.href)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </SheetContent>
          </Sheet>
          <span className="text-xs text-muted-foreground/60 font-serif">{chapterTitle}</span>
        </div>
        <span className="text-xs text-muted-foreground/50 font-mono">{progress}</span>
      </div>

      {/* Highlight color picker */}
      {selection && selection.rect && (
        <div
          className="fixed z-50 bg-popover border border-border/50 shadow-lg rounded-full px-3 py-2 flex items-center gap-2"
          style={{
            top: `${selection.rect.top - 56}px`,
            left: `${selection.rect.left + selection.rect.width / 2}px`,
            transform: "translateX(-50%)",
          }}
        >
          {[
            { label: "Yellow", color: "#fde047" },
            { label: "Green", color: "#86efac" },
            { label: "Pink", color: "#f9a8d4" },
            { label: "Blue", color: "#93c5fd" },
          ].map(({ label, color }) => (
            <button
              key={color}
              title={label}
              data-testid={`highlight-color-${label.toLowerCase()}`}
              className="w-6 h-6 rounded-full hover:scale-125 transition-transform shadow-sm ring-1 ring-black/10"
              style={{ backgroundColor: color }}
              onClick={() => handleSaveHighlight(color)}
            />
          ))}
          <div className="w-px h-5 bg-border mx-1" />
          <button
            className="text-xs text-muted-foreground hover:text-foreground transition-colors px-1"
            onClick={() => {
              try { selection.contents.window.getSelection()?.removeAllRanges(); } catch {}
              setSelection(null);
            }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
