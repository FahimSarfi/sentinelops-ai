import { cn } from "@/lib/utils";
export function Brand({ light = false }: { light?: boolean }) {
  return (
    <a
      href="/"
      aria-label="SentinelOps AI home"
      className={cn("brand", light && "brand-light")}
    >
      <span className="brand-mark" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      <span>
        sentinel<span className="brand-ops">ops</span>
        <sup>AI</sup>
      </span>
    </a>
  );
}
