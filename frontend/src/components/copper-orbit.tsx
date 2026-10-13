/** Original decorative artwork, built entirely with CSS. */
export function CopperOrbit({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`copper-orbit ${compact ? "orbit-compact" : ""}`}
      aria-hidden="true"
    >
      <div className="orbit-halo" />
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className={`copper-loop loop-${i}`} />
      ))}
      <div className="orbit-center" />
    </div>
  );
}
