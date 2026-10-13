import { Brand } from "@/components/brand";
import { RecoveryForm } from "@/components/auth/recovery-form";
export default function Page() {
  return (
    <main id="main" className="standalone-auth">
      <Brand />
      <div className="recovery-card">
        <span className="eyebrow">SENTINELOPS / ACCOUNT ACCESS</span>
        <h1>A fresh start.</h1>
        <p>Choose a new password for your account.</p>
        <RecoveryForm reset />
      </div>
      <a href="/" className="text-link">
        Back to website
      </a>
    </main>
  );
}
