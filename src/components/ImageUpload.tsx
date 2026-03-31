import { useCallback, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Upload } from "lucide-react";

interface ImageUploadProps {
  faceIndex: number;
  onUploadComplete: (faceIndex: number, url: string) => void;
}

export default function ImageUpload({ faceIndex, onUploadComplete }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `cube-face-${faceIndex}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("portfolio")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("portfolio")
        .getPublicUrl(path);

      // Upsert the face assignment
      await supabase.from("portfolio_images").upsert(
        { face_index: faceIndex, storage_path: path, file_name: file.name },
        { onConflict: "face_index" }
      );

      onUploadComplete(faceIndex, publicUrl);
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
    }
  }, [faceIndex, onUploadComplete]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  }, [handleUpload]);

  return (
    <>
      <div
        className="upload-zone"
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-5 h-5 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
            <span className="font-mono text-[0.55rem] tracking-widest uppercase text-muted-foreground">
              Uploading...
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
            <span className="font-mono text-[0.55rem] tracking-widest uppercase text-muted-foreground">
              Drop image
            </span>
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
        }}
      />
    </>
  );
}
