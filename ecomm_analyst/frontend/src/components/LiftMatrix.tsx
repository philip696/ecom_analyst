"use client";

import { clsx } from "clsx";

export type LiftRow = {
  product_a: string;
  product_b: string;
  confidence_ab: number;
  confidence_ba: number;
};

/** Built on the server from bundle line counts (same semantics as legacy rows). */
export type LiftMatrixFromDb = {
  product_ids: number[];
  product_names: string[];
  percent_matrix: (number | null)[][];
};

function maxPercentFromMatrix(matrix: LiftMatrixFromDb): number {
  let m = 1;
  for (const row of matrix.percent_matrix) {
    for (const v of row) {
      if (v != null && v > m) m = v;
    }
  }
  return m;
}

function maxPercentFromRows(rows: LiftRow[]): number {
  const topRows = rows.slice(0, 28);
  const lookup: Record<string, number> = {};
  topRows.forEach((r) => {
    lookup[`${r.product_a}||${r.product_b}`] = r.confidence_ab;
    lookup[`${r.product_b}||${r.product_a}`] = r.confidence_ba;
  });
  return Math.max(...Object.values(lookup), 1);
}

export default function LiftMatrix({
  matrix,
  rows = [],
}: {
  matrix?: LiftMatrixFromDb | null;
  rows?: LiftRow[];
}) {
  const n = matrix?.product_names.length ?? 0;
  const useDb =
    matrix &&
    n > 0 &&
    matrix.percent_matrix.length === n &&
    matrix.percent_matrix.every((row) => row.length === n);

  const maxConf = useDb
    ? maxPercentFromMatrix(matrix)
    : maxPercentFromRows(rows);

  function cellColor(val: number | null): string {
    if (val === null) return "bg-slate-50 text-slate-300";
    const intensity = val / maxConf;
    if (intensity > 0.75) return "bg-indigo-600 text-white";
    if (intensity > 0.5) return "bg-indigo-400 text-white";
    if (intensity > 0.25) return "bg-indigo-200 text-indigo-800";
    if (intensity > 0) return "bg-indigo-50 text-indigo-600";
    return "bg-slate-50 text-slate-300";
  }

  if (useDb) {
    const labels = matrix.product_names.map((p, i) => ({
      full: p,
      short: p.length > 10 ? `${p.slice(0, 9)}…` : p,
      letter: String.fromCharCode(65 + i),
      rowIndex: i,
    }));

    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="w-28 pb-2 pr-2 align-bottom text-left text-xs font-medium text-slate-400">
                Association
                <br />
                strength (%)
              </th>
              {labels.map((l) => (
                <th
                  key={`col-${l.rowIndex}`}
                  className="min-w-[52px] px-1 pb-2 text-center text-xs font-semibold text-slate-500"
                >
                  {l.letter}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {labels.map((row) => (
              <tr key={`row-${row.rowIndex}`}>
                <td className="whitespace-nowrap py-1 pr-3 text-xs font-semibold text-slate-600">
                  <span className="inline-flex max-w-[120px] items-center gap-1.5">
                    <span className="text-slate-400">{row.letter}</span>
                    <span className="truncate">{row.short}</span>
                  </span>
                </td>
                {labels.map((col) => {
                  const isSelf = row.rowIndex === col.rowIndex;
                  const val: number | null = isSelf
                    ? null
                    : (matrix.percent_matrix[row.rowIndex]?.[col.rowIndex] ?? 0);
                  return (
                    <td
                      key={`c-${row.rowIndex}-${col.rowIndex}`}
                      className={clsx(
                        "rounded px-1 py-1.5 text-center text-xs font-medium transition-colors",
                        isSelf ? "bg-slate-100 text-slate-300" : cellColor(val)
                      )}
                    >
                      {isSelf ? "—" : val !== null && val > 0 ? `${val}%` : "0%"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
          <span>Low</span>
          {["bg-indigo-50", "bg-indigo-200", "bg-indigo-400", "bg-indigo-600"].map((c) => (
            <span key={c} className={clsx("inline-block h-3 w-5 rounded", c)} />
          ))}
          <span>High</span>
          <span className="ml-1 italic text-slate-400 sm:ml-3">
            % = probability of buying column product given row product (same bundle line)
          </span>
        </div>
      </div>
    );
  }

  const topRows = rows.slice(0, 28);
  const productSet = new Set<string>();
  topRows.forEach((r) => {
    productSet.add(r.product_a);
    productSet.add(r.product_b);
  });
  const products = Array.from(productSet).slice(0, 8);

  const lookup: Record<string, number> = {};
  topRows.forEach((r) => {
    lookup[`${r.product_a}||${r.product_b}`] = r.confidence_ab;
    lookup[`${r.product_b}||${r.product_a}`] = r.confidence_ba;
  });

  if (!products.length) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-slate-300">
        No association data
      </div>
    );
  }

  const labels = products.map((p, i) => ({
    full: p,
    short: p.length > 10 ? `${p.slice(0, 9)}…` : p,
    letter: String.fromCharCode(65 + i),
  }));

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className="w-28 pb-2 pr-2 align-bottom text-left text-xs font-medium text-slate-400">
              Association
              <br />
              strength (%)
            </th>
            {labels.map((l) => (
              <th
                key={l.full}
                className="min-w-[52px] px-1 pb-2 text-center text-xs font-semibold text-slate-500"
              >
                {l.letter}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {labels.map((row) => (
            <tr key={row.full}>
              <td className="whitespace-nowrap py-1 pr-3 text-xs font-semibold text-slate-600">
                <span className="inline-flex max-w-[120px] items-center gap-1.5">
                  <span className="text-slate-400">{row.letter}</span>
                  <span className="truncate">{row.short}</span>
                </span>
              </td>
              {labels.map((col) => {
                const isSelf = row.full === col.full;
                const val: number | null = isSelf ? null : (lookup[`${row.full}||${col.full}`] ?? 0);
                return (
                  <td
                    key={col.full}
                    className={clsx(
                      "rounded px-1 py-1.5 text-center text-xs font-medium transition-colors",
                      isSelf ? "bg-slate-100 text-slate-300" : cellColor(val)
                    )}
                  >
                    {isSelf ? "—" : val !== null && val > 0 ? `${val}%` : "0%"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
        <span>Low</span>
        {["bg-indigo-50", "bg-indigo-200", "bg-indigo-400", "bg-indigo-600"].map((c) => (
          <span key={c} className={clsx("inline-block h-3 w-5 rounded", c)} />
        ))}
        <span>High</span>
        <span className="ml-1 italic text-slate-400 sm:ml-3">
          % = probability of buying column product given row product (same bundle line)
        </span>
      </div>
    </div>
  );
}
