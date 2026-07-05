import { useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import { useBook, toggleFavorite } from "@/hooks/use-db";
import { EPUBReader } from "@/components/reader/epub-reader";
import { PDFReader } from "@/components/reader/pdf-reader";
import { ArrowLeft, Moon, Sun, Sunset, Star, Settings } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

type Theme = "day" | "sepia" | "night";

export default function ReaderPage() {
  const params = useParams();
  const id = parseInt(params.bookId || "", 10);
  const book = useBook(id);
  const [theme, setTheme] = useState<Theme>("day");
  const [showToolbar, setShowToolbar] = useState(true);

  // Auto-theme based on time
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 18) setTheme("day");
    else if (hour >= 18 && hour < 21) setTheme("sepia");
    else setTheme("night");
  }, []);

  // Auto hide toolbar
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const handleMouseMove = () => {
      setShowToolbar(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setShowToolbar(false), 2500);
    };
    
    window.addEventListener("mousemove", handleMouseMove);
    timeout = setTimeout(() => setShowToolbar(false), 2500);
    
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      clearTimeout(timeout);
    };
  }, []);

  if (book === undefined) return null;
  if (book === null) return <div>Book not found</div>;

  const handleToggleFavorite = () => {
    toggleFavorite(book);
  };

  const cycleTheme = () => {
    const themes: Theme[] = ["day", "sepia", "night"];
    const idx = themes.indexOf(theme);
    setTheme(themes[(idx + 1) % themes.length]);
  };

  const bgClasses = {
    day: "bg-[#ffffff]",
    sepia: "bg-[#f4ece0]",
    night: "bg-[#1a1a1a]"
  };

  return (
    <div className={`h-[100dvh] w-full overflow-hidden transition-colors duration-700 ${bgClasses[theme]}`}>
      
      <AnimatePresence>
        {showToolbar && (
          <motion.div 
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className={`absolute top-0 left-0 right-0 h-16 z-50 px-6 flex items-center justify-between
              ${theme === 'night' ? 'text-white/80 bg-black/40' : 'text-black/70 bg-white/40'}
              backdrop-blur-md border-b border-black/5`}
          >
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild className="rounded-full">
                <Link href="/">
                  <ArrowLeft className="w-5 h-5" />
                </Link>
              </Button>
              <h1 className="font-serif font-medium line-clamp-1 max-w-md">{book.title}</h1>
            </div>

            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-full"
                onClick={handleToggleFavorite}
              >
                <Star className={`w-5 h-5 ${book.isFavorite ? 'fill-yellow-500 text-yellow-500' : ''}`} />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-full"
                onClick={cycleTheme}
              >
                {theme === 'day' && <Sun className="w-5 h-5" />}
                {theme === 'sepia' && <Sunset className="w-5 h-5" />}
                {theme === 'night' && <Moon className="w-5 h-5" />}
              </Button>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Settings className="w-5 h-5" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full h-full pt-8">
        {book.format === "epub" ? (
          <EPUBReader book={book} theme={theme} />
        ) : (
          <PDFReader book={book} theme={theme} />
        )}
      </div>

    </div>
  );
}
