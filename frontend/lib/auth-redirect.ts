/** Only same-site paths may be used after authentication. */
export function safeAuthRedirect(value: unknown): string {
  return typeof value === "string" && /^\/(?!\/)/.test(value) && !/[\\\u0000-\u0020]/.test(value)
    ? value
    : "/hesabim";
}
