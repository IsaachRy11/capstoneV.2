import { Link } from "react-router-dom";

// A row of big icon buttons to the main places (like the quick-action grid of a phone app). `items` are
// { to, icon, label }. Five fit on a phone; the labels stay short.
export default function Shortcuts({ items }) {
  return (
    <nav aria-label="Shortcuts" className="card grid grid-cols-5 gap-1.5 p-3 sm:gap-3 sm:p-4">
      {items.map(({ to, icon: Icon, label }) => (
        <Link key={to + label} to={to} className="hover-lift group flex flex-col items-center gap-2 rounded-2xl border border-transparent px-1 py-2.5 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-tint text-tint-ink transition-transform duration-200 group-hover:scale-105 sm:h-14 sm:w-14">
            <Icon size={24} aria-hidden="true" />
          </span>
          <span className="text-[12px] font-semibold leading-tight text-ink-2 sm:text-[13px]">{label}</span>
        </Link>
      ))}
    </nav>
  );
}
