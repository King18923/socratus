import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Book, Library, Star, Clock, Settings, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { importBookFile } from "@/lib/import-book";

export function Sidebar() {
  const [location] = useLocation();
  const [isImporting, setIsImporting] = useState(false);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    
    setIsImporting(true);
    const files = Array.from(e.target.files);
    
    for (const file of files) {
      await importBookFile(file);
    }
    
    setIsImporting(false);
    if (e.target) e.target.value = '';
  };

  const navItems = [
    { href: "/", icon: Library, label: "Library" },
    { href: "/favorites", icon: Star, label: "Favorites" },
    { href: "/recent", icon: Clock, label: "Recent" },
  ];

  return (
    <div className="w-64 border-r border-border bg-sidebar h-full flex flex-col pt-6 pb-4">
      <div className="px-6 mb-8 flex items-center gap-2 text-foreground font-serif">
        <Book className="w-6 h-6 text-primary" />
        <span className="text-xl font-bold tracking-tight">PageTurn</span>
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

      <div className="px-6 space-y-4">
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
