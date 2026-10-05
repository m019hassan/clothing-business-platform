"use client";

import Link from "next/link";
import { useMemo, useState, useEffect, useRef } from "react";

import type { PosLabels } from "@/modules/pos/components/pos-labels";
import type { PosCatalogItemView, PosCatalogView, PosReceiptView } from "@/modules/pos/types";
import { PosProductCard } from "@/modules/pos/components/pos-product-card";
import { apiErrorMessage, apiRequest, type ApiErrorLabels } from "@/src/lib/api";
import { formatMoney } from "@/src/lib/format";
import {
  CheckCircle2Icon,
  GridIcon,
  ListIcon,
  Loader2Icon,
  SearchIcon,
  ShoppingBagIcon,
  StoreIcon,
} from "@/components/ui/icons";

type CartLine = { item: PosCatalogItemView; quantity: number };

export function PosTerminal({
  catalog,
  labels,
  preferEnglish = false,
  errors,
}: {
  catalog: PosCatalogView;
  labels: PosLabels;
  preferEnglish?: boolean;
  errors?: ApiErrorLabels;
}) {
  const [query, setQuery] = useState("");
  const [lines, setLines] = useState<CartLine[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<PosReceiptView | null>(null);
  const [view, setView] = useState<"list" | "cards">("list");
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const remembered = window.localStorage.getItem("pos-catalog-view");
    if (remembered === "cards" || remembered === "list") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setView(remembered);
    }
  }, []);

  const changeView = (next: "list" | "cards") => {
    setView(next);
    window.localStorage.setItem("pos-catalog-view", next);
  };

  const itemsWithRemaining = useMemo(() => {
    const inCart = new Map<string, number>();

    for (const line of lines) {
      inCart.set(line.item.variantId, line.quantity);
    }

    return catalog.items.map((item) => ({
      ...item,
      availableQuantity: Math.max(item.availableQuantity - (inCart.get(item.variantId) ?? 0), 0),
    }));
  }, [catalog.items, lines]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();

    if (needle.length === 0) {
      return itemsWithRemaining;
    }

    return itemsWithRemaining.filter(
      (item) =>
        item.sku.toLowerCase().includes(needle) ||
        item.productName.toLowerCase().includes(needle) ||
        (item.size ?? "").toLowerCase().includes(needle) ||
        (item.color ?? "").toLowerCase().includes(needle),
    );
  }, [itemsWithRemaining, query]);

  const saleGroups = useMemo(() => {
    const groups = new Map<string, { productId: string; productName: string; lines: typeof lines }>();

    for (const line of lines) {
      const group = groups.get(line.item.productId) ?? {
        productId: line.item.productId,
        productName: line.item.productName,
        lines: [] as typeof lines,
      };

      group.lines.push(line);
      groups.set(line.item.productId, group);
    }

    return [...groups.values()];
  }, [lines]);

  const cardGroups = useMemo(() => {
    const groups = new Map<string, PosCatalogItemView[]>();

    for (const item of filtered) {
      const group = groups.get(item.productId) ?? [];
      group.push(item);
      groups.set(item.productId, group);
    }

    return [...groups.values()].slice(0, 25);
  }, [filtered]);

  const total = lines.reduce((sum, line) => sum + Number(line.item.unitPrice) * line.quantity, 0);
  const totalItemCount = lines.reduce((sum, line) => sum + line.quantity, 0);

  const describeItem = (item: PosCatalogItemView) => {
    const attributes = [item.size, item.color].filter(Boolean).join(" · ");

    return attributes ? `${item.productName} · ${attributes}` : item.productName;
  };

  function addItem(item: PosCatalogItemView) {
    const shelfItem = catalog.items.find((entry) => entry.variantId === item.variantId) ?? item;
    const shelfQuantity = shelfItem.availableQuantity;

    setError(null);
    setLines((current) => {
      const existing = current.find((line) => line.item.variantId === item.variantId);

      if (!existing) {
        return shelfQuantity <= 0 ? current : [...current, { item: shelfItem, quantity: 1 }];
      }

      if (existing.quantity + 1 > shelfQuantity) {
        setError(
          labels.onlyAvailable
            .replace("{name}", describeItem(shelfItem))
            .replace("{count}", String(shelfQuantity)),
        );
        return current;
      }

      return current.map((line) =>
        line.item.variantId === item.variantId ? { ...line, quantity: line.quantity + 1 } : line,
      );
    });

    searchInputRef.current?.focus();
  }

  function changeQuantity(variantId: string, delta: number) {
    setLines((current) =>
      current
        .map((line) => {
          if (line.item.variantId !== variantId) {
            return line;
          }

          const next = line.quantity + delta;
          const shelfItem = catalog.items.find((entry) => entry.variantId === line.item.variantId) ?? line.item;

          if (next > shelfItem.availableQuantity) {
            setError(
              labels.onlyAvailable
                .replace("{name}", describeItem(shelfItem))
                .replace("{count}", String(shelfItem.availableQuantity)),
            );

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
      setError(apiErrorMessage(requestError, errors));
    } finally {
      setPending(false);
    }
  }

  if (receipt) {
    return (
      <div className="space-y-5">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6 shadow-sm">
          <div className="flex items-center gap-2.5 text-emerald-800">
            <CheckCircle2Icon className="h-6 w-6 text-emerald-600" />
            <h3 className="text-lg font-bold">{labels.saleCompleted}</h3>
          </div>
          <p className="mt-2 text-sm text-emerald-700">
            <span className="font-semibold">{receipt.orderNumber}</span> · {formatMoney(receipt.totalAmount, receipt.currency)} · {receipt.itemCount} {receipt.itemCount === 1 ? "item" : "items"} · {receipt.branchCode}
          </p>

          <div className="mt-4 rounded-xl border border-emerald-200/60 bg-white/80 p-4">
            <ul className="space-y-2 text-xs text-slate-700">
              {receipt.lines.map((line) => (
                <li key={line.variantId} className="flex justify-between border-b border-emerald-50 pb-1.5 last:border-0 last:pb-0">
                  <span>
                    <strong className="text-slate-900">{line.quantity}×</strong> {line.sku}
                  </span>
                  <span className="font-semibold text-slate-900">
                    {formatMoney(line.lineTotal, receipt.currency)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link
              href={`/pos/sales/${receipt.orderId}`}
              className="rounded-xl bg-slate-950 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-slate-800"
            >
              {labels.openInvoice}
            </Link>
            <button
              type="button"
              onClick={() => {
                setReceipt(null);
                setTimeout(() => searchInputRef.current?.focus(), 100);
              }}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              {labels.newSale}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(340px,1fr)]">
      {/* Products Catalog Terminal View */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-4">
        <div>
          <label htmlFor="pos-search" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
            {labels.findProduct}
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3.5 text-slate-400">
              <SearchIcon className="h-4 w-4" />
            </span>
            <input
              ref={searchInputRef}
              id="pos-search"
              type="search"
              autoFocus
              onKeyDown={(event) => {
                if (event.key !== "Enter") {
                  return;
                }

                const needle = query.trim().toLowerCase();
                const exact = catalog.items.find((item) => item.sku.toLowerCase() === needle);

                if (exact) {
                  event.preventDefault();
                  addItem(exact);
                  setQuery("");
                }
              }}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={labels.searchPlaceholder}
              className="w-full rounded-xl border border-slate-300 bg-white py-2.5 ps-10 pe-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-950/10"
            />
          </div>
        </div>

        {/* View Toggle and Result Count */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <span className="text-xs font-medium text-slate-500">
            {filtered.length} {labels.results}
          </span>
          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => changeView("list")}
              aria-pressed={view === "list"}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                view === "list" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <ListIcon className="h-3.5 w-3.5" />
              <span>{labels.viewList}</span>
            </button>
            <button
              type="button"
              onClick={() => changeView("cards")}
              aria-pressed={view === "cards"}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                view === "cards" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <GridIcon className="h-3.5 w-3.5" />
              <span>{labels.viewCards}</span>
            </button>
          </div>
        </div>

        {view === "cards" ? (
          <ul className="mt-3 grid md:grid-cols-2 gap-3 xl:grid-cols-3">
            {cardGroups.map((group) => (
              <PosProductCard
                key={group[0].productId}
                items={group}
                preferEnglish={preferEnglish}
                labels={{
                  addToSale: labels.addToSale,
                  availableInRow: labels.availableInRow,
                  colorLabel: labels.colorLabel,
                  sizeLabel: labels.sizeLabel,
                }}
                onAdd={addItem}
              />
            ))}
            {cardGroups.length === 0 ? (
              <li className="col-span-full py-12 text-center text-sm text-slate-500">{labels.noMatches}</li>
            ) : null}
          </ul>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtered.slice(0, 25).map((item) => (
              <li key={item.variantId} className="flex items-center justify-between gap-3 py-3 transition-colors hover:bg-slate-50/60 rounded-xl px-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{item.productName}</p>
                  <p className="truncate text-xs text-slate-700 font-medium">
                    {[item.size, item.color].filter(Boolean).join(" · ") || "—"}
                    <span className="ms-2 text-xs font-normal text-slate-500">
                      {labels.availableInRow} {item.availableQuantity}
                    </span>
                  </p>
                  <p className="truncate font-mono text-[11px] text-slate-400">{item.sku}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-sm font-bold text-slate-900">
                    {formatMoney(item.unitPrice, item.currency)}
                  </span>
                  <button
                    type="button"
                    onClick={() => addItem(item)}
                    disabled={item.availableQuantity <= 0}
                    className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                  >
                    {labels.addToSale}
                  </button>
                </div>
              </li>
            ))}
            {filtered.length === 0 ? <li className="py-12 text-center text-sm text-slate-500">{labels.noMatches}</li> : null}
          </ul>
        )}

        {filtered.length > 25 ? (
          <p className="text-xs text-slate-400 text-center pt-2">{labels.firstMatches}</p>
        ) : null}
      </section>

      {/* POS Cart / Register Panel */}
      <section className="h-fit rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm lg:sticky lg:top-24 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <StoreIcon className="h-4 w-4 text-blue-600" />
              <h3 className="text-base font-bold text-slate-900">{labels.currentSale}</h3>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {labels.branchNote.replace("{code}", catalog.branchCode)}
            </p>
          </div>
          {totalItemCount > 0 ? (
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
              {totalItemCount}
            </span>
          ) : null}
        </div>

        {lines.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <ShoppingBagIcon className="h-6 w-6" />
            </div>
            <p className="mt-3 text-xs text-slate-500">{labels.noItems}</p>
          </div>
        ) : (
          <ul className="space-y-2.5 max-h-[420px] overflow-y-auto pe-1">
            {saleGroups.map((group) => {
              const groupTotal = group.lines.reduce(
                (sum, line) => sum + Number(line.item.unitPrice) * line.quantity,
                0,
              );

              return (
                <li key={group.productId} className="overflow-hidden rounded-xl border border-slate-200/80">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-3 py-1.5">
                    <p className="min-w-0 truncate text-xs font-bold text-slate-900">{group.productName}</p>
                    <span className="shrink-0 text-xs font-semibold text-slate-700">
                      {formatMoney(String(groupTotal), group.lines[0].item.currency)}
                    </span>
                  </div>
                  <ul className="divide-y divide-slate-50">
                    {group.lines.map((line) => (
                      <li key={line.item.variantId} className="flex items-center justify-between gap-2 px-3 py-2">
                        <div className="min-w-0">
                          <p className="flex flex-wrap items-center gap-1">
                            {line.item.size ? (
                              <span className="rounded-md bg-slate-900 px-1.5 py-0.5 text-[11px] font-bold text-white">
                                {line.item.size}
                              </span>
                            ) : null}
                            {line.item.color ? (
                              <span className="flex items-center gap-1 rounded-full border border-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                                <span
                                  className="inline-block h-2 w-2 rounded-full border border-black/10"
                                  style={{ backgroundColor: line.item.colorHex ?? "transparent" }}
                                />
                                {preferEnglish ? (line.item.colorNameEn ?? line.item.color) : line.item.color}
                              </span>
                            ) : null}
                          </p>
                          <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                            {formatMoney(line.item.unitPrice, line.item.currency)} {labels.each}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center rounded-lg border border-slate-200 bg-white">
                          <button
                            type="button"
                            onClick={() => changeQuantity(line.item.variantId, -1)}
                            className="flex h-7 w-7 items-center justify-center text-xs font-bold text-slate-700 hover:bg-slate-100"
                          >
                            −
                          </button>
                          <span className="min-w-6 text-center text-xs font-bold text-slate-900">
                            {line.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => changeQuantity(line.item.variantId, 1)}
                            className="flex h-7 w-7 items-center justify-center text-xs font-bold text-slate-700 hover:bg-slate-100"
                          >
                            +
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
        )}

        <div className="border-t border-slate-100 pt-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-slate-600">{labels.total}</span>
            <span className="text-xl font-bold text-slate-950">
              {formatMoney(String(total), catalog.items[0]?.currency ?? "SAR")}
            </span>
          </div>

          <button
            type="button"
            onClick={completeSale}
            disabled={pending || lines.length === 0}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? (
              <>
                <Loader2Icon className="h-4 w-4 animate-spin" />
                <span>{labels.recording}</span>
              </>
            ) : (
              labels.completeSaleCash
            )}
          </button>

          {error ? (
            <p role="alert" className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
              {error}
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
