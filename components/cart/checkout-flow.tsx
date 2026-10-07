"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { createAddressAction, type AddressFormState } from "@/modules/customers/application/address-actions";
import type { AddressView } from "@/modules/customers/application/addresses";
import type { GeoAddressSuggestion } from "@/modules/checkout/application/geo";
import type { OrderView } from "@/modules/order/types";
import { apiErrorMessage, apiRequest, type ApiErrorLabels } from "@/src/lib/api";
import { formatMoney } from "@/src/lib/format";
import { CheckIcon, MapPinIcon, PlusIcon, ShieldCheckIcon, SearchIcon } from "@/components/ui/icons";

const initialState: AddressFormState = { ok: true, message: "" };

type FlowLabels = {
  stepAddress: string;
  stepPayment: string;
  stepReview: string;
  pickAddress: string;
  newAddress: string;
  searchLabel: string;
  searchHint: string;
  noResults: string;
  recipient: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  region: string;
  postal: string;
  makeDefault: string;
  saveAddress: string;
  savingAddress: string;
  addressSaved: string;
  required: string;
  tooShort: string;
  phoneInvalid: string;
  noAddress: string;
  reviewTitle: string;
  confirmHint: string;
  total: string;
  cancelNew: string;
};

type CartLabels = {
  createdTitle: string;
  createdBody: string;
  paymentLine: string;
  notCreated: string;
  reservedNote: string;
  cancelNote: string;
  deliveryLine: string;
  viewOrder: string;
  allOrders: string;
  continueShopping: string;
  deliveryAddress: string;
  paymentMethod: string;
  cashOnDelivery: string;
  bankTransfer: string;
  creating: string;
  create: string;
};

type NewAddressFields = {
  recipientName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  region: string;
  postalCode: string;
  label: string;
  isDefault: boolean;
};

const emptyAddress: NewAddressFields = {
  recipientName: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  region: "",
  postalCode: "",
  label: "",
  isDefault: false,
};

type FieldKey = keyof Pick<NewAddressFields, "recipientName" | "phone" | "line1" | "city">;

/**
 * The whole checkout on one page: a progress bar over three steps (address, payment,
 * review), an address form with map-backed autocomplete, per-field validation as the
 * shopper types, and the order button at the end.
 */
