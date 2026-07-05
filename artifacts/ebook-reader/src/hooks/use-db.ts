import { useLiveQuery } from "dexie-react-hooks";
import { db, type Book, type Highlight, type Bookmark } from "@/lib/db";

export function useBooks() {
  const books = useLiveQuery(() => db.books.orderBy("lastOpenedAt").reverse().toArray());
  return books || [];
}

export function useFavoriteBooks() {
  const books = useLiveQuery(() => db.books.where("isFavorite").equals(1).toArray());
  return books || [];
}

export function useRecentBooks() {
  const books = useLiveQuery(() => db.books.orderBy("lastOpenedAt").reverse().limit(10).toArray());
  return books || [];
}

export function useBook(id?: number) {
  const book = useLiveQuery(() => id ? db.books.get(id) : undefined, [id]);
  return book;
}

export async function toggleFavorite(book: Book) {
  if (!book.id) return;
  await db.books.update(book.id, { isFavorite: !book.isFavorite });
}

export async function updateReadingProgress(id: number, location: string) {
  await db.books.update(id, { 
    currentLocation: location,
    lastOpenedAt: new Date()
  });
}

export async function deleteBook(id: number) {
  await db.books.delete(id);
  await db.highlights.where("bookId").equals(id).delete();
  await db.bookmarks.where("bookId").equals(id).delete();
}

export function useHighlights(bookId: number) {
  return useLiveQuery(() => db.highlights.where("bookId").equals(bookId).toArray(), [bookId]) || [];
}

export async function addHighlight(highlight: Omit<Highlight, "id">) {
  return await db.highlights.add(highlight);
}
