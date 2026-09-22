"use client";

import { useActionState } from "react";

import {
  createAddressAction,
  deleteAddressAction,
  setDefaultAddressAction,
  type AddressFormState,
} from "@/modules/customers/application/address-actions";
import type { AddressView } from "@/modules/customers/application/addresses";

const initialState: AddressFormState = { ok: true, message: "" };

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2";
const labelClass = "mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500";

function AddressRow({ address }: { address: AddressView }) {
  const [defaultState, defaultAction, isSettingDefault] = useActionState(setDefaultAddressAction, initialState);
  const [deleteState, deleteAction, isDeleting] = useActionState(deleteAddressAction, initialState);

  return (
    <li className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 text-sm text-slate-700">
        <p className="font-medium text-slate-900">
          {address.label ?? "Address"}
          {address.isDefault ? (
            <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
              default
            </span>
          ) : null}
        </p>
        <p className="mt-1">
          {address.recipientName} · {address.phone}
        </p>
        <p className="mt-1 text-slate-600">
          {address.line1}
          {address.line2 ? `, ${address.line2}` : ""} · {address.city}
          {address.region ? `, ${address.region}` : ""} {address.postalCode ?? ""} · {address.country}
        </p>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {address.isDefault ? null : (
          <form action={defaultAction}>
            <input type="hidden" name="addressId" value={address.id} />
            <button
              type="submit"
              disabled={isSettingDefault}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
            >
              {isSettingDefault ? "Saving…" : "Set default"}
            </button>
          </form>
        )}
        <form action={deleteAction}>
          <input type="hidden" name="addressId" value={address.id} />
          <button
            type="submit"
            disabled={isDeleting}
            className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-50 disabled:opacity-60"
          >
            {isDeleting ? "Removing…" : "Remove"}
          </button>
        </form>
      </div>

      {defaultState.message && !defaultState.ok ? (
        <p role="alert" className="text-xs text-rose-700">
          {defaultState.message}
        </p>
      ) : null}
      {deleteState.message && !deleteState.ok ? (
        <p role="alert" className="text-xs text-rose-700">
          {deleteState.message}
        </p>
      ) : null}
    </li>
  );
}

export function AddressManager({ addresses }: { addresses: AddressView[] }) {
  const [state, formAction, isPending] = useActionState(createAddressAction, initialState);

  return (
    <div className="space-y-5">
      <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200">
        {addresses.length === 0 ? (
          <li className="px-5 py-6 text-sm text-slate-500">
            No delivery addresses yet. Add one to speed up checkout.
          </li>
        ) : (
          addresses.map((address) => <AddressRow key={address.id} address={address} />)
        )}
      </ul>

      <form action={formAction} className="rounded-xl border border-slate-200 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">New address</p>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="label" className={labelClass}>
              Label
            </label>
            <input id="label" name="label" placeholder="Home" className={inputClass} />
          </div>
          <div>
            <label htmlFor="recipientName" className={labelClass}>
              Recipient
            </label>
            <input id="recipientName" name="recipientName" required className={inputClass} />
          </div>
          <div>
            <label htmlFor="phone" className={labelClass}>
              Phone
            </label>
            <input id="phone" name="phone" required placeholder="+9665..." className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="line1" className={labelClass}>
              Address line 1
            </label>
            <input id="line1" name="line1" required className={inputClass} />
          </div>
          <div>
            <label htmlFor="line2" className={labelClass}>
              Address line 2
            </label>
            <input id="line2" name="line2" className={inputClass} />
          </div>
          <div>
            <label htmlFor="city" className={labelClass}>
              City
            </label>
            <input id="city" name="city" required className={inputClass} />
          </div>
          <div>
            <label htmlFor="region" className={labelClass}>
              Region
            </label>
            <input id="region" name="region" className={inputClass} />
          </div>
          <div>
            <label htmlFor="postalCode" className={labelClass}>
              Postal code
            </label>
            <input id="postalCode" name="postalCode" className={inputClass} />
          </div>
          <div>
            <label htmlFor="country" className={labelClass}>
              Country (ISO-2)
            </label>
            <input id="country" name="country" defaultValue="SA" maxLength={2} className={inputClass} />
          </div>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <input id="isDefault" name="isDefault" type="checkbox" className="h-4 w-4 rounded border-slate-300" />
          <label htmlFor="isDefault" className="text-sm text-slate-700">
            Use as my default delivery address
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Saving…" : "Add address"}
          </button>
          {state.message ? (
            <p role={state.ok ? "status" : "alert"} className={["text-sm", state.ok ? "text-emerald-700" : "text-rose-700"].join(" ")}>
              {state.message}
            </p>
          ) : null}
        </div>
      </form>
    </div>
  );
}
