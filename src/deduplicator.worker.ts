import { runDeduplication } from "./core/deduplicator";

self.onmessage = (e: MessageEvent) => {
  const { rawRows, options } = e.data;

  try {
    const result = runDeduplication(rawRows, options);
    self.postMessage({ success: true, result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro desconhecido no Web Worker";
    self.postMessage({ success: false, error: message });
  }
};
