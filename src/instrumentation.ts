// Next.js instrumentation — runs before any page code on the server.
// Polyfills browser-only globals that Firebase client SDK accesses at
// module evaluation time (for its auth-redirect detection logic).
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    if (typeof (globalThis as Record<string, unknown>).location === "undefined") {
      (globalThis as Record<string, unknown>).location = {
        href: "",
        hash: "",
        pathname: "/",
        search: "",
        origin: "http://localhost",
        hostname: "localhost",
        protocol: "http:",
        port: "",
        host: "localhost",
        assign: () => {},
        replace: () => {},
        reload: () => {},
        toString: () => "",
      };
    }
  }
}
