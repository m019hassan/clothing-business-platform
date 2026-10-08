"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { apiRequest } from "@/src/lib/api";
import type { PosSwapView } from "@/modules/pos/application/pos-swaps";
import { CheckCircle2Icon, Loader2Icon } from "@/components/ui/icons";

/** The stage keys in the order a swap moves through; the labels come from the dictionary. */
const STAGES = ["REQUESTED", "UNDER_REVIEW", "APPROVED", "SHIPPED", "RECEIVED"] as const;

type StageKey = (typeof STAGES)[number];

/** Dictionary key for each stage, in the same order. */
const STAGE_LABEL_KEYS = {
  REQUESTED: "requested",
  UNDER_REVIEW: "underReview",
  APPROVED: "approved",
  SHIPPED: "shipped",
  RECEIVED: "received",
} as const satisfies Record<StageKey, string>;

export type SwapLineInput = {
  orderItemId: string;
  productName: string;
  sku: string;
  remaining: number;
};

type SwapTrackerLabels = {
  sectionTitle: string;
  stepperLabel: string;
  stages: {
    requested: string;
    underReview: string;
    approved: string;
    shipped: string;
    received: string;
  };
  requestButton: string;
  requestTitle: string;
  quantity: string;
  reason: string;
  reasonPlaceholder: string;
  submit: string;
  submitting: string;
  cancel: string;
  empty: string;
  advance: string;
  advancing: string;
  restocked: string;
  liveHint: string;
  nothingLeft: string;
  unitsShort: string;
};

interface SwapTrackerProps {
  orderId: string;
  swaps: PosSwapView[];
  /** Sale lines that still have units neither returned nor swapped. */
  lines: SwapLineInput[];
  labels: SwapTrackerLabels;
  locale: string;
}

/** The poll interval for an in-flight exchange, in milliseconds. */
const REFRESH_MS = 15000;

/**
 * The exchange window for one invoice: every swap request as a stage stepper,
 * a form to open a new request, and a quiet poll that keeps the stages current
 * while the customer is looking at the screen.
 */
