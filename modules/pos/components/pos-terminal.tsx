"use client";

import Link from "next/link";
import { useMemo, useState, useEffect, useRef, useCallback } from "react";

import type { PosLabels } from "@/modules/pos/components/pos-labels";
import type { PosCatalogItemView, PosCatalogView, PosReceiptView } from "@/modules/pos/types";
import { PosProductCard } from "@/modules/pos/components/pos-product-card";
import { apiErrorMessage, apiRequest, type ApiErrorLabels } from "@/src/lib/api";
import { formatMoney } from "@/src/lib/format";
import {
  CalculatorIcon,
  CheckCircle2Icon,
  GridIcon,
  ListIcon,
  Loader2Icon,
  PauseIcon,
  PlayIcon,
  PrinterIcon,
  SearchIcon,
  ShoppingBagIcon,
  StoreIcon,
  TrashIcon,
  Volume2Icon,
  VolumeXIcon,
  XIcon,
} from "@/components/ui/icons";

type CartLine = { item: PosCatalogItemView; quantity: number };

type HeldCart = {
  id: string;
  timestamp: number;
  label: string;
  lines: CartLine[];
  total: number;
  currency: string;
};

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
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [lines, setLines] = useState<CartLine[]>([]);
  const [heldCarts, setHeldCarts] = useState<HeldCart[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<PosReceiptView | null>(null);
  const [view, setView] = useState<"list" | "cards">("list");
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Cash / Change calculator modal state
  const [isCashModalOpen, setIsCashModalOpen] = useState(false);
  const [cashGiven, setCashGiven] = useState<string>("");
  const [isHeldModalOpen, setIsHeldModalOpen] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const cashInputRef = useRef<HTMLInputElement>(null);

  // Load saved preferences & held carts. Reading after mount keeps the server and the
  // first client render identical, so the synchronous set-state calls here are intended.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const rememberedView = window.localStorage.getItem("pos-catalog-view");
    if (rememberedView === "cards" || rememberedView === "list") {
      setView(rememberedView);
    }

    const rememberedSound = window.localStorage.getItem("pos-sound-enabled");
    if (rememberedSound !== null) {
      setSoundEnabled(rememberedSound === "true");
    }

    const rememberedHeld = window.localStorage.getItem("pos-held-carts");
    if (rememberedHeld) {
      try {
        setHeldCarts(JSON.parse(rememberedHeld));
      } catch {
        // Ignore JSON error
      }
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const changeView = (next: "list" | "cards") => {
    setView(next);
    window.localStorage.setItem("pos-catalog-view", next);
  };

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      window.localStorage.setItem("pos-sound-enabled", String(next));
      return next;
    });
  };

  // Synthesized audio feedback for barcode scan / item added
  const playBeep = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime); // 880 Hz A5 note
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch {
      // Audio might be blocked before interaction
    }
  }, [soundEnabled]);

  // Extract all distinct categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const item of catalog.items) {
      if (item.categoryName) {
        set.add(item.categoryName);
      }
    }
    return Array.from(set).sort();
  }, [catalog.items]);

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

    return itemsWithRemaining.filter((item) => {
      // Category filter
      if (selectedCategory && item.categoryName !== selectedCategory) {
        return false;
      }

      // Search query filter
      if (needle.length === 0) {
        return true;
      }

      return (
        item.sku.toLowerCase().includes(needle) ||
        item.productName.toLowerCase().includes(needle) ||
        (item.size ?? "").toLowerCase().includes(needle) ||
        (item.color ?? "").toLowerCase().includes(needle)
      );
    });
  }, [itemsWithRemaining, query, selectedCategory]);

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
  const currency = catalog.items[0]?.currency ?? "SAR";

  const parsedCashGiven = Number(cashGiven) || 0;
  const changeDue = Math.max(parsedCashGiven - total, 0);
  const remainingDue = Math.max(total - parsedCashGiven, 0);

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
        if (shelfQuantity <= 0) return current;
        playBeep();
        return [...current, { item: shelfItem, quantity: 1 }];
      }

      if (existing.quantity + 1 > shelfQuantity) {
        setError(
          labels.onlyAvailable
            .replace("{name}", describeItem(shelfItem))
            .replace("{count}", String(shelfQuantity)),
        );
        return current;
      }

      playBeep();
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

  // Hold (Park) current cart
  function holdCurrentCart() {
    if (lines.length === 0) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const newHeld: HeldCart = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      label: `فاتورة معلقة (${totalItemCount} قطع - ${timeStr})`,
      lines: [...lines],
      total,
      currency,
    };

    const updated = [newHeld, ...heldCarts];
    setHeldCarts(updated);
    window.localStorage.setItem("pos-held-carts", JSON.stringify(updated));
    setLines([]);
    searchInputRef.current?.focus();
  }

  // Resume held cart. Stock may have moved while the ticket was parked, so each line is
  // matched against the shelf again: quantities clamp to what is left, and lines whose
  // stock is gone are dropped with a notice.
  function resumeCart(heldId: string) {
    const target = heldCarts.find((c) => c.id === heldId);
    if (!target) return;

    const restored = [];
    let adjusted = false;

    for (const held of target.lines) {
      const shelfItem = catalog.items.find((entry) => entry.variantId === held.item.variantId);

      if (!shelfItem || shelfItem.availableQuantity <= 0) {
        adjusted = true;
        continue;
      }

      const quantity = Math.min(held.quantity, shelfItem.availableQuantity);

      if (quantity !== held.quantity) {
        adjusted = true;
      }

      restored.push({ item: shelfItem, quantity });
    }

    setLines(restored);

    if (adjusted) {
      setError("تم تحديث الفاتورة المعلقة حسب المخزون الحالي — راجع الكميات قبل إتمام البيع.");
    }

    const updated = heldCarts.filter((c) => c.id !== heldId);
    setHeldCarts(updated);
    window.localStorage.setItem("pos-held-carts", JSON.stringify(updated));
    setIsHeldModalOpen(false);
    searchInputRef.current?.focus();
  }

  // Delete held cart
  function deleteHeldCart(heldId: string) {
    const updated = heldCarts.filter((c) => c.id !== heldId);
    setHeldCarts(updated);
    window.localStorage.setItem("pos-held-carts", JSON.stringify(updated));
  }

  // Clear current active cart
  function clearActiveCart() {
    if (lines.length === 0) return;
    if (window.confirm("هل أنت متأكد من مسح الفاتورة الحالية؟")) {
      setLines([]);
      searchInputRef.current?.focus();
    }
  }

  // Trigger cash payment modal
  function openCashModal() {
    if (lines.length === 0) return;
    setCashGiven(String(total));
    setIsCashModalOpen(true);
    setTimeout(() => cashInputRef.current?.select(), 100);
  }

  // Execute sale via API
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
      setIsCashModalOpen(false);
    } catch (requestError) {
      setError(apiErrorMessage(requestError, errors));
    } finally {
      setPending(false);
    }
  }

  // Keyboard shortcuts listener (F2: search, F4: pay, F9: hold, Esc: close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F2: focus barcode search
      if (e.key === "F2") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }

      // F4: open cash payment
      if (e.key === "F4") {
        e.preventDefault();
        if (lines.length > 0 && !isCashModalOpen) {
          openCashModal();
        }
      }

      // F9: hold cart
      if (e.key === "F9") {
        e.preventDefault();
        if (lines.length > 0) {
          holdCurrentCart();
        }
      }

      // Escape: close modal
      if (e.key === "Escape") {
        if (isCashModalOpen) setIsCashModalOpen(false);
        if (isHeldModalOpen) setIsHeldModalOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines, isCashModalOpen, isHeldModalOpen, total]);

  // Denominations for quick cash buttons
  const denominations = useMemo(() => {
    const list = [total];
    const rounded50 = Math.ceil(total / 50) * 50;
    const rounded100 = Math.ceil(total / 100) * 100;
    const rounded200 = Math.ceil(total / 200) * 200;

    if (!list.includes(rounded50) && rounded50 > total) list.push(rounded50);
    if (!list.includes(rounded100) && rounded100 > total) list.push(rounded100);
    if (!list.includes(rounded200) && rounded200 > total) list.push(rounded200);

    // Common standard bills
    for (const bill of [50, 100, 200, 500]) {
      if (bill >= total && !list.includes(bill)) {
        list.push(bill);
      }
    }

    return list.sort((a, b) => a - b).slice(0, 5);
  }, [total]);

  // Completed Receipt View
  if (receipt) {
    return (
      <div className="space-y-5">
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50/80 p-6 sm:p-8 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-emerald-900">
              <CheckCircle2Icon className="h-8 w-8 text-emerald-600" />
              <div>
                <h3 className="text-xl font-bold">{labels.saleCompleted}</h3>
                <p className="text-xs text-emerald-700">رقم الفاتورة: {receipt.orderNumber} · الفرع: {receipt.branchCode}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-white px-4 py-2 text-xs font-bold text-emerald-800 shadow-xs hover:bg-emerald-50"
            >
              <PrinterIcon className="h-4 w-4" />
              <span>طباعة الإيصال (Print)</span>
            </button>
          </div>

          <div className="mt-6 rounded-2xl border border-emerald-200/60 bg-white/90 p-5 shadow-xs">
            <ul className="divide-y divide-emerald-50 text-xs">
              {receipt.lines.map((line) => (
                <li key={line.variantId} className="flex justify-between py-2">
                  <span>
                    <strong className="text-slate-900">{line.quantity}×</strong> {line.productName} ({line.sku})
                  </span>
                  <span className="font-bold text-slate-900">
                    {formatMoney(line.lineTotal, receipt.currency)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex items-center justify-between border-t border-emerald-100 pt-3 text-sm">
              <span className="font-bold text-slate-700">{labels.total}</span>
              <span className="text-lg font-bold text-slate-950">
                {formatMoney(receipt.totalAmount, receipt.currency)}
              </span>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href={`/pos/sales/${receipt.orderId}`}
              className="rounded-xl bg-slate-950 px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-slate-800"
            >
              {labels.openInvoice}
            </Link>
            <button
              type="button"
              onClick={() => {
                setReceipt(null);
                setTimeout(() => searchInputRef.current?.focus(), 100);
              }}
              className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              {labels.newSale}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pos-screen space-y-4">
      {/* Keyboard Shortcuts & Utility Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-2.5 shadow-xs">
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
          <span className="font-bold text-slate-700">اختصارات سريعة:</span>
          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-700">
            F2 بحث
          </span>
          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-700">
            F4 دفع
          </span>
          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-700">
            F9 تعليق الفاتورة
          </span>
          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-700">
            Esc إغلاق
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Audio Beep Switcher */}
          <button
            type="button"
            onClick={toggleSound}
            title={soundEnabled ? "إيقاف صوت الباركود" : "تشغيل صوت الباركود"}
            className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-medium transition-colors ${
              soundEnabled
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-slate-200 bg-slate-50 text-slate-400"
            }`}
          >
            {soundEnabled ? <Volume2Icon className="h-3.5 w-3.5" /> : <VolumeXIcon className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{soundEnabled ? "صوت الباركود: مفعل" : "صوت الباركود: صامت"}</span>
          </button>

          {/* Held Carts Badge Button */}
          {heldCarts.length > 0 ? (
            <button
              type="button"
              onClick={() => setIsHeldModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 transition-colors hover:bg-amber-100"
            >
              <PauseIcon className="h-3.5 w-3.5" />
              <span>فواتير معلقة ({heldCarts.length})</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* Main Terminal Layout */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(360px,1fr)]">
        {/* Left: Products Catalog & Search */}
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-4">
          {/* Barcode Search Box */}
          <div>
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
                placeholder="امسح الباركود بالماسح أو اكتب اسم الموديل أو المقاس (ثم اضغط Enter)..."
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 ps-10 pe-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-950/10"
              />
            </div>
          </div>

          {/* Quick Category Pills Bar */}
          {categories.length > 0 ? (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => setSelectedCategory(null)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                  selectedCategory === null
                    ? "bg-slate-950 text-white shadow-xs"
                    : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                الكل ({catalog.items.length})
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                    selectedCategory === cat
                      ? "bg-slate-950 text-white shadow-xs"
                      : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          ) : null}

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

          {/* Products List or Cards */}
          {view === "cards" ? (
            <ul className="mt-3 grid md:grid-cols-2 gap-3 xl:grid-cols-3 max-h-[580px] overflow-y-auto pe-1">
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
            <ul className="divide-y divide-slate-100 max-h-[580px] overflow-y-auto pe-1">
              {filtered.slice(0, 30).map((item) => (
                <li key={item.variantId} className="flex items-center justify-between gap-3 py-3 transition-colors hover:bg-slate-50/60 rounded-xl px-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">{item.productName}</p>
                    <p className="truncate text-xs text-slate-700 font-semibold mt-0.5">
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
                      className="rounded-xl bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                    >
                      {labels.addToSale}
                    </button>
                  </div>
                </li>
              ))}
              {filtered.length === 0 ? <li className="py-12 text-center text-sm text-slate-500">{labels.noMatches}</li> : null}
            </ul>
          )}

          {filtered.length > 30 ? (
            <p className="text-xs text-slate-400 text-center pt-2">{labels.firstMatches}</p>
          ) : null}
        </section>

        {/* Right: Active Ticket / Cart Register */}
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

            {/* Hold & Clear Quick Action Buttons */}
            {lines.length > 0 ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={holdCurrentCart}
                  title="تعليق الفاتورة الحالية (F9)"
                  className="inline-flex items-center gap-1 rounded-xl border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100"
                >
                  <PauseIcon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">تعليق (F9)</span>
                </button>
                <button
                  type="button"
                  onClick={clearActiveCart}
                  title="مسح الفاتورة"
                  className="rounded-xl border border-slate-200 p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                >
                  <TrashIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : null}
          </div>

          {lines.length === 0 ? (
            <div className="py-14 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-100 text-slate-400">
                <ShoppingBagIcon className="h-7 w-7" />
              </div>
              <p className="mt-3 text-xs text-slate-500">{labels.noItems}</p>
              <p className="mt-1 text-[11px] text-slate-400">امسح قطعة بالباركود أو اختر من الكتالوج</p>
            </div>
          ) : (
            <ul className="space-y-2.5 max-h-[380px] overflow-y-auto pe-1">
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

          {/* Register Bottom Summary & Pay Trigger */}
          <div className="border-t border-slate-100 pt-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-600">{labels.total}</span>
              <span className="text-2xl font-bold tracking-tight text-slate-950">
                {formatMoney(String(total), currency)}
              </span>
            </div>

            <button
              type="button"
              onClick={openCashModal}
              disabled={pending || lines.length === 0}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CalculatorIcon className="h-4 w-4" />
              <span>إتمام البيع وحساب الباقي (F4)</span>
            </button>

            {error ? (
              <p role="alert" className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                {error}
              </p>
            ) : null}
          </div>
        </section>
      </div>

      {/* QUICK CASH & CHANGE CALCULATOR MODAL */}
      {isCashModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CalculatorIcon className="h-5 w-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">حاسبة النقدية السريعة وإصدار الفاتورة</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCashModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Order Total Highlight */}
            <div className="rounded-2xl bg-slate-50 p-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">إجمالي الحساب المطلوب</p>
              <p className="mt-1 text-3xl font-extrabold text-slate-950">
                {formatMoney(String(total), currency)}
              </p>
            </div>

            {/* Cash Given Input */}
            <div>
              <label htmlFor="cash-given" className="block text-xs font-bold text-slate-700 mb-1.5">
                المبلغ المستلم من العميل نقداً:
              </label>
              <div className="relative">
                <input
                  ref={cashInputRef}
                  id="cash-given"
                  type="number"
                  step="any"
                  value={cashGiven}
                  onChange={(e) => setCashGiven(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !pending && parsedCashGiven >= total) {
                      e.preventDefault();
                      completeSale();
                    }
                  }}
                  className="w-full rounded-xl border border-slate-300 py-3 ps-4 pe-12 text-2xl font-bold text-slate-900 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-950/10"
                />
                <span className="pointer-events-none absolute inset-y-0 end-0 flex items-center pe-4 text-xs font-bold text-slate-400">
                  {currency}
                </span>
              </div>
            </div>

            {/* Quick Denominations Pills */}
            <div className="flex flex-wrap gap-2">
              {denominations.map((denom) => (
                <button
                  key={denom}
                  type="button"
                  onClick={() => setCashGiven(String(denom))}
                  className={`flex-1 min-w-[70px] rounded-xl border py-2 text-xs font-bold transition-all ${
                    parsedCashGiven === denom
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {denom === total ? "المبلغ بالضبط" : formatMoney(String(denom), currency)}
                </button>
              ))}
            </div>

            {/* Change Due Display */}
            {parsedCashGiven >= total ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center">
                <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">
                  الباقي للعميل (Change Due)
                </p>
                <p className="mt-1 text-2xl font-black text-emerald-700">
                  {formatMoney(String(changeDue), currency)}
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-center">
                <p className="text-xs font-semibold text-amber-800">
                  المتبقي لإتمام المبلغ: <strong className="font-bold">{formatMoney(String(remainingDue), currency)}</strong>
                </p>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsCashModalOpen(false)}
                className="flex-1 rounded-xl border border-slate-200 py-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                إلغاء (Esc)
              </button>
              <button
                type="button"
                onClick={completeSale}
                disabled={pending || parsedCashGiven < total}
                className="flex-[2] flex items-center justify-center gap-2 rounded-xl bg-slate-950 py-3 text-xs font-bold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
              >
                {pending ? (
                  <>
                    <Loader2Icon className="h-4 w-4 animate-spin" />
                    <span>جاري التسجيل...</span>
                  </>
                ) : (
                  <span>تأكيد وطباعة الإيصال (Enter)</span>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* HELD / PARKED CARTS MODAL */}
      {isHeldModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <PauseIcon className="h-5 w-5 text-amber-600" />
                <h3 className="text-base font-bold text-slate-900">الفواتير المعلقة في الذاكرة ({heldCarts.length})</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsHeldModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <ul className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
              {heldCarts.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-3 px-2 rounded-xl hover:bg-slate-50">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{c.label}</p>
                    <p className="text-xs text-slate-500 font-medium">
                      إجمالي: <strong className="text-slate-800">{formatMoney(String(c.total), c.currency)}</strong> · {c.lines.length} موديلات
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => resumeCart(c.id)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-slate-950 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800"
                    >
                      <PlayIcon className="h-3 w-3" />
                      <span>استرجاع</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteHeldCart(c.id)}
                      className="rounded-xl border border-slate-200 p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setIsHeldModalOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                إغلاق (Esc)
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
