import { POPPY_MARK_SRC } from "../lib/constants.js";

function PoppyMark({ size, color, className = "" }) {
  // `color` is accepted for backwards compatibility but ignored — the artwork is pre-colored.
  // If `size` is omitted, the mark fills its container (width/height = 100%).
  // The viewBox is tightened to the orange disc in the embedded PNG (x=22..113, y=16..107
  // out of 128) so the artwork edge sits flush against a `bg-poppy-500` container.
  const dim = size ?? "100%";
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={dim}
      height={dim}
      viewBox="22 16 91 91"
      className={className}
      aria-hidden="true"
      preserveAspectRatio="xMidYMid slice"
    >
      <image
        x="0"
        y="0"
        width="128"
        height="128"
        href={POPPY_MARK_SRC}
        preserveAspectRatio="xMidYMid meet"
      />
    </svg>
  );
}

export { PoppyMark };
