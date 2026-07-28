function FilterRow({ label, children }) {
  return (
    <div className="py-2">
      <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-ink-500 mb-2">
        {label}
      </p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export { FilterRow };
