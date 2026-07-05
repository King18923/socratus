import { useEffect, useState, useMemo } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { type Book } from "@/lib/db";
import { updateReadingProgress } from "@/hooks/use-db";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

interface PDFReaderProps {
  book: Book;
  theme: "day" | "sepia" | "night";
}

export function PDFReader({ book, theme }: PDFReaderProps) {
  const [numPages, setNumPages] = useState<number>();
  const [pageNumber, setPageNumber] = useState<number>(() => {
    return book.currentLocation ? parseInt(book.currentLocation, 10) : 1;
  });

  const file = useMemo(() => new Blob([book.fileData], { type: "application/pdf" }), [book.fileData]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const nextPage = () => {
    if (numPages && pageNumber < numPages) {
      const next = Math.min(pageNumber + 2, numPages);
      setPageNumber(next);
      if (book.id) updateReadingProgress(book.id, next.toString());
    }
  };

  const prevPage = () => {
    if (pageNumber > 1) {
      const prev = Math.max(pageNumber - 2, 1);
      setPageNumber(prev);
      if (book.id) updateReadingProgress(book.id, prev.toString());
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") nextPage();
      if (e.key === "ArrowLeft") prevPage();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pageNumber, numPages]);

  // theme classes for pdf wrapper
  const themeClass = {
    day: "",
    sepia: "mix-blend-multiply opacity-90",
    night: "invert hue-rotate-180 brightness-75 contrast-125"
  }[theme];

  return (
    <div className="w-full h-full relative flex flex-col items-center justify-center overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-1/6 z-10 cursor-pointer" onClick={prevPage} />
      <div className="absolute right-0 top-0 bottom-0 w-1/6 z-10 cursor-pointer" onClick={nextPage} />
      
      <div className={`w-full max-w-6xl mx-auto flex items-center justify-center transition-all ${themeClass}`}>
        <Document
          file={file}
          onLoadSuccess={onDocumentLoadSuccess}
          className="flex gap-4 justify-center"
        >
          <Page 
            pageNumber={pageNumber} 
            renderTextLayer={true}
            renderAnnotationLayer={true}
            height={window.innerHeight * 0.85}
            className="shadow-2xl bg-white"
          />
          {pageNumber + 1 <= (numPages || 0) && (
            <Page 
              pageNumber={pageNumber + 1} 
              renderTextLayer={true}
              renderAnnotationLayer={true}
              height={window.innerHeight * 0.85}
              className="shadow-2xl bg-white hidden md:block"
            />
          )}
        </Document>
      </div>

      <div className="absolute bottom-6 right-12 text-sm text-muted-foreground/60 font-mono z-20">
        {pageNumber} {numPages ? `/ ${numPages}` : ""}
      </div>
    </div>
  );
}
