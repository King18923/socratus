import { useRecentBooks } from "@/hooks/use-db";
import { Shell } from "@/components/layout/shell";
import { BookCard } from "@/components/library/book-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock } from "lucide-react";

export default function RecentPage() {
  const recent = useRecentBooks();

  return (
    <Shell>
      <ScrollArea className="h-full">
        <div className="p-10 min-h-full">
          <h2 className="text-3xl font-serif font-medium text-foreground mb-8 flex items-center gap-3">
            <Clock className="w-8 h-8 text-primary" />
            Recent Reads
          </h2>

          {recent.length === 0 ? (
            <div className="text-center text-muted-foreground mt-20">
              <p>You haven't read any books recently.</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-6">
              {recent.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </Shell>
  );
}
