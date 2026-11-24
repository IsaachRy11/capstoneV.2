// A card with a photo behind it and light text on top. The photo is decoration (empty alt); a flat dark layer keeps
// the text readable in both themes. Photos live in /public/photos (Unsplash, see the credits on the landing page).
export default function PhotoHero({ src, position = "center", as: Tag = "section", className = "", children }) {
  return (
    <Tag className={`photo-hero relative isolate overflow-hidden text-white ${className}`}>
      <img src={src} alt="" aria-hidden="true" decoding="async" className="absolute inset-0 -z-20 h-full w-full object-cover" style={{ objectPosition: position }} />
      <span className="photo-scrim absolute inset-0 -z-10" aria-hidden="true" />
      {children}
    </Tag>
  );
}

// Frosted-glass chip row: small labeled facts over a photo (like the weather row of a phone app).
export function GlassFacts({ items }) {
  return (
    <dl className="glass grid grid-cols-2 gap-x-6 gap-y-3 rounded-2xl p-4 sm:flex sm:flex-wrap sm:items-center sm:gap-x-8 sm:p-5">
      {items.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] opacity-80">{label}</dt>
          <dd className="mt-0.5 truncate text-[16px] font-bold sm:text-[17px]">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
