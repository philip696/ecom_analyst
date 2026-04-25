"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ForceGraphMethods } from "react-force-graph-2d";
import type { DirectedBundleEdge } from "@/lib/bundle-analytics-types";
import {
  getInterlockStats,
  selectInterlockEdges,
} from "@/lib/bundle-interlock-graph";
import { resolveProductImageUrl, truncateProductName } from "@/lib/product-image";
import ForceGraph2D from "react-force-graph-2d";

export type { DirectedBundleEdge } from "@/lib/bundle-analytics-types";

/** Unicode subscript digits for b₁-style labels (as in the reference). */
const SUB: Record<string, string> = {
  "0": "₀",
  "1": "₁",
  "2": "₂",
  "3": "₃",
  "4": "₄",
  "5": "₅",
  "6": "₆",
  "7": "₇",
  "8": "₈",
  "9": "₉",
};

type NodeRole = "primary" | "mixed" | "addon";

type GraphNode = {
  id: string;
  name: string;
  numId: number;
  strength: number;
  role: NodeRole;
  /** Line item with many distinct add-on edges in the current selection (sales hub / spoke pattern). */
  isHub: boolean;
  /** Resolved API URL for canvas drawImage, or null. */
  imageUrl: string | null;
  /** Set by the force layout at runtime. */
  x?: number;
  y?: number;
};

type GraphLink = {
  source: string;
  target: string;
  count: number;
  revenue: number;
  value: number;
  targetNumId: number;
};

/** Edges in the interlock set (hubs + chains + top global) — see selectInterlockEdges. */
const MAX_INTERLOCK_EDGES = 200;
const HUB_MIN_SPOKES = 6;

function subscriptId(n: number): string {
  return String(n)
    .split("")
    .map((d) => SUB[d] ?? d)
    .join("");
}

function classifyRole(
  outW: number,
  inW: number
): NodeRole {
  if (outW === 0 && inW > 0) return "addon";
  if (inW === 0 && outW > 0) return "primary";
  const r = outW / (inW + 0.0001);
  if (r > 1.4) return "primary";
  if (r < 0.69) return "addon";
  return "mixed";
}

function buildGraph(
  slice: DirectedBundleEdge[],
  linkMetric: "count" | "revenue",
  outSpokeCount: Map<number, number>
): { nodes: GraphNode[]; links: GraphLink[]; maxLink: number; maxStrength: number } {
  if (slice.length === 0) {
    return { nodes: [], links: [], maxLink: 1, maxStrength: 1 };
  }

  const outSum = new Map<number, number>();
  const inSum = new Map<number, number>();
  for (const e of slice) {
    const w = linkMetric === "count" ? e.count : e.revenue;
    outSum.set(e.source_id, (outSum.get(e.source_id) ?? 0) + w);
    inSum.set(e.target_id, (inSum.get(e.target_id) ?? 0) + w);
  }

  const ids = new Set<number>();
  for (const e of slice) {
    ids.add(e.source_id);
    ids.add(e.target_id);
  }

  const nodeMap = new Map<string, GraphNode>();
  for (const id of Array.from(ids)) {
    const o = outSum.get(id) ?? 0;
    const i = inSum.get(id) ?? 0;
    const strength = o + i;
    const spokes = outSpokeCount.get(id) ?? 0;
    nodeMap.set(String(id), {
      id: String(id),
      name: "—",
      numId: id,
      strength,
      role: classifyRole(o, i),
      isHub: spokes >= HUB_MIN_SPOKES,
      imageUrl: null,
    });
  }

  for (const e of slice) {
    const a = nodeMap.get(String(e.source_id));
    if (a) {
      a.name = e.source_name;
      if (e.source_image_url) {
        const u = resolveProductImageUrl(e.source_image_url);
        if (u) a.imageUrl = u;
      }
    }
    const b = nodeMap.get(String(e.target_id));
    if (b) {
      b.name = e.target_name;
      if (e.target_image_url) {
        const u = resolveProductImageUrl(e.target_image_url);
        if (u) b.imageUrl = u;
      }
    }
  }

  const links: GraphLink[] = slice.map((e) => ({
    source: String(e.source_id),
    target: String(e.target_id),
    count: e.count,
    revenue: e.revenue,
    value: linkMetric === "count" ? e.count : e.revenue,
    targetNumId: e.target_id,
  }));

  const maxLink = Math.max(...links.map((l) => l.value), 1);
  const nodesArr = Array.from(nodeMap.values());
  const maxStrength = Math.max(...nodesArr.map((n) => n.strength), 1);
  return { nodes: nodesArr, links, maxLink, maxStrength };
}

