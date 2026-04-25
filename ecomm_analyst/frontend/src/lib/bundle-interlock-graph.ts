import type { DirectedBundleEdge } from "@/lib/bundle-analytics-types";

const DEFAULT_MAX = 200;
const TOP_SOURCES = 45;
const EDGES_PER_HUB = 12;
const CHAIN_FOLLOW = 2;
const CHAIN_DEPTH = 3;

const edgeKey = (a: number, b: number) => `${a}\0${b}`;

/**
 * Picks a diverse edge set that surfaces sales.csv interlocking:
 * 1) Strong line items (hubs) keep several out-edges (spokes).
 * 2) BFS on targets to include 2+ hop chain rows (A→B→C).
 * 3) Fills to maxTotal with globally strongest remaining edges.
 */
export function selectInterlockEdges(
  all: DirectedBundleEdge[],
  linkMetric: "count" | "revenue",
  maxTotal: number = DEFAULT_MAX
): DirectedBundleEdge[] {
  if (all.length === 0) return [];

  const w = (e: DirectedBundleEdge) => (linkMetric === "count" ? e.count : e.revenue);

  const outgoing = new Map<number, DirectedBundleEdge[]>();
  for (const e of all) {
    if (!outgoing.has(e.source_id)) outgoing.set(e.source_id, []);
    outgoing.get(e.source_id)!.push(e);
  }
  outgoing.forEach((arr) => {
    arr.sort((a: DirectedBundleEdge, b: DirectedBundleEdge) => w(b) - w(a));
  });

  const sourceWeight = new Map<number, number>();
  for (const e of all) {
    sourceWeight.set(e.source_id, (sourceWeight.get(e.source_id) ?? 0) + w(e));
  }
  const sourcesRanked = Array.from(sourceWeight.keys()).sort(
    (a, b) => (sourceWeight.get(b) ?? 0) - (sourceWeight.get(a) ?? 0)
  );

  const seen = new Set<string>();
  const out: DirectedBundleEdge[] = [];

  const push = (e: DirectedBundleEdge) => {
    const k = edgeKey(e.source_id, e.target_id);
    if (seen.has(k) || out.length >= maxTotal) return false;
    seen.add(k);
    out.push(e);
    return true;
  };

  for (const src of sourcesRanked.slice(0, TOP_SOURCES)) {
    const list = outgoing.get(src);
    if (!list) continue;
    for (const e of list.slice(0, EDGES_PER_HUB)) {
      if (out.length >= maxTotal) break;
      push(e);
    }
  }

  let work = new Set(out.map((e) => e.target_id));
  for (let d = 0; d < CHAIN_DEPTH && out.length < maxTotal; d++) {
    const nextWork = new Set<number>();
    work.forEach((tid) => {
      const nxt = outgoing.get(tid);
      if (!nxt) return;
      for (const c of nxt.slice(0, CHAIN_FOLLOW)) {
        if (push(c)) nextWork.add(c.target_id);
      }
    });
    work = nextWork;
  }

  const rest = [...all].sort((a, b) => w(b) - w(a));
  for (const e of rest) {
    if (out.length >= maxTotal) break;
    push(e);
  }

  return out;
}

export type InterlockStats = {
  /** Edges (a,b) where some row (b,·) also exists: chain segments */
  chainSegments: number;
  /** product_ids with 3+ distinct add-ons in this edge set */
  hubCount: number;
  topHubId: number | null;
  topHubSpokes: number;
};

/**
 * Simple stats on the *selected* edge list for the caption.
 */
export function getInterlockStats(edges: DirectedBundleEdge[]): InterlockStats {
  if (edges.length === 0) {
    return { chainSegments: 0, hubCount: 0, topHubId: null, topHubSpokes: 0 };
  }

  const outBySrc = new Map<number, number>();
  for (const e of edges) {
    outBySrc.set(e.source_id, (outBySrc.get(e.source_id) ?? 0) + 1);
  }

  const hasOut = (id: number) => edges.some((e) => e.source_id === id);
  let chainSegments = 0;
  for (const e of edges) {
    if (hasOut(e.target_id)) chainSegments += 1;
  }

  const hubs = Array.from(outBySrc.entries()).filter(([, c]) => c >= 3);
  const top = hubs.sort((a, b) => b[1] - a[1])[0] ?? null;

  return {
    chainSegments,
    hubCount: hubs.length,
    topHubId: top ? top[0] : null,
    topHubSpokes: top ? top[1] : 0,
  };
}
