import Link from "next/link";
import {buildBreadcrumbs} from "@/lib/navigation";

export default function ProductBreadcrumbs({
  product,
  section,
}: {
  product: {id: string; name: string};
  section: string;
}) {
  const items = buildBreadcrumbs(product, section);
  return (
    <nav className="breadcrumbs" aria-label="面包屑">
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`}>
          {index > 0 && <span className="breadcrumb-separator" aria-hidden="true">/</span>}
          {item.href ? (
            <Link href={item.href}>{item.label}</Link>
          ) : (
            <span aria-current={index === items.length - 1 ? "page" : undefined}>{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
