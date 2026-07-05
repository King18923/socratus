import { useFavoriteBooks } from "@/hooks/use-db";
import { Shell } from "@/components/layout/shell";
import { BookCard } from "@/components/library/book-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Star } from "lucide-react";

export default function FavoritesPage() {
  const favorites = useFavoriteBooks();

  return (
    <Shell>
      <ScrollArea className="h-full">
        <div className="p-10 min-h-full">
          <h2 className="text-3xl font-serif font-medium text-foreground mb-8 flex items-center gap-3">
            <Star className="w-8 h-8 text-yellow-500 fill-current" />
            Favorites
          </h2>

          {favorites.length === 0 ? (
            <div className="text-center text-muted-foreground mt-20">
              <p>You haven't marked any books as favorites yet.</p>
              <p className="text-sm mt-2">Open a book to star it.</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-6">
              {favorites.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </Shell>
  );
}
