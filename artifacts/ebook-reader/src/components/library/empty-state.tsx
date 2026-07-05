import { useState } from "react";
import { BookOpen, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { importBookFile } from "@/lib/import-book";
import { motion } from "framer-motion";

export function EmptyState() {
  const [isImporting, setIsImporting] = useState(false);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setIsImporting(true);
    const files = Array.from(e.target.files);
    for (const file of files) {
      await importBookFile(file);
    }
    setIsImporting(false);
  };

  return (
    <div className="flex-1 h-full flex flex-col items-center justify-center p-8 text-center">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md space-y-6 flex flex-col items-center"
      >
        <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-2">
          <BookOpen className="w-12 h-12" strokeWidth={1.5} />
        </div>
        <h2 className="text-3xl font-serif text-foreground font-medium">Your library is empty</h2>
        <p className="text-muted-foreground text-lg">
          Add some EPUB or PDF files to start your reading journey.
        </p>
        <label>
          <Button size="lg" disabled={isImporting} asChild className="cursor-pointer shadow-md">
            <span>
              <Plus className="w-5 h-5 mr-2" />
              {isImporting ? "Importing..." : "Add your first book"}
            </span>
          </Button>
          <input
            type="file"
            accept=".epub,.pdf"
            multiple
            className="hidden"
            onChange={handleImport}
            disabled={isImporting}
          />
        </label>
      </motion.div>
    </div>
  );
}
