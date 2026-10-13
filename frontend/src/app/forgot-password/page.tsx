import { Brand } from "@/components/brand";
import { RecoveryForm } from "@/components/auth/recovery-form";
export default function Page() {
  return (
    <main id="main" className="standalone-auth">
      <Brand />
      <div className="recovery-card">
        <span className="eyebrow">SENTINELOPS / ACCOUNT ACCESS</span>
        <h1>Get back to your workspace.</h1>
        <p>We’ll send you a link to reset your password.</p>
        <RecoveryForm reset={false} />
      </div>
      <a href="/" className="text-link">
        Back to website
      </a>
    </main>
  );
}
