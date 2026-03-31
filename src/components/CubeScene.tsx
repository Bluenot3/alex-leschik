import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Upload, X, Check } from "lucide-react";

import cubeImg1 from "@/assets/hero-cube-1.jpg";
import cubeImg2 from "@/assets/hero-cube-2.jpg";
import cubeImg3 from "@/assets/hero-cube-3.jpg";
import cubeImg4 from "@/assets/hero-cube-4.jpg";
import cubeImg5 from "@/assets/hero-cube-5.jpg";
import cubeImg6 from "@/assets/hero-cube-6.jpg";

const DEFAULT_IMAGES = [cubeImg1, cubeImg2, cubeImg3, cubeImg4, cubeImg5, cubeImg6];
const FACES = ["top", "front", "right", "back", "left", "bottom"] as const;
const FACE_CLASSES: Record<string, string> = {
  top: "cube-face-top",
  front: "cube-face-front",
  right: "cube-face-right",
  back: "cube-face-back",
  left: "cube-face-left",
  bottom: "cube-face-bottom",
};

interface CubeSceneProps {
  rotation: { rx: number; ry: number };
  editMode?: boolean;
}

export default function CubeScene({ rotation, editMode = false }: CubeSceneProps) {
  const [faceImages, setFaceImages] = useState<string[]>([...DEFAULT_IMAGES]);
  const [uploading, setUploading] = useState<number | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<number | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const loadImages = async () => {
      const { data } = await supabase.from("portfolio_images").select("*");
      if (data && data.length > 0) {
        const newImages = [...DEFAULT_IMAGES];
        data.forEach((row: { face_index: number; storage_path: string }) => {
          const { data: { publicUrl } } = supabase.storage
            .from("portfolio")
            .getPublicUrl(row.storage_path);
          newImages[row.face_index] = publicUrl;
        });
        setFaceImages(newImages);
      }
    };
    loadImages();
  }, []);

  const handleUpload = useCallback(async (faceIndex: number, file: File) => {
    setUploading(faceIndex);
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

      await supabase.from("portfolio_images").upsert(
        { face_index: faceIndex, storage_path: path, file_name: file.name },
        { onConflict: "face_index" }
      );

      setFaceImages((prev) => {
        const next = [...prev];
        next[faceIndex] = publicUrl;
        return next;
      });

      setUploadSuccess(faceIndex);
      setTimeout(() => setUploadSuccess(null), 2000);
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(null);
    }
  }, []);

  return (
    <>
      <div className="cube-scene">
        <div
          className="cube"
          style={{ transform: `rotateX(${rotation.rx}deg) rotateY(${rotation.ry}deg)` }}
        >
          {FACES.map((face, i) => (
            <div key={face} className={`cube-face ${FACE_CLASSES[face]}`}>
              <img
                src={faceImages[i]}
                alt={face}
                width={1024}
                height={1024}
                loading={i === 0 ? undefined : "lazy"}
              />
              {!editMode && (
                <span className="cube-face-label">{face.toUpperCase()}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Flat upload panel — no 3D click issues */}
      {editMode && (
        <div className="face-upload-panel">
          <div className="font-mono text-[0.55rem] tracking-widest uppercase text-muted-foreground mb-3">
            Click a face to upload
          </div>
          <div className="grid grid-cols-3 gap-2">
            {FACES.map((face, i) => (
              <button
                key={face}
                className="face-thumb-btn"
                onClick={() => inputRefs.current[i]?.click()}
                disabled={uploading === i}
              >
                <img
                  src={faceImages[i]}
                  alt={face}
                  className="face-thumb-img"
                />
                <div className="face-thumb-overlay">
                  {uploading === i ? (
                    <div className="w-4 h-4 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
                  ) : uploadSuccess === i ? (
                    <Check className="w-4 h-4 text-emerald-500" strokeWidth={2} />
                  ) : (
                    <Upload className="w-3.5 h-3.5 text-foreground/60" strokeWidth={1.5} />
                  )}
                </div>
                <span className="face-thumb-label">{face}</span>
                <input
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUpload(i, file);
                    e.target.value = "";
                  }}
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
