"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  CreateRecordPayload,
  DashboardSummary,
  OperatorRecord,
  RecordsPayload,
} from "@/lib/records/types";

type RecordsContextValue = RecordsPayload & {
  isCreating: boolean;
  isLoading: boolean;
  isDeleting: string | null;
  error: string | null;
  createRecord: (payload: CreateRecordPayload) => Promise<OperatorRecord>;
  deleteRecord: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
};

const emptySummary: DashboardSummary = {
  totalCards: 0,
  totalAmountInCents: 0,
  operatorCount: 0,
  topOperator: null,
};

const RecordsContext = createContext<RecordsContextValue | null>(null);

async function parseApiError(response: Response) {
  try {
    const data = (await response.json()) as {
      message?: string;
      errors?: Array<{ message: string }>;
    };

    if (data.errors?.length) {
      return data.errors.map((error) => error.message).join(" ");
    }

    return data.message ?? "Nao foi possivel concluir a acao.";
  } catch {
    return "Nao foi possivel concluir a acao.";
  }
}

export function RecordsProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<OperatorRecord[]>([]);
  const [summary, setSummary] = useState<DashboardSummary>(emptySummary);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadRecords = useCallback(async () => {
    setError(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch("/api/records", {
        method: "GET",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "Cache-Control": "no-cache",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorMsg = await parseApiError(response);
        throw new Error(`API Error (${response.status}): ${errorMsg}`);
      }

      const data = (await response.json()) as RecordsPayload;
      setRecords(data.records);
      setSummary(data.summary);
    } catch (loadError) {
      const errorMessage = loadError instanceof Error 
        ? loadError.message 
        : "Nao foi possivel carregar os registros.";
      
      console.error("Load records error:", errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadRecords);
  }, [loadRecords]);

  const createRecord = useCallback(async (payload: CreateRecordPayload) => {
    setIsCreating(true);
    setError(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch("/api/records", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }

      const data = (await response.json()) as RecordsPayload & {
        record: OperatorRecord;
      };

      setRecords(data.records);
      setSummary(data.summary);

      return data.record;
    } catch (createError) {
      const errorMessage = createError instanceof Error
        ? createError.message
        : "Nao foi possivel criar o registro.";
      
      console.error("Create record error:", errorMessage);
      setError(errorMessage);
      throw createError;
    } finally {
      setIsCreating(false);
    }
  }, []);

  const deleteRecord = useCallback(async (id: string) => {
    setIsDeleting(id);
    setError(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`/api/records?id=${id}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          "Cache-Control": "no-cache",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }

      const data = (await response.json()) as RecordsPayload;
      setRecords(data.records);
      setSummary(data.summary);
    } catch (deleteError) {
      const errorMessage = deleteError instanceof Error
        ? deleteError.message
        : "Nao foi possivel deletar o registro.";
      
      console.error("Delete record error:", errorMessage);
      setError(errorMessage);
      throw deleteError;
    } finally {
      setIsDeleting(null);
    }
  }, []);

  const value = useMemo<RecordsContextValue>(
    () => ({
      records,
      summary,
      isCreating,
      isLoading,
      isDeleting,
      error,
      createRecord,
      deleteRecord,
      refresh: loadRecords,
    }),
    [createRecord, deleteRecord, error, isCreating, isDeleting, isLoading, loadRecords, records, summary],
  );

  return (
    <RecordsContext.Provider value={value}>{children}</RecordsContext.Provider>
  );
}

export function useRecords() {
  const context = useContext(RecordsContext);

  if (!context) {
    throw new Error("useRecords precisa estar dentro de RecordsProvider.");
  }

  return context;
}
