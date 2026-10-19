import { buildImageUpload } from "@owlbear-rodeo/sdk";
import { OBR, guard } from "./sdk";
import { imageUrl, validateFile } from "./model";
export function loadImage(url: string, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const abort = () => finish(new Error("Image loading canceled."));
    const timer = setTimeout(
      () =>
        finish(
          new Error("Image load timed out. Check the URL or source server."),
        ),
      20000,
    );
    function finish(error?: Error) {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      image.onload = null;
      image.onerror = null;
      image.src = "";
      if (error) reject(error);
      else resolve();
    }
    image.referrerPolicy = "no-referrer";
    if (signal?.aborted) {
      abort();
      return;
    }
    signal?.addEventListener("abort", abort, { once: true });
    image.onload = () => finish();
    image.onerror = () =>
      finish(
        new Error(
          "Image could not load. The URL may be private, expired, blocked by the source server, or restricted by browser policy.",
        ),
      );
    image.src = url;
  });
}
export async function chooseAsset(scene: string, search = "") {
  await guard(scene);
  const [asset] = await OBR.assets.downloadImages(false, search);
  await guard(scene);
  return asset ? imageUrl(asset.image.url) : undefined;
}
export async function upload(
  file: File,
  scene: string,
  active: () => boolean = () => true,
) {
  validateFile(file);
  await guard(scene);
  const copy = new File([await file.arrayBuffer()], file.name, {
    type: file.type,
  });
  if (!active()) return;
  await OBR.assets.uploadImages([buildImageUpload(copy).build()], "PROP");
  await guard(scene);
  if (!active()) return;
  // uploadImages returns void. Explicitly choose the durable asset after upload.
  return chooseAsset(scene, file.name.replace(/\.[^.]+$/, ""));
}
