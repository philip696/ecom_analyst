"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useMemo, useRef, useLayoutEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import { Package, DollarSign, Layers, Link2, Network, TrendingUp } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import KpiCard from "@/components/KpiCard";
import LiftMatrix from "@/components/LiftMatrix";
import type { LiftMatrixFromDb } from "@/components/LiftMatrix";
import { salesApi } from "@/lib/api";
import { truncateYAxisLabel, verticalCategoryBarChartHeight } from "@/lib/chart-axis";
import { clsx } from "clsx";
import type { DirectedBundleEdge } from "@/lib/bundle-analytics-types";
import { SALES_CHANNELS, type SalesChannelId } from "@/lib/channels";
import MarketplaceLogo from "@/components/MarketplaceLogo";

const BundleNetworkGraph = dynamic(
  () => import("@/components/BundleNetworkGraph"),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex items-center justify-center rounded-xl border border-slate-100 bg-slate-50/50 text-slate-400 text-sm"
        style={{ minHeight: 600 }}
      >
        Loading co-purchase network…
      </div>
    ),
  }
);

// ── Types ─────────────────────────────────────────────────────────────────────

type BundlePair = {
  product_a: string;
  product_b: string;
  product_a_id: number;
  product_b_id: number;
  count: number;
  revenue: number;
  avg_order_qty: number;
};

type ChartPoint = {
  name: string;
  count: number;
  revenue: number;
};

type Summary = {
  total_bundle_sales: number;
  total_bundle_revenue: number;
  unique_pairs: number;
  avg_bundle_qty: number;
  most_common_pair: string;
  most_common_count: number;
};

type SortKey = "count" | "revenue" | "avg_order_qty" | "product_a" | "product_b";

// ── Chart colours ─────────────────────────────────────────────────────────────
const BAR_COLORS = [
  "#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd",
  "#818cf8", "#7c3aed", "#4f46e5", "#4338ca", "#3730a3", "#312e81",
];

