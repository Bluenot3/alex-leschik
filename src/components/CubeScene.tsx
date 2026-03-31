import cubeImg1 from "@/assets/hero-cube-1.jpg";
import cubeImg2 from "@/assets/hero-cube-2.jpg";
import cubeImg3 from "@/assets/hero-cube-3.jpg";
import cubeImg4 from "@/assets/hero-cube-4.jpg";
import cubeImg5 from "@/assets/hero-cube-5.jpg";
import cubeImg6 from "@/assets/hero-cube-6.jpg";

const IMAGES = [cubeImg1, cubeImg2, cubeImg3, cubeImg4, cubeImg5, cubeImg6];
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
}

export default function CubeScene({ rotation }: CubeSceneProps) {
  return (
    <div className="cube-scene">
      <div
        className="cube"
        style={{
          transform: `rotateX(${rotation.rx}deg) rotateY(${rotation.ry}deg)`,
        }}
      >
        {FACES.map((face, i) => (
          <div key={face} className={`cube-face ${FACE_CLASSES[face]}`}>
            <img
              src={IMAGES[i]}
              alt={face}
              width={1024}
              height={1024}
              loading={i === 0 ? undefined : "lazy"}
            />
            <span className="cube-face-label">{face.toUpperCase()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
