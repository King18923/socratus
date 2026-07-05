import { useEffect, useRef, useState, useCallback, MutableRefObject } from "react";
import ePub, { type Rendition, type Book as EPubBook } from "epubjs";
import { type Book } from "@/lib/db";
import { updateReadingProgress, useHighlights, addHighlight } from "@/hooks/use-db";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { List } from "lucide-react";
import type { ReaderSettings } from "./settings-panel";

// High-contrast text colours per theme — applied inside the epub iframe
const THEME_BODY: Record<string, Record<string, string>> = {
  day: {
    background: "#ffffff !important",
    color: "#1a1310",
    "-webkit-font-smoothing": "antialiased",
  },
  sepia: {
    background: "#f4ece0 !important",
    color: "#2a1a0a",
    "-webkit-font-smoothing": "antialiased",
  },
  night: {
    background: "#1c1917 !important",
    color: "#ede8e0",
    "-webkit-font-smoothing": "antialiased",
  },
};

const SELECTION_STYLE = { "::selection": { background: "rgba(253, 224, 71, 0.45)" } };

const FONT_FAMILY: Record<string, string> = {
  serif: "Georgia, 'Times New Roman', serif",
  sans:  "Inter, 'Helvetica Neue', Arial, sans-serif",
  mono:  "Menlo, 'Courier New', monospace",
};

const LINE_HEIGHT: Record<string, string> = {
  normal:  "1.5",
  relaxed: "1.75",
  loose:   "2.0",
};

interface EPUBReaderProps {
  book: Book;
  theme: "day" | "sepia" | "night";
  settings: ReaderSettings;
  getPageTextRef: MutableRefObject<(() => string) | null>;
}

// ── Dictionary popover ─────────────────────────────────────────────────────
interface DictEntry {
  word: string;
  phonetic?: string;
  meanings: { partOfSpeech: string; definitions: { definition: string }[] }[];
}

