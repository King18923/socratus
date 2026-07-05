import { useLiveQuery } from "dexie-react-hooks";
import { db, type Book, type Highlight, type Note } from "@/lib/db";

export function useBooks() {
  return useLiveQuery(() => db.books.orderBy("lastOpenedAt").reverse().toArray()) ?? [];
}

export function useFavoriteBooks() {
  return useLiveQuery(() => db.books.where("isFavorite").equals(1).toArray()) ?? [];
}

export function useRecentBooks() {
  return (
    useLiveQuery(() => db.books.orderBy("lastOpenedAt").reverse().limit(10).toArray()) ?? []
  );
}

export function useBook(id?: number) {
  return useLiveQuery(() => (id ? db.books.get(id) : undefined), [id]);
}

export async function toggleFavorite(book: Book) {
  if (!book.id) return;
  await db.books.update(book.id, { isFavorite: !book.isFavorite });
}

export async function updateReadingProgress(id: number, location: string) {
  await db.books.update(id, { currentLocation: location, lastOpenedAt: new Date() });
}

export async function deleteBook(id: number) {
  await db.books.delete(id);
  await db.highlights.where("bookId").equals(id).delete();
  await db.bookmarks.where("bookId").equals(id).delete();
  await db.notes.where("bookId").equals(id).delete();
}

// ── Highlights ─────────────────────────────────────────────────────────────

export function useHighlights(bookId: number) {
  return (
    useLiveQuery(
      () => db.highlights.where("bookId").equals(bookId).sortBy("createdAt"),
      [bookId]
    ) ?? []
  );
}

export function useAllHighlights() {
  return useLiveQuery(() => db.highlights.orderBy("createdAt").reverse().toArray()) ?? [];
}

export async function addHighlight(highlight: Omit<Highlight, "id">) {
  return db.highlights.add(highlight);
}

export async function deleteHighlight(id: number) {
  return db.highlights.delete(id);
}

// ── Notes ──────────────────────────────────────────────────────────────────

export function useNotes(bookId?: number) {
  return (
    useLiveQuery(
      () =>
        bookId
          ? db.notes.where("bookId").equals(bookId).reverse().sortBy("createdAt")
          : db.notes.orderBy("createdAt").reverse().toArray(),
      [bookId]
    ) ?? []
  );
}

export async function addNote(note: Omit<Note, "id">) {
  return db.notes.add(note);
}

export async function updateNote(id: number, patch: Partial<Note>) {
  return db.notes.update(id, { ...patch, updatedAt: new Date() });
}

export async function deleteNote(id: number) {
  return db.notes.delete(id);
}