export function SwapTracker({ orderId, swaps, lines, labels, locale }: SwapTrackerProps) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [reason, setReason] = useState("");
  const [advancingId, setAdvancingId] = useState<string | null>(null);

  const hasActive = swaps.some((swap) => swap.stage !== "RECEIVED");

  // While an exchange is in flight the server holds the truth; a light poll of
  // the server component keeps the stepper honest without a websocket stack.
  useEffect(() => {
    if (!hasActive) {
      return undefined;
    }

    const timer = setInterval(() => router.refresh(), REFRESH_MS);

    return () => clearInterval(timer);
  }, [hasActive, router]);

  const setQuantity = (orderItemId: string, value: string) =>
    setQuantities((current) => ({ ...current, [orderItemId]: value }));

  const submitRequest = async () => {
    const chosen = lines
      .map((line) => ({ line, quantity: Number(quantities[line.orderItemId] ?? 0) }))
      .find((entry) => entry.quantity > 0);

    if (!chosen) {
      setError(labels.quantity);
      return;
    }

    setBusy(true);
    setError(null);

    try {
      await apiRequest(`/api/pos/sales/${orderId}/swaps`, {
        method: "POST",
        body: JSON.stringify({ orderItemId: chosen.line.orderItemId, quantity: chosen.quantity, reason: reason.trim() || undefined }),
      });
      setFormOpen(false);
      setQuantities({});
      setReason("");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };

  const advance = async (swapId: string, nextStage: StageKey) => {
    setBusy(true);
    setAdvancingId(swapId);
    setError(null);

    try {
      await apiRequest(`/api/pos/swaps/${swapId}/advance`, {
        method: "POST",
        body: JSON.stringify({ stage: nextStage }),
      });
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
      setAdvancingId(null);
    }
  };

  const stageLabel = (stage: string) => {
    const key = STAGE_LABEL_KEYS[stage as StageKey];

    return key ? labels.stages[key] : stage;
  };

  const dateFormat = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [locale],
  );

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print:hidden">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{labels.sectionTitle}</h2>
        {hasActive ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-medium text-blue-700">
            <Loader2Icon className="h-3 w-3 animate-spin" />
            {labels.liveHint}
          </span>
        ) : null}
      </div>

      {swaps.length === 0 && lines.length > 0 && !formOpen ? (
        <p className="mt-3 text-sm text-slate-500">{labels.empty}</p>
      ) : null}

      {swaps.length === 0 && lines.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">{labels.nothingLeft}</p>
      ) : null}

      <ul className="mt-3 space-y-4">
        {swaps.map((swap) => {
          const currentIndex = STAGES.indexOf(swap.stage as StageKey);
          const nextStage = currentIndex < STAGES.length - 1 ? STAGES[currentIndex + 1] : null;

          return (
            <li key={swap.id} className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">
                  {swap.productName}{" "}
                  <span className="font-mono text-xs text-slate-400">{swap.sku}</span>
                  <span className="ms-2 text-xs font-normal text-slate-500">
                    {labels.unitsShort.replace("{count}", String(swap.quantity))}
                  </span>
                  <span className="ms-2 text-xs font-normal text-slate-400">
                    {dateFormat.format(new Date(swap.createdAt))}
                  </span>
                </p>
                {swap.restockedAt ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                    <CheckCircle2Icon className="h-3 w-3" />
                    {labels.restocked}
                  </span>
                ) : null}
              </div>

              {/* Stage stepper: done → filled, current → ringed, future → hollow */}
              <ol
                aria-label={labels.stepperLabel}
                className="mt-4 flex items-start"
              >
                {STAGES.map((stage, index) => {
                  const done = index < currentIndex;
                  const current = index === currentIndex;

                  return (
                    <li
                      key={stage}
                      aria-current={current ? "step" : undefined}
                      className="flex min-w-0 flex-1 flex-col items-center"
                    >
                      <div className="flex w-full items-center">
                        <span
                          className={[
                            "h-2 flex-1 rounded-full",
                            index === 0 ? "bg-transparent" : done || current ? "bg-emerald-400" : "bg-slate-200",
                          ].join(" ")}
                        />
                        <span
                          className={[
                            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-bold",
                            done
                              ? "border-emerald-500 bg-emerald-500 text-white"
                              : current
                                ? "border-blue-500 bg-white text-blue-600"
                                : "border-slate-300 bg-white text-slate-400",
                          ].join(" ")}
                        >
                          {done ? <CheckCircle2Icon className="h-3.5 w-3.5" /> : index + 1}
                        </span>
                        <span
                          className={[
                            "h-2 flex-1 rounded-full",
                            index === STAGES.length - 1 ? "bg-transparent" : done ? "bg-emerald-400" : "bg-slate-200",
                          ].join(" ")}
                        />
                      </div>
                      <span
                        className={[
                          "mt-1.5 px-0.5 text-center text-[10px] leading-tight sm:text-xs",
                          current ? "font-bold text-blue-700" : done ? "font-medium text-emerald-700" : "text-slate-400",
                        ].join(" ")}
                      >
                        {stageLabel(stage)}
                      </span>
                    </li>
                  );
                })}
              </ol>

              {nextStage ? (
                <button
                  type="button"
                  onClick={() => advance(swap.id, nextStage)}
                  disabled={busy}
                  className="mt-4 min-h-11 w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-60 sm:w-auto"
                >
                  {advancingId === swap.id ? labels.advancing : labels.advance.replace("{stage}", stageLabel(nextStage))}
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>

      {/* New request */}
      {formOpen ? (
        <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{labels.requestTitle}</p>

          <ul className="space-y-2">
            {lines.map((line) => (
              <li key={line.orderItemId} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-slate-700">
                  {line.productName} <span className="font-mono text-xs text-slate-400">{line.sku}</span>
                  <span className="ms-1 text-xs text-slate-400">
                    · {labels.unitsShort.replace("{count}", String(line.remaining))}
                  </span>
                </span>
                <label className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">{labels.quantity}</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={line.remaining}
                    value={quantities[line.orderItemId] ?? ""}
                    onChange={(event) => setQuantity(line.orderItemId, event.target.value)}
                    placeholder={`0 / ${line.remaining}`}
                    className="w-20 rounded-lg border border-slate-300 px-2 py-2 text-sm focus:border-slate-500 focus:outline-none"
                  />
                </label>
              </li>
            ))}
          </ul>

          <label className="block text-sm">
            <span className="mb-1 block text-xs text-slate-500">{labels.reason}</span>
            <input
              type="text"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={labels.reasonPlaceholder}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-slate-500 focus:outline-none"
            />
          </label>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={submitRequest}
              disabled={busy}
              className="min-h-11 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:opacity-60"
            >
              {busy ? labels.submitting : labels.submit}
            </button>
            <button
              type="button"
              onClick={() => {
                setFormOpen(false);
                setQuantities({});
                setReason("");
                setError(null);
              }}
              className="min-h-11 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-white"
            >
              {labels.cancel}
            </button>
          </div>
        </div>
      ) : (
        lines.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setFormOpen(true);
              setError(null);
            }}
            className="mt-4 min-h-11 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 sm:w-auto"
          >
            {labels.requestButton}
          </button>
        )
      )}

      {error ? (
        <p role="alert" className="mt-3 text-sm text-rose-600">
          {error}
        </p>
      ) : null}
    </section>
  );
}
