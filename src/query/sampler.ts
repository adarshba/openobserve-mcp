import type { LogEntry, SampleStrategy } from "./types.js";

export function reservoirSample(
  logs: LogEntry[],
  k: number,
  strategy: SampleStrategy,
): { samples: LogEntry[]; diversity: number } {
  if (logs.length === 0) return { samples: [], diversity: 0 };
  if (logs.length <= k) return { samples: logs, diversity: 1 };

  switch (strategy) {
    case "recent":
      return { samples: logs.slice(-k), diversity: k / logs.length };
    case "errors":
      return sampleErrors(logs, k);
    case "diverse":
      return diverseSample(logs, k);
  }
}

function sampleErrors(
  logs: LogEntry[],
  k: number,
): { samples: LogEntry[]; diversity: number } {
  const errors = logs.filter(
    (l) =>
      l["level"] === "error" ||
      l["level"] === "ERROR" ||
      l["severity"] === "error" ||
      l["severity"] === "ERROR",
  );

  const errorK = Math.min(errors.length, Math.ceil(k * 0.7));
  const restK = k - errorK;

  const nonErrors = logs.filter((l) => !errors.includes(l));
  const restSamples = uniformSample(nonErrors, restK);
  const errorSamples = uniformSample(errors, errorK);

  return {
    samples: [...errorSamples, ...restSamples],
    diversity: k / logs.length,
  };
}

function diverseSample(
  logs: LogEntry[],
  k: number,
): { samples: LogEntry[]; diversity: number } {
  const reservoir: LogEntry[] = logs.slice(0, k);

  for (let i = k; i < logs.length; i++) {
    const j = Math.floor(Math.random() * (i + 1));
    if (j < k) {
      reservoir[j] = logs[i];
    }
  }

  return { samples: reservoir, diversity: k / logs.length };
}

function uniformSample(logs: LogEntry[], k: number): LogEntry[] {
  if (logs.length <= k) return logs;
  const reservoir = logs.slice(0, k);
  for (let i = k; i < logs.length; i++) {
    const j = Math.floor(Math.random() * (i + 1));
    if (j < k) reservoir[j] = logs[i];
  }
  return reservoir;
}
