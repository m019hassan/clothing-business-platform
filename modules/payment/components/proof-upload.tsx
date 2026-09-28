"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { apiErrorMessage, apiRequest, type ApiErrorLabels } from "@/src/lib/api";
import type { PaymentProofView } from "@/modules/payment/application/proofs";

export type ProofUploadLabels = {
  title: string;
  hint: string;
  chooseFile: string;
  upload: string;
  uploading: string;
  uploaded: string;
  replace: string;
  errors?: ApiErrorLabels;
};

/**
 * Collects the bank-transfer receipt for a payment that still awaits a decision.
 * The file goes to POST /api/payments/:id/proof as multipart/form-data.
 */
export function ProofUpload({
  paymentId,
  labels,
  existing,
}: {
  paymentId: string;
  labels: ProofUploadLabels;
  existing: { originalName: string; createdAt: string } | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function upload() {
    const file = inputRef.current?.files?.[0];

    if (!file) {
      setError(labels.chooseFile);
      return;
    }

    setPending(true);
    setError(null);

    try {
      const form = new FormData();
      form.append("file", file);

      await apiRequest<{ proof: PaymentProofView }>(`/api/payments/${paymentId}/proof`, {
        method: "POST",
        body: form,
      });

      setDone(true);
      router.refresh();
    } catch (requestError) {
      setError(apiErrorMessage(requestError, labels.errors));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
      <p className="text-xs font-semibold text-slate-700">{labels.title}</p>
      <p className="mt-1 text-xs text-slate-500">{labels.hint}</p>

      {existing && !done ? (
        <p className="mt-2 text-xs text-slate-600">
          {labels.uploaded}: {existing.originalName}
        </p>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          className="text-xs text-slate-600 file:me-2 file:rounded-lg file:border file:border-slate-300 file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-slate-700"
        />
        <button
          type="button"
          onClick={upload}
          disabled={pending}
          className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? labels.uploading : existing ? labels.replace : labels.upload}
        </button>
      </div>

      {done ? <p className="mt-2 text-xs font-medium text-emerald-700">{labels.uploaded}</p> : null}

      {error ? (
        <p role="alert" className="mt-2 text-xs text-rose-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
