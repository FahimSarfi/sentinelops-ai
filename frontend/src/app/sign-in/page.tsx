import { AuthPage } from "@/components/auth/auth-page";
export const metadata = { title: "Sign in — SentinelOps AI" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; reason?: string }>;
}) {
  const { error, reason } = await searchParams;
  return (
    <AuthPage
      signup={false}
      confirmationError={error === "confirmation"}
      oauthError={error === "oauth"}
      oauthFailureReason={reason}
    />
  );
}
