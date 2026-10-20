import Link from "next/link";

import type { RelatedProductView } from "@/modules/catalog/application/products";
import { formatMoney } from "@/src/lib/format";

/** "You may also like": same-category picks under the product. */
export function RelatedProducts({
  products,
  labels,
}: {
  products: RelatedProductView[];
  labels: { title: string; viewAll: string; off: string };
}) {
  if (products.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold tracking-tight text-slate-950 sm:text-xl">{labels.title}</h2>
        <Link href="/products" className="text-sm font-semibold text-slate-500 hover:text-slate-900">
          {labels.viewAll} →
        </Link>
      </div>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((related) => (
          <li key={related.id}>
            <Link href={`/products/${related.id}`} className="group block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
              <div className="aspect-[3/4] bg-slate-50">
                {related.imageId ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/products/images/${related.imageId}`}
                    alt={related.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-3xl font-bold text-slate-300">
                    {related.name.slice(0, 1)}
                  </div>
                )}
              </div>
              <div className="space-y-1 p-3">
                <p className="truncate text-sm font-semibold text-slate-900">{related.name}</p>
                <p className="flex items-center gap-2 text-sm">
                  <span className="font-bold text-slate-950">
                    {formatMoney(related.salePrice ?? related.basePrice, related.currency)}
                  </span>
                  {related.salePrice ? (
                    <span className="text-xs text-slate-400 line-through">
                      {formatMoney(related.basePrice, related.currency)}
                    </span>
                  ) : null}
                  {related.discountPercent ? (
                    <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                      -{related.discountPercent}% {labels.off}
                    </span>
                  ) : null}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
