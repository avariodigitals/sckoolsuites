export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { bootstrapDatabase } = await import("./lib/bootstrap");
    bootstrapDatabase().catch((err) => {
      console.error("[instrumentation] Bootstrap failed:", err?.message ?? err);
    });
  }
}
