import { useEffect, useState, useMemo } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { type Book } from "@/lib/db";
import { updateReadingProgress } from "@/hooks/use-db";
import type { ReaderSettings } from "./settings-panel";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

interface PDFReaderProps {
  book: Book;
  theme: "day" | "sepia" | "night";
  settings: ReaderSettings;
}

const THEME_FILTER: Record<string, string> = {
  day:   "none",
  sepia: "sepia(0.4) brightness(0.97)",
  night: "invert(1) hue-rotate(180deg) brightness(0.85) contrast(1.1)",
};

export function PDFReader({ book, theme, settings }: PDFReaderProps) {
  const [numPages, setNumPages] = useState<number>();
  const [pageNumber, setPageNumber] = useState<number>(() =>
    book.currentLocation ? parseInt(book.currentLocation, 10) : 1
  );

  const file = useMemo(
    () => new Blob([book.fileData], { type: "application/pdf" }),
    [book.fileData]
  );

  const isDouble = settings.spread === "double";

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const nextPage = () => {
    if (!numPages) return;
    const step = isDouble ? 2 : 1;
    const next = Math.min(pageNumber + step, numPages);
    setPageNumber(next);
    if (book.id) updateReadingProgress(book.id, next.toString());
  };

  const prevPage = () => {
    const step = isDouble ? 2 : 1;
    const prev = Math.max(pageNumber - step, 1);
    setPageNumber(prev);
    if (book.id) updateReadingProgress(book.id, prev.toString());
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") nextPage();
      if (e.key === "ArrowLeft")  prevPage();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageNumber, numPages, isDouble]);

  const pageHeight = Math.round(window.innerHeight * 0.83);

  return (
    <div className="w-full h-full relative flex flex-col items-center justify-center overflow-hidden">
      {/* Click zones */}
      <div className="absolute left-0 top-0 bottom-0 w-[10%] z-10 cursor-pointer" onClick={prevPage} />
      <div className="absolute right-0 top-0 bottom-0 w-[10%] z-10 cursor-pointer" onClick={nextPage} />

      <div
        className="max-w-6xl mx-auto flex items-center justify-center gap-4 transition-[filter] duration-500"
        style={{ filter: THEME_FILTER[theme] }}
      >
        <Document
          file={file}
          onLoadSuccess={onDocumentLoadSuccess}
          className="flex gap-4 justify-center"
        >
          <Page
            pageNumber={pageNumber}
            renderTextLayer
            renderAnnotationLayer
            height={pageHeight}
            className="shadow-2xl"
          />
          {isDouble && pageNumber + 1 <= (numPages ?? 0) && (
            <Page
              pageNumber={pageNumber + 1}
              renderTextLayer
              renderAnnotationLayer
              height={pageHeight}
              className="shadow-2xl hidden md:block"
            />
          )}
        </Document>
      </div>

      {/* Progress */}
      <div className="absolute bottom-4 right-10 text-xs opacity-40 font-mono z-20">
        {pageNumber}{numPages ? ` / ${numPages}` : ""}
      </div>
    </div>
  );
}
