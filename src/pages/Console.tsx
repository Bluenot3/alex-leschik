import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import CommandDashboard from "@/components/CommandDashboard";

/**
 * Private owner console.
 *
 * Unlisted route — nothing on the public site links here, and the page
 * asks crawlers not to index it. Access is still decided server-side:
 * the owner gate signs in against the backend and row-level security
 * rejects writes from any session that is not on the allowlist.
 */
export default function Console() {
  const navigate = useNavigate();

  useEffect(() => {
    const prevTitle = document.title;
    document.title = "Owner Console";
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => {
      document.title = prevTitle;
      meta.remove();
    };
  }, []);

  return (
    <main className="console-page">
      <CommandDashboard open onClose={() => navigate("/")} />
    </main>
  );
}
