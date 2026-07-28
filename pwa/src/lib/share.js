import { POPPY_MARK_SRC } from "./constants.js";
import { toTitle } from "./format.js";

// --- Share as image -------------------------------------------------------
// Renders an outfit or collection (title + grid of item photos + item names + Poppy mark)
// to a single PNG, then hands it to the Web Share API. If the platform can't share
// files, falls back to downloading the PNG so the user can share it manually.
function _loadImage(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}
function _roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
function _drawContain(ctx, img, x, y, w, h) {
  if (!img || !img.naturalWidth) return;
  const r = Math.min(w / img.naturalWidth, h / img.naturalHeight);
  const dw = img.naturalWidth * r;
  const dh = img.naturalHeight * r;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}
function _drawCover(ctx, img, x, y, w, h) {
  if (!img || !img.naturalWidth) return;
  const r = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const dw = img.naturalWidth * r;
  const dh = img.naturalHeight * r;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  ctx.restore();
}
function _slug(s) {
  return (
    (s || "share")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "share"
  );
}
async function shareAsImage({
  title,
  subtitle,
  items,
  images,
  selfieUrl,
  accent,
  kindLabel,
  maxCols,
}) {
  const W = 1080;
  const PAD = 56;
  const capCols = maxCols || 3;
  // Pick a column count that keeps the grid roughly square so the export
  // doesn't end up much taller than it is wide for large collections.
  const n = items.length;
  let cols;
  if (n <= 1) cols = 1;
  else if (n <= 4) cols = Math.min(2, capCols);
  else if (n <= 9) cols = Math.min(3, capCols);
  else cols = Math.min(capCols, Math.ceil(Math.sqrt(n)));
  const gap = 20;
  const innerW = W - PAD * 2;
  const tileSize = Math.floor((innerW - gap * (cols - 1)) / cols);

  // Preload images so we can measure layout precisely.
  const pieceImgs = await Promise.all(
    items.map((it) => _loadImage(images[it.id])),
  );
  const selfieImg = selfieUrl ? await _loadImage(selfieUrl) : null;
  const markImg = await _loadImage(POPPY_MARK_SRC);

  // We'll lay out into a virtual canvas. Compute total height first.
  const ctxMeasure = document.createElement("canvas").getContext("2d");

  // Caption metrics (item name shown under each tile image) — scale down with denser grids
  const captionFontPx = cols >= 6 ? 13 : cols >= 5 ? 14 : cols >= 4 ? 16 : 18;
  const captionFont = `700 ${captionFontPx}px Nunito, sans-serif`;
  const captionLineH = Math.round(captionFontPx * 1.22);
  const captionPadY = cols >= 5 ? 10 : 14;
  const captionPadX = cols >= 5 ? 8 : 12;
  const maxCaptionLines = 2;
  ctxMeasure.font = captionFont;
  const wrapToLines = (text, maxW, maxLines) => {
    const words = text.split(/\s+/).filter(Boolean);
    const lines = [];
    let cur = "";
    for (const w of words) {
      const trial = cur ? cur + " " + w : w;
      if (ctxMeasure.measureText(trial).width <= maxW) {
        cur = trial;
      } else {
        if (cur) lines.push(cur);
        cur = w;
        if (lines.length >= maxLines) break;
      }
    }
    if (cur && lines.length < maxLines) lines.push(cur);
    if (lines.length > maxLines) lines.length = maxLines;
    // Truncate last line if we overflowed
    if (lines.length === maxLines) {
      let last = lines[maxLines - 1];
      const wordsLeft = words.length - words.indexOf(last.split(" ").pop()) - 1;
      if (wordsLeft > 0) {
        while (
          ctxMeasure.measureText(last + "…").width > maxW &&
          last.length > 1
        )
          last = last.slice(0, -1);
        lines[maxLines - 1] = last + "…";
      }
    }
    return lines.length ? lines : [""];
  };
  const captionInnerW = tileSize - captionPadX * 2;
  const captionData = items.map((it) =>
    wrapToLines(
      toTitle(it.name || "").toUpperCase(),
      captionInnerW,
      maxCaptionLines,
    ),
  );
  const maxLines = Math.max(1, ...captionData.map((l) => l.length));
  const captionH = captionPadY * 2 + maxLines * captionLineH;
  const tileTotalH = tileSize + captionH;

  const rows = Math.ceil(items.length / cols);
  const gridH = rows > 0 ? rows * tileTotalH + (rows - 1) * gap : 0;

  // Header heights
  const labelH = 36;
  const titleH = 78;
  const subtitleH = subtitle ? 56 : 0;
  const headerTop = PAD;
  const headerH = labelH + 8 + titleH + (subtitleH ? subtitleH + 6 : 0);

  // Selfie
  // Fit the selfie panel to the photo's aspect ratio (capped so very tall portraits don't dominate).
  let selfieH = 0;
  let selfiePanelW = innerW;
  if (selfieImg && selfieImg.naturalWidth && selfieImg.naturalHeight) {
    const maxH = 900;
    const minH = 420;
    const aspect = selfieImg.naturalWidth / selfieImg.naturalHeight; // w/h
    if (aspect >= 1) {
      // landscape — full width, height by aspect
      selfieH = Math.max(minH, Math.min(maxH, Math.round(innerW / aspect)));
      selfiePanelW = innerW;
    } else {
      // portrait — cap height, derive width
      selfieH = maxH;
      selfiePanelW = Math.min(innerW, Math.round(maxH * aspect));
    }
  } else if (selfieImg) {
    selfieH = 720;
  }
  const afterHeader = headerTop + headerH + 32;
  const gridTop = afterHeader + (selfieImg ? selfieH + 28 : 0);
  const footerTop = gridTop + gridH + 64;
  const footerH = 90;
  const H = footerTop + footerH + PAD;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = Math.max(H, 1200);
  const ctx = canvas.getContext("2d");

  // Background — cream
  ctx.fillStyle = "#FFFBF6";
  ctx.fillRect(0, 0, W, canvas.height);

  // Decorative wash
  const wash1 = ctx.createRadialGradient(W * 0.95, -60, 0, W * 0.95, -60, 700);
  wash1.addColorStop(0, "rgba(255, 90, 54, 0.18)");
  wash1.addColorStop(1, "rgba(255, 90, 54, 0)");
  ctx.fillStyle = wash1;
  ctx.fillRect(0, 0, W, canvas.height);
  const wash2 = ctx.createRadialGradient(
    -60,
    canvas.height + 60,
    0,
    -60,
    canvas.height + 60,
    800,
  );
  wash2.addColorStop(0, "rgba(247, 201, 72, 0.18)");
  wash2.addColorStop(1, "rgba(247, 201, 72, 0)");
  ctx.fillStyle = wash2;
  ctx.fillRect(0, 0, W, canvas.height);

  // Label
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = accent || "#EC4778";
  ctx.font = "800 22px Nunito, sans-serif";
  const label = (kindLabel || "LOOK").toUpperCase();
  ctx.fillText(label, PAD, headerTop + 24);

  // Title
  ctx.fillStyle = "#241A11";
  ctx.font = "800 64px Fraunces, Georgia, serif";
  ctx.fillText(toTitle(title || "Untitled"), PAD, headerTop + labelH + 8 + 60);

  // Subtitle (note / description)
  if (subtitle) {
    ctx.fillStyle = "#8F7060";
    ctx.font = "italic 600 26px Fraunces, Georgia, serif";
    let s = `"${subtitle}"`;
    // Truncate if too long
    const maxW = innerW;
    while (ctx.measureText(s).width > maxW && s.length > 10)
      s = s.slice(0, -2) + '…"';
    ctx.fillText(s, PAD, headerTop + labelH + 8 + titleH + 36);
  }

  // Selfie
  if (selfieImg) {
    const sy = afterHeader;
    const sx = PAD + Math.round((innerW - selfiePanelW) / 2);
    _roundRect(ctx, sx, sy, selfiePanelW, selfieH, 36);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();
    ctx.save();
    _roundRect(ctx, sx, sy, selfiePanelW, selfieH, 36);
    ctx.clip();
    _drawContain(ctx, selfieImg, sx, sy, selfiePanelW, selfieH);
    ctx.restore();
  }

  // Items grid — each tile = image square + caption underneath, inside one rounded card
  for (let i = 0; i < items.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = PAD + col * (tileSize + gap);
    const ty = gridTop + row * (tileTotalH + gap);

    // Card background
    _roundRect(ctx, x, ty, tileSize, tileTotalH, 28);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();
    ctx.strokeStyle = "#FFE7D1";
    ctx.lineWidth = 2;
    _roundRect(ctx, x, ty, tileSize, tileTotalH, 28);
    ctx.stroke();

    // Image area — inset scales with tile size
    const inset = cols >= 6 ? 10 : cols >= 5 ? 14 : cols >= 4 ? 18 : 22;
    _drawContain(
      ctx,
      pieceImgs[i],
      x + inset,
      ty + inset,
      tileSize - inset * 2,
      tileSize - inset * 2,
    );

    // Divider line between image and caption
    ctx.strokeStyle = "#FFE7D1";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + 16, ty + tileSize);
    ctx.lineTo(x + tileSize - 16, ty + tileSize);
    ctx.stroke();

    // Caption
    ctx.font = captionFont;
    ctx.fillStyle = "#36281B";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const lines = captionData[i];
    // Vertically center the lines block within the caption strip
    const blockH = lines.length * captionLineH;
    const startY = ty + tileSize + (captionH - blockH) / 2 + captionLineH / 2;
    for (let li = 0; li < lines.length; li++) {
      ctx.fillText(lines[li], x + tileSize / 2, startY + li * captionLineH);
    }
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }

  // Footer — Poppy mark + wordmark
  const fy = footerTop;
  const markSize = 68;
  if (markImg) ctx.drawImage(markImg, PAD, fy, markSize, markSize);
  ctx.fillStyle = "#FF5A36";
  ctx.font = "800 36px Fraunces, Georgia, serif";
  ctx.textBaseline = "middle";
  ctx.fillText("Poppy", PAD + markSize + 16, fy + markSize / 2 - 4);
  ctx.fillStyle = "#8F7060";
  ctx.font = "700 16px Nunito, sans-serif";
  ctx.fillText(
    "CULTIVATE YOUR CLOSET.",
    PAD + markSize + 16,
    fy + markSize / 2 + 22,
  );
  ctx.textBaseline = "alphabetic";

  // Convert to blob and share / download
  const blob = await new Promise((res) =>
    canvas.toBlob(res, "image/png", 0.95),
  );
  if (!blob) throw new Error("Could not render share image.");
  const filename = `poppy-${(kindLabel || "share").toLowerCase()}-${_slug(title)}.png`;
  const file = new File([blob], filename, { type: "image/png" });

  if (
    typeof navigator !== "undefined" &&
    navigator.canShare &&
    navigator.canShare({ files: [file] })
  ) {
    try {
      await navigator.share({
        files: [file],
        title: toTitle(title || "Poppy"),
        text: `${kindLabel || "Look"}: ${toTitle(title || "")}`,
      });
      return { ok: true, shared: true };
    } catch (err) {
      if (err && err.name === "AbortError")
        return { ok: true, shared: false, aborted: true };
      // fall through to download
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  return { ok: true, shared: false, downloaded: true };
}

export { shareAsImage };
