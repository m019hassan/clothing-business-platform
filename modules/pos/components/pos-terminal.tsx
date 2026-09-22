"use client";

import { useMemo, useState } from "react";

import type { PosCatalogItemView, PosCatalogView, PosReceiptView } from "@/modules/pos/types";
import { apiErrorMessage, apiRequest } from "@/src/lib/api";
import { formatMoney } from "@/src/lib/format";

type CartLine = { item: PosCatalogItemView; quantity: number };

export function PosTerminal({ catalog }: { catalog: PosCatalogView }) {
  const [query, setQuery] = useState("");
  const [lines, setLines] = useState<CartLine[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<PosReceiptView | null>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();

    if (needle.length === 0) {
      return catalog.items;
    }

    return catalog.items.filter(
      (item) =>
        item.sku.toLowerCase().includes(needle) ||
        item.productName.toLowerCase().includes(needle) ||
        (item.size ?? "").toLowerCase().includes(needle) ||
        (item.color ?? "").toLowerCase().includes(needle),
    );
  }, [catalog.items, query]);

  const total = lines.reduce((sum, line) => sum + Number(line.item.unitPrice) * line.quantity, 0);

  function addItem(item: PosCatalogItemView) {
    setError(null);
    setLines((current) => {
      const existing = current.find((line) => line.item.variantId === item.variantId);

      if (!existing) {
        return [...current, { item, quantity: 1 }];
      }

      if (existing.quantity + 1 > item.availableQuantity) {
        setError(`${item.sku}: only ${item.availableQuantity} available.`);
        return current;
      }

      return current.map((line) =>
        line.item.variantId === item.variantId ? { ...line, quantity: line.quantity + 1 } : line,
      );
    });
  }

  function changeQuantity(variantId: string, delta: number) {
    setLines((current) =>
      current
        .map((line) => {
          if (line.item.variantId !== variantId) {
            return line;
          }

          const next = line.quantity + delta;

          if (next > line.item.availableQuantity) {
            setError(`${line.item.sku}: only ${line.item.availableQuantity} available.`);

            return line;
          }

          return { ...line, quantity: next };
        })
        .filter((line) => line.quantity > 0),
    );
  }

  async function completeSale() {
    setPending(true);
    setError(null);

    try {
      const result = await apiRequest<{ receipt: PosReceiptView }>("/api/pos/sales", {
        method: "POST",
        body: JSON.stringify({
          items: lines.map((line) => ({ variantId: line.item.variantId, quantity: line.quantity })),
        }),
      });

      setReceipt(result.receipt);
      setLines([]);
    } catch (requestError) {
      setError(apiErrorMessage(requestError));
    } finally {
      setPending(false);
    }
  }

  if (receipt) {
    return (
      <div className="space-y-5">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
          <h3 className="text-base font-semibold text-emerald-800">Sale completed</h3>
          <p className="mt-1 text-sm text-emerald-700">
            {receipt.orderNumber} · {formatMoney(receipt.totalAmount, receipt.currency)} · {receipt.itemCount} item
            {receipt.itemCount === 1 ? "" : "s"} · branch {receipt.branchCode}
          </p>
          <ul className="mt-4 space-y-1 text-sm text-emerald-800">
            {receipt.lines.map((line) => (
              <li key={line.variantId}>
                {line.quantity} × {line.sku} @ {formatMoney(line.unitPrice, receipt.currency)} ={" "}
                {formatMoney(line.lineTotal, receipt.currency)}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setReceipt(null)}
            className="mt-5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
          >
            New sale
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <label htmlFor="pos-search" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
          Find a product
        </label>
        <input
          id="pos-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="SKU, name, size or color"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
        />

        <ul className="mt-4 divide-y divide-slate-100">
          {filtered.slice(0, 25).map((item) => (
            <li key={item.variantId} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">{item.productName}</p>
                <p className="text-xs text-slate-500">
                  {item.sku}
                  {item.size ? ` · ${item.size}` : ""}
                  {item.color ? ` · ${item.color}` : ""} · available {item.availableQuantity}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-sm font-semibold text-slate-800">
                  {formatMoney(item.unitPrice, item.currency)}
                </span>
                <button
                  type="button"
                  onClick={() => addItem(item)}
                  disabled={item.availableQuantity <= 0}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Add
                </button>
              </div>
            </li>
          ))}
          {filtered.length === 0 ? <li className="py-6 text-sm text-slate-500">No matching products.</li> : null}
        </ul>
        {filtered.length > 25 ? (
          <p className="mt-3 text-xs text-slate-400">Showing the first 25 matches — refine the search.</p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900">Current sale</h3>
        <p className="mt-1 text-xs text-slate-500">
          Branch {catalog.branchCode} · cash payment, confirmed immediately.
        </p>

        {lines.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No items yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {lines.map((line) => (
              <li key={line.item.variantId} className="flex items-center justify-between gap-2 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm text-slate-900">{line.item.sku}</p>
                  <p className="text-xs text-slate-500">
                    {formatMoney(line.item.unitPrice, line.item.currency)} each
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => changeQuantity(line.item.variantId, -1)}
                    className="h-7 w-7 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700"
                  >
                    −
                  </button>
                  <span className="w-6 text-center text-sm text-slate-800">{line.quantity}</span>
                  <button
                    type="button"
                    onClick={() => changeQuantity(line.item.variantId, 1)}
                    className="h-7 w-7 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700"
                  >
                    +
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-sm">
          <span className="font-medium text-slate-600">Total</span>
          <span className="text-lg font-semibold text-slate-900">
            {formatMoney(String(total), catalog.items[0]?.currency ?? "SAR")}
          </span>
        </p>

        <button
          type="button"
          onClick={completeSale}
          disabled={pending || lines.length === 0}
          className="mt-4 w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Recording…" : "Complete sale (cash)"}
        </button>

        {error ? (
          <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        ) : null}
      </section>
    </div>
  );
}
