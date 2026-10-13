"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="not-found">
      <span className="eyebrow">LET’S TRY THAT AGAIN</span>
      <h1>We couldn’t load this page.</h1>
      <p>
        Check your connection and retry. If account access is affected, check
        your Supabase workspace setup.
      </p>
      <button className="button button-primary" onClick={reset}>
        Try again
      </button>
      <a href="/" className="text-link">
        Return home
      </a>
    </main>
  );
}