type Props = {
  directedEdges: DirectedBundleEdge[];
  linkMetric: "count" | "revenue";
  height?: number;
};

/** Node radius in graph space (room for image + label). */
function nodeRadiusGraph(n: GraphNode, maxStrength: number): number {
  const t = n.strength / maxStrength;
  return 7.4 + 13.5 * Math.sqrt(t);
}

export default function BundleNetworkGraph({ directedEdges, linkMetric, height = 650 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<ForceGraphMethods<GraphNode, GraphLink> | undefined>(undefined);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w != null) setWidth(Math.max(0, Math.floor(w)));
    });
    ro.observe(el);
    setWidth(Math.max(0, Math.floor(el.clientWidth)));
    return () => ro.disconnect();
  }, []);

  const selectedEdges = useMemo(
    () => selectInterlockEdges(directedEdges, linkMetric, MAX_INTERLOCK_EDGES),
    [directedEdges, linkMetric]
  );
  const interlockStats = useMemo(() => getInterlockStats(selectedEdges), [selectedEdges]);
  const outSpokeCount = useMemo(() => {
    const m = new Map<number, number>();
    for (const e of selectedEdges) {
      m.set(e.source_id, (m.get(e.source_id) ?? 0) + 1);
    }
    return m;
  }, [selectedEdges]);

  const { nodes, links, maxLink, maxStrength } = useMemo(
    () => buildGraph(selectedEdges, linkMetric, outSpokeCount),
    [selectedEdges, linkMetric, outSpokeCount]
  );
  const [hoverText, setHoverText] = useState<string | null>(null);
  const imageCache = useRef(
    new Map<string, HTMLImageElement | "err" | "loading">()
  );
  const [imgVersion, setImgVersion] = useState(0);

  const imageUrlKey = useMemo(() => {
    const s = new Set<string>();
    for (const n of nodes) {
      if (n.imageUrl) s.add(n.imageUrl);
    }
    return Array.from(s).sort().join("\n");
  }, [nodes]);

  useEffect(() => {
    if (!imageUrlKey) return;
    for (const url of imageUrlKey.split("\n")) {
      if (!url) continue;
      if (imageCache.current.has(url)) continue;
      imageCache.current.set(url, "loading");
      const im = new Image();
      im.crossOrigin = "anonymous";
      im.onload = () => {
        imageCache.current.set(url, im);
        setImgVersion((v) => v + 1);
        requestAnimationFrame(() => fgRef.current?.d3ReheatSimulation());
      };
      im.onerror = () => {
        imageCache.current.set(url, "err");
        setImgVersion((v) => v + 1);
        requestAnimationFrame(() => fgRef.current?.d3ReheatSimulation());
      };
      im.src = url;
    }
  }, [imageUrlKey]);

  const getLoadedImage = useCallback(
    (url: string | null) => {
      if (!url) return null;
      const v = imageCache.current.get(url);
      if (!v || v === "err" || v === "loading") return null;
      if (v.naturalWidth > 0) return v;
      return null;
    },
    [imgVersion]
  );

  const graphData = useMemo(
    () => ({ nodes, links }),
    [nodes, links]
  );

  /**
   * Weak repulsion + short links + firm center: separate loops / clusters as close as the layout allows.
   * (Do not add d3 `forceCollide` from a second module — it can desync the sim and throw at tick time.)
   */
  useEffect(() => {
    if (graphData.nodes.length === 0 || width < 1) return;
    const t = setTimeout(() => {
      const fg = fgRef.current;
      if (!fg) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (fg.d3Force("charge") as any)?.strength?.(-260);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (fg.d3Force("link") as any)?.distance?.((l: object) => {
        const gl = l as GraphLink;
        const v = gl.value ?? 0;
        const m = maxLink > 0 ? maxLink : 1;
        return 72 + 38 * (v / m);
      });
      // Pull the mass centroid toward the view center so disjoint loops sit tighter together.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (fg.d3Force("center") as any)?.strength?.(1.45);
      fg.d3ReheatSimulation();
    }, 0);
    return () => clearTimeout(t);
  }, [graphData, maxLink, maxStrength, width]);

  const linkWidth = useCallback(
    (link: object) => {
      const l = link as GraphLink;
      return 0.5 + (5 * l.value) / maxLink;
    },
    [maxLink]
  );

  const linkColor = useCallback(() => "rgba(55, 65, 80, 0.55)", []);

  const nodeCanvasObject = useCallback(
    (node: object, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const n = node as GraphNode;
      if (n.x == null || n.y == null) return;
      const g = globalScale > 0 ? globalScale : 1;
      const R = nodeRadiusGraph(n, maxStrength);
      const { x, y } = n;
      const ir = R * 0.92;
      const img = getLoadedImage(n.imageUrl);

      const nameSize = Math.max(4.2 / g, R * 0.34);
      const nameStr = truncateProductName(n.name, 22);
      ctx.font = `500 ${nameSize}px system-ui, "Segoe UI", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
      ctx.fillText(nameStr, x, y - ir - 3 / g);

      if (n.isHub) {
        ctx.beginPath();
        ctx.arc(x, y, ir + 3.5 / g, 0, 2 * Math.PI);
        ctx.strokeStyle = "rgba(245, 158, 11, 0.88)";
        ctx.lineWidth = 1.6 / g;
        ctx.stroke();
      }

      if (img) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, ir, 0, 2 * Math.PI);
        ctx.closePath();
        ctx.clip();
        const d = ir * 2;
        try {
          ctx.drawImage(img, x - ir, y - ir, d, d);
        } catch {
          /* tainted or decode error */
        }
        ctx.restore();
        ctx.beginPath();
        ctx.arc(x, y, ir, 0, 2 * Math.PI);
        ctx.strokeStyle = "rgba(15, 23, 42, 0.25)";
        ctx.lineWidth = 1 / g;
        ctx.stroke();
      } else {
        if (n.role === "primary") {
          ctx.fillStyle = "#1e1e1e";
        } else if (n.role === "addon") {
          ctx.fillStyle = "#f8fafc";
        } else {
          ctx.fillStyle = "#a1a1aa";
        }
        ctx.beginPath();
        ctx.arc(x, y, ir, 0, 2 * Math.PI);
        ctx.fill();
        if (n.role === "addon") {
          ctx.strokeStyle = "rgba(23, 23, 23, 0.9)";
          ctx.lineWidth = 1.2 / g;
          ctx.stroke();
        }
        const ch = n.name.charAt(0).toUpperCase() || "·";
        const chSize = Math.max(6 / g, R * 0.55);
        ctx.font = `600 ${chSize}px system-ui, sans-serif`;
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        ctx.fillStyle = n.role === "primary" ? "#f8fafc" : "#0f172a";
        ctx.fillText(ch, x, y);
        ctx.textBaseline = "bottom";
        ctx.textAlign = "center";
      }

      const subSize = Math.max(3.2 / g, R * 0.2);
      ctx.font = `italic ${subSize}px "Times New Roman", Georgia, serif`;
      ctx.textBaseline = "top";
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(15, 23, 42, 0.65)";
      const subY = y + ir + 3 / g;
      ctx.fillText(`b${subscriptId(n.numId)}`, x, subY);
    },
    [getLoadedImage, maxStrength, imgVersion]
  );

  const nodePointerAreaPaint = useCallback(
    (node: object, color: string, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const n = node as GraphNode;
      if (n.x == null || n.y == null) return;
      const g = globalScale > 0 ? globalScale : 1;
      const R = nodeRadiusGraph(n, maxStrength);
      const ext = 40 / g + R * 0.58;
      ctx.beginPath();
      ctx.arc(n.x, n.y, R + ext, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
    },
    [maxStrength, imgVersion]
  );

  return (
    <div ref={containerRef} className="relative w-full">
      {nodes.length === 0 ? (
        <div
          className="flex items-center justify-center rounded-xl border border-slate-100 bg-slate-50/50 text-slate-400 text-sm"
          style={{ minHeight: height }}
        >
          No bundle relationships to show
        </div>
      ) : width < 1 ? (
        <div
          className="w-full rounded-xl border border-slate-100 bg-slate-50/30"
          style={{ minHeight: height }}
          aria-hidden
        />
      ) : (
        <>
          {hoverText && (
            <div className="absolute top-2 left-2 z-10 max-w-md rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs text-slate-600 shadow-sm pointer-events-none">
              {hoverText}
            </div>
          )}
          <ForceGraph2D
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ref={fgRef as any}
            width={width}
            height={height}
            graphData={graphData as { nodes: GraphNode[]; links: GraphLink[] }}
            nodeId="id"
            backgroundColor="rgba(255, 255, 255, 0.9)"
            linkDirectionalArrowLength={9}
            linkDirectionalArrowRelPos={1}
            linkDirectionalArrowColor={() => "rgba(55, 65, 80, 0.65)"}
            linkColor={linkColor}
            linkWidth={linkWidth}
            linkCurvature={0.14}
            linkCanvasObjectMode={() => "after"}
            linkCanvasObject={(link, ctx, globalScale) => {
              const l = link as GraphLink & { source: unknown; target: unknown };
              const s = l.source as unknown as GraphNode;
              const t = l.target as unknown as GraphNode;
              if (!s || !t || s.x == null || t.y == null || t.x == null) return;
              const midX = (s.x! + t.x!) / 2;
              const midY = (s.y! + t.y!) / 2;
              const fs = 11 / globalScale;
              ctx.font = `italic ${fs}px "Times New Roman", Georgia, serif`;
              ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
              const tnum =
                typeof t === "object" && t && "numId" in t
                  ? (t as GraphNode).numId
                  : l.targetNumId;
              const txt = `b${subscriptId(tnum)}`;
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillText(txt, midX, midY - 6);
            }}
            onLinkHover={(link) => {
              if (!link) {
                setHoverText(null);
                return;
              }
              const l = link as GraphLink;
              setHoverText(
                `Sales records: ${l.count}× line items · $${l.revenue.toFixed(2)} revenue (same orders)`
              );
            }}
            onNodeHover={(node) => {
              if (!node) {
                setHoverText(null);
                return;
              }
              const n = node as GraphNode;
              setHoverText(
                `${n.isHub ? "Hub (many add-ons) · " : ""}b${subscriptId(n.numId)} — ${n.name}`
              );
            }}
            nodeLabel={() => ""}
            nodeVal={(n) => 1.9 * Math.sqrt((n as GraphNode).strength) * ((n as GraphNode).isHub ? 1.1 : 1)}
            nodeRelSize={8.5}
            nodePointerAreaPaint={nodePointerAreaPaint}
            nodeCanvasObjectMode={() => "replace"}
            nodeCanvasObject={nodeCanvasObject}
            nodeColor={() => "transparent"}
            d3VelocityDecay={0.36}
            onEngineStop={() => {
              fgRef.current?.zoomToFit(320, 16);
            }}
            cooldownTicks={360}
            d3AlphaDecay={0.012}
            warmupTicks={220}
            enableNodeDrag
            enableZoomInteraction
            enablePanInteraction
            d3AlphaMin={0.001}
          />
          <p className="text-[11px] text-slate-400 mt-1 text-center leading-snug">
            <span className="text-slate-500">Interlock model:</span> multiple spokes per line item, plus
            chain follow-through (A→B→C). Amber ring = hub (≥{HUB_MIN_SPOKES} add-on links in this
            view). {interlockStats.chainSegments} chain step
            {interlockStats.chainSegments === 1 ? "" : "s"} · {interlockStats.hubCount} hub
            {interlockStats.hubCount === 1 ? "" : "s"}
            {interlockStats.topHubId != null
              ? ` (largest line item id ${interlockStats.topHubId} · ${interlockStats.topHubSpokes} add-ons here)`
              : ""}
            .             <span className="text-slate-500">Up to {MAX_INTERLOCK_EDGES} edges; thickness =</span>{" "}
            {linkMetric === "count" ? "order count" : "revenue weight"}. Thumbnails and names come from
            product records; size scales with the graph when you zoom; labels use a minimum screen
            size so they stay readable.
          </p>
        </>
      )}
    </div>
  );
}
