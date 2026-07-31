import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/integrations/supabase/client";
import { useOwnerAuth } from "@/hooks/useOwnerAuth";
import OwnerGate from "@/components/OwnerGate";
import {
  ZENGEN_BUCKET,
  makeKey,
  processImage,
  type ZenGenCollection,
} from "@/lib/zengen";

type Status = "queued" | "working" | "done" | "failed";

interface QueueItem {
  id: string;
  file: File;
  status: Status;
  error?: string;
}

const CONCURRENCY = 4;

interface Props {
  collections: ZenGenCollection[];
  onClose: () => void;
  onUploaded: () => void;
}

export default function ZenGenStudio({ collections, onClose, onUploaded }: Props) {
  const { session, isOwner } = useOwnerAuth();

  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [running, setRunning] = useState(false);
  const [collectionId, setCollectionId] = useState<string>("");
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);
  const cancelled = useRef(false);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape" && !running) onClose(); };
    window.addEventListener("keydown", h);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", h);
      document.body.style.overflow = prev;
    };
  }, [onClose, running]);

  useEffect(() => () => { cancelled.current = true; }, []);

  const stats = useMemo(() => {
    let done = 0, failed = 0, pending = 0;
    for (const q of queue) {
      if (q.status === "done") done++;
      else if (q.status === "failed") failed++;
      else pending++;
    }
    return { done, failed, pending, total: queue.length };
  }, [queue]);

  const addFiles = useCallback((list: FileList | File[]) => {
    const incoming = Array.from(list).filter((f) => f.type.startsWith("image/"));
    if (incoming.length === 0) return;
    setQueue((prev) => [
      ...prev,
      ...incoming.map((file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 7)}`,
        file,
        status: "queued" as Status,
      })),
    ]);
  }, []);

  const mark = useCallback((id: string, status: Status, error?: string) => {
    setQueue((prev) => prev.map((q) => (q.id === id ? { ...q, status, error } : q)));
  }, []);

  const uploadOne = useCallback(async (item: QueueItem) => {
    mark(item.id, "working");
    try {
      const { full, thumb, width, height } = await processImage(item.file);
      const key = makeKey(item.file);
      const fullPath = `full/${key}.webp`;
      const thumbPath = `thumb/${key}.webp`;

      const [fullRes, thumbRes] = await Promise.all([
        supabase.storage.from(ZENGEN_BUCKET).upload(fullPath, full, {
          contentType: "image/webp", cacheControl: "31536000", upsert: false,
        }),
        supabase.storage.from(ZENGEN_BUCKET).upload(thumbPath, thumb, {
          contentType: "image/webp", cacheControl: "31536000", upsert: false,
        }),
      ]);
      if (fullRes.error) throw fullRes.error;
      if (thumbRes.error) throw thumbRes.error;

      const { error } = await supabase.from("zengen_images").insert({
        storage_path: fullPath,
        thumb_path: thumbPath,
        title: item.file.name.replace(/\.[^.]+$/, ""),
        collection_id: collectionId || null,
        width,
        height,
        bytes: full.size,
      });
      if (error) throw error;

      mark(item.id, "done");
    } catch (err) {
      mark(item.id, "failed", err instanceof Error ? err.message : "upload failed");
    }
  }, [collectionId, mark]);

  /** Fixed-size worker pool so a thousand-file drop stays polite. */
  const runQueue = useCallback(async () => {
    if (running) return;
    cancelled.current = false;
    setRunning(true);

    const pending = queue.filter((q) => q.status === "queued" || q.status === "failed");
    let cursor = 0;

    const worker = async () => {
      while (!cancelled.current) {
        const idx = cursor++;
        if (idx >= pending.length) return;
        await uploadOne(pending[idx]);
      }
    };

    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, pending.length) }, worker));

    setRunning(false);
    onUploaded();
  }, [queue, running, uploadOne, onUploaded]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  /* Portalled so the panel escapes the gallery's stacking context and
     lands above the page's fixed chrome. */
  return createPortal(
    <div className="zg-studio" role="dialog" aria-modal="true" aria-label="ZEN-GEN studio">
      <div className="zg-studio__panel">
        <header className="zg-studio__head">
          <div className="zg-studio__id">
            <span className="zg-studio__glyph">⌘</span>
            <div>
              <h3>ZEN-GEN STUDIO</h3>
              <span className="zg-studio__sub">
                {isOwner ? "owner session · write access granted" : "owner access required"}
              </span>
            </div>
          </div>
          <button type="button" className="zg-studio__close" onClick={onClose} disabled={running} aria-label="Close studio">
            <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M1 1l10 10M11 1L1 11" /></svg>
          </button>
        </header>

        <OwnerGate
          purpose="Upload and file ZEN-GEN generations."
          footNote={`signed in as ${session?.user.email ?? ""}`}
        >
          <div className="zg-studio__body">
            <div
              className={`zg-drop${dragging ? " zg-drop--over" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
            >
              <span className="zg-drop__glyph">⊕</span>
              <span className="zg-drop__title">Drop generations here</span>
              <span className="zg-drop__sub">
                or click to select · hundreds at a time · resized and converted to WebP in-browser
              </span>
              <button
                type="button"
                className="zg-drop__folder"
                onClick={(e) => { e.stopPropagation(); folderRef.current?.click(); }}
              >
                select a whole folder
              </button>
            </div>

            <input
              ref={fileRef} type="file" accept="image/*" multiple hidden
              onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }}
            />
            <input
              ref={folderRef} type="file" accept="image/*" multiple hidden
              /* Non-standard but supported in Chromium and Safari */
              {...({ webkitdirectory: "", directory: "" } as Record<string, string>)}
              onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }}
            />

            <div className="zg-studio__row">
              <label className="zg-studio__select">
                <span>Collection</span>
                <select value={collectionId} onChange={(e) => setCollectionId(e.target.value)}>
                  <option value="">— unfiled —</option>
                  {collections.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </label>

              <div className="zg-studio__actions">
                {queue.length > 0 && !running && (
                  <button type="button" className="cta-btn-muted" onClick={() => setQueue([])}>
                    Clear
                  </button>
                )}
                <button
                  type="button"
                  className="cta-btn"
                  onClick={running ? () => { cancelled.current = true; } : runQueue}
                  disabled={queue.length === 0 || (!running && stats.pending === 0)}
                >
                  {running ? "Stop" : `Upload ${stats.pending || ""}`.trim()}
                </button>
              </div>
            </div>

            {queue.length > 0 && (
              <>
                <div className="zg-progress">
                  <div
                    className="zg-progress__fill"
                    style={{ transform: `scaleX(${(stats.done / Math.max(1, stats.total)).toFixed(4)})` }}
                  />
                </div>
                <div className="zg-studio__counts">
                  <span>{stats.done} uploaded</span>
                  <span>{stats.pending} pending</span>
                  {stats.failed > 0 && <span className="is-fail">{stats.failed} failed</span>}
                </div>

                <ul className="zg-queue">
                  {queue.slice(0, 200).map((q) => (
                    <li key={q.id} className={`zg-queue__row is-${q.status}`}>
                      <span className="zg-queue__dot" aria-hidden />
                      <span className="zg-queue__name">{q.file.name}</span>
                      <span className="zg-queue__state">
                        {q.status === "failed" ? (q.error ?? "failed") : q.status}
                      </span>
                    </li>
                  ))}
                  {queue.length > 200 && (
                    <li className="zg-queue__row is-more">+{queue.length - 200} more queued</li>
                  )}
                </ul>
              </>
            )}

          </div>
        </OwnerGate>
      </div>
    </div>,
    document.body,
  );
}
