import { DownloadIcon } from "@/components/ui/icons";

/**
 * A plain link to a CSV endpoint; the `download` attribute plus the server's
 * Content-Disposition make the browser save the file instead of navigating.
 * Styled like the print button so the invoice actions read as one group, and
 * tall enough for a thumb on a phone.
 */
export function CsvDownloadButton({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      download
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 active:scale-[0.98]"
    >
      <DownloadIcon className="h-4 w-4" />
      {label}
    </a>
  );
}
