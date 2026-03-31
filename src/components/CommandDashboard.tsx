import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Image, Video, Code, GripVertical, X, Upload, Check } from "lucide-react";

type ItemType = "image" | "video" | "code";

interface GalleryItem {
  id: string;
  type: ItemType;
  title: string;
  description: string;
  storage_path: string | null;
  external_url: string | null;
  code_content: string | null;
  code_language: string | null;
  sort_order: number;
}

interface CommandDashboardProps {
  open: boolean;
  onClose: () => void;
}

export default function CommandDashboard({ open, onClose }: CommandDashboardProps) {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [adding, setAdding] = useState<ItemType | null>(null);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [codeContent, setCodeContent] = useState("");
  const [codeLanguage, setCodeLanguage] = useState("javascript");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const { data } = await supabase
      .from("gallery_items")
      .select("*")
      .order("sort_order", { ascending: true });
    if (data) setItems(data as GalleryItem[]);
  };

  useEffect(() => {
    if (open) load();
  }, [open]);

  const resetForm = () => {
    setAdding(null);
    setTitle("");
    setDescription("");
    setExternalUrl("");
    setCodeContent("");
    setCodeLanguage("javascript");
    setSelectedFile(null);
  };

  const handleSubmit = async () => {
    if (!adding) return;
    setUploading(true);

    try {
      let storagePath: string | null = null;

      if (selectedFile && (adding === "image" || adding === "video")) {
        const ext = selectedFile.name.split(".").pop();
        const path = `gallery/${adding}-${Date.now()}.${ext}`;
        const { error } = await supabase.storage
          .from("portfolio")
          .upload(path, selectedFile, { upsert: true });
        if (error) throw error;
        storagePath = path;
      }

      await supabase.from("gallery_items").insert({
        type: adding,
        title,
        description,
        storage_path: storagePath,
        external_url: externalUrl || null,
        code_content: adding === "code" ? codeContent : null,
        code_language: adding === "code" ? codeLanguage : null,
        sort_order: items.length,
      });

      resetForm();
      load();
    } catch (err) {
      console.error("Failed to add item:", err);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, storagePath: string | null) => {
    if (storagePath) {
      await supabase.storage.from("portfolio").remove([storagePath]);
    }
    await supabase.from("gallery_items").delete().eq("id", id);
    load();
  };

  const getThumb = (item: GalleryItem) => {
    if (item.storage_path) {
      return supabase.storage.from("portfolio").getPublicUrl(item.storage_path).data.publicUrl;
    }
    return null;
  };

  if (!open) return null;

  return (
    <div className="cmd-overlay" onClick={onClose}>
      <div className="cmd-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="cmd-header">
          <h2 className="font-mono text-[0.65rem] tracking-[0.25em] uppercase text-foreground/80">
            Command Dashboard
          </h2>
          <button onClick={onClose} className="cmd-close">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Add buttons */}
        {!adding && (
          <div className="cmd-add-row">
            <button onClick={() => setAdding("image")} className="cmd-type-btn">
              <Image className="w-3.5 h-3.5" />
              <span>Image</span>
            </button>
            <button onClick={() => setAdding("video")} className="cmd-type-btn">
              <Video className="w-3.5 h-3.5" />
              <span>Video</span>
            </button>
            <button onClick={() => setAdding("code")} className="cmd-type-btn">
              <Code className="w-3.5 h-3.5" />
              <span>Code</span>
            </button>
          </div>
        )}

        {/* Add form */}
        {adding && (
          <div className="cmd-form">
            <div className="cmd-form-header">
              <span className="font-mono text-[0.55rem] tracking-widest uppercase text-muted-foreground">
                Add {adding}
              </span>
              <button onClick={resetForm} className="text-muted-foreground/40 hover:text-foreground/60 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <input
              type="text"
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="cmd-input"
            />
            <input
              type="text"
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="cmd-input"
            />

            {(adding === "image" || adding === "video") && (
              <>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="cmd-upload-btn"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{selectedFile ? selectedFile.name : `Choose ${adding} file`}</span>
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept={adding === "image" ? "image/*" : "video/*"}
                  className="hidden"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
                <input
                  type="text"
                  placeholder="Or paste external URL"
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  className="cmd-input"
                />
              </>
            )}

            {adding === "code" && (
              <>
                <select
                  value={codeLanguage}
                  onChange={(e) => setCodeLanguage(e.target.value)}
                  className="cmd-input"
                >
                  <option value="javascript">JavaScript</option>
                  <option value="typescript">TypeScript</option>
                  <option value="python">Python</option>
                  <option value="html">HTML</option>
                  <option value="css">CSS</option>
                  <option value="rust">Rust</option>
                  <option value="go">Go</option>
                  <option value="sql">SQL</option>
                </select>
                <textarea
                  placeholder="Paste your code here..."
                  value={codeContent}
                  onChange={(e) => setCodeContent(e.target.value)}
                  className="cmd-textarea"
                  rows={8}
                />
                <input
                  type="text"
                  placeholder="Live demo URL (optional)"
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  className="cmd-input"
                />
              </>
            )}

            <button
              onClick={handleSubmit}
              disabled={uploading || (!selectedFile && !externalUrl && !codeContent)}
              className="cmd-submit"
            >
              {uploading ? (
                <div className="w-3.5 h-3.5 border-2 border-background/30 border-t-background rounded-full animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              <span>{uploading ? "Uploading..." : "Add item"}</span>
            </button>
          </div>
        )}

        {/* Item list */}
        <div className="cmd-list">
          {items.length === 0 && (
            <div className="text-center py-8 text-muted-foreground/30 font-mono text-[0.55rem] tracking-widest uppercase">
              Empty gallery
            </div>
          )}
          {items.map((item) => (
            <div key={item.id} className="cmd-item">
              <div className="cmd-item-grip">
                <GripVertical className="w-3 h-3 text-muted-foreground/20" />
              </div>
              <div className="cmd-item-thumb">
                {item.type === "image" && getThumb(item) && (
                  <img src={getThumb(item)!} alt="" className="w-full h-full object-cover" />
                )}
                {item.type === "video" && (
                  <Video className="w-4 h-4 text-muted-foreground/40" />
                )}
                {item.type === "code" && (
                  <Code className="w-4 h-4 text-muted-foreground/40" />
                )}
              </div>
              <div className="cmd-item-info">
                <span className="font-mono text-[0.55rem] tracking-wider text-foreground/70">
                  {item.title || item.type}
                </span>
                <span className="text-[0.5rem] text-muted-foreground/40 uppercase tracking-wider">
                  {item.type}
                </span>
              </div>
              <button
                onClick={() => handleDelete(item.id, item.storage_path)}
                className="cmd-item-delete"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
