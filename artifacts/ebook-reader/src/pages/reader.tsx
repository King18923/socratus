import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "wouter";
import { useBook, toggleFavorite } from "@/hooks/use-db";
import { EPUBReader } from "@/components/reader/epub-reader";
import { PDFReader } from "@/components/reader/pdf-reader";
import { SettingsPanel, DEFAULT_SETTINGS, type ReaderSettings } from "@/components/reader/settings-panel";
import { ArrowLeft, Moon, Sun, Sunset, Star, Settings, Volume2, VolumeX } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

type Theme = "day" | "sepia" | "night";

const THEME_BG: Record<Theme, string> = {
  day:   "bg-white",
  sepia: "bg-[#f4ece0]",
  night: "bg-[#1c1917]",
};

const THEME_TOOLBAR: Record<Theme, string> = {
  day:   "bg-white/80 text-stone-800 border-stone-200",
  sepia: "bg-[#f4ece0]/90 text-amber-950 border-amber-200",
  night: "bg-[#1c1917]/90 text-stone-200 border-stone-700",
};

export default function ReaderPage() {
  const params = useParams();
  const id = parseInt(params.bookId || "", 10);
  const book = useBook(id);

  const [theme, setTheme] = useState<Theme>("day");
  const [showToolbar, setShowToolbar] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<ReaderSettings>(DEFAULT_SETTINGS);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Ref so epub-reader can expose a "get current page text" function
  const getPageTextRef = useRef<(() => string) | null>(null);

  // Auto-theme based on time of day
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 18) setTheme("day");
    else if (hour >= 18 && hour < 21) setTheme("sepia");
    else setTheme("night");
  }, []);

  // Auto-hide toolbar
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const show = () => {
      setShowToolbar(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setShowToolbar(false), 2800);
    };
    window.addEventListener("mousemove", show);
    timeout = setTimeout(() => setShowToolbar(false), 2800);
    return () => {
      window.removeEventListener("mousemove", show);
      clearTimeout(timeout);
    };
  }, []);

  // Stop speech when unmounting
  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  if (book === undefined) return null;
  if (book === null) {
    return (
      <div className="h-[100dvh] flex items-center justify-center text-muted-foreground">
        Book not found.{" "}
        <Link href="/" className="underline ml-1">
          Go back
        </Link>
      </div>
    );
  }

  const cycleTheme = () => {
    const order: Theme[] = ["day", "sepia", "night"];
    setTheme((t) => order[(order.indexOf(t) + 1) % order.length]);
  };

  const handleVoicePlay = () => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const text = getPageTextRef.current?.() ?? "";
    if (!text.trim()) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = settings.voiceSpeed;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  const handleVoiceStop = () => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  };

  return (
    <div
      className={`h-[100dvh] w-full overflow-hidden transition-colors duration-500 ${THEME_BG[theme]}`}
    >
      {/* Toolbar */}
      <AnimatePresence>
        {showToolbar && (
          <motion.header
            initial={{ y: -64, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -64, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className={`absolute top-0 left-0 right-0 h-14 z-50 px-5 flex items-center justify-between
              backdrop-blur-md border-b ${THEME_TOOLBAR[theme]}`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <Button variant="ghost" size="icon" className="rounded-full flex-shrink-0" asChild>
                <Link href="/">
                  <ArrowLeft className="w-4 h-4" />
                </Link>
              </Button>
              <h1 className="font-serif font-medium text-sm line-clamp-1">{book.title}</h1>
            </div>

            <div className="flex items-center gap-1">
              {/* Favourite */}
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={() => toggleFavorite(book)}
                data-testid="button-favorite"
              >
                <Star
                  className={`w-4 h-4 ${book.isFavorite ? "fill-amber-500 text-amber-500" : ""}`}
                />
              </Button>

              {/* Theme cycle */}
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={cycleTheme}
                data-testid="button-theme"
                title={`Theme: ${theme}`}
              >
                {theme === "day"   && <Sun   className="w-4 h-4" />}
                {theme === "sepia" && <Sunset className="w-4 h-4" />}
                {theme === "night" && <Moon  className="w-4 h-4" />}
              </Button>

              {/* Voice reader */}
              {book.format === "epub" && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full"
                  onClick={isSpeaking ? handleVoiceStop : handleVoicePlay}
                  data-testid="button-voice"
                  title={isSpeaking ? "Stop reading" : "Read aloud"}
                >
                  {isSpeaking ? (
                    <VolumeX className="w-4 h-4 text-primary" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </Button>
              )}

              {/* Settings */}
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={() => setSettingsOpen(true)}
                data-testid="button-settings"
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      {/* Reader content */}
      <div className="w-full h-full pt-14">
        {book.format === "epub" ? (
          <EPUBReader
            book={book}
            theme={theme}
            settings={settings}
            getPageTextRef={getPageTextRef}
          />
        ) : (
          <PDFReader
            book={book}
            theme={theme}
            settings={settings}
          />
        )}
      </div>

      {/* Settings panel */}
      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onChange={setSettings}
        isSpeaking={isSpeaking}
        onVoicePlay={handleVoicePlay}
        onVoiceStop={handleVoiceStop}
      />
    </div>
  );
}
