import Dexie, { type Table } from "dexie";

export interface Book {
  id?: number;
  title: string;
  author: string;
  format: "epub" | "pdf";
  coverUrl?: string;
  fileData: ArrayBuffer;
  addedAt: Date;
  lastOpenedAt?: Date;
  currentLocation?: string;
  isFavorite: boolean;
  totalPages?: number;
}

export interface Highlight {
  id?: number;
  bookId: number;
  cfi: string;
  text: string;
  color: string;
  createdAt: Date;
  note?: string;
}

export interface Bookmark {
  id?: number;
  bookId: number;
  cfi: string;
  label: string;
  createdAt: Date;
}

export interface Note {
  id?: number;
  bookId: number;
  highlightId?: number;
  title: string;
  content: string;
  quote?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

class SocratusDB extends Dexie {
  books!: Table<Book>;
  highlights!: Table<Highlight>;
  bookmarks!: Table<Bookmark>;
  notes!: Table<Note>;

  constructor() {
    super("PageTurnDB");
    this.version(1).stores({
      books: "++id, addedAt, lastOpenedAt, isFavorite",
      highlights: "++id, bookId, createdAt",
      bookmarks: "++id, bookId",
    });
    this.version(2).stores({
      books: "++id, addedAt, lastOpenedAt, isFavorite",
      highlights: "++id, bookId, createdAt, color",
      bookmarks: "++id, bookId",
      notes: "++id, bookId, highlightId, createdAt",
    });
  }
}

export const db = new SocratusDB();
