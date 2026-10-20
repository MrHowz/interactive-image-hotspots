import { useEffect, useRef, useState } from "react";
import { NS, allowed, data, linkTitle } from "./model";
import { OBR } from "./sdk";
import { useScene } from "./useScene";
export function Viewer({ params }: { params: URLSearchParams }) {
  const state = useScene();
  const item = state.items.find((i) => i.id === params.get("id"));
  const available =
    state.ready &&
    state.scene === params.get("scene") &&
    item &&
    allowed(item, state.gm);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [imageState, setImageState] = useState({ url: "", status: "loading" });
  const [retry, setRetry] = useState(0);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ distance: number; zoom: number } | null>(null);
  const url = item ? data(item)?.url : "";
  const status = imageState.url === url ? imageState.status : "loading";
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [url]);
  useEffect(() => {
    if (!url) return;
    const timer = setTimeout(
      () =>
        setImageState((s) =>
          s.url === url && s.status === "ready" ? s : { url, status: "error" },
        ),
      20000,
    );
    return () => clearTimeout(timer);
  }, [url, retry]);
  const close = () => OBR.modal.close(`${NS}/viewer`);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") void OBR.modal.close(`${NS}/viewer`);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  const scale = (v: number) => setZoom(Math.max(0.25, Math.min(8, v)));
  return (
    <main className="viewer">
      <header className="viewer-bar">
        <div>
          <div className="eyebrow">IMAGE HOTSPOTS</div>
          <h1>{available ? linkTitle(item) : "Image unavailable"}</h1>
        </div>
        <button
          autoFocus
          onClick={() => void close()}
          aria-label="Close image viewer"
        >
          ✕
        </button>
      </header>
      {!available ? (
        <div className="viewer-message" role="status">
          {state.connected
            ? "This image is unavailable in the current scene or your access has changed."
            : "Connecting to scene…"}
        </div>
      ) : (
        <>
          <div
            className="canvas"
            onWheel={(e) => {
              scale(zoom * Math.exp(-e.deltaY * 0.002));
            }}
            onPointerDown={(e) => {
              if ((e.target as Element).closest("button")) return;
              e.currentTarget.setPointerCapture(e.pointerId);
              pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
              if (pointers.current.size === 2) {
                const [a, b] = [...pointers.current.values()];
                gesture.current = {
                  distance: Math.hypot(a.x - b.x, a.y - b.y),
                  zoom,
                };
              }
            }}
            onPointerMove={(e) => {
              const previous = pointers.current.get(e.pointerId);
              if (!previous) return;
              pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
              if (pointers.current.size === 2 && gesture.current) {
                const [a, b] = [...pointers.current.values()];
                scale(
                  (gesture.current.zoom * Math.hypot(a.x - b.x, a.y - b.y)) /
                    Math.max(1, gesture.current.distance),
                );
              } else if (pointers.current.size === 1) {
                setPan((p) => ({
                  x: p.x + e.clientX - previous.x,
                  y: p.y + e.clientY - previous.y,
                }));
              }
            }}
            onPointerUp={(e) => {
              pointers.current.delete(e.pointerId);
              gesture.current = null;
            }}
            onPointerCancel={(e) => {
              pointers.current.delete(e.pointerId);
              gesture.current = null;
            }}
            onLostPointerCapture={(e) => {
              pointers.current.delete(e.pointerId);
              gesture.current = null;
            }}
          >
            {status === "loading" && (
              <div className="viewer-message" role="status">
                Loading image…
              </div>
            )}
            {status === "error" && (
              <div className="viewer-message error" role="alert">
                Unable to load image. The source may be unavailable, expired or
                block embedding.
                <button
                  onClick={() => {
                    setImageState({ url: url || "", status: "loading" });
                    setRetry((n) => n + 1);
                  }}
                >
                  Retry
                </button>
              </div>
            )}
            <img
              key={`${url}/${retry}`}
              className="full-image"
              src={url}
              alt={linkTitle(item)}
              draggable={false}
              referrerPolicy="no-referrer"
              onLoad={() => setImageState({ url: url || "", status: "ready" })}
              onError={() => setImageState({ url: url || "", status: "error" })}
              style={{
                transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`,
                visibility: status === "ready" ? "visible" : "hidden",
              }}
            />
          </div>
          <footer className="viewer-controls">
            <button onClick={() => scale(zoom / 1.25)} aria-label="Zoom out">
              −
            </button>
            <output aria-live="polite">{Math.round(zoom * 100)}%</output>
            <button onClick={() => scale(zoom * 1.25)} aria-label="Zoom in">
              +
            </button>
            <button
              onClick={() => {
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
            >
              Reset
            </button>
            <span>Drag to pan · pinch or scroll to zoom</span>
          </footer>
        </>
      )}
    </main>
  );
}
