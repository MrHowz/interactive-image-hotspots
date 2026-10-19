import { useState } from "react";
import { allowed, data, marksShown } from "./model";
import {
  beginSelection,
  setMarks,
  openEditor,
  openViewer,
  remove,
} from "./sdk";
import { useScene } from "./useScene";
import { control } from "./control";
import { useSelection } from "./useSelection";
export function App() {
  const state = useScene();
  const selection = useSelection();
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
                  state.gm
                    ? beginSelection(state.scene)
                    : control("explore").then(() => {}),
                )
              }
            >
              {state.gm ? "+ Select cells" : "◎ Explore hotspots"}
            </button>
            {state.gm && (
              <button
                disabled={busy}
                onClick={() =>
                  void run(() => control("explore").then(() => {}))
                }
              >
                Explore
              </button>
            )}
          </div>
          {state.gm && selection.active && selection.scene === state.scene && (
            <div className="selection-status" role="status">
              <strong>{selection.count} cells selected</strong>
              <p>Click squares on the map, then finish here.</p>
              <div className="row">
                <button
                  className="primary"
                  disabled={busy || selection.count === 0}
                  onClick={() =>
                    void run(() => control("finish").then(() => {}))
                  }
                >
                  Done · choose image
                </button>
                <button
                  disabled={busy}
                  onClick={() =>
                    void run(() => control("cancel").then(() => {}))
                  }
                >
                  Cancel selection
                </button>
              </div>
            </div>
          )}
          <p className="hint">
            {state.gm
              ? "Select cells → click connected grid squares → Done in this panel → choose an image."
              : "Select Explore, then click a linked cell. Cells still work when their markings are hidden."}
          </p>
          {state.gm && state.items.length > 0 && (
            <button
              className="full"
              disabled={busy}
              aria-pressed={state.items.some(marksShown)}
              onClick={() =>
                void run(() =>
                  setMarks(
                    state.scene,
                    state.items.map((i) => i.id),
                    !state.items.some(marksShown),
                  ),
                )
              }
            >
              {state.items.some(marksShown)
                ? "Hide all markings"
                : "Show all markings"}
              <small>
                Only changes the fill and border. Cells stay clickable.
              </small>
            </button>
          )}
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
                          : d.version === 1 && !item.visible
                            ? "Hidden"
                            : !d.players
                              ? "GM only"
                              : d.marks === false
                                ? "Clickable · markings hidden"
                                : "Ready to explore"}{" "}
                        ·{" "}
                        {d.version === 2
                          ? `${d.cells.length} cells`
                          : "Legacy circle"}
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
                            disabled={busy}
                            onClick={() =>
                              void run(() =>
                                beginSelection(state.scene, item.id),
                              )
                            }
                          >
                            Reselect cells
                          </button>
                          <button
                            disabled={busy}
                            aria-label={`${marksShown(item) ? "Hide" : "Show"} markings for ${item.name}`}
                            onClick={() =>
                              void run(() =>
                                setMarks(
                                  state.scene,
                                  [item.id],
                                  !marksShown(item),
                                ),
                              )
                            }
                          >
                            {marksShown(item) ? "Hide marks" : "Show marks"}
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
                secret. Hiding markings keeps cells clickable. Turn Enabled off
                to disable interaction, or turn Players off for GM-only access.
              </p>
              <p>
                Hotspots are independent of fog. Disable regions that should not
                be revealed.
              </p>
            </details>
          )}
        </>
      )}
      <footer className="panel-footer">
        SCENE LINKS · PERSONAL IMAGE VIEWER · v1.1.1
      </footer>
    </main>
  );
}
