import Langfuse, { LangfuseTraceClient, LangfuseSpanClient } from "langfuse";

function createTracing() {
  let client: Langfuse | null = null;

  function initTracing(): void {
    try {
      if (process.env.LANGFUSE_O2_ENABLED !== "true") return;

      const publicKey = process.env.LANGFUSE_O2_PUBLIC_KEY;
      const secretKey = process.env.LANGFUSE_O2_SECRET_KEY;
      const baseUrl =
        process.env.LANGFUSE_O2_BASE_URL ?? "https://cloud.langfuse.com";

      if (!publicKey || !secretKey) {
        console.warn(
          "[openobserve-mcp] Langfuse tracing enabled but missing keys. " +
            "Set LANGFUSE_O2_PUBLIC_KEY and LANGFUSE_O2_SECRET_KEY env vars.",
        );
        return;
      }

      client = new Langfuse({ publicKey, secretKey, baseUrl });
    } catch (err) {
      console.warn("[openobserve-mcp] Failed to initialize Langfuse tracing:", err);
      client = null;
    }
  }

  async function shutdownTracing(): Promise<void> {
    try {
      if (client) {
        await client.shutdownAsync();
        client = null;
      }
    } catch {
      client = null;
    }
  }

  function withTracing<TArgs, TResult>(
    toolName: string,
    handler: (args: TArgs) => Promise<TResult>,
  ): (args: TArgs) => Promise<TResult> {
    return async (args: TArgs): Promise<TResult> => {
      if (!client) return handler(args);

      let trace: LangfuseTraceClient | null = null;
      let span: LangfuseSpanClient | null = null;
      let startTime: number;

      try {
        startTime = Date.now();

        trace = client.trace({
          name: `mcp_tool:${toolName}`,
          metadata: { toolName, input: args } as Record<string, unknown>,
        });

        span = trace.span({
          name: toolName,
          input: args as Record<string, unknown>,
        });
      } catch (tracingErr) {
        console.warn("[openobserve-mcp] Langfuse trace creation failed:", tracingErr);
        return handler(args);
      }

      try {
        const result = await handler(args);

        try {
          span.update({
            output: result as Record<string, unknown>,
            level: "DEFAULT",
            statusMessage: "ok",
          });
          span.end();

          trace.update({
            output: result as Record<string, unknown>,
            metadata: {
              toolName,
              durationMs: Date.now() - startTime,
              success: true,
            },
          });
        } catch {}

        return result;
      } catch (err) {
        try {
          const errorMessage = err instanceof Error ? err.message : String(err);
          const errorStack = err instanceof Error ? err.stack : undefined;

          span.update({
            level: "ERROR",
            statusMessage: errorMessage,
            output: { error: errorMessage, stack: errorStack },
          });
          span.end();

          trace.update({
            metadata: {
              toolName,
              durationMs: Date.now() - startTime,
              success: false,
              error: errorMessage,
            },
          });
        } catch {}

        throw err;
      }
    };
  }

  return { initTracing, shutdownTracing, withTracing };
}

export const { initTracing, shutdownTracing, withTracing } = createTracing();
