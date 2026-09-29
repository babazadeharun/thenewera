"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Image as ImageIcon, Search, Trash2, Upload, Video, X } from "lucide-react";

type Media = {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  url: string;
  category: string;
  alt: string | null;
  createdAt: string;
};

type MediaSelectorProps = {
  open: boolean;
  title: string;
  value: Media | null;
  accept: "image" | "video";
  onClose: () => void;
  onSelect: (media: Media) => void;
  onClear: () => void;
  onUploadNewMedia: () => void;
};

const categories = ["", "HERO", "CREATORS", "PORTFOLIO", "CLIENTS", "SERVICES", "BLOG", "GENERAL"];

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function MediaSelector({ open, title, value, accept, onClose, onSelect, onClear, onUploadNewMedia }: MediaSelectorProps) {
  const [media, setMedia] = useState<Media[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("HERO");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadMedia = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      // HERO is the preferred category, but the empty value means all categories.
      if (category) params.set("category", category);
      const response = await fetch(`/api/admin/media?${params.toString()}`, { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to load media.");
      setMedia(Array.isArray(data.media) ? data.media : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load media.");
      setMedia([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    setQuery("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    void loadMedia();
    // loadMedia intentionally tracks the active modal/category state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, category]);

  const compatibleMedia = useMemo(
    () => media.filter((item) => accept === "image" ? item.mimeType.startsWith("image/") : item.mimeType.startsWith("video/")),
    [accept, media]
  );

  const visibleMedia = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return compatibleMedia;
    return compatibleMedia.filter((item) => `${item.originalName} ${item.filename} ${item.alt || ""}`.toLowerCase().includes(q));
  }, [compatibleMedia, query]);

  if (!open) return null;

  return (
    <div className="mediaSelectorBackdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="mediaSelectorModal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="mediaSelectorHeader">
          <div>
            <small>MEDIA LIBRARY</small>
            <h3>{title}</h3>
            <p>{accept === "image" ? "Choose an existing image from the database-backed Media Library." : "Choose an existing video from the database-backed Media Library."}</p>
          </div>
          <button className="mediaSelectorClose" type="button" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>

        <div className="mediaSelectorToolbar">
          <label className="mediaSelectorSearch"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search filename or alt text" /></label>
          <select value={category} onChange={(event) => { setCategory(event.target.value); setTimeout(() => void loadMedia(), 0); }}>
            <option value="">All categories</option>
            {categories.filter(Boolean).map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <button type="button" onClick={() => void loadMedia()} disabled={loading}>{loading ? "Refreshing…" : "Refresh"}</button>
        </div>

        <div className="mediaSelectorActions">
          <span>{visibleMedia.length} compatible {accept === "image" ? "images" : "videos"}</span>
          <button type="button" onClick={onUploadNewMedia}><Upload size={14} /> Upload new media</button>
        </div>

        {error && <div className="mediaSelectorError">{error}</div>}

        {value && (
          <div className="mediaSelectorSelected">
            <div className="mediaSelectorSelectedPreview">
              {value.mimeType.startsWith("image/") ? <img src={value.url} alt={value.alt || value.originalName} /> : <video src={value.url} controls preload="metadata" />}
            </div>
            <div className="mediaSelectorSelectedInfo"><small>Currently selected</small><strong>{value.originalName}</strong><span>{value.category} · {formatSize(value.size)}</span></div>
            <button type="button" className="mediaSelectorRemove" onClick={onClear}><Trash2 size={14} /> Remove</button>
          </div>
        )}

        {!loading && !visibleMedia.length && (
          <div className="mediaSelectorEmpty">
            {accept === "image" ? <ImageIcon size={28} /> : <Video size={28} />}
            <strong>No media available</strong>
            <span>{category === "HERO" ? "No compatible HERO media was found. Try All categories or upload media first." : "Upload media first, then return here to select it."}</span>
            <button type="button" onClick={onUploadNewMedia}><Upload size={14} /> Upload media first</button>
          </div>
        )}

        <div className="mediaSelectorGrid">
          {visibleMedia.map((item) => {
            const selected = item.id === value?.id;
            return (
              <button key={item.id} type="button" className={`mediaSelectorCard${selected ? " selected" : ""}`} onClick={() => { onSelect(item); onClose(); }}>
                <div className="mediaSelectorThumb">
                  {item.mimeType.startsWith("image/") ? <img src={item.url} alt={item.alt || item.originalName} /> : <video src={item.url} preload="metadata" muted />}
                  {selected && <span className="mediaSelectorCheck"><Check size={13} /></span>}
                </div>
                <span className="mediaSelectorCardName" title={item.originalName}>{item.originalName}</span>
                <span className="mediaSelectorCardMeta">{item.category} · {formatSize(item.size)}{item.width && item.height ? ` · ${item.width}×${item.height}` : ""}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
