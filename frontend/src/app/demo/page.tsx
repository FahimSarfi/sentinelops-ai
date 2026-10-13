import { Brand } from "@/components/brand";
import { DemoForm } from "@/components/auth/demo-form";
import { demoEnabled } from "@/lib/auth/provider";
export const dynamic = "force-dynamic";
export default function Page() {
  return (
    <main id="main" className="standalone-auth">
      <Brand />
      <div className="recovery-card">
        <span className="eyebrow">SENTINELOPS / ACCOUNT ACCESS</span>
        <h1>Meet your incident workspace.</h1>
        <p>A guided look at evidence, approval, and recovery.</p>
        <DemoForm enabled={demoEnabled()} />
      </div>
      <a href="/" className="text-link">
        Back to website
      </a>
    </main>
  );
}