// ── Custom Tooltip ─────────────────────────────────────────────────────────────
function BundleTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { name: string; value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-100 shadow-lg rounded-xl px-4 py-3 text-sm max-w-xs">
      <p className="text-xs text-slate-500 font-medium mb-2 leading-snug">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex justify-between gap-6 text-slate-700">
          <span className="text-slate-400">{p.name}</span>
          <span className="font-semibold">
            {p.name === "Revenue" ? `$${p.value.toFixed(2)}` : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function BundlePage() {
  const [channel, setChannel] = useState<SalesChannelId>("all");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [pairs, setPairs] = useState<BundlePair[]>([]);
  const [directedEdges, setDirectedEdges] = useState<DirectedBundleEdge[]>([]);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [liftMatrix, setLiftMatrix] = useState<LiftMatrixFromDb | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("count");
  const [sortAsc, setSortAsc] = useState(false);
  const [search, setSearch] = useState("");
  const [chartMode, setChartMode] = useState<"count" | "revenue">("count");
  const [networkMetric, setNetworkMetric] = useState<"count" | "revenue">("count");

  const mkt = channel === "all" ? undefined : channel;

  const sortedChartData = useMemo(() => {
    if (chartData.length === 0) return chartData;
    const key = chartMode;
    return [...chartData].sort((a, b) => b[key] - a[key]);
  }, [chartData, chartMode]);

  const bundleBarChartHeight = useMemo(
    () =>
      verticalCategoryBarChartHeight(sortedChartData.length, {
        min: 260,
        max: 560,
        band: 34,
        gutter: 56,
        empty: 280,
      }),
    [sortedChartData.length]
  );

  const topPairsCardRef = useRef<HTMLDivElement>(null);
  const [commonBundlesHeight, setCommonBundlesHeight] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    if (loading) {
      setCommonBundlesHeight(undefined);
      return;
    }
    const node = topPairsCardRef.current;
    if (!node) return;

    const sync = () => {
      const wide = window.matchMedia("(min-width: 1024px)").matches;
      if (!wide) {
        setCommonBundlesHeight(undefined);
        return;
      }
      setCommonBundlesHeight(node.offsetHeight);
    };

    const ro = new ResizeObserver(() => sync());
    ro.observe(node);
    sync();
    window.addEventListener("resize", sync);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", sync);
    };
  }, [loading, bundleBarChartHeight, sortedChartData.length, chartMode, channel]);

  useEffect(() => {
    setLoading(true);
    salesApi.bundleAnalytics(mkt)
      .then((res) => {
        setSummary(res.data.summary);
        setPairs(res.data.pairs);
        setDirectedEdges(
          (res.data as { directed_edges?: DirectedBundleEdge[] }).directed_edges ?? []
        );
        setChartData(res.data.chart_data);
        setLiftMatrix(
          (res.data as { lift_matrix?: LiftMatrixFromDb | null }).lift_matrix ?? null
        );
      })
      .finally(() => setLoading(false));
  }, [channel]);

  // ── Sort / filter ─────────────────────────────────────────────────────────
  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((v) => !v);
    else { setSortKey(key); setSortAsc(key === "product_a" || key === "product_b"); }
  };

  const filtered = pairs
    .filter((p) =>
      p.product_a.toLowerCase().includes(search.toLowerCase()) ||
      p.product_b.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (typeof av === "string" && typeof bv === "string")
        return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });

  const SortIcon = ({ col }: { col: SortKey }) =>
    sortKey === col
      ? <span className="ml-1 text-brand-500">{sortAsc ? "↑" : "↓"}</span>
      : <span className="ml-1 text-slate-300">↕</span>;

  return (
    <div>
      <PageHeader
        title="Bundle Analytics"
        description="Discover which products are most frequently purchased together"
      />

      {/* Channel Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {SALES_CHANNELS.map((ch) => (
          <button
            key={ch.id}
            onClick={() => setChannel(ch.id)}
            className={clsx(
              "px-3 py-2 rounded-xl border text-sm font-medium transition-all flex items-center gap-2",
              channel === ch.id
                ? ch.color + " border-current shadow-sm"
                : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
            )}
          >
            <MarketplaceLogo
              assetSlug={ch.assetSlug}
              emoji={ch.emoji}
              label={ch.label}
              size={20}
              className="text-base leading-none"
            />
            <span>{ch.label}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* KPI Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KpiCard
              title="Total Bundle Sales"
              value={summary?.total_bundle_sales ?? 0}
              icon={Package}
              iconColor="bg-brand-500"
            />
            <KpiCard
              title="Bundle Revenue"
              value={`$${(summary?.total_bundle_revenue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              icon={DollarSign}
              iconColor="bg-emerald-500"
            />
            <KpiCard
              title="Unique Pairs"
              value={summary?.unique_pairs ?? 0}
              icon={Layers}
              iconColor="bg-violet-500"
            />
            <KpiCard
              title="Avg Bundle Qty"
              value={summary?.avg_bundle_qty ?? 0}
              subtitle="units per bundle order"
              icon={TrendingUp}
              iconColor="bg-amber-500"
            />
          </div>

          {/* Chart + Top Pairs — side by side; chart card height = content only (ends after bar) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 lg:items-stretch gap-6 mb-6">

            {/* Bar Chart — 2/3 width; self-start so card does not stretch below the chart */}
            <div
              ref={topPairsCardRef}
              className="card lg:col-span-2 flex flex-col lg:self-start w-full shrink-0"
            >
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-base font-semibold text-slate-700">Top Bundle Pairs</h2>
                {/* Toggle count / revenue */}
                <div className="flex items-center bg-slate-100 rounded-lg p-0.5 text-xs font-medium">
                  <button
                    onClick={() => setChartMode("count")}
                    className={clsx(
                      "px-3 py-1 rounded-md transition-all",
                      chartMode === "count" ? "bg-white text-brand-600 shadow-sm" : "text-slate-500"
                    )}
                  >
                    By Count
                  </button>
                  <button
                    onClick={() => setChartMode("revenue")}
                    className={clsx(
                      "px-3 py-1 rounded-md transition-all",
                      chartMode === "revenue" ? "bg-white text-brand-600 shadow-sm" : "text-slate-500"
                    )}
                  >
                    By Revenue
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-3">Top 10 most frequently bundled product pairs</p>

              {sortedChartData.length === 0 ? (
                <div className="flex items-center justify-center h-56 text-slate-300 text-sm shrink-0">No bundle data</div>
              ) : (
                <ResponsiveContainer width="100%" height={bundleBarChartHeight} className="shrink-0">
                  <BarChart data={sortedChartData} layout="vertical" margin={{ left: 4, right: 20, top: 4, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={chartMode === "revenue" ? (v) => `$${v}` : undefined}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 10, fill: "#94a3b8" }}
                      tickLine={false}
                      axisLine={false}
                      width={172}
                      interval={0}
                      tickFormatter={(v) => truncateYAxisLabel(v, 30)}
                    />
                    <Tooltip content={<BundleTooltip />} />
                    <Bar dataKey={chartMode} name={chartMode === "count" ? "Times Bundled" : "Revenue"} radius={[0, 4, 4, 0]}>
                      {sortedChartData.map((_, i) => (
                        <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Top Pairs ranked list — lg: same pixel height as Top Bundle Pairs, list scrolls */}
            <div
              className="card flex flex-col min-h-0 max-lg:h-auto"
              style={
                commonBundlesHeight != null
                  ? { minHeight: commonBundlesHeight, height: commonBundlesHeight }
                  : undefined
              }
            >
              <div className="shrink-0">
                <h2 className="text-base font-semibold text-slate-700 mb-1">Most Common Bundles</h2>
                <p className="text-xs text-slate-400 mb-3">Ranked by times purchased together</p>
              </div>

              {pairs.length === 0 ? (
                <div className="flex-1 min-h-[8rem] flex items-center justify-center text-slate-300 text-sm">
                  No data
                </div>
              ) : (
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain flex flex-col gap-2.5 pr-1 -mr-1">
                  {pairs.slice(0, 8).map((p, i) => {
                    const maxCount = pairs[0]?.count || 1;
                    const pct = Math.round((p.count / maxCount) * 100);
                    return (
                      <div key={i} className="rounded-xl border border-slate-100 p-3 hover:bg-slate-50 transition-colors">
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-5 h-5 rounded-full bg-brand-50 text-brand-600 text-xs font-bold flex items-center justify-center shrink-0">
                              {i + 1}
                            </span>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-700 truncate">{p.product_a}</p>
                              <p className="text-xs text-slate-400">+ {p.product_b}</p>
                            </div>
                          </div>
                          <span className="text-xs font-bold bg-brand-50 text-brand-600 px-2 py-0.5 rounded-full shrink-0">
                            {p.count}×
                          </span>
                        </div>
                        {/* progress bar */}
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-brand-400 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-slate-400 mt-1">
                          <span>${p.revenue.toFixed(2)} revenue</span>
                          <span>{p.avg_order_qty} avg qty</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Association strength matrix — above co-purchase network */}
          <div className="card mb-4">
            <div className="mb-4 flex gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                <Link2 className="size-5" aria-hidden />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-slate-700">Association strength</h2>
                <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-500">
                  Conditional bundle rates for top pairs (letters map to products below). Each cell is P(column
                  add-on | row line product) on the same bundle line.
                </p>
              </div>
            </div>
            <LiftMatrix matrix={liftMatrix} />
          </div>

          {/* Co-purchase network graph */}
          <div className="card mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-1">
              <div className="flex items-center gap-2">
                <Network className="h-4 w-4 text-brand-500" aria-hidden />
                <h2 className="text-base font-semibold text-slate-700">Co-purchase network</h2>
              </div>
              <div className="flex items-center bg-slate-100 rounded-lg p-0.5 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setNetworkMetric("count")}
                  className={clsx(
                    "px-3 py-1 rounded-md transition-all",
                    networkMetric === "count" ? "bg-white text-brand-600 shadow-sm" : "text-slate-500"
                  )}
                >
                  By count
                </button>
                <button
                  type="button"
                  onClick={() => setNetworkMetric("revenue")}
                  className={clsx(
                    "px-3 py-1 rounded-md transition-all",
                    networkMetric === "revenue" ? "bg-white text-brand-600 shadow-sm" : "text-slate-500"
                  )}
                >
                  By revenue
                </button>
              </div>
            </div>
            <p className="text-xs text-slate-400 mb-2">
              Same as <span className="text-slate-500">sales.csv</span> semantics: each row is a
              line-item <code className="text-slate-500">product_id</code> with an optional{" "}
              <code className="text-slate-500">bundled_with</code> target — arrows go from the line
              product to the add-on. Thicker lines =
              {networkMetric === "count" ? " more co-purchased line items" : " more revenue on those orders"}.
            </p>
            <BundleNetworkGraph directedEdges={directedEdges} linkMetric={networkMetric} height={650} />
          </div>

          {/* Full Table */}
          <div className="card">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <h2 className="text-base font-semibold text-slate-700">All Bundle Pairs</h2>
              <input
                type="text"
                placeholder="Search product..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input text-sm py-1.5 w-full sm:w-56"
              />
            </div>

            <div className="rounded-xl border border-slate-100 overflow-hidden">
              {filtered.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-10">No records found</p>
              ) : (
                <div className="max-h-[420px] overflow-auto overscroll-contain">
                  <table className="w-full text-sm min-w-[640px]">
                    <thead className="sticky top-0 z-10 bg-white border-b border-slate-100 shadow-[0_1px_0_0_rgb(241_245_249)]">
                    <tr className="text-xs text-slate-400 uppercase tracking-wide">
                      {(
                        [
                          { key: "product_a",     label: "Product A",        align: "text-left" },
                          { key: "product_b",     label: "Product B",        align: "text-left" },
                          { key: "count",         label: "Times Bundled",    align: "text-right" },
                          { key: "revenue",       label: "Est. Revenue",     align: "text-right" },
                          { key: "avg_order_qty", label: "Avg Qty",          align: "text-right" },
                        ] as { key: SortKey; label: string; align: string }[]
                      ).map(({ key, label, align }) => (
                        <th
                          key={key}
                          onClick={() => handleSort(key)}
                          className={clsx(
                            "py-2.5 pr-4 font-medium cursor-pointer select-none hover:text-slate-600 transition-colors",
                            align
                          )}
                        >
                          {label}
                          <SortIcon col={key} />
                        </th>
                      ))}
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                    {filtered.map((p, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 pr-4 font-medium text-slate-700 max-w-[180px] truncate">
                          {p.product_a}
                        </td>
                        <td className="py-3 pr-4 text-slate-500 max-w-[180px] truncate">
                          {p.product_b}
                        </td>
                        <td className="py-3 pr-4 text-right">
                          <span className="inline-flex items-center gap-1 text-xs font-bold bg-brand-50 text-brand-600 px-2.5 py-0.5 rounded-full tabular-nums">
                            {p.count}×
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-right font-medium text-slate-700 tabular-nums">
                          ${p.revenue.toFixed(2)}
                        </td>
                        <td className="py-3 text-right text-slate-500 tabular-nums">
                          {p.avg_order_qty}
                        </td>
                      </tr>
                    ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {filtered.length > 0 && (
              <p className="text-xs text-slate-400 mt-3 text-right">
                {filtered.length} pair{filtered.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
