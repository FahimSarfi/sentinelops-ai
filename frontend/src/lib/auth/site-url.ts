export function siteOrigin(requestHost?: string | null) {
  const url = new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://127.0.0.1:3000",
  );
  const loopback = ["localhost", "127.0.0.1", "[::1]"];
  if (
    url.username ||
    url.password ||
    (url.protocol !== "https:" &&
      !(url.protocol === "http:" && loopback.includes(url.hostname)))
  )
    throw new Error("Invalid site origin");
  // Keep PKCE cookies on the hostname where this local flow actually started.
  if (
    loopback.includes(url.hostname) &&
    requestHost &&
    /^(localhost|127\.0\.0\.1|\[::1\])(?::[0-9]{1,5})?$/.test(requestHost)
  ) {
    return new URL("http://" + requestHost).origin;
  }
  return url.origin;
}
