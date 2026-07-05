import ePub from "epubjs";
import { db } from "@/lib/db";

export async function importBookFile(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const format = file.name.toLowerCase().endsWith(".pdf") ? "pdf" : "epub";
  
  let title = file.name.replace(/\.[^/.]+$/, "");
  let author = "Unknown Author";
  let coverUrl: string | undefined = undefined;

  if (format === "epub") {
    try {
      const book = ePub();
      await book.open(arrayBuffer.slice(0));
      await book.ready;
      
      const metadata = await book.loaded.metadata;
      if (metadata.title) title = metadata.title;
      if (metadata.creator) author = metadata.creator;
      
      const coverUrlTemp = await book.coverUrl();
      if (coverUrlTemp) {
        const res = await fetch(coverUrlTemp);
        const blob = await res.blob();
        const reader = new FileReader();
        coverUrl = await new Promise((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      }
    } catch (e) {
      console.error("Failed to parse EPUB metadata", e);
    }
  }

  await db.books.add({
    title,
    author,
    format,
    fileData: arrayBuffer,
    coverUrl,
    addedAt: new Date(),
    lastOpenedAt: new Date(),
    isFavorite: false,
  });
}
