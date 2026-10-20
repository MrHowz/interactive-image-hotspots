import { parseArea } from "./areas";
import { useEffect, useRef, useState } from "react";
import {
  NS,
  data,
  linkTitle,
  imageUrl,
  validateFile,
  type LinkDraft,
} from "./model";
import { OBR, save } from "./sdk";
import { chooseAsset, loadImage, upload } from "./images";
import { useScene } from "./useScene";
export function Editor({ params }: { params: URLSearchParams }) {
  const state = useScene();
  const scene = params.get("scene") || "";
  const id = params.get("id") || "";
  const pendingArea = parseArea(params.get("area"));
  const [transform, setTransform] = useState({
    x: pendingArea?.position.x ?? 0,
    y: pendingArea?.position.y ?? 0,
    scaleX: 1,
    scaleY: 1,
  });
  const isArea =
    !!pendingArea ||
    data(
      state.items.find((i) => i.id === id) ??
        ({ metadata: {} } as import("@owlbear-rodeo/sdk").Item),
    )?.version === 4;
  const [draft, setDraft] = useState<LinkDraft>({
    name: "",
    url: "",
    enabled: true,
    players: true,
    gmMarks: true,
    playerMarks: false,
  });
  const [loaded, setLoaded] = useState(!!pendingArea);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState("");
  const [verified, setVerified] = useState("");
  const [file, setFile] = useState<File>();
  const [filePreview, setFilePreview] = useState("");
  const lock = useRef(false);
  const request = useRef(0);
  const mounted = useRef(true);
  const imageRequest = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      mounted.current = false;
      request.current++;
      imageRequest.current?.abort();
    },
    [],
  );
  useEffect(() => {
    if (!file) {
      setFilePreview("");
      return;
    }
    const u = URL.createObjectURL(file);
    setFilePreview(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  useEffect(() => {
    if (loaded || !state.ready || state.scene !== scene) return;
    const item = state.items.find((i) => i.id === id);
    if (item) {
      const d = data(item);
      setDraft({
        name: linkTitle(item),
        url: d?.url ?? "",
        enabled: d?.enabled ?? true,
        players: d?.players ?? true,
        gmMarks: d?.version === 4 ? d.gmMarks : true,
        playerMarks: d?.version === 4 ? d.playerMarks : false,
      });
      setTransform({
        x: item.position.x,
        y: item.position.y,
        scaleX: item.scale.x,
        scaleY: item.scale.y,
      });
      setPreview(d?.url ?? "");
      setLoaded(true);
    }
  }, [state, loaded, id, scene]);
  const valid = state.ready && state.gm && state.scene === scene && !!scene;
  const change = <K extends keyof LinkDraft>(key: K, value: LinkDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));
  const run = async (action: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (e) {
      if (mounted.current)
        setError(e instanceof Error ? e.message : "Unable to save.");
    } finally {
      lock.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  const verify = async (raw: string) => {
    const token = ++request.current;
    const url = imageUrl(raw);
    imageRequest.current?.abort();
    imageRequest.current = new AbortController();
    await loadImage(url, imageRequest.current.signal);
    if (token !== request.current || !mounted.current) return;
    change("url", url);
    setPreview(url);
    setVerified(url);
  };
  return (
    <main className="editor">
      <header>
        <div className="eyebrow">SCENE HANDOUT</div>
        <h1>{isArea ? "Image area" : "Link image to object"}</h1>
        <p>Choose an image to open with one click using Explore.</p>
        {state.items.find((item) => item.id === id) && (
          <p className="attachment-name">
            Attached to:{" "}
            {state.items.find((item) => item.id === id)!.name ||
              "Untitled object"}
          </p>
        )}
      </header>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {state.error && (
        <p role="alert" className="error">
          {state.error}
        </p>
      )}
      {state.connected && !valid && (
        <p role="alert" className="error">
          GM access to the original scene is required. Close this window and
          reopen from the current scene.
        </p>
      )}
      {valid && id && !state.items.some((item) => item.id === id) && (
        <p className="error" role="alert">
          This object no longer exists. Close the editor and select another
          object.
        </p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            await verify(draft.url);
            if (!mounted.current) return;
            await save(
              scene,
              draft,
              id,
              pendingArea,
              isArea ? transform : undefined,
            );
            await OBR.modal.close(`${NS}/editor`);
          });
        }}
      >
        <fieldset
          disabled={
            !valid ||
            busy ||
            !loaded ||
            (!pendingArea && !state.items.some((item) => item.id === id))
          }
        >
          <label>
            Name
            <input
              autoFocus
              required
              maxLength={100}
              value={draft.name}
              placeholder="The forgotten shrine"
              onChange={(e) => change("name", e.target.value)}
            />
          </label>
          <div className="source">
            <div className="section-title">LINK AN IMAGE</div>
            <label>
              HTTPS image URL
              <input
                type="url"
                required
                value={draft.url}
                placeholder="https://…/image.webp"
                onChange={(e) => {
                  request.current++;
                  change("url", e.target.value);
                  setVerified("");
                }}
              />
            </label>
            <button
              type="button"
              onClick={() => void run(() => verify(draft.url))}
            >
              Preview URL
            </button>
            <span className="or">or use your Owlbear library</span>
            <div className="row">
              <label className="button file-button">
                Choose file
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (!f) return;
                    try {
                      validateFile(f);
                      setFile(f);
                      setError("");
                    } catch (err) {
                      setError((err as Error).message);
                    }
                  }}
                />
              </label>
              <button
                type="button"
                onClick={() =>
                  void run(async () => {
                    const url = await chooseAsset(scene);
                    if (url) await verify(url);
                  })
                }
              >
                Browse Assets
              </button>
            </div>
            {file && (
              <div className="upload">
                <img src={filePreview || undefined} alt="Selected local file preview" />
                <span>{file.name}</span>
                <button
                  type="button"
                  onClick={() =>
                    void run(async () => {
                      const url = await upload(
                        file,
                        scene,
                        () => mounted.current,
                      );
                      if (url) {
                        await verify(url);
                        setFile(undefined);
                      }
                    })
                  }
                >
                  Upload & choose
                </button>
                <button type="button" onClick={() => setFile(undefined)}>
                  Cancel
                </button>
              </div>
            )}
            <small>
              PNG, JPG, WebP or GIF · up to 20 MB. After upload, select the
              saved image in Owlbear’s picker.
            </small>
          </div>
          {preview && (
            <div className="preview">
              <img
                src={preview}
                alt="Linked image preview"
                referrerPolicy="no-referrer"
                onError={() => {
                  setVerified("");
                  setError("Preview unavailable. Check the image source.");
                }}
              />
              <span>
                {verified === draft.url
                  ? "Image ready"
                  : "Preview · verify before saving"}
              </span>
            </div>
          )}
          {isArea && (
            <section className="area-settings">
              <h2>Area appearance</h2>
              <label className="check">
                <input
                  type="checkbox"
                  checked={draft.gmMarks ?? true}
                  onChange={(e) => change("gmMarks", e.target.checked)}
                />
                Show border to GM
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  checked={draft.playerMarks ?? false}
                  onChange={(e) => change("playerMarks", e.target.checked)}
                />
                Show border to players
              </label>
              <small>Hiding the border keeps the entire area clickable.</small>
              <div className="coordinates">
                {(["x", "y", "scaleX", "scaleY"] as const).map((key) => (
                  <label key={key}>
                    {key}
                    <input
                      type="number"
                      step="any"
                      required
                      value={transform[key]}
                      onChange={(e) =>
                        setTransform((t) => ({
                          ...t,
                          [key]: e.target.valueAsNumber,
                        }))
                      }
                    />
                  </label>
                ))}
              </div>
            </section>
          )}
          <label className="check">
            <input
              type="checkbox"
              checked={draft.enabled}
              onChange={(e) => change("enabled", e.target.checked)}
            />
            Enabled
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={draft.players}
              onChange={(e) => change("players", e.target.checked)}
            />
            Players may open this image
          </label>
          <button className="primary full" type="submit">
            {busy ? "Working…" : "Save image link"}
          </button>
        </fieldset>
      </form>
      <button
        className="full"
        disabled={busy}
        onClick={() => void OBR.modal.close(`${NS}/editor`)}
      >
        Close
      </button>
    </main>
  );
}
