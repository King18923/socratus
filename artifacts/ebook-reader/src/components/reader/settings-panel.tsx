import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ReaderSettings {
  fontSize: number;
  fontFamily: "serif" | "sans" | "mono";
  lineSpacing: "normal" | "relaxed" | "loose";
  spread: "single" | "double";
  flow: "paginated" | "scrolled";
  voiceSpeed: number;
}

export const DEFAULT_SETTINGS: ReaderSettings = {
  fontSize: 18,
  fontFamily: "serif",
  lineSpacing: "relaxed",
  spread: "double",
  flow: "paginated",
  voiceSpeed: 1.0,
};

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  settings: ReaderSettings;
  onChange: (s: ReaderSettings) => void;
  isSpeaking: boolean;
  onVoicePlay: () => void;
  onVoiceStop: () => void;
}

type Option<T> = { label: string; value: T };

function OptionRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex rounded-lg overflow-hidden border border-border">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "flex-1 text-xs py-2 px-3 transition-colors font-medium",
            value === opt.value
              ? "bg-primary text-primary-foreground"
              : "bg-background text-muted-foreground hover:bg-muted"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function SettingsPanel({
  open,
  onClose,
  settings,
  onChange,
  isSpeaking,
  onVoicePlay,
  onVoiceStop,
}: SettingsPanelProps) {
  const set = <K extends keyof ReaderSettings>(key: K, value: ReaderSettings[K]) =>
    onChange({ ...settings, [key]: value });

  const fontFamilyLabel = {
    serif: "Georgia, serif",
    sans: "Inter, sans-serif",
    mono: "Menlo, monospace",
  }[settings.fontFamily];

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-[320px] sm:w-[360px] overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="font-serif text-base">Reading Settings</SheetTitle>
        </SheetHeader>

        {/* ── Appearance ── */}
        <section className="space-y-5">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Appearance
          </h3>

          <div className="space-y-2">
            <label className="text-sm font-medium">Font Style</label>
            <OptionRow
              options={[
                { label: "Serif", value: "serif" as const },
                { label: "Sans", value: "sans" as const },
                { label: "Mono", value: "mono" as const },
              ]}
              value={settings.fontFamily}
              onChange={(v) => set("fontFamily", v)}
            />
            <p className="text-xs text-muted-foreground mt-1">{fontFamilyLabel}</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Font Size</label>
              <span className="text-sm text-muted-foreground tabular-nums">
                {settings.fontSize}px
              </span>
            </div>
            <Slider
              min={12}
              max={28}
              step={1}
              value={[settings.fontSize]}
              onValueChange={([v]) => set("fontSize", v)}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Small</span>
              <span>Large</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Line Spacing</label>
            <OptionRow
              options={[
                { label: "Tight", value: "normal" as const },
                { label: "Normal", value: "relaxed" as const },
                { label: "Loose", value: "loose" as const },
              ]}
              value={settings.lineSpacing}
              onChange={(v) => set("lineSpacing", v)}
            />
          </div>
        </section>

        <Separator className="my-6" />

        {/* ── Layout ── */}
        <section className="space-y-5">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Layout
          </h3>

          <div className="space-y-2">
            <label className="text-sm font-medium">Page Spread</label>
            <OptionRow
              options={[
                { label: "Single", value: "single" as const },
                { label: "Double", value: "double" as const },
              ]}
              value={settings.spread}
              onChange={(v) => set("spread", v)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Reading Direction</label>
            <OptionRow
              options={[
                { label: "Horizontal", value: "paginated" as const },
                { label: "Scroll Down", value: "scrolled" as const },
              ]}
              value={settings.flow}
              onChange={(v) => set("flow", v)}
            />
          </div>
        </section>

        <Separator className="my-6" />

        {/* ── Voice Reader ── */}
        <section className="space-y-5">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Voice Reader
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Reads the current page aloud using your device's text-to-speech engine.
          </p>

          <div className="flex gap-2">
            <Button
              variant={isSpeaking ? "destructive" : "default"}
              size="sm"
              className="flex-1"
              onClick={isSpeaking ? onVoiceStop : onVoicePlay}
            >
              {isSpeaking ? "Stop Reading" : "Read Aloud"}
            </Button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Reading Speed</label>
              <span className="text-sm text-muted-foreground tabular-nums">
                {settings.voiceSpeed.toFixed(1)}×
              </span>
            </div>
            <Slider
              min={0.5}
              max={2.0}
              step={0.1}
              value={[settings.voiceSpeed]}
              onValueChange={([v]) => set("voiceSpeed", v)}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0.5× Slow</span>
              <span>2.0× Fast</span>
            </div>
          </div>
        </section>

        <Separator className="my-6" />

        {/* ── Dictionary ── */}
        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Dictionary
          </h3>
          <div className="rounded-lg bg-muted/50 p-3 space-y-1">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="font-medium text-foreground">Double-click</span> any word while reading to instantly look up its definition.
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Definitions are fetched from the Free Dictionary API — no account needed.
            </p>
          </div>
        </section>
      </SheetContent>
    </Sheet>
  );
}
