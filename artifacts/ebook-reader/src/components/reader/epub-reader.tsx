import { useEffect, useRef, useState, useCallback } from "react";
import ePub, { Rendition, Book as EPubBook, Location } from "epubjs";
import { type Book, db } from "@/lib/db";
import { updateReadingProgress, useHighlights, addHighlight } from "@/hooks/use-db";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Menu, List } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

interface EPUBReaderProps {
  book: Book;
  theme: "day" | "sepia" | "night";
}

export function EPUBReader({ book, theme }: EPUBReaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const bookRef = useRef<EPubBook | null>(null);
  const [chapterTitle, setChapterTitle] = useState("");
  const [progress, setProgress] = useState("");
  const [toc, setToc] = useState<any[]>([]);
  
  // Highlight popover state
  const [selection, setSelection] = useState<{ cfiRange: string; contents: any; rect: DOMRect | null } | null>(null);

  const highlights = useHighlights(book.id!);

  const applyTheme = useCallback((rendition: Rendition) => {
    const themes = rendition.themes;
    themes.register("day", {
      body: { background: "transparent", color: "#2d2621" },
      "::selection": { background: "rgba(255, 212, 0, 0.4)" }
    });
    themes.register("sepia", {
      body: { background: "transparent", color: "#3a2a18" },
      "::selection": { background: "rgba(255, 212, 0, 0.4)" }
    });
    themes.register("night", {
      body: { background: "transparent", color: "#cccccc" },
      "::selection": { background: "rgba(255, 212, 0, 0.4)" }
    });
    themes.select(theme);
  }, [theme]);

  // Handle Highlights
  useEffect(() => {
    if (!renditionRef.current || !highlights) return;
    const rendition = renditionRef.current;
    
    // Clear old highlights (simple approach)
    // rendition.annotations.clear();
    
    highlights.forEach(hl => {
      try {
        rendition.annotations.add("highlight", hl.cfi, {}, undefined, "hl", { fill: hl.color, "fill-opacity": "0.3" });
      } catch (e) {
        console.error("Failed to add highlight", e);
      }
    });
  }, [highlights]);

  useEffect(() => {
    if (!containerRef.current) return;

    const epubBook = ePub();
    bookRef.current = epubBook;
    
    const buffer = book.fileData.slice(0);
    let isMounted = true;

    const initBook = async () => {
      await epubBook.open(buffer);
      if (!isMounted) return;

      const rendition = epubBook.renderTo(containerRef.current!, {
        width: "100%",
        height: "100%",
        spread: "always",
        flow: "paginated",
        manager: "continuous"
      });
      renditionRef.current = rendition;

      applyTheme(rendition);

      rendition.on("relocated", (location: Location) => {
        if (book.id) {
          updateReadingProgress(book.id, location.start.cfi);
        }
        
        const navItem = epubBook.navigation.get(location.start.href);
        if (navItem) {
          setChapterTitle(navItem.label.trim());
        }

        if (epubBook.locations.length() > 0) {
          const percentage = epubBook.locations.percentageFromCfi(location.start.cfi);
          setProgress(`${Math.round(percentage * 100)}%`);
        }
      });

      rendition.on("selected", (cfiRange: string, contents: any) => {
        // Find selection rect to position popover
        const range = contents.window.getSelection().getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        setSelection({ cfiRange, contents, rect });
      });

      epubBook.loaded.navigation.then(nav => {
        if (isMounted) setToc(nav.toc);
      });

      await rendition.display(book.currentLocation || undefined);
      await epubBook.locations.generate(1600);
    };

    initBook();

    return () => {
      isMounted = false;
      if (renditionRef.current) renditionRef.current.destroy();
      if (bookRef.current) bookRef.current.destroy();
    };
  }, [book, applyTheme]);

  const nextPage = () => renditionRef.current?.next();
  const prevPage = () => renditionRef.current?.prev();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") nextPage();
      if (e.key === "ArrowLeft") prevPage();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSaveHighlight = async (color: string) => {
    if (!selection || !book.id) return;
    
    // Hacky way to get selected text
    const text = selection.contents.window.getSelection().toString();
    
    await addHighlight({
      bookId: book.id,
      cfi: selection.cfiRange,
      text,
      color,
      createdAt: new Date()
    });
    
    // Clear selection
    selection.contents.window.getSelection().removeAllRanges();
    setSelection(null);
  };

  return (
    <div className="w-full h-full relative flex items-center justify-center">
      <div className="absolute left-0 top-0 bottom-0 w-1/6 z-10 cursor-pointer" onClick={prevPage} />
      <div className="absolute right-0 top-0 bottom-0 w-1/6 z-10 cursor-pointer" onClick={nextPage} />
      
      <div ref={containerRef} className="w-full h-[85vh] max-w-6xl px-12" />

      {/* Chapter & Progress */}
      <div className="absolute bottom-6 left-12 text-sm text-muted-foreground/60 font-serif z-20 flex items-center gap-4">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
              <List className="w-4 h-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] sm:w-[400px]">
            <SheetHeader>
              <SheetTitle className="font-serif">Table of Contents</SheetTitle>
            </SheetHeader>
            <div className="mt-6 space-y-2 overflow-y-auto max-h-[80vh] pr-4">
              {toc.map((item, idx) => (
                <div 
                  key={idx} 
                  className="cursor-pointer text-sm py-1 hover:text-primary transition-colors line-clamp-1"
                  onClick={() => {
                    renditionRef.current?.display(item.href);
                  }}
                >
                  {item.label}
                </div>
              ))}
            </div>
          </SheetContent>
        </Sheet>
        {chapterTitle}
      </div>
      <div className="absolute bottom-6 right-12 text-sm text-muted-foreground/60 font-mono z-20">
        {progress}
      </div>

      {/* Highlight Color Picker Popover */}
      {selection && selection.rect && (
        <div 
          className="absolute z-50 bg-popover text-popover-foreground shadow-lg rounded-full px-3 py-2 flex gap-2 border border-border/50 animate-in zoom-in-95 duration-200"
          style={{
            top: `${selection.rect.top - 50}px`,
            left: `${selection.rect.left + (selection.rect.width / 2)}px`,
            transform: 'translateX(-50%)'
          }}
        >
          {['#fde047', '#86efac', '#f9a8d4', '#93c5fd'].map(color => (
            <button
              key={color}
              className="w-6 h-6 rounded-full hover:scale-110 transition-transform shadow-sm"
              style={{ backgroundColor: color }}
              onClick={() => handleSaveHighlight(color)}
            />
          ))}
          <div className="w-px h-6 bg-border mx-1" />
          <button 
            className="text-xs font-medium px-2 hover:opacity-70"
            onClick={() => {
              selection.contents.window.getSelection().removeAllRanges();
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
