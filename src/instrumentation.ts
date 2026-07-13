export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const { bootstrapDatabase } = await import("./lib/bootstrap");
      bootstrapDatabase().catch((err) => {
        console.error("[instrumentation] Bootstrap failed:", err?.message ?? err);
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[instrumentation] Failed to load bootstrap module:", msg);
    }
  }
}
