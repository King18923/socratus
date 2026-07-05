import { Link } from "wouter";
import { type Book } from "@/lib/db";
import { motion } from "framer-motion";
import { Star } from "lucide-react";

function getCoverGradient(title: string) {
  let hash = 0;
  for (let i = 0; i < title.length; i++) hash = title.charCodeAt(i) + ((hash << 5) - hash);
  const h1 = Math.abs(hash) % 360;
  const h2 = (h1 + 40) % 360;
  return `linear-gradient(135deg, hsl(${h1}, 40%, 30%), hsl(${h2}, 50%, 20%))`;
}

export function BookCard({ book, featured = false }: { book: Book; featured?: boolean }) {
  const isPdf = book.format === "pdf";

  return (
    <Link href={`/read/${book.id}`}>
      <motion.div
        whileHover={{ y: -4, scale: 1.02 }}
        transition={{ duration: 0.2 }}
        className={`group flex flex-col gap-3 cursor-pointer ${featured ? "w-56" : "w-40"}`}
      >
        <div 
          className={`relative rounded-md overflow-hidden shadow-md group-hover:shadow-xl transition-shadow ${featured ? "h-80" : "h-60"}`}
          style={book.coverUrl ? {
            backgroundImage: `url(${book.coverUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center"
          } : {
            background: getCoverGradient(book.title)
          }}
        >
          {!book.coverUrl && (
            <div className="absolute inset-0 p-4 flex flex-col justify-end bg-black/20">
              <span className="text-white font-serif font-semibold leading-tight line-clamp-3 shadow-sm">{book.title}</span>
              <span className="text-white/80 text-xs mt-1 line-clamp-1">{book.author}</span>
            </div>
          )}
          {book.isFavorite && (
            <div className="absolute top-2 right-2 text-yellow-400 drop-shadow-md">
              <Star className="w-5 h-5 fill-current" />
            </div>
          )}
          {isPdf && (
            <div className="absolute top-2 left-2 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider font-semibold backdrop-blur-sm">
              PDF
            </div>
          )}
        </div>
        <div>
          <h3 className="font-serif font-medium text-foreground leading-tight line-clamp-2">{book.title}</h3>
          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{book.author}</p>
        </div>
      </motion.div>
    </Link>
  );
}
