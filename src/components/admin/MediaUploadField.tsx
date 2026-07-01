import { useRef, useState } from "react";
import { Upload, Loader2, CheckCircle2, X } from "lucide-react";
import { uploadMedia } from "@/lib/media-upload";

type Props = {
  label: string;
  value: string;
  onChange: (url: string) => void;
  folder: string;
  accept?: string;
  maxSizeMB?: number;
  placeholder?: string;
};

/**
 * Paste-a-URL field with a real upload button next to it. Uploads go to the
 * `cms-media` Supabase Storage bucket; the resulting public URL fills the
 * same field a manually-pasted external URL would. Shows live upload
 * percentage. Pasting a URL still works for anyone who wants to host media
 * elsewhere — upload is additive, not a replacement.
 */
export function MediaUploadField({
  label,
  value,
  onChange,
  folder,
  accept,
  maxSizeMB = 200,
  placeholder = "https://… or upload a file",
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setError(null);
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File too large — max ${maxSizeMB}MB.`);
      return;
    }
    setProgress(0);
    try {
      const url = await uploadMedia(file, folder, setProgress);
      onChange(url);
      setProgress(100);
      setTimeout(() => setProgress(null), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
      setProgress(null);
    }
  };

  const uploading = progress !== null && progress < 100;

  return (
    <div>
      <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">{label}</label>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary/50 transition-colors"
        />
        {value && !uploading && (
          <button
            type="button"
            onClick={() => onChange("")}
            title="Clear"
            className="shrink-0 p-2 rounded-xl bg-secondary hover:bg-secondary/70 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary hover:bg-secondary/70 text-xs font-medium disabled:opacity-70 transition-colors whitespace-nowrap"
        >
          {progress === null ? (
            <>
              <Upload className="w-3.5 h-3.5" /> Upload
            </>
          ) : progress < 100 ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> {progress}%
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Done
            </>
          )}
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
      {error && <p className="text-[10px] text-destructive mt-1">{error}</p>}
    </div>
  );
}
