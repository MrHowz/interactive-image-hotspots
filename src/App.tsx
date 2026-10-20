import { useRef, useState } from "react";
import { allowed, data, linkTitle } from "./model";
import { openEditor, openViewer, remove } from "./sdk";
import { useScene } from "./useScene";
export function App() {
  const state = useScene();
  const [error, setError] = useState("");
  const [pending, setPending] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const run = async (fn: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to update image link.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const selected = state.items.filter((i) => state.selected.includes(i.id));
  const target = selected.length === 1 ? selected[0] : undefined;
  const links = state.items.filter((i) => data(i) && allowed(i, state.gm));
  return (
    <main className="panel">
      <header>
        <div className="brand">
          <span className="brand-mark">◎</span>
          <span className="badge">{state.gm ? "GAME MASTER" : "PLAYER"}</span>
        </div>
        <h1>
          Image Links<span className="accent">.</span>
        </h1>
        <p>A story behind every object.</p>
      </header>
      {(error || state.error) && (
        <p role="alert" className="error">
          {error || state.error}
        </p>
      )}
      {!state.connected ? (
        <div className="empty" role="status">
          Connecting to Owlbear Rodeo…
          <small>Open this extension inside a room.</small>
        </div>
      ) : !state.ready ? (
        <div className="empty">Open a scene to begin.</div>
      ) : (
        <>
          <section
            className="selection-status"
            aria-label="Selected map object"
          >
            <div className="eyebrow">SELECTED ON MAP</div>
            <h2>
              {target
                ? target.name || "Untitled object"
                : selected.length
                  ? `${selected.length} objects selected`
                  : "Select a token or drawing"}
            </h2>
            <p>
              {target
                ? `${target.type.toLowerCase()} · ${data(target) ? "Image linked" : "Ready to link"}`
                : "Use Owlbear’s Select tool, then select one existing map object."}
            </p>
            <div className="row">
              {state.gm && (
                <button
                  className="primary"
                  disabled={busy || !target || !state.scene}
                  onClick={() =>
                    target && void run(() => openEditor(state.scene, target.id))
                  }
                >
                  {target && data(target) ? "Edit image link" : "Link image"}
                </button>
              )}
              {target && data(target) && allowed(target, state.gm) && (
                <button
                  disabled={busy}
                  onClick={() =>
                    void run(() => openViewer(target.id, state.scene))
                  }
                >
                  Open image
                </button>
              )}
            </div>
          </section>
          <p className="hint">
            {state.gm
              ? "Select one object → Link image → Save. You can also use Link / edit image in the object’s selection menu."
              : "Select a linked object and choose Open linked image in its selection menu, or open an image below."}
          </p>
          <div className="list-heading">
            <h2>Linked in this scene</h2>
            <span>{links.length}</span>
          </div>
          {!links.length ? (
            <div className="empty">
              <span className="empty-icon">◎</span>
              <h2>No image links yet</h2>
              <p>
                {state.gm
                  ? "Link a portrait to a token, or a clue to a drawing. Move the object and the link follows."
                  : "Your GM can link images to map objects."}
              </p>
            </div>
          ) : (
            <div className="hotspot-list">
              {links.map((item) => {
                const d = data(item)!;
                const title = linkTitle(item);
                return (
                  <article className="hotspot" key={item.id}>
                    <button
                      className="thumbnail"
                      aria-label={`View ${title}`}
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
                      />
                    </button>
                    <div className="hotspot-info">
                      <button
                        className="name"
                        disabled={busy}
                        onClick={() =>
                          void run(() => openViewer(item.id, state.scene))
                        }
                      >
                        {title}
                      </button>
                      <small>
                        {item.name || "Untitled object"} ·{" "}
                        {item.type.toLowerCase()}
                      </small>
                      <small>
                        {!d.enabled
                          ? "Disabled for players"
                          : !item.visible
                            ? "Object hidden"
                            : !d.players
                              ? "GM only"
                              : "Players can open"}
                        {d.version !== 3 ? " · Legacy hotspot" : ""}
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
                            Unlink
                          </button>
                        </div>
                      )}
                    </div>
                    {pending === item.id && (
                      <div className="confirmation" role="alert">
                        <span>
                          Remove the image link? The map object stays.
                        </span>
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
                          Confirm unlink
                        </button>
                        <button disabled={busy} onClick={() => setPending("")}>
                          Keep link
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
          <details className="notes">
            <summary>How links & permissions work</summary>
            <p>
              Links are stored on shared map objects. Unlink removes only the
              image link. Object appearance and movement stay under Owlbear’s
              normal controls. Hidden objects cannot be opened by players
              through this extension.
            </p>
            <p>
              GM-only editing is enforced by this extension. Owlbear item
              permissions still apply: players who can edit an object may alter
              its shared metadata. Image URLs are not secret; fog does not
              automatically restrict this list.
            </p>
          </details>
        </>
      )}
      <footer className="panel-footer">
        OBJECT LINKS · PERSONAL IMAGE VIEWER · v2.0.0
      </footer>
    </main>
  );
}
