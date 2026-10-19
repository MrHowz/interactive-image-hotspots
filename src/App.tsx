import { useState } from "react";
import { TOOL, VIEW, PLACE, allowed, data } from "./model";
import { OBR, openEditor, openViewer, remove } from "./sdk";
import { useScene } from "./useScene";
export function App() {
  const state = useScene();
  const [error, setError] = useState("");
  const [pending, setPending] = useState("");
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Operation failed.");
    } finally {
      setBusy(false);
    }
  };
  const items = state.items.filter((i) => allowed(i, state.gm));
  return (
    <main className="panel">
      <header>
        <div className="brand">
          <span className="brand-mark">◎</span>
          <span className="badge">{state.gm ? "GAME MASTER" : "EXPLORER"}</span>
        </div>
        <h1>
          Image Hotspots<span className="accent">.</span>
        </h1>
        <p>Give every place a story.</p>
      </header>
      {(error || state.error) && (
        <p className="error" role="alert">
          {error || state.error}
        </p>
      )}
      {!state.connected ? (
        <div className="empty" role="status">
          Connecting to Owlbear Rodeo…
          <small>Open this extension inside an Owlbear room.</small>
        </div>
      ) : !state.ready ? (
        <div className="empty">Open a scene to begin.</div>
      ) : (
        <>
          <div className="toolbar">
            <button
              className="primary"
              disabled={busy || !state.scene}
              onClick={() =>
                void run(() =>
                  OBR.tool.activateMode(TOOL, state.gm ? PLACE : VIEW),
                )
              }
            >
              {state.gm ? "+ Place hotspot" : "◎ Explore hotspots"}
            </button>
            {state.gm && (
              <button
                disabled={busy}
                onClick={() =>
                  void run(() => OBR.tool.activateMode(TOOL, VIEW))
                }
              >
                Explore
              </button>
            )}
          </div>
          <p className="hint">
            {state.gm
              ? "Place hotspot → click a point on the map → choose an image."
              : "Select Explore, then click a visible circle on the map."}
          </p>
          <div className="list-heading">
            <h2>{state.gm ? "In this scene" : "Available images"}</h2>
            <span>{items.length}</span>
          </div>
          {!items.length ? (
            <div className="empty">
              <span className="empty-icon">◎</span>
              <h2>
                {state.gm
                  ? "Your scene has stories to tell"
                  : "No images to explore yet"}
              </h2>
              <p>
                {state.gm
                  ? "Place your first hotspot to reveal a portrait, a clue or a whole new view."
                  : "Your GM can add image hotspots to this scene."}
              </p>
            </div>
          ) : (
            <div className="hotspot-list">
              {items.map((item) => {
                const d = data(item)!;
                return (
                  <article className="hotspot" key={item.id}>
                    <button
                      className="thumbnail"
                      aria-label={`View ${item.name}`}
                      disabled={busy}
                      onClick={() =>
                        void run(() => openViewer(item.id, state.scene))
                      }
                    >
                      <img
                        loading="lazy"
                        src={d.url}
                        alt=""
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.style.visibility = "hidden";
                        }}
                      />
                    </button>
                    <div className="hotspot-info">
                      <button
                        className="name"
                        onClick={() =>
                          void run(() => openViewer(item.id, state.scene))
                        }
                      >
                        {item.name}
                      </button>
                      <small>
                        {!d.enabled
                          ? "Disabled"
                          : !item.visible
                            ? "Hidden"
                            : !d.players
                              ? "GM only"
                              : "Ready to explore"}{" "}
                        ·{" "}
                        {Math.round((item.width * Math.abs(item.scale.x)) / 2)}{" "}
                        px
                      </small>
                      {state.gm && (
                        <div className="item-actions">
                          <button
                            disabled={busy}
                            onClick={() =>
                              void run(() => openEditor(state.scene, item.id))
                            }
                          >
                            Edit
                          </button>
                          <button
                            className="danger"
                            disabled={busy}
                            onClick={() => setPending(item.id)}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                    {pending === item.id && (
                      <div className="confirmation" role="alert">
                        <span>Delete “{item.name}”?</span>
                        <button
                          className="danger"
                          disabled={busy}
                          onClick={() =>
                            void run(async () => {
                              await remove(state.scene, item.id);
                              setPending("");
                            })
                          }
                        >
                          Delete hotspot
                        </button>
                        <button onClick={() => setPending("")}>Keep</button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
          {state.gm && (
            <details className="notes">
              <summary>Room permissions & image privacy</summary>
              <p>
                Disable player MAP create, update and delete permissions in room
                settings. Hotspots use locked MAP items. Shared URLs are not
                secret; hiding a point prevents interaction, not access to its
                metadata.
              </p>
              <p>
                Hotspots are independent of fog. Hide or disable points that
                should not be revealed.
              </p>
            </details>
          )}
        </>
      )}
      <footer className="panel-footer">
        SCENE LINKS · PERSONAL IMAGE VIEWER
      </footer>
    </main>
  );
}
