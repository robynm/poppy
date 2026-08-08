// --- Inline SVG icons (replaces lucide-react) -------------------------------
const Icon = ({
  d,
  size = 16,
  stroke = 2,
  fill = "none",
  className = "",
  ...props
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={fill}
    stroke="currentColor"
    strokeWidth={stroke}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    {typeof d === "string" ? <path d={d} /> : d}
  </svg>
);
const I = {
  shirt: (p) => (
    <Icon
      {...p}
      d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"
    />
  ),
  tag: (p) => (
    <Icon
      {...p}
      d={
        <>
          <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2z" />
          <circle cx="7" cy="7" r="0.5" fill="currentColor" />
        </>
      }
    />
  ),
  layers: (p) => (
    <Icon
      {...p}
      d={
        <>
          <path d="M12 2 2 7l10 5 10-5-10-5z" />
          <path d="m2 17 10 5 10-5" />
          <path d="m2 12 10 5 10-5" />
        </>
      }
    />
  ),
  plus: (p) => (
    <Icon
      {...p}
      d={
        <>
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </>
      }
    />
  ),
  x: (p) => (
    <Icon
      {...p}
      d={
        <>
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </>
      }
    />
  ),
  upload: (p) => (
    <Icon
      {...p}
      d={
        <>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" x2="12" y1="3" y2="15" />
        </>
      }
    />
  ),
  trash: (p) => (
    <Icon
      {...p}
      d={
        <>
          <path d="M3 6h18" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </>
      }
    />
  ),
  pencil: (p) => (
    <Icon
      {...p}
      d={
        <>
          <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
        </>
      }
    />
  ),
  check: (p) => <Icon {...p} d="M20 6 9 17l-5-5" />,
  search: (p) => (
    <Icon
      {...p}
      d={
        <>
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </>
      }
    />
  ),
  sparkles: (p) => (
    <Icon
      {...p}
      d={
        <>
          <path d="M9.94 14.34 12 21l2.06-6.66L21 12.28l-6.94-2.06L12 3l-2.06 6.66L3 12.28z" />
        </>
      }
    />
  ),
  chevron: (p) => <Icon {...p} d="m9 18 6-6-6-6" />,
  download: (p) => (
    <Icon
      {...p}
      d={
        <>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" x2="12" y1="15" y2="3" />
        </>
      }
    />
  ),
  install: (p) => (
    <Icon
      {...p}
      d={
        <>
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <line x1="8" x2="16" y1="21" y2="21" />
          <line x1="12" x2="12" y1="17" y2="21" />
        </>
      }
    />
  ),
  archive: (p) => (
    <Icon
      {...p}
      d={
        <>
          <rect x="2" y="3" width="20" height="5" rx="1" />
          <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
          <line x1="10" x2="14" y1="12" y2="12" />
        </>
      }
    />
  ),
  alert: (p) => (
    <Icon
      {...p}
      d={
        <>
          <circle cx="12" cy="12" r="10" />
          <line x1="12" x2="12" y1="8" y2="12" />
          <line x1="12" x2="12.01" y1="16" y2="16" />
        </>
      }
    />
  ),
  folder: (p) => (
    <Icon
      {...p}
      d="M4 4h5l2 3h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"
    />
  ),
  bookmark: (p) => (
    <Icon {...p} d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  ),
  grip: (p) => (
    <Icon
      {...p}
      d={
        <>
          <path d="M12 3l-4 4h8l-4-4z" />
          <path d="M12 21l4-4H8l4 4z" />
          <line x1="12" y1="7" x2="12" y2="17" />
        </>
      }
    />
  ),
  dots: (p) => (
    <Icon
      {...p}
      fill="currentColor"
      stroke="none"
      d={
        <>
          <circle cx="9" cy="6" r="1.5" />
          <circle cx="9" cy="12" r="1.5" />
          <circle cx="9" cy="18" r="1.5" />
          <circle cx="15" cy="6" r="1.5" />
          <circle cx="15" cy="12" r="1.5" />
          <circle cx="15" cy="18" r="1.5" />
        </>
      }
    />
  ),
  camera: (p) => (
    <Icon
      {...p}
      d={
        <>
          <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
          <circle cx="12" cy="13" r="3" />
        </>
      }
    />
  ),
  flower: (p) => (
    <Icon
      {...p}
      fill="currentColor"
      stroke="none"
      d={
        <>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2a3.5 3.5 0 0 0-3 5.3A3.5 3.5 0 0 0 7.3 9 3.5 3.5 0 0 0 5 12c0 1.13.54 2.13 1.37 2.77A3.5 3.5 0 0 0 6 17a3.5 3.5 0 0 0 5.3 3 3.5 3.5 0 0 0 1.7 1.7A3.5 3.5 0 0 0 18 17a3.5 3.5 0 0 0-.37-2.23A3.5 3.5 0 0 0 19 12a3.5 3.5 0 0 0-2.3-3.3A3.5 3.5 0 0 0 17 7a3.5 3.5 0 0 0-5-5z" />
        </>
      }
    />
  ),
  sun: (p) => (
    <Icon
      {...p}
      d={
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m4.93 19.07 1.41-1.41" />
          <path d="m17.66 6.34 1.41-1.41" />
        </>
      }
    />
  ),
  heart: (p) => (
    <Icon
      {...p}
      d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z"
    />
  ),
  sunglasses: (p) => (
    <Icon
      {...p}
      d={
        <>
          <path d="M14 18a2 2 0 0 0-4 0" />
          <path d="m19 11-2.11-6.657a2 2 0 0 0-2.752-1.148l-1.276.61A2 2 0 0 1 12 4H8.5a2 2 0 0 0-1.925 1.456L5 11" />
          <path d="M2 11h20" />
          <circle cx="17" cy="18" r="3" />
          <circle cx="7" cy="18" r="3" />
        </>
      }
    />
  ),
  suitcase: (p) => (
    <Icon
      {...p}
      d={
        <>
          <path d="M8 16V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v12" />
          <rect x="4" y="6" width="16" height="10" rx="2" />
        </>
      }
    />
  ),
  share: (p) => (
    <Icon
      {...p}
      d={
        <>
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </>
      }
    />
  ),
  more: (p) => (
    <Icon
      {...p}
      fill="currentColor"
      stroke="none"
      d={
        <>
          <circle cx="12" cy="5" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="12" cy="19" r="1.5" />
        </>
      }
    />
  ),
  chart: (p) => (
    <Icon
      {...p}
      d={
        <>
          <line x1="3" y1="20" x2="21" y2="20" />
          <rect x="6" y="11" width="3" height="9" />
          <rect x="11" y="6" width="3" height="14" />
          <rect x="16" y="14" width="3" height="6" />
        </>
      }
    />
  ),
  pie: (p) => (
    <Icon
      {...p}
      d={
        <>
          <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
          <path d="M22 12A10 10 0 0 0 12 2v10z" />
        </>
      }
    />
  ),
  help: (p) => (
    <Icon
      {...p}
      d={
        <>
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <line x1="12" x2="12.01" y1="17" y2="17" />
        </>
      }
    />
  ),
  shield: (p) => (
    <Icon
      {...p}
      d={
        <>
          <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
        </>
      }
    />
  ),
  code: (p) => (
    <Icon
      {...p}
      d={
        <>
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </>
      }
    />
  ),
  sort: (p) => (
    <Icon
      {...p}
      d={
        <>
          <path d="M4 6h16" />
          <path d="M4 12h10" />
          <path d="M4 18h5" />
        </>
      }
    />
  ),
  smile: (p) => (
    <Icon
      {...p}
      d={
        <>
          <circle cx="12" cy="12" r="10" />
          <path d="M8 14s1.5 2 4 2 4-2 4-2" />
          <line x1="9" x2="9.01" y1="9" y2="9" />
          <line x1="15" x2="15.01" y1="9" y2="9" />
        </>
      }
    />
  ),
  meh: (p) => (
    <Icon
      {...p}
      d={
        <>
          <circle cx="12" cy="12" r="10" />
          <line x1="8" x2="16" y1="15" y2="15" />
          <line x1="9" x2="9.01" y1="9" y2="9" />
          <line x1="15" x2="15.01" y1="9" y2="9" />
        </>
      }
    />
  ),
  frown: (p) => (
    <Icon
      {...p}
      d={
        <>
          <circle cx="12" cy="12" r="10" />
          <path d="M16 16s-1.5-2-4-2-4 2-4 2" />
          <line x1="9" x2="9.01" y1="9" y2="9" />
          <line x1="15" x2="15.01" y1="9" y2="9" />
        </>
      }
    />
  ),
};

export { Icon, I };
