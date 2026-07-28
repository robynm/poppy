function SectionLabel({ children, count }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="w-2 h-2 rounded-full bg-poppy-500"></span>
      <h2 className="font-display font-bold text-xl text-ink-800">
        {children}
      </h2>
      {count !== undefined && (
        <span className="text-[11px] font-bold tracking-widest uppercase text-poppy-600 bg-poppy-50 px-2 py-0.5 rounded-full">
          {count}
        </span>
      )}
      <div className="flex-1 h-px bg-cream-200"></div>
    </div>
  );
}

export { SectionLabel };
