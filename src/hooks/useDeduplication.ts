import { useState, useEffect, useRef } from "react";
import {
  ReferenceRawRow,
  ReferenceItem,
  DuplicateGroup,
  ColumnMapping,
} from "../types";
import DeduplicatorWorker from "../deduplicator.worker?worker";

interface UseDeduplicationProps {
  rawRows: ReferenceRawRow[];
  columnMapping: ColumnMapping;
  threshold: number;
  matchDoi: boolean;
  parentRule: "first" | "completeness";
  onNotify: (type: "success" | "warning" | "error", message: string) => void;
}

export function useDeduplication({
  rawRows,
  columnMapping,
  threshold,
  matchDoi,
  parentRule,
  onNotify,
}: UseDeduplicationProps) {
  const [baseItems, setBaseItems] = useState<ReferenceItem[]>([]);
  const [baseGroups, setBaseGroups] = useState<DuplicateGroup[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Debounced threshold to prevent thrashing when user moves slider
  const [debouncedThreshold, setDebouncedThreshold] = useState<number>(threshold);
  const activeWorkerRef = useRef<Worker | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedThreshold(threshold);
    }, 250);
    return () => clearTimeout(timer);
  }, [threshold]);

  useEffect(() => {
    if (rawRows.length === 0 || !columnMapping.titleColumn) {
      setBaseItems([]);
      setBaseGroups([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Terminate existing worker if still running
    if (activeWorkerRef.current) {
      activeWorkerRef.current.terminate();
      activeWorkerRef.current = null;
    }

    const worker = new DeduplicatorWorker();
    activeWorkerRef.current = worker;

    // Safety timeout to prevent infinite loading state
    const timeoutId = setTimeout(() => {
      if (activeWorkerRef.current === worker) {
        worker.terminate();
        activeWorkerRef.current = null;
        setLoading(false);
        onNotify("error", "O processamento excedeu o tempo limite.");
      }
    }, 60000);

    worker.onmessage = (e: MessageEvent) => {
      clearTimeout(timeoutId);
      const { success, result, error } = e.data;

      if (success && result) {
        setBaseItems(result.items || []);
        setBaseGroups(result.groups || []);
      } else {
        onNotify("error", `Erro no processamento: ${error || "Falha desconhecida"}`);
      }
      setLoading(false);
      worker.terminate();
      if (activeWorkerRef.current === worker) {
        activeWorkerRef.current = null;
      }
    };

    worker.onerror = (err) => {
      clearTimeout(timeoutId);
      onNotify("error", `Erro no Web Worker: ${err.message || "Erro desconhecido"}`);
      setLoading(false);
      worker.terminate();
      if (activeWorkerRef.current === worker) {
        activeWorkerRef.current = null;
      }
    };

    worker.postMessage({
      rawRows,
      options: {
        threshold: debouncedThreshold,
        matchDoi,
        parentRule,
        columnMapping,
      },
    });

    return () => {
      clearTimeout(timeoutId);
      worker.terminate();
      if (activeWorkerRef.current === worker) {
        activeWorkerRef.current = null;
      }
    };
  }, [rawRows, columnMapping, debouncedThreshold, matchDoi, parentRule, onNotify]);

  return {
    baseItems,
    baseGroups,
    loading,
  };
}
