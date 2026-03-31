import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import ImageUpload from "@/components/ImageUpload";

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

  // Load saved images from database
  useEffect(() => {
    const loadImages = async () => {
      const { data } = await supabase
        .from("portfolio_images")
        .select("*");

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

  const handleUploadComplete = useCallback((faceIndex: number, url: string) => {
    setFaceImages((prev) => {
      const next = [...prev];
      next[faceIndex] = url;
      return next;
    });
  }, []);

  return (
    <div className="cube-scene" style={{ pointerEvents: editMode ? "auto" : "none" }}>
      <div
        className="cube"
        style={{
          transform: `rotateX(${rotation.rx}deg) rotateY(${rotation.ry}deg)`,
          pointerEvents: editMode ? "auto" : "none",
        }}
      >
        {FACES.map((face, i) => (
          <div key={face} className={`cube-face ${FACE_CLASSES[face]}`} style={{ pointerEvents: editMode ? "auto" : "none" }}>
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
            {editMode && (
              <ImageUpload faceIndex={i} onUploadComplete={handleUploadComplete} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
