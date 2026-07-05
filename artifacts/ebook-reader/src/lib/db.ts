import Dexie, { type Table } from "dexie";

export interface Book {
  id?: number;
  title: string;
  author: string;
  format: "epub" | "pdf";
  coverUrl?: string;
  fileData: ArrayBuffer;  // store raw file bytes
  addedAt: Date;
  lastOpenedAt?: Date;
  currentLocation?: string; // epub CFI or pdf page number string
  isFavorite: boolean;
  totalPages?: number;
}

export interface Highlight {
  id?: number;
  bookId: number;
  cfi: string;           // epub CFI range or pdf "page:x1,y1,x2,y2"
  text: string;
  color: string;         // "yellow" | "green" | "pink" | "blue"
  createdAt: Date;
}

export interface Bookmark {
  id?: number;
  bookId: number;
  cfi: string;
  label: string;
  createdAt: Date;
}

class PageTurnDB extends Dexie {
  books!: Table<Book>;
  highlights!: Table<Highlight>;
  bookmarks!: Table<Bookmark>;

  constructor() {
    super("PageTurnDB");
    this.version(1).stores({
      books: "++id, addedAt, lastOpenedAt, isFavorite",
      highlights: "++id, bookId, createdAt",
      bookmarks: "++id, bookId",
    });
  }
}

export const db = new PageTurnDB();
