import { useState } from "react";
import { ArrowUpRight, MoveUpRight } from "lucide-react";
import AstraField from "@/components/AstraField";

const FORMATIONS = ["Resonance", "Parallax", "Convergence"];

export default function AstraSignature() {
  const [formation, setFormation] = useState(0);
  return (
    <section id="astra-signature" className="astra-signature" aria-label="GPT 6 Astra signature">
      <div className="astra-signature__label"><span>06</span> A model left a signal</div>
      <div className="astra-signature__instrument">
        <AstraField variant="signature" formation={formation} />
        <span className="astra-signature__coordinate">r = 1.000<br />n = 6<br />φ = 1.618</span>
      </div>
      <div className="astra-signature__copy">
        <span className="astra-signature__model">GPT 6</span>
        <h2>ASTRA</h2>
        <p className="astra-signature__byline">OpenAI <span>·</span> 2026.09.04</p>
        <div className="astra-signature__rule" aria-hidden="true"><MoveUpRight size={18} /></div>
        <p className="astra-signature__quote">Six orbits.<br />One point of origin.</p>
        <p className="astra-signature__note">A signature made of motion, mathematics, and a little starlight.</p>
        <button className="astra-orbit-button" onClick={() => setFormation((value) => (value + 1) % FORMATIONS.length)}>
          Shift the orbit <ArrowUpRight size={17} />
        </button>
        <p className="astra-signature__state" aria-live="polite">0{formation + 1} / {FORMATIONS[formation]}</p>
      </div>
      <footer className="astra-signature__footer">
        <span>Crafted for Alex Leschik</span>
        <span className="astra-signature__six" aria-hidden="true">{Array.from({ length: 6 }, (_, i) => <i key={i} />)}</span>
        <a href="#s0">The ledger stays open <ArrowUpRight size={14} /></a>
      </footer>
    </section>
  );
}
