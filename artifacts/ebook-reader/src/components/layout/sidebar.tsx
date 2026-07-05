import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Library, Star, Clock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { importBookFile } from "@/lib/import-book";

function SocratesIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="currentColor"
      className={className}
      aria-label="Socratus"
    >
      {/* Head */}
      <ellipse cx="32" cy="11" rx="8" ry="9" />
      {/* Beard — fuller, flowing down */}
      <path d="M24 17 Q20 26 22 34 Q26 30 32 31 Q38 30 42 34 Q44 26 40 17 Q36 22 32 23 Q28 22 24 17Z" />
      {/* Robe body — draped, seated shape */}
      <path d="M18 34 Q14 40 13 52 Q18 54 32 54 Q46 54 51 52 Q50 40 46 34 Q42 38 32 38 Q22 38 18 34Z" />
      {/* Left arm resting on knee */}
      <path d="M13 52 Q10 48 11 42 Q14 40 18 44 Q16 48 13 52Z" />
      {/* Right arm — hand raised to chin (thinker pose) */}
      <path d="M51 52 Q54 46 52 38 Q48 36 45 40 Q47 44 51 52Z" />
      {/* Right hand at chin */}
      <ellipse cx="45" cy="38" rx="4" ry="3" />
      {/* Legs crossed, seated */}
      <ellipse cx="24" cy="54" rx="9" ry="4" />
      <ellipse cx="40" cy="54" rx="9" ry="4" />
      {/* Folds in robe */}
      <path d="M25 40 Q28 50 32 54" strokeWidth="0.5" fill="none" stroke="currentColor" opacity="0.3" />
      <path d="M39 40 Q36 50 32 54" strokeWidth="0.5" fill="none" stroke="currentColor" opacity="0.3" />
    </svg>
  );
}

export function Sidebar() {
  const [location] = useLocation();
  const [isImporting, setIsImporting] = useState(false);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setIsImporting(true);
    for (const file of Array.from(e.target.files)) {
      await importBookFile(file);
    }
    setIsImporting(false);
    if (e.target) e.target.value = "";
  };

  const navItems = [
    { href: "/", icon: Library, label: "Library" },
    { href: "/favorites", icon: Star, label: "Favorites" },
    { href: "/recent", icon: Clock, label: "Recent" },
  ];

  return (
    <div className="w-64 border-r border-border bg-sidebar h-full flex flex-col pt-6 pb-4">
      <div className="px-6 mb-8 flex items-center gap-3">
        <SocratesIcon className="w-8 h-8 text-primary flex-shrink-0" />
        <span className="text-xl font-serif font-bold tracking-tight text-foreground">
          Socratus
        </span>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <span
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors cursor-pointer ${
                location === item.href
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50"
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </span>
          </Link>
        ))}
      </nav>

      <div className="px-6">
        <label className="block">
          <Button
            className="w-full justify-start shadow-none bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={isImporting}
            asChild
          >
            <span>
              <Plus className="w-4 h-4 mr-2" />
              {isImporting ? "Importing..." : "Add Books"}
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
      </div>
    </div>
  );
}
