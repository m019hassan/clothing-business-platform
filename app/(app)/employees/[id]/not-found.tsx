import Link from "next/link";

export default function EmployeeNotFound() {
  return (
    <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
      <p className="text-sm font-semibold text-slate-800">Employee not found</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
        This employee account does not exist or is no longer active.
      </p>
      <Link href="/employees" className="mt-5 inline-flex rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100">
        Back to employees
      </Link>
    </section>
  );
}
