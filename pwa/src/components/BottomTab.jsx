function BottomTab({ IconC, label, active, onClick, count, tone = "poppy", testId }) {
  // Each tab has its own accent color, so the bar reads as a colorful row
  const toneMap = {
    poppy: { bg: "bg-poppy-50", text: "text-poppy-600", pill: "bg-poppy-500" },
    petal: { bg: "bg-petal-50", text: "text-petal-600", pill: "bg-petal-500" },
    sky2: { bg: "bg-sky2-50", text: "text-sky2-600", pill: "bg-sky2-500" },
  };
  const t = toneMap[tone] || toneMap.poppy;
  return (
    <button
      onClick={onClick}
      data-testid={testId}
      className={`relative flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-2xl transition-all ${active ? t.bg : "bg-transparent"} active:scale-95`}
    >
      <div
        className={`relative w-11 h-11 rounded-full flex items-center justify-center transition-colors ${active ? `${t.pill} text-white shadow-pop` : "text-ink-400"}`}
      >
        <IconC size={20} stroke={active ? 2.4 : 2} />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 bg-poppy-500 text-white text-[9px] font-bold rounded-full px-1.5 py-0.5 leading-none border-2 border-white">
            {count}
          </span>
        )}
      </div>
      <span
        className={`text-[10px] font-bold tracking-[0.1em] uppercase ${active ? t.text : "text-ink-400"}`}
      >
        {label}
      </span>
    </button>
  );
}

export { BottomTab };
