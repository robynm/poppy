// Displays a snap inside a fixed-aspect frame, honoring a per-snap crop
// ({ zoom, x, y }). The image is sized to `zoom`× the frame and positioned via
// object-position, so the frame is always fully covered (no empty edges) while
// the user controls which part shows. The caller sets the aspect via className
// (e.g. "aspect-[3/4]").
function CroppedImage({ url, crop, alt = "Snap", className = "" }) {
  const zoom = crop?.zoom ?? 1;
  const x = crop?.x ?? 50;
  const y = crop?.y ?? 50;
  return (
    <div className={`relative overflow-hidden bg-cream-50 ${className}`}>
      {url && (
        <img
          src={url}
          alt={alt}
          draggable={false}
          loading="lazy"
          className="absolute left-1/2 top-1/2 max-w-none object-cover"
          style={{
            width: `${zoom * 100}%`,
            height: `${zoom * 100}%`,
            transform: "translate(-50%, -50%)",
            objectPosition: `${x}% ${y}%`,
          }}
        />
      )}
    </div>
  );
}

export { CroppedImage };
