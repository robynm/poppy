// Detect WebP encode support once. Some old WebViews don't support it; fall back to JPEG.
const SUPPORTS_WEBP = (() => {
  try {
    const c = document.createElement("canvas");
    c.width = c.height = 1;
    return c.toDataURL("image/webp").startsWith("data:image/webp");
  } catch {
    return false;
  }
})();

// Resize and re-encode an image to a Blob. WebP by default (handles transparency
// at ~30–50% the size of JPEG/PNG); JPEG fallback for ancient browsers.
async function resizeImageToBlob(source, maxDim = 640, quality = 0.85) {
  // `source` may be a File, a Blob, or a data URL string.
  const srcUrl =
    typeof source === "string" ? source : URL.createObjectURL(source);
  try {
    const img = await new Promise((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = reject;
      im.src = srcUrl;
    });
    const longest = Math.max(img.width, img.height);
    const scale = longest > maxDim ? maxDim / longest : 1;
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d").drawImage(img, 0, 0, w, h);
    const type = SUPPORTS_WEBP ? "image/webp" : "image/jpeg";
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, type, quality),
    );
    return blob; // may be null if encoding failed; callers handle that.
  } finally {
    if (typeof source !== "string") URL.revokeObjectURL(srcUrl);
  }
}

// data URL <-> Blob conversion, for backup compatibility (backups stay JSON).
function dataUrlToBlob(dataUrl) {
  const [meta, b64] = dataUrl.split(",");
  const mime = (meta.match(/data:([^;]+)/) || [, "image/jpeg"])[1];
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}
function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

export { SUPPORTS_WEBP, resizeImageToBlob, dataUrlToBlob, blobToDataUrl };
