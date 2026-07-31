import { useState, useMemo } from "react";
import { CATEGORY_OPTIONS, OCCASION_OPTIONS, SEASON_OPTIONS, STATUS_OPTIONS } from "../lib/constants.js";
import { toTitle } from "../lib/format.js";
import { useBodyScrollLock } from "../lib/hooks.js";
import { I } from "../lib/icons.jsx";

// --- Backup Modal ---------------------------------------------------------
function StatsModal({
  items,
  outfits,
  collections,
  customTags,
  brands,
  selfies = [],
  onClose,
}) {
  useBodyScrollLock();
  const [tagsExpanded, setTagsExpanded] = useState(false);
  const [tagSort, setTagSort] = useState("count");
  const [wornExpanded, setWornExpanded] = useState(false);
  const [versatileExpanded, setVersatileExpanded] = useState(false);

  const stats = useMemo(() => {
    const owned = items.filter((i) => (i.status || "owned") === "owned");

    const byCat = {};
    CATEGORY_OPTIONS.forEach((c) => {
      byCat[c] = owned.filter((i) => i.category === c).length;
    });

    const byStatus = {};
    STATUS_OPTIONS.forEach((s) => {
      byStatus[s] = items.filter((i) => (i.status || "owned") === s).length;
    });

    const bySeason = {};
    SEASON_OPTIONS.forEach((s) => {
      bySeason[s] = owned.filter((i) => i.seasons?.includes(s)).length;
    });

    const byOccasion = {};
    OCCASION_OPTIONS.forEach((o) => {
      byOccasion[o] = owned.filter((i) => i.occasions?.includes(o)).length;
    });

    const brandCount = {};
    owned.forEach((i) => {
      const b = (i.brand || "").trim();
      if (b) brandCount[b] = (brandCount[b] || 0) + 1;
    });
    const topBrands = Object.entries(brandCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    const yearCount = {};
    owned.forEach((i) => {
      const y = i.yearPurchased;
      if (y) yearCount[y] = (yearCount[y] || 0) + 1;
    });
    const byYear = Object.entries(yearCount).sort((a, b) =>
      b[0].localeCompare(a[0]),
    );

    const tagCount = {};
    const tagSet = new Set(customTags);
    owned.forEach((i) => {
      (i.custom || []).forEach((t) => {
        if (tagSet.has(t)) tagCount[t] = (tagCount[t] || 0) + 1;
      });
    });
    const allTags = Object.entries(tagCount).sort((a, b) => b[1] - a[1]);

    // Closet utilization — owned items appearing in ≥1 outfit
    const lookCount = {};
    outfits.forEach((o) =>
      (o.itemIds || []).forEach((id) => {
        lookCount[id] = (lookCount[id] || 0) + 1;
      }),
    );
    const usedCount = owned.filter((i) => lookCount[i.id]).length;
    const utilizationPct = owned.length
      ? Math.round((usedCount / owned.length) * 100)
      : 0;

    // Most-versatile pieces — owned items ranked by number of looks they appear in
    const topItems = owned
      .map((i) => ({ id: i.id, name: i.name, count: lookCount[i.id] || 0 }))
      .filter((x) => x.count > 0)
      .sort((a, b) => b.count - a.count);

    // Times worn — each snap counts as one wear for every item in its look.
    // Looks with no snaps don't count as worn.
    const snapsPerOutfit = {};
    selfies.forEach((s) => {
      if (s.outfitId)
        snapsPerOutfit[s.outfitId] = (snapsPerOutfit[s.outfitId] || 0) + 1;
    });
    const wearCount = {};
    outfits.forEach((o) => {
      const wears = snapsPerOutfit[o.id] || 0;
      if (!wears) return;
      (o.itemIds || []).forEach((id) => {
        wearCount[id] = (wearCount[id] || 0) + wears;
      });
    });
    const totalWears = Object.values(wearCount).reduce((s, n) => s + n, 0);
    const topWorn = owned
      .map((i) => ({ id: i.id, name: i.name, count: wearCount[i.id] || 0 }))
      .filter((x) => x.count > 0)
      .sort((a, b) => b.count - a.count);

    const avgItemsPerLook = outfits.length
      ? (
          outfits.reduce((s, o) => s + (o.itemIds?.length || 0), 0) /
          outfits.length
        ).toFixed(1)
      : "0";

    return {
      totalItems: items.length,
      ownedCount: owned.length,
      outfitCount: outfits.length,
      collectionCount: collections.length,
      brandTotal: Object.keys(brandCount).length,
      tagTotal: Object.keys(tagCount).length,
      byCat,
      byStatus,
      bySeason,
      byOccasion,
      topBrands,
      topItems,
      topWorn,
      totalWears,
      byYear,
      allTags,
      usedCount,
      utilizationPct,
      avgItemsPerLook,
    };
  }, [items, outfits, collections, customTags, selfies]);

  const Bar = ({ label, count, max, color }) => {
    const pct = max > 0 ? (count / max) * 100 : 0;
    return (
      <div className="flex items-center gap-3">
        <div className="w-20 sm:w-24 text-[11px] font-bold text-ink-600 capitalize truncate">
          {label}
        </div>
        <div className="flex-1 h-5 bg-cream-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${color}`}
            style={{
              width: `${pct}%`,
              transition: "width 0.6s cubic-bezier(.34,1.56,.64,1)",
            }}
          />
        </div>
        <div className="w-10 text-right text-sm font-bold text-ink-800">
          {count}
        </div>
      </div>
    );
  };

  const StatusDonut = () => {
    const total = stats.totalItems || 1;
    const r = 56,
      c = 2 * Math.PI * r;
    const segs = [
      {
        label: "owned",
        count: stats.byStatus.owned,
        color: "var(--poppy-500)",
        swatch: "bg-poppy-500",
      },
      {
        label: "planned",
        count: stats.byStatus.planned,
        color: "var(--buttercup-400)",
        swatch: "bg-buttercup-400",
      },
      {
        label: "donated",
        count: stats.byStatus.donated,
        color: "var(--cream-400)",
        swatch: "bg-cream-400",
      },
    ];
    let offset = 0;
    return (
      <div className="flex items-center gap-5">
        <svg
          width="140"
          height="140"
          viewBox="0 0 140 140"
          className="shrink-0"
        >
          <circle
            cx="70"
            cy="70"
            r={r}
            fill="none"
            stroke="var(--cream-100)"
            strokeWidth="16"
          />
          {segs
            .filter((s) => s.count > 0)
            .map((s) => {
              const len = (s.count / total) * c;
              const node = (
                <circle
                  key={s.label}
                  cx="70"
                  cy="70"
                  r={r}
                  fill="none"
                  stroke={s.color}
                  strokeWidth="16"
                  strokeDasharray={`${len} ${c - len}`}
                  strokeDashoffset={-offset}
                  transform="rotate(-90 70 70)"
                />
              );
              offset += len;
              return node;
            })}
          <text
            x="70"
            y="68"
            textAnchor="middle"
            className="font-display"
            style={{
              fontSize: "28px",
              fill: "var(--ink-900)",
              fontWeight: 700,
            }}
          >
            {stats.totalItems}
          </text>
          <text
            x="70"
            y="86"
            textAnchor="middle"
            style={{
              fontSize: "9px",
              fill: "var(--ink-500)",
              letterSpacing: "0.15em",
              fontWeight: 700,
            }}
          >
            PIECES
          </text>
        </svg>
        <div className="flex flex-col gap-2 text-sm">
          {segs.map((s) => (
            <div key={s.label} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${s.swatch}`} />
              <span className="font-bold text-ink-700 capitalize">
                {s.label}
              </span>
              <span className="text-ink-500">{s.count}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const categoryLabels = {
    top: "tops",
    bottom: "bottoms",
    dress: "dresses",
    outerwear: "outerwear",
    shoes: "shoes",
    accessory: "accessories",
  };
  const categoryColors = {
    top: "bg-poppy-400",
    bottom: "bg-sky2-400",
    dress: "bg-petal-400",
    outerwear: "bg-plum-400",
    shoes: "bg-buttercup-400",
    accessory: "bg-leaf-400",
  };
  const categoryStroke = {
    top: "var(--poppy-400)",
    bottom: "var(--sky2-400)",
    dress: "var(--petal-400)",
    outerwear: "var(--plum-400)",
    shoes: "var(--buttercup-400)",
    accessory: "var(--leaf-400)",
  };

  const CategoryDonut = () => {
    const ownedCount = Math.max(1, stats.ownedCount || 1);
    const r = 56,
      circ = 2 * Math.PI * r;
    const segs = CATEGORY_OPTIONS.map((cat) => ({
      label: categoryLabels[cat],
      count: stats.byCat[cat],
      color: categoryStroke[cat],
      swatch: categoryColors[cat],
    }));
    let offset = 0;
    return (
      <div className="flex items-center gap-5">
        <svg
          width="140"
          height="140"
          viewBox="0 0 140 140"
          className="shrink-0"
        >
          <circle
            cx="70"
            cy="70"
            r={r}
            fill="none"
            stroke="var(--cream-100)"
            strokeWidth="16"
          />
          {segs
            .filter((s) => s.count > 0)
            .map((s) => {
              const len = (s.count / ownedCount) * circ;
              const node = (
                <circle
                  key={s.label}
                  cx="70"
                  cy="70"
                  r={r}
                  fill="none"
                  stroke={s.color}
                  strokeWidth="16"
                  strokeDasharray={`${len} ${circ - len}`}
                  strokeDashoffset={-offset}
                  transform="rotate(-90 70 70)"
                />
              );
              offset += len;
              return node;
            })}
          <text
            x="70"
            y="68"
            textAnchor="middle"
            style={{
              fontSize: "28px",
              fill: "var(--ink-900)",
              fontWeight: 700,
            }}
          >
            {stats.ownedCount}
          </text>
          <text
            x="70"
            y="86"
            textAnchor="middle"
            style={{
              fontSize: "9px",
              fill: "var(--ink-500)",
              letterSpacing: "0.15em",
              fontWeight: 700,
            }}
          >
            OWNED
          </text>
        </svg>
        <div className="flex flex-col gap-2 text-sm">
          {segs.map((s) => (
            <div key={s.label} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${s.swatch}`} />
              <span className="font-bold text-ink-700 capitalize">
                {s.label}
              </span>
              <span className="text-ink-500">{s.count}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };
  const seasonColors = {
    spring: "bg-leaf-400",
    summer: "bg-buttercup-400",
    fall: "bg-poppy-400",
    winter: "bg-sky2-400",
  };

  const ownedTotal = Math.max(1, stats.ownedCount);

  const empty = stats.totalItems === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div
        className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm"
        onClick={onClose}
      ></div>
      <div
        data-testid="stats-modal"
        className="relative bg-white max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto p-6 sm:p-8 rounded-t-3xl sm:rounded-3xl shadow-2xl fade-up"
        style={{ paddingBottom: `max(env(safe-area-inset-bottom), 24px)` }}
      >
        <button
          data-testid="stats-close"
          onClick={onClose}
          className="absolute top-3 right-3 text-ink-500 p-2"
        >
          <I.x size={22} />
        </button>

        <div className="inline-flex items-center gap-2 px-3 py-1 bg-poppy-50 rounded-full mb-3">
          <I.pie size={12} className="text-poppy-600" />
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-poppy-700">
            Closet stats
          </p>
        </div>
        <h3 className="font-display font-bold text-2xl sm:text-3xl mb-6 text-ink-900">
          Your closet,
          <br />
          <em className="text-poppy-600">by the numbers.</em>
        </h3>

        {empty ? (
          <div className="p-6 bg-cream-50 border-2 border-cream-100 rounded-2xl text-center text-ink-600">
            <p className="text-sm">
              Add a few pieces to your closet and the numbers will start to
              bloom here.
            </p>
          </div>
        ) : (
          <>
            {/* Hero numbers */}
            <div className="grid grid-cols-3 gap-3 mb-8">
              {[
                {
                  n: stats.ownedCount,
                  label: "pieces",
                  color: "text-poppy-600",
                },
                {
                  n: stats.outfitCount,
                  label: "looks",
                  color: "text-petal-500",
                },
                {
                  n: stats.collectionCount,
                  label: "collections",
                  color: "text-sky2-500",
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="p-4 bg-cream-50 border-2 border-cream-100 rounded-2xl text-center"
                >
                  <div
                    className={`font-display font-bold text-3xl sm:text-4xl ${s.color}`}
                  >
                    {s.n}
                  </div>
                  <div className="text-[10px] font-bold tracking-wide uppercase text-ink-500 mt-1">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>

            {/* By category */}
            <div className="mb-8">
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-poppy-700 mb-3">
                By category
              </p>
              <CategoryDonut />
            </div>

            {/* By status — donut */}
            <div className="mb-8">
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-poppy-700 mb-3">
                By status
              </p>
              <StatusDonut />
            </div>

            {/* Utilization */}
            <div className="mb-8 p-4 bg-leaf-50 border-2 border-leaf-100 rounded-2xl">
              <div className="flex items-baseline justify-between mb-2">
                <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-leaf-700">
                  Closet utilization
                </p>
                <span className="font-display font-bold text-2xl text-leaf-700">
                  {stats.utilizationPct}%
                </span>
              </div>
              <div className="h-3 bg-white rounded-full overflow-hidden mb-2">
                <div
                  className="h-full bg-leaf-500 rounded-full"
                  style={{
                    width: `${stats.utilizationPct}%`,
                    transition: "width 0.6s cubic-bezier(.34,1.56,.64,1)",
                  }}
                />
              </div>
              <p className="text-xs text-ink-600">
                <span className="font-bold text-ink-800">
                  {stats.usedCount}
                </span>{" "}
                of {stats.ownedCount} pieces appear in at least one look · avg{" "}
                <span className="font-bold text-ink-800">
                  {stats.avgItemsPerLook}
                </span>{" "}
                pieces per look
              </p>
            </div>

            {/* By season */}
            <div className="mb-8">
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-poppy-700 mb-3">
                By season
              </p>
              <div className="flex flex-col gap-2">
                {SEASON_OPTIONS.map((s) => (
                  <Bar
                    key={s}
                    label={s}
                    count={stats.bySeason[s]}
                    max={ownedTotal}
                    color={seasonColors[s]}
                  />
                ))}
              </div>
            </div>

            {/* By occasion */}
            <div className="mb-8">
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-poppy-700 mb-3">
                By occasion
              </p>
              <div className="flex flex-col gap-2">
                {OCCASION_OPTIONS.map((o) => (
                  <Bar
                    key={o}
                    label={o}
                    count={stats.byOccasion[o]}
                    max={ownedTotal}
                    color="bg-plum-400"
                  />
                ))}
              </div>
            </div>

            {/* By year purchased */}
            {stats.byYear.length > 0 && (
              <div className="mb-8">
                <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-buttercup-700 mb-3">
                  By year purchased
                </p>
                <div className="flex flex-col gap-2">
                  {stats.byYear.map(([y, n]) => (
                    <Bar
                      key={y}
                      label={y}
                      count={n}
                      max={ownedTotal}
                      color="bg-buttercup-400"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Most worn — driven by snaps */}
            {stats.topWorn.length > 0 && (
              <div className="mb-8" data-testid="stat-most-worn">
                <div className="flex items-baseline justify-between mb-3">
                  <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-buttercup-700">
                    Most worn
                  </p>
                  <p className="text-[12px] text-ink-500">
                    {stats.totalWears} total wears
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  {(wornExpanded
                    ? stats.topWorn
                    : stats.topWorn.slice(0, 5)
                  ).map(({ id, name, count }, idx) => (
                    <div
                      key={id}
                      data-testid="worn-item"
                      data-item-id={id}
                      className="flex items-center gap-3 p-2.5 bg-cream-50 border-2 border-cream-100 rounded-2xl"
                    >
                      <div className="w-6 h-6 shrink-0 flex items-center justify-center rounded-full bg-buttercup-100 text-buttercup-700 font-display font-bold text-[12px]">
                        {idx + 1}
                      </div>
                      <span className="flex-1 text-[13px] font-bold text-ink-800 capitalize truncate">
                        {toTitle(name)}
                      </span>
                      <span className="shrink-0 text-[11px] font-bold bg-buttercup-100 text-buttercup-700 rounded-full px-2 py-0.5">
                        {count} {count === 1 ? "wear" : "wears"}
                      </span>
                    </div>
                  ))}
                </div>
                {stats.topWorn.length > 5 && (
                  <button
                    data-testid="worn-toggle"
                    onClick={() => setWornExpanded((e) => !e)}
                    className="mt-3 text-[11px] font-bold text-ink-500 active:text-ink-800"
                  >
                    {wornExpanded
                      ? "Show less"
                      : `Show all ${stats.topWorn.length}`}
                  </button>
                )}
              </div>
            )}

            {/* Most versatile — how many looks each piece appears in */}
            {stats.topItems.length > 0 && (
              <div className="mb-8">
                <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-poppy-700 mb-3">
                  Most versatile items
                </p>
                <div className="flex flex-col gap-2">
                  {(versatileExpanded
                    ? stats.topItems
                    : stats.topItems.slice(0, 5)
                  ).map(({ id, name, count }, idx) => (
                    <div
                      key={id}
                      className="flex items-center gap-3 p-2.5 bg-cream-50 border-2 border-cream-100 rounded-2xl"
                    >
                      <div className="w-6 h-6 shrink-0 flex items-center justify-center rounded-full bg-poppy-100 text-poppy-700 font-display font-bold text-[12px]">
                        {idx + 1}
                      </div>
                      <span className="flex-1 text-[13px] font-bold text-ink-800 capitalize truncate">
                        {toTitle(name)}
                      </span>
                      <span className="shrink-0 text-[11px] font-bold bg-petal-100 text-petal-700 rounded-full px-2 py-0.5">
                        {count} {count === 1 ? "look" : "looks"}
                      </span>
                    </div>
                  ))}
                </div>
                {stats.topItems.length > 5 && (
                  <button
                    data-testid="versatile-toggle"
                    onClick={() => setVersatileExpanded((e) => !e)}
                    className="mt-3 text-[11px] font-bold text-ink-500 active:text-ink-800"
                  >
                    {versatileExpanded
                      ? "Show less"
                      : `Show all ${stats.topItems.length}`}
                  </button>
                )}
              </div>
            )}

            {/* Top brands */}
            {stats.topBrands.length > 0 && (
              <div className="mb-8">
                <div className="flex items-baseline justify-between mb-3">
                  <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-poppy-700">
                    Top brands
                  </p>
                  <p className="text-[12px] text-ink-500">
                    {stats.brandTotal} total
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {stats.topBrands.map(([b, n]) => (
                    <div
                      key={b}
                      className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 bg-sky2-50 border-2 border-sky2-100 rounded-full"
                    >
                      <span className="text-[12px] font-bold text-ink-800">
                        {b}
                      </span>
                      <span className="text-[11px] font-bold bg-sky2-200 text-sky2-800 rounded-full px-1.5 min-w-[20px] text-center leading-5">
                        {n}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            {stats.allTags.length > 0 && (
              <div className="mb-2">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-poppy-700">
                    Tags
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        setTagSort((s) => (s === "count" ? "alpha" : "count"))
                      }
                      className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-500 px-2 py-0.5 rounded-full border-2 border-ink-200 active:bg-cream-100 transition-colors"
                    >
                      {tagSort === "count" ? "A–Z" : "#"}
                    </button>
                    <p className="text-[12px] text-ink-500">
                      {stats.tagTotal} total
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(() => {
                    let tags =
                      tagSort === "alpha"
                        ? [...stats.allTags].sort((a, b) =>
                            a[0].localeCompare(b[0]),
                          )
                        : stats.allTags;
                    if (!tagsExpanded) tags = tags.slice(0, 10);
                    return tags.map(([t, n]) => (
                      <div
                        key={t}
                        className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 bg-buttercup-50 border-2 border-buttercup-100 rounded-full"
                      >
                        <span className="text-[12px] font-bold text-ink-800">
                          {t}
                        </span>
                        <span className="text-[11px] font-bold bg-buttercup-200 text-ink-700 rounded-full px-1.5 min-w-[20px] text-center leading-5">
                          {n}
                        </span>
                      </div>
                    ));
                  })()}
                </div>
                {stats.tagTotal > 10 && (
                  <button
                    onClick={() => setTagsExpanded((e) => !e)}
                    className="mt-3 text-[11px] font-bold text-ink-500 active:text-ink-800"
                  >
                    {tagsExpanded
                      ? "Show less"
                      : `Show all ${stats.tagTotal} tags`}
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export { StatsModal };
