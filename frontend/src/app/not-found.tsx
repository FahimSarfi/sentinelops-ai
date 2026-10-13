import { Brand } from "@/components/brand";
import { ButtonLink } from "@/components/ui/button";
export default function NotFound() {
  return (
    <main id="main" className="wrap docs">
      <Brand />
      <section>
        <span className="eyebrow">404 / PAGE NOT FOUND</span>
        <h1>Let’s find your way back.</h1>
        <p className="intro">
          This page is not part of the current SentinelOps preview.
        </p>
        <ButtonLink href="/">Return home</ButtonLink>
      </section>
    </main>
  );
}