export function CheckoutFlow({
  addresses,
  total,
  currency,
  labels,
  flow,
  errors,
}: {
  addresses: AddressView[];
  total: string;
  currency: string;
  labels: CartLabels;
  flow: FlowLabels;
  errors?: ApiErrorLabels;
}) {
  const router = useRouter();
  const defaultAddress = addresses.find((address) => address.isDefault) ?? addresses[0];
  const [addressId, setAddressId] = useState(defaultAddress?.id ?? "");
  const [addingNew, setAddingNew] = useState(addresses.length === 0);
  const [fields, setFields] = useState<NewAddressFields>(emptyAddress);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [paymentMethod, setPaymentMethod] = useState("CASH_ON_DELIVERY");
  const [suggestions, setSuggestions] = useState<GeoAddressSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressMessage, setAddressMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<OrderView | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setField = (key: keyof NewAddressFields, value: string | boolean) =>
    setFields((current) => ({ ...current, [key]: value }));

  const fieldError = (key: FieldKey): string | null => {
    const value = String(fields[key] ?? "").trim();

    if (value === "") {
      return flow.required;
    }

    if (key === "phone") {
      return value.replace(/\D/g, "").length >= 9 ? null : flow.phoneInvalid;
    }

    const minimum = key === "line1" ? 5 : 2;

    return value.length >= minimum ? null : flow.tooShort;
  };

  const newAddressValid = (["recipientName", "phone", "line1", "city"] as FieldKey[]).every(
    (key) => fieldError(key) === null,
  );
  const addressReady = addingNew ? newAddressValid : addressId !== "";
  const paymentReady = paymentMethod !== "";
  const completedSteps = (addressReady ? 1 : 0) + (addressReady && paymentReady ? 2 : 0);
  const progress = Math.round((completedSteps / 3) * 100);

  // Autocomplete: watch the address line and ask the map for Saudi matches.
  useEffect(() => {
    const query = fields.line1.trim();

    if (searchTimer.current) {
      clearTimeout(searchTimer.current);
    }

    if (!addingNew || query.length < 3 || touched.line1 !== true) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSuggestions([]);
      return undefined;
    }

    searchTimer.current = setTimeout(async () => {
      setSearching(true);

      try {
        const result = await apiRequest<{ suggestions: GeoAddressSuggestion[] }>(
          `/api/geo/search?q=${encodeURIComponent(query)}`,
        );
        setSuggestions(result.suggestions);
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 600);

    return () => {
      if (searchTimer.current) {
        clearTimeout(searchTimer.current);
      }
    };
  }, [fields.line1, addingNew, touched.line1]);

  const applySuggestion = (suggestion: GeoAddressSuggestion) => {
    setFields((current) => ({
      ...current,
      line1: suggestion.line1 || current.line1,
      city: suggestion.city || current.city,
      region: suggestion.region ?? current.region,
      postalCode: suggestion.postalCode ?? current.postalCode,
    }));
    setSuggestions([]);
  };

  const saveAddress = async () => {
    setTouched({ recipientName: true, phone: true, line1: true, city: true });

    if (!newAddressValid) {
      return;
    }

    setSavingAddress(true);
    setAddressMessage(null);

    const formData = new FormData();
    formData.set("recipientName", fields.recipientName);
    formData.set("phone", fields.phone);
    formData.set("line1", fields.line1);
    formData.set("line2", fields.line2);
    formData.set("city", fields.city);
    formData.set("region", fields.region);
    formData.set("postalCode", fields.postalCode);
    formData.set("label", fields.label);
    if (fields.isDefault) {
      formData.set("isDefault", "on");
    }

    try {
      const state = await createAddressAction(initialState, formData);

      if (!state.ok) {
        setAddressMessage(state.message);
        return;
      }

      setAddressMessage(flow.addressSaved);
      setAddingNew(false);
      setFields(emptyAddress);
      setTouched({});
      router.refresh();
    } catch {
      setAddressMessage(flow.addressSaved.replace(flow.addressSaved, "Unable to save the address right now."));
    } finally {
      setSavingAddress(false);
    }
  };

  const placeOrder = async () => {
    if (!addressReady) {
      setTouched({ recipientName: true, phone: true, line1: true, city: true });
      setError(flow.noAddress);
      return;
    }

    setPending(true);
    setError(null);

    try {
      const result = await apiRequest<{ order: OrderView }>("/api/orders", {
        method: "POST",
        body: JSON.stringify({ ...(addressId ? { addressId } : {}), paymentMethod }),
      });
      setCreatedOrder(result.order);
      router.refresh();
    } catch (requestError) {
      setError(apiErrorMessage(requestError, errors));
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  if (createdOrder) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
        <h3 className="text-sm font-semibold text-emerald-800">{labels.createdTitle}</h3>
        <p className="mt-1 text-sm text-emerald-700">
          {labels.createdBody
            .replace("{number}", createdOrder.orderNumber)
            .replace("{status}", createdOrder.status.replaceAll("_", " "))
            .replace("{total}", String(createdOrder.totalAmount))
            .replace("{currency}", createdOrder.currency)}
        </p>
        <ul className="mt-3 space-y-1 text-sm text-emerald-700">
          <li>
            {labels.paymentLine.replace(
              "{status}",
              createdOrder.payment ? createdOrder.payment.status.replaceAll("_", " ").toLowerCase() : labels.notCreated,
            )}
          </li>
          <li>{labels.reservedNote}</li>
          <li>{labels.cancelNote}</li>
          {createdOrder.deliveryAddress ? (
            <li>
              {labels.deliveryLine
                .replace("{recipient}", createdOrder.deliveryAddress.recipientName)
                .replace("{city}", createdOrder.deliveryAddress.city)
                .replace("{line1}", createdOrder.deliveryAddress.line1)}
            </li>
          ) : null}
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={`/orders/${createdOrder.id}`}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
          >
            {labels.viewOrder}
          </Link>
          <Link
            href="/orders"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-white"
          >
            {labels.allOrders}
          </Link>
          <Link
            href="/products"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-white"
          >
            {labels.continueShopping}
          </Link>
        </div>
      </div>
    );
  }

  const steps = [
    { key: "address", label: flow.stepAddress, done: addressReady },
    { key: "payment", label: flow.stepPayment, done: addressReady && paymentReady },
    { key: "review", label: flow.stepReview, done: addressReady && paymentReady },
  ];

  return (
    <div className="space-y-5">
      {/* Progress bar over the three steps, all on this one page. */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          {steps.map((step, position) => (
            <div key={step.key} className="flex flex-1 items-center gap-2">
              <span
                className={[
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  step.done ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-600",
                ].join(" ")}
              >
                {step.done ? <CheckIcon className="h-4 w-4" /> : position + 1}
              </span>
              <span className={["truncate text-xs font-semibold", step.done ? "text-emerald-700" : "text-slate-500"].join(" ")}>
                {step.label}
              </span>
              {position < steps.length - 1 ? (
                <span className={["mx-1 hidden h-0.5 flex-1 rounded sm:block", step.done ? "bg-emerald-500" : "bg-slate-200"].join(" ")} />
              ) : null}
            </div>
          ))}
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>

      {/* Step one: the delivery address. */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <MapPinIcon className="h-4 w-4 text-blue-700" />
          <h3 className="text-base font-bold text-slate-900">{flow.stepAddress}</h3>
        </div>

        {addresses.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {addresses.map((address) => (
              <li key={address.id}>
                <label
                  className={[
                    "flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition-colors",
                    addressId === address.id && !addingNew
                      ? "border-slate-900 bg-slate-50"
                      : "border-slate-200 hover:bg-slate-50",
                  ].join(" ")}
                >
                  <input
                    type="radio"
                    name="addressId"
                    value={address.id}
                    checked={addressId === address.id && !addingNew}
                    onChange={() => {
                      setAddressId(address.id);
                      setAddingNew(false);
                    }}
                    className="mt-1"
                  />
                  <span className="min-w-0">
                    <span className="block font-semibold text-slate-900">
                      {address.recipientName}
                      {address.isDefault ? <span className="ms-2 text-xs text-emerald-700">★</span> : null}
                    </span>
                    <span className="block text-xs text-slate-500">
                      {address.line1}
                      {address.city ? ` · ${address.city}` : ""} · {address.phone}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        ) : null}

        {!addingNew ? (
          <button
            type="button"
            onClick={() => setAddingNew(true)}
            className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            {flow.newAddress}
          </button>
        ) : (
          <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">{flow.searchLabel}</span>
              <span className="relative block">
                <SearchIcon className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={fields.line1}
                  onChange={(event) => {
                    setField("line1", event.target.value);
                    setTouched((current) => ({ ...current, line1: true }));
                  }}
                  onBlur={() => setTouched((current) => ({ ...current, line1: true }))}
                  placeholder={flow.searchHint}
                  className="w-full rounded-lg border border-slate-300 bg-white py-2 pe-3 ps-9 text-sm focus:border-slate-500 focus:outline-none"
                />
                {searching ? (
                  <span className="absolute end-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">…</span>
                ) : null}
              </span>
            </label>

            {suggestions.length > 0 ? (
              <ul className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                {suggestions.map((suggestion) => (
                  <li key={suggestion.label}>
                    <button
                      type="button"
                      onClick={() => applySuggestion(suggestion)}
                      className="block w-full px-3 py-2 text-start text-xs text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      {suggestion.label}
                    </button>
                  </li>
                ))}
              </ul>
            ) : touched.line1 === true && fields.line1.trim().length >= 3 && !searching ? (
              <p className="text-xs text-slate-400">{flow.noResults}</p>
            ) : null}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(
                [
                  ["recipientName", flow.recipient],
                  ["phone", flow.phone],
                  ["city", flow.city],
                  ["region", flow.region],
                  ["postalCode", flow.postal],
                  ["label", flow.line2],
                ] as [keyof NewAddressFields, string][]
              ).map(([key, label]) => {
                const errorText = (["recipientName", "phone", "city"] as FieldKey[]).includes(key as FieldKey)
                  ? touched[key] === true
                    ? fieldError(key as FieldKey)
                    : null
                  : null;

                return (
                  <label key={key} className="block text-sm">
                    <span className="mb-1 block font-medium text-slate-700">{label}</span>
                    <input
                      value={String(fields[key] ?? "")}
                      onChange={(event) => setField(key, event.target.value)}
                      onBlur={() => setTouched((current) => ({ ...current, [key]: true }))}
                      className={[
                        "w-full rounded-lg border px-3 py-2 text-sm focus:outline-none",
                        errorText ? "border-rose-400 focus:border-rose-500" : "border-slate-300 focus:border-slate-500",
                      ].join(" ")}
                    />
                    {errorText ? <span className="mt-1 block text-xs text-rose-600">{errorText}</span> : null}
                  </label>
                );
              })}
            </div>

            {touched.line1 === true && fieldError("line1") ? (
              <p className="text-xs text-rose-600">{fieldError("line1")}</p>
            ) : null}

            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={fields.isDefault}
                onChange={(event) => setField("isDefault", event.target.checked)}
              />
              {flow.makeDefault}
            </label>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={saveAddress}
                disabled={savingAddress}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:opacity-60"
              >
                {savingAddress ? flow.savingAddress : flow.saveAddress}
              </button>
              {addresses.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setAddingNew(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-white"
                >
                  {flow.cancelNew}
                </button>
              ) : null}
              {addressMessage ? <span className="text-xs text-slate-600">{addressMessage}</span> : null}
            </div>
          </div>
        )}
      </section>

      {/* Step two: how they pay. */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-900">{flow.stepPayment}</h3>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {(
            [
              ["CASH_ON_DELIVERY", labels.cashOnDelivery],
              ["BANK_TRANSFER", labels.bankTransfer],
            ] as [string, string][]
          ).map(([value, label]) => (
            <label
              key={value}
              className={[
                "flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm transition-colors",
                paymentMethod === value ? "border-slate-900 bg-slate-50" : "border-slate-200 hover:bg-slate-50",
              ].join(" ")}
            >
              <input
                type="radio"
                name="paymentMethod"
                value={value}
                checked={paymentMethod === value}
                onChange={() => setPaymentMethod(value)}
              />
              <span className="font-medium text-slate-800">{label}</span>
            </label>
          ))}
        </div>
      </section>

      {/* Step three: review and place the order. */}
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-900">{flow.reviewTitle}</h3>
        <dl className="space-y-2 text-sm">
          <div className="flex items-center justify-between border-t border-slate-100 pt-3">
            <dt className="text-base font-bold text-slate-900">{flow.total}</dt>
            <dd className="text-xl font-bold text-slate-950">{formatMoney(total, currency)}</dd>
          </div>
        </dl>
        <p className="flex items-start gap-2 text-xs text-slate-500">
          <ShieldCheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          {flow.confirmHint}
        </p>
        {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
        <button
          type="button"
          onClick={placeOrder}
          disabled={pending || !addressReady}
          className="w-full rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? labels.creating : labels.create}
        </button>
        {!addressReady ? <p className="text-xs text-amber-700">{flow.noAddress}</p> : null}
      </section>
    </div>
  );
}
