import { useBooks, useRecentBooks, useFavoriteBooks } from "@/hooks/use-db";
import { Shell } from "@/components/layout/shell";
import { BookCard } from "@/components/library/book-card";
import { EmptyState } from "@/components/library/empty-state";
import { ScrollArea } from "@/components/ui/scroll-area";
import { importBookFile } from "@/lib/import-book";
import { useState } from "react";

export default function LibraryPage() {
  const books = useBooks();
  const recent = useRecentBooks();
  const favorites = useFavoriteBooks();
  const [isDragging, setIsDragging] = useState(false);

  if (!books) return null; // loading

  if (books.length === 0) {
    return (
      <Shell>
        <EmptyState />
      </Shell>
    );
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(f => 
      f.name.toLowerCase().endsWith('.epub') || f.name.toLowerCase().endsWith('.pdf')
    );
    for (const file of files) {
      await importBookFile(file);
    }
  };

  return (
    <Shell>
      <ScrollArea className="h-full">
        <div 
          className={`p-10 min-h-full transition-colors ${isDragging ? "bg-primary/5" : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {isDragging && (
            <div className="absolute inset-0 z-50 border-4 border-dashed border-primary/50 bg-background/80 backdrop-blur-sm flex items-center justify-center pointer-events-none">
              <h2 className="text-3xl font-serif text-primary font-medium">Drop books to add to library</h2>
            </div>
          )}

          {recent.length > 0 && (
            <section className="mb-14">
              <h2 className="text-2xl font-serif font-medium text-foreground mb-6">Recent Reads</h2>
              <div className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory hide-scrollbar">
                {recent.map((book, i) => (
                  <div key={book.id} className="snap-start shrink-0">
                    <BookCard book={book} featured={i === 0} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {favorites.length > 0 && (
            <section className="mb-14">
              <h2 className="text-2xl font-serif font-medium text-foreground mb-6">Favorites</h2>
              <div className="flex flex-wrap gap-6">
                {favorites.map((book) => (
                  <BookCard key={book.id} book={book} />
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="text-2xl font-serif font-medium text-foreground mb-6">All Books</h2>
            <div className="flex flex-wrap gap-6">
              {books.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          </section>
        </div>
      </ScrollArea>
    </Shell>
  );
}