function DictPopover({
  word,
  rect,
  onClose,
}: {
  word: string;
  rect: DOMRect;
  onClose: () => void;
}) {
  const [entry, setEntry] = useState<DictEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data) && data[0]) setEntry(data[0] as DictEntry);
        else if (!cancelled) setError(true);
      })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [word]);

  return (
    <div
      className="fixed z-[60] w-72 bg-popover border border-border rounded-xl shadow-xl p-4 text-sm"
      style={{
        top: Math.max(8, rect.bottom + 8),
        left: Math.min(rect.left, window.innerWidth - 300),
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-serif font-semibold text-base">{word}</span>
        {entry?.phonetic && (
          <span className="text-xs text-muted-foreground">{entry.phonetic}</span>
        )}
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground ml-2 text-xs">
          ✕
        </button>
      </div>
      {loading && <p className="text-muted-foreground text-xs">Looking up…</p>}
      {error && !loading && (
        <p className="text-muted-foreground text-xs">No definition found for "{word}".</p>
      )}
      {entry && !loading && (
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {entry.meanings.slice(0, 2).map((m, i) => (
            <div key={i}>
              <span className="text-[10px] uppercase tracking-wider text-primary font-semibold">
                {m.partOfSpeech}
              </span>
              <p className="text-xs text-foreground/90 mt-0.5 leading-relaxed">
                {m.definitions[0]?.definition}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export function EPUBReader({ book, theme, settings, getPageTextRef }: EPUBReaderProps) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const renditionRef  = useRef<Rendition | null>(null);
  const epubBookRef   = useRef<EPubBook | null>(null);

  const [chapterTitle, setChapterTitle] = useState("");
  const [progress, setProgress] = useState("");
  const [toc, setToc] = useState<{ label: string; href: string }[]>([]);

  // Highlight picker state
  const [selection, setSelection] = useState<{
    cfiRange: string;
    contents: any;
    rect: DOMRect | null;
  } | null>(null);

  // Dictionary state
  const [dictState, setDictState] = useState<{ word: string; rect: DOMRect } | null>(null);

  const highlights = useHighlights(book.id!);

  // Expose a getter for the current page's plain text (used by voice reader)
  useEffect(() => {
    getPageTextRef.current = () => {
      try {
        const contents = (renditionRef.current as any)?.getContents?.();
        if (contents && contents.length > 0) {
          return (contents[0].document?.body as HTMLElement)?.innerText ?? "";
        }
      } catch { /* ignore */ }
      return "";
    };
    return () => { getPageTextRef.current = null; };
  }, [getPageTextRef]);

  // ── Build theme object and apply ────────────────────────────────────────
  const buildThemeStyles = useCallback(
    (t: string) => ({
      body: {
        ...THEME_BODY[t],
        "font-family": FONT_FAMILY[settings.fontFamily],
        "font-size":   `${settings.fontSize}px`,
        "line-height": LINE_HEIGHT[settings.lineSpacing],
      },
      ...SELECTION_STYLE,
      a: { color: t === "night" ? "#93c5fd !important" : "#2563eb !important" },
    }),
    [settings.fontFamily, settings.fontSize, settings.lineSpacing]
  );

  const applyTheme = useCallback(
    (rendition: Rendition, t: string) => {
      (["day", "sepia", "night"] as const).forEach((name) => {
        rendition.themes.register(name, buildThemeStyles(name));
      });
      rendition.themes.select(t);
    },
    [buildThemeStyles]
  );

  // Re-apply highlights
  useEffect(() => {
    if (!renditionRef.current || !highlights.length) return;
    highlights.forEach((hl) => {
      try {
        renditionRef.current!.annotations.add("highlight", hl.cfi, {}, undefined, "hl", {
          fill: hl.color,
          "fill-opacity": "0.35",
        });
      } catch { /* CFI may not be on current page */ }
    });
  }, [highlights]);

  // Theme switch (no re-init needed)
  useEffect(() => {
    if (!renditionRef.current) return;
    applyTheme(renditionRef.current, theme);
  }, [theme, applyTheme]);

  // Settings changes that can be applied without re-init
  useEffect(() => {
    const r = renditionRef.current;
    if (!r) return;
    // Re-register themes with updated font/size/spacing, then reselect
    applyTheme(r, theme);
    // Spread
    try {
      (r as any).spread(settings.spread === "double" ? "always" : "none");
    } catch { /* some epub versions don't support dynamic spread */ }
    // Flow
    try {
      r.flow(settings.flow === "scrolled" ? "scrolled" : "paginated");
    } catch { /* ignore */ }
  }, [settings, theme, applyTheme]);

  // ── Initial mount / book change ─────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    const buffer = book.fileData instanceof ArrayBuffer
      ? book.fileData.slice(0)
      : book.fileData;

    const epubBook = ePub();
    epubBookRef.current = epubBook;
    let mounted = true;

    const init = async () => {
      try {
        await epubBook.open(buffer as ArrayBuffer);
        if (!mounted) return;

        // Wait for spine before rendering
        await epubBook.loaded.spine;
        if (!mounted) return;

        const rendition = epubBook.renderTo(containerRef.current!, {
          width:  "100%",
          height: "100%",
          spread: settings.spread === "double" ? "always" : "none",
          flow:   settings.flow === "scrolled" ? "scrolled" : "paginated",
        });
        renditionRef.current = rendition;

        applyTheme(rendition, theme);

        // ── Event: page relocated ───────────────────────────────────────
        rendition.on("relocated", (location: any) => {
          if (!mounted) return;
          if (book.id) updateReadingProgress(book.id, location.start.cfi).catch(() => {});
          try {
            const nav = epubBook.navigation?.get(location.start.href);
            if (nav) setChapterTitle(nav.label.trim());
          } catch { /* nav not ready */ }
          try {
            if (epubBook.locations?.length() > 0) {
              const pct = epubBook.locations.percentageFromCfi(location.start.cfi);
              setProgress(`${Math.round(pct * 100)}%`);
            }
          } catch { /* locations not generated */ }
        });

        // ── Event: text selected → highlight picker ─────────────────────
        rendition.on("selected", (cfiRange: string, contents: any) => {
          if (!mounted) return;
          try {
            const sel = contents.window.getSelection();
            if (!sel || sel.rangeCount === 0) return;
            setDictState(null); // close dict if open
            setSelection({ cfiRange, contents, rect: sel.getRangeAt(0).getBoundingClientRect() });
          } catch { /* ignore */ }
        });

        // ── Event: double-click word → dictionary ──────────────────────
        rendition.on("rendered", (_section: any, view: any) => {
          if (!mounted || !view?.document) return;
          try {
            view.document.addEventListener("dblclick", (e: MouseEvent) => {
              const sel = view.document.getSelection();
              const word = sel?.toString().trim().replace(/[^a-zA-Z'-]/g, "");
              if (word && word.length > 1) {
                const range = sel.getRangeAt(0);
                const rect  = range.getBoundingClientRect();
                // Translate iframe coords to host page coords
                const iframe = view.iframe as HTMLIFrameElement | undefined;
                const offset  = iframe?.getBoundingClientRect();
                if (offset) {
                  setDictState({
                    word,
                    rect: new DOMRect(
                      rect.left   + offset.left,
                      rect.top    + offset.top,
                      rect.width,
                      rect.height
                    ),
                  });
                } else {
                  setDictState({ word, rect });
                }
              }
            });
          } catch { /* ignore */ }
        });

        // TOC
        epubBook.loaded.navigation
          .then((nav) => { if (mounted) setToc(nav.toc as { label: string; href: string }[]); })
          .catch(() => {});

        await rendition.display(book.currentLocation || undefined);
        if (!mounted) return;

        // Generate locations (non-critical)
        try { await epubBook.locations.generate(1600); } catch { /* ignore */ }
      } catch (err) {
        console.error("EPUB init error:", err);
      }
    };

    init();

    return () => {
      mounted = false;
      try { renditionRef.current?.destroy(); } catch { /* ignore */ }
      try { epubBookRef.current?.destroy();  } catch { /* ignore */ }
      renditionRef.current = null;
      epubBookRef.current  = null;
    };
  // Only re-init when the book itself changes — settings are applied reactively
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book.id]);

  // Arrow key navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") renditionRef.current?.next();
      if (e.key === "ArrowLeft")  renditionRef.current?.prev();
      if (e.key === "Escape") { setSelection(null); setDictState(null); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ── Save highlight ──────────────────────────────────────────────────────
  const handleSaveHighlight = async (color: string) => {
    if (!selection || !book.id) return;
    try {
      const text = selection.contents.window.getSelection()?.toString() ?? "";
      await addHighlight({ bookId: book.id, cfi: selection.cfiRange, text, color, createdAt: new Date() });
      renditionRef.current?.annotations.add("highlight", selection.cfiRange, {}, undefined, "hl", {
        fill: color, "fill-opacity": "0.35",
      });
      selection.contents.window.getSelection()?.removeAllRanges();
    } catch (err) {
      console.error("Save highlight failed:", err);
    }
    setSelection(null);
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="w-full h-full relative flex items-center justify-center">
      {/* Click zones for prev / next */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[10%] z-10 cursor-pointer"
        onClick={() => renditionRef.current?.prev()}
      />
      <div
        className="absolute right-0 top-0 bottom-0 w-[10%] z-10 cursor-pointer"
        onClick={() => renditionRef.current?.next()}
      />

      {/* EPUB render target */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Bottom bar */}
      <div className="absolute bottom-4 left-8 right-8 flex items-center justify-between z-20 pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full opacity-40 hover:opacity-90">
                <List className="w-3.5 h-3.5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[270px]">
              <SheetHeader>
                <SheetTitle className="font-serif text-sm">Table of Contents</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-0.5 overflow-y-auto max-h-[80vh]">
                {toc.map((item, idx) => (
                  <button
                    key={idx}
                    className="w-full text-left text-sm py-1.5 px-2 rounded-md hover:bg-muted transition-colors line-clamp-1"
                    onClick={() => renditionRef.current?.display(item.href)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </SheetContent>
          </Sheet>
          <span className="text-xs opacity-50 font-serif">{chapterTitle}</span>
        </div>
        <span className="text-xs opacity-40 font-mono">{progress}</span>
      </div>

      {/* Highlight colour picker */}
      {selection?.rect && (
        <div
          className="fixed z-50 bg-popover border border-border/60 shadow-xl rounded-full px-3 py-2 flex items-center gap-2"
          style={{
            top:  `${Math.max(8, selection.rect.top - 52)}px`,
            left: `${selection.rect.left + selection.rect.width / 2}px`,
            transform: "translateX(-50%)",
          }}
        >
          {[
            { label: "Yellow", color: "#fde047" },
            { label: "Green",  color: "#86efac" },
            { label: "Pink",   color: "#f9a8d4" },
            { label: "Blue",   color: "#93c5fd" },
          ].map(({ label, color }) => (
            <button
              key={color}
              title={label}
              data-testid={`highlight-${label.toLowerCase()}`}
              className="w-6 h-6 rounded-full hover:scale-125 transition-transform ring-1 ring-black/10 shadow-sm"
              style={{ backgroundColor: color }}
              onClick={() => handleSaveHighlight(color)}
            />
          ))}
          <div className="w-px h-4 bg-border mx-1" />
          <button
            className="text-[11px] text-muted-foreground hover:text-foreground px-1"
            onClick={() => {
              try { selection.contents.window.getSelection()?.removeAllRanges(); } catch { /* ignore */ }
              setSelection(null);
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Dictionary popover */}
      {dictState && (
        <DictPopover
          word={dictState.word}
          rect={dictState.rect}
          onClose={() => setDictState(null)}
        />
      )}
    </div>
  );
}
