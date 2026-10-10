import { useState, useEffect, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useInView } from "@/hooks/useInView";
import { Play, Code, ExternalLink } from "lucide-react";

interface GalleryItem {
  id: string;
  type: "image" | "video" | "code";
  title: string;
  description: string;
  storage_path: string | null;
  external_url: string | null;
  code_content: string | null;
  code_language: string | null;
  sort_order: number;
}

export default function GalleryShowcase() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [activeCode, setActiveCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  /* The section mounts early (idle time) for every visitor; the live-update
     socket, which only matters while the owner adds items, opens once the
     section is actually near the screen. */
  const { ref, inView: near } = useInView<HTMLDivElement>({ rootMargin: "800px 0px", once: true });

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("gallery_items")
      .select("*")
      .order("sort_order", { ascending: true });
    if (data) setItems(data as GalleryItem[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!near) return;
    const channel = supabase
      .channel("gallery-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "gallery_items" }, () => {
        load();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [near, load]);

  const getPublicUrl = (path: string) => {
    const { data } = supabase.storage.from("portfolio").getPublicUrl(path);
    return data.publicUrl;
  };

  /* One root for every state, so the in-view observer keeps its element. */
  let content: ReactNode;

  /* One placeholder card: the archive is small, and a taller skeleton would
     collapse (and shift the page) when the real items arrive. */
  if (loading) {
    content = (
      <div className="gallery-grid">
        <div className="gallery-card gallery-skeleton" />
      </div>
    );
  } else if (items.length === 0) {
    content = (
      <div className="gallery-empty">
        <span className="font-mono text-[0.6rem] tracking-widest uppercase text-muted-foreground/50">
          No items yet — use the command panel to add content
        </span>
      </div>
    );
  } else {
    content = (
      <div className="gallery-grid">
        {items.map((item, i) => (
          <div
            key={item.id}
            className="gallery-card"
            style={{ animationDelay: `${i * 0.08}s` }}
          >
            {item.type === "image" && item.storage_path && (
              <img
                src={getPublicUrl(item.storage_path)}
                alt={item.title || "Gallery image"}
                className="gallery-card-media"
                loading="lazy"
              />
            )}

            {item.type === "video" && (
              <div className="gallery-card-video">
                {item.storage_path ? (
                  <video
                    src={getPublicUrl(item.storage_path)}
                    controls
                    playsInline
                    preload="metadata"
                    className="gallery-card-media"
                  />
                ) : item.external_url ? (
                  <iframe
                    src={item.external_url}
                    className="gallery-card-media"
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                    loading="lazy"
                  />
                ) : (
                  <div className="gallery-card-placeholder">
                    <Play className="w-8 h-8 text-muted-foreground/30" />
                  </div>
                )}
              </div>
            )}

            {item.type === "code" && (
              <div
                className="gallery-card-code"
                onClick={() => setActiveCode(activeCode === item.id ? null : item.id)}
              >
                <div className="code-header">
                  <Code className="w-3 h-3 text-muted-foreground/60" />
                  <span className="font-mono text-[0.5rem] tracking-wider uppercase text-muted-foreground/60">
                    {item.code_language || "code"}
                  </span>
                </div>
                <pre className={`code-block ${activeCode === item.id ? "code-expanded" : ""}`}>
                  <code>{item.code_content}</code>
                </pre>
              </div>
            )}

            {/* Info overlay */}
            <div className="gallery-card-info">
              {item.title && (
                <h3 className="font-mono text-[0.6rem] tracking-widest uppercase text-foreground/80">
                  {item.title}
                </h3>
              )}
              {item.description && (
                <p className="text-[0.55rem] text-muted-foreground/60 mt-0.5 leading-relaxed">
                  {item.description}
                </p>
              )}
              {item.external_url && item.type !== "video" && (
                <a
                  href={item.external_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-1 text-[0.5rem] text-muted-foreground/40 hover:text-foreground/60 transition-colors"
                >
                  <ExternalLink className="w-2.5 h-2.5" /> Open
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div ref={ref} className="gallery-showcase">
      {content}
    </div>
  );
}
