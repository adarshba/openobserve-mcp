import Langfuse from "langfuse";

let langfuseClient: Langfuse | null = null;

/**
 * Initialize Langfuse tracing from environment variables only.
 * Off by default — requires LANGFUSE_O2_ENABLED=true plus key env vars.
 */
export function initTracing(): void {
  try {
    if (process.env.LANGFUSE_O2_ENABLED !== "true") return;

    const publicKey = process.env.LANGFUSE_O2_PUBLIC_KEY;
    const secretKey = process.env.LANGFUSE_O2_SECRET_KEY;
    const baseUrl =
      process.env.LANGFUSE_O2_BASE_URL || "https://cloud.langfuse.com";

    if (!publicKey || !secretKey) {
      console.warn(
        "[openobserve-mcp] Langfuse tracing enabled but missing keys. " +
          "Set LANGFUSE_O2_PUBLIC_KEY and LANGFUSE_O2_SECRET_KEY env vars.",
      );
      return;
    }

    langfuseClient = new Langfuse({ publicKey, secretKey, baseUrl });
  } catch (err) {
    console.warn("[openobserve-mcp] Failed to initialize Langfuse tracing:", err);
    langfuseClient = null;
  }
}

export async function shutdownTracing(): Promise<void> {
  try {
    if (langfuseClient) {
      await langfuseClient.shutdownAsync();
      langfuseClient = null;
    }
  } catch {
    // Best-effort shutdown — never block process exit
    langfuseClient = null;
  }
}

interface ToolTraceMetadata {
  toolName: string;
  input: Record<string, unknown>;
}

/**
 * Wraps an MCP tool handler callback to emit a Langfuse trace + span
 * for every invocation. Tracing failures are silently logged — they never
 * block or interfere with the tool handler.
 */
export function withTracing<TArgs, TResult>(
  toolName: string,
  handler: (args: TArgs) => Promise<TResult>,
): (args: TArgs) => Promise<TResult> {
  return async (args: TArgs): Promise<TResult> => {
    if (!langfuseClient) return handler(args);

    let trace: ReturnType<Langfuse["trace"]> | null = null;
    let span: ReturnType<ReturnType<Langfuse["trace"]>["span"]> | null = null;
    const startTime = Date.now();

    try {
      trace = langfuseClient.trace({
        name: `mcp_tool:${toolName}`,
        metadata: { toolName, input: args } as ToolTraceMetadata,
      });

      span = trace.span({
        name: toolName,
        input: args as Record<string, unknown>,
      });
    } catch (tracingErr) {
      // Tracing setup failed — run handler without tracing
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
      } catch {
        // Tracing update failed — result is still valid
      }

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
      } catch {
        // Tracing update failed — still re-throw the original error
      }

      throw err;
    }
  };
}
