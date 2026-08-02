import { useState } from "react";

// Portrait frame aspect (width / height) that snaps are cropped to.
const FRAME_ASPECT = 1 / 2;

// x/y focal are stored 0..1. Guard older data that used 0..100.
function focal(v) {
  if (v == null) return 0.5;
  return v > 1 ? v / 100 : v;
}

// The image size (as % of the frame) that exactly *covers* the frame, given the
// image's natural aspect ratio. One dimension is 100%, the other overflows.
function coverDims(aspect) {
  return aspect > FRAME_ASPECT
    ? { w: (aspect / FRAME_ASPECT) * 100, h: 100 }
    : { w: 100, h: (FRAME_ASPECT / aspect) * 100 };
}

// The smallest zoom (≤ 1) at which the whole image fits inside the frame —
// i.e. how far you can zoom OUT before the image is fully visible (letterboxed).
function minZoomFor(aspect) {
  const { w, h } = coverDims(aspect);
  return 100 / Math.max(w, h);
}

// Absolute-position style for the image given its aspect and a crop.
// zoom=1 fills the frame; zoom<1 shows more of the image (down to the whole
// thing at minZoom); zoom>1 crops in. x/y (0..1) pan when there's overflow.
function cropLayout(aspect, crop) {
  const zoom = crop?.zoom ?? 1;
  const x = focal(crop?.x);
  const y = focal(crop?.y);
  const { w, h } = coverDims(aspect);
  const iw = w * zoom;
  const ih = h * zoom;
  const overflowX = Math.max(0, iw - 100);
  const overflowY = Math.max(0, ih - 100);
  return {
    position: "absolute",
    width: `${iw}%`,
    height: `${ih}%`,
    left: `${50 + (0.5 - x) * overflowX}%`,
    top: `${50 + (0.5 - y) * overflowY}%`,
    transform: "translate(-50%, -50%)",
    objectFit: "fill",
  };
}

// Displays a snap inside a fixed-aspect frame, honoring a per-snap crop
// ({ zoom, x, y }). The caller sets the aspect via className (e.g. "aspect-[3/4]").
function CroppedImage({ url, crop, alt = "Snap", className = "" }) {
  const [aspect, setAspect] = useState(null);
  return (
    <div className={`relative overflow-hidden bg-cream-50 ${className}`}>
      {url && (
        <img
          src={url}
          alt={alt}
          draggable={false}
          loading="lazy"
          onLoad={(e) =>
            setAspect(
              e.currentTarget.naturalWidth / e.currentTarget.naturalHeight,
            )
          }
          className="max-w-none select-none"
          style={
            aspect
              ? cropLayout(aspect, crop)
              : {
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }
          }
        />
      )}
    </div>
  );
}

export { CroppedImage, cropLayout, minZoomFor };
