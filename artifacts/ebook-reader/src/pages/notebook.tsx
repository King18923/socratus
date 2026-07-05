import { useState } from "react";
import { useNotes, useBooks, addNote, updateNote, deleteNote } from "@/hooks/use-db";
import { Shell } from "@/components/layout/shell";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pencil, Trash2, Plus, BookOpen, Quote } from "lucide-react";
import { type Note } from "@/lib/db";

function NoteCard({
  note,
  bookTitle,
  onEdit,
  onDelete,
}: {
  note: Note;
  bookTitle: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group rounded-xl border border-border bg-card p-5 space-y-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-serif font-medium text-foreground leading-tight">
          {note.title || "Untitled Note"}
        </h3>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {note.quote && (
        <blockquote className="border-l-2 border-primary/50 pl-3 text-sm text-muted-foreground italic font-serif">
          <Quote className="w-3 h-3 inline-block mr-1 mb-0.5 text-primary/50" />
          {note.quote}
        </blockquote>
      )}

      <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
        {note.content}
      </p>

      {note.tags && note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {note.tags.map((tag) => (
            <span
              key={tag}
              className="text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 pt-1 border-t border-border/50">
        <BookOpen className="w-3 h-3 text-muted-foreground/50" />
        <span className="text-xs text-muted-foreground">{bookTitle}</span>
        <span className="text-muted-foreground/40 text-xs">·</span>
        <span className="text-xs text-muted-foreground">
          {new Date(note.updatedAt).toLocaleDateString("en-US", {
            year: "numeric", month: "short", day: "numeric",
          })}
        </span>
      </div>
    </div>
  );
}

interface NoteFormProps {
  open: boolean;
  onClose: () => void;
  bookId?: number;
  books: { id: number; title: string }[];
  existing?: Note;
}

function NoteForm({ open, onClose, bookId, books, existing }: NoteFormProps) {
  const [selectedBookId, setSelectedBookId] = useState<string>(
    existing?.bookId?.toString() ?? bookId?.toString() ?? ""
  );
  const [title, setTitle]   = useState(existing?.title ?? "");
  const [quote, setQuote]   = useState(existing?.quote ?? "");
  const [content, setContent] = useState(existing?.content ?? "");
  const [tags, setTags]     = useState(existing?.tags?.join(", ") ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!selectedBookId || !content.trim()) return;
    setSaving(true);
    const parsedTags = tags.split(",").map((t) => t.trim()).filter(Boolean);
    const now = new Date();
    if (existing?.id) {
      await updateNote(existing.id, { title, quote: quote || undefined, content, tags: parsedTags });
    } else {
      await addNote({
        bookId: parseInt(selectedBookId),
        title,
        quote: quote || undefined,
        content,
        tags: parsedTags,
        createdAt: now,
        updatedAt: now,
      });
    }
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif">
            {existing ? "Edit Note" : "New Note"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {!bookId && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Book</label>
              <Select value={selectedBookId} onValueChange={setSelectedBookId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a book…" />
                </SelectTrigger>
                <SelectContent>
                  {books.map((b) => (
                    <SelectItem key={b.id} value={b.id.toString()}>
                      {b.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Title</label>
            <Input
              placeholder="Note title (optional)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Quote / Passage</label>
            <Textarea
              placeholder="Paste a quote or passage from the book…"
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
              rows={2}
              className="text-sm font-serif"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Your Note</label>
            <Textarea
              placeholder="Write your thoughts, insights, or reflections…"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Tags</label>
            <Input
              placeholder="insight, philosophy, wisdom (comma-separated)"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !selectedBookId || !content.trim()}>
              {saving ? "Saving…" : existing ? "Save Changes" : "Add Note"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function NotebookPage() {
  const notes = useNotes();
  const books = useBooks();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Note | undefined>();

  const bookMap = Object.fromEntries(books.map((b) => [b.id!, b.title]));

  const grouped = books
    .map((b) => ({
      book: b,
      notes: notes.filter((n) => n.bookId === b.id),
    }))
    .filter((g) => g.notes.length > 0);

  const handleEdit = (note: Note) => {
    setEditing(note);
    setFormOpen(true);
  };

  const handleDelete = async (id?: number) => {
    if (id) await deleteNote(id);
  };

  const handleClose = () => {
    setEditing(undefined);
    setFormOpen(false);
  };

  return (
    <Shell>
      <ScrollArea className="h-full">
        <div className="p-10 max-w-4xl">
          <div className="mb-10 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-serif font-medium text-foreground">Notebook</h1>
              <p className="text-muted-foreground mt-1 text-sm">
                {notes.length} note{notes.length !== 1 ? "s" : ""} — your personal reading journal
              </p>
            </div>
            <Button onClick={() => setFormOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              New Note
            </Button>
          </div>

          {notes.length === 0 ? (
            <div className="text-center py-24">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Pencil className="w-7 h-7 text-muted-foreground" />
              </div>
              <p className="text-lg font-serif text-foreground">Your notebook is empty</p>
              <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
                Capture insights, link quotes, and build your personal reading journal.
              </p>
              <Button className="mt-6 gap-2" onClick={() => setFormOpen(true)}>
                <Plus className="w-4 h-4" />
                Add your first note
              </Button>
            </div>
          ) : (
            <div className="space-y-12">
              {grouped.map(({ book, notes: bookNotes }) => (
                <section key={book.id}>
                  <h2 className="text-lg font-serif font-medium mb-4 text-muted-foreground">
                    {book.title}
                  </h2>
                  <div className="grid grid-cols-1 gap-4">
                    {bookNotes.map((note) => (
                      <NoteCard
                        key={note.id}
                        note={note}
                        bookTitle={bookMap[note.bookId] ?? "Unknown Book"}
                        onEdit={() => handleEdit(note)}
                        onDelete={() => handleDelete(note.id)}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      <NoteForm
        open={formOpen}
        onClose={handleClose}
        books={books.map((b) => ({ id: b.id!, title: b.title }))}
        existing={editing}
      />
    </Shell>
  );
}
