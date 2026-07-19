"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search, Users, CreditCard, ChevronRight, Trash2, Edit3,
  GitMerge, Loader2, AlertTriangle, Check, X, ArrowLeft,
  Timer, Calendar,
} from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout/page-container";
import { DashboardSkeleton } from "@/components/ui/skeleton";
import { MetricCard } from "@/components/ui/metric-card";
import { getOperatorColor } from "@/lib/records/colors";
import { formatCurrency, formatInteger, formatTime } from "@/lib/utils/format";
import { toDateKey, formatLongDate } from "@/lib/utils/format";
import type { OperatorRecord } from "@/lib/records/types";
import { cn } from "@/lib/utils/cn";

type Collaborator = { id: string; name: string; created_at: string };

type CollaboratorWithStats = Collaborator & {
  recordCount: number;
  totalInCents: number;
};

async function apiRequest(body: Record<string, unknown>) {
  const res = await fetch("/api/collaborators", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const d = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(d.message ?? "Erro na operação.");
  }
  return res.json();
}

export function CollaboratorsView() {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [records, setRecords] = useState<OperatorRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState("");
  const [mergeTarget, setMergeTarget] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteRecordId, setConfirmDeleteRecordId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadCollaborators = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/collaborators", { cache: "no-store" });
      if (!res.ok) throw new Error("Erro ao carregar.");
      const d = (await res.json()) as { collaborators: Collaborator[] };
      setCollaborators(d.collaborators);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void loadCollaborators(); }, [loadCollaborators]);

  const loadRecords = useCallback(async (collabId: string) => {
    setLoadingRecords(true);
    try {
      const d = (await apiRequest({ action: "records", collaboratorId: collabId })) as { records: OperatorRecord[] };
      setRecords(d.records);
    } catch { setRecords([]); }
    finally { setLoadingRecords(false); }
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return collaborators;
    const q = search.toLowerCase();
    return collaborators.filter((c) => c.name.toLowerCase().includes(q));
  }, [collaborators, search]);

  const selectedCollab = collaborators.find((c) => c.id === selectedId);

  function showSuccess(msg: string) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 2500);
  }

  async function handleRename(id: string) {
    if (!renameName.trim()) return;
    setActionLoading("rename");
    try {
      const d = (await apiRequest({ action: "rename", id, newName: renameName })) as { collaborators: Collaborator[] };
      setCollaborators(d.collaborators);
      setRenameId(null);
      showSuccess("Nome atualizado com sucesso.");
      if (selectedId === id) {
        void loadRecords(id);
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Erro."); }
    finally { setActionLoading(null); }
  }

  async function handleMerge(keepId: string, mergeId: string) {
    setActionLoading("merge");
    try {
      const d = (await apiRequest({ action: "merge", keepId, mergeId })) as { collaborators: Collaborator[] };
      setCollaborators(d.collaborators);
      setMergeTarget(null);
      showSuccess("Colaboradores mesclados com sucesso.");
      if (selectedId === mergeId) setSelectedId(keepId);
      if (selectedId) void loadRecords(selectedId);
    } catch (e) { setError(e instanceof Error ? e.message : "Erro."); }
    finally { setActionLoading(null); }
  }

  async function handleDeleteCollab(id: string) {
    setActionLoading("delete-collab");
    try {
      const d = (await apiRequest({ action: "delete", id })) as { collaborators: Collaborator[] };
      setCollaborators(d.collaborators);
      if (selectedId === id) { setSelectedId(null); setRecords([]); }
      setConfirmDeleteId(null);
      showSuccess("Colaborador removido.");
    } catch (e) { setError(e instanceof Error ? e.message : "Erro."); }
    finally { setActionLoading(null); }
  }

  async function handleDeleteRecord(recordId: string) {
    setActionLoading("delete-record");
    try {
      const res = await fetch(`/api/records?id=${recordId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao deletar.");
      setRecords((prev) => prev.filter((r) => r.id !== recordId));
      setConfirmDeleteRecordId(null);
      showSuccess("Registro deletado.");
    } catch (e) { setError(e instanceof Error ? e.message : "Erro."); }
    finally { setActionLoading(null); }
  }

  if (isLoading) return <PageContainer><DashboardSkeleton /></PageContainer>;

  // ── Detail View ──
  if (selectedId && selectedCollab) {
    const color = getOperatorColor(selectedCollab.name, 0);
    const totalValue = records.reduce((s, r) => s + r.amountInCents, 0);
    const grouped = new Map<string, OperatorRecord[]>();
    records.forEach((r) => {
      const dk = toDateKey(r.createdAt);
      grouped.set(dk, [...(grouped.get(dk) ?? []), r]);
    });
    const dateGroups = Array.from(grouped.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([dk, recs]) => ({ dateKey: dk, label: formatLongDate(dk), records: recs }));

    return (
      <PageContainer>
        <button
          type="button"
          onClick={() => { setSelectedId(null); setRecords([]); }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300 hover:text-zinc-950"
        >
          <ArrowLeft className="size-4" /> Voltar
        </button>

        <div className="mb-8 flex items-center gap-4">
          <div className="flex size-16 items-center justify-center rounded-[1.5rem] text-2xl font-bold text-white shadow-lg" style={{ backgroundColor: color }}>
            {selectedCollab.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-3xl font-semibold text-zinc-950">{selectedCollab.name}</h1>
            <p className="mt-1 text-sm text-zinc-500">Histórico completo de cartões</p>
          </div>
        </div>

        <AnimatePresence>
          {successMsg && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              {successMsg}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <MetricCard label="Total de cartões" value={formatInteger(records.length)} detail="Registros do colaborador" icon={CreditCard} tone="dark" />
          <MetricCard label="Valor total" value={formatCurrency(totalValue)} detail="Volume acumulado" icon={CreditCard} tone="blue" />
          <MetricCard label="Média por cartão" value={records.length ? formatCurrency(Math.round(totalValue / records.length)) : "R$ 0,00"} detail="Valor médio" icon={CreditCard} tone="green" />
        </div>

        {loadingRecords ? <DashboardSkeleton /> : (
          <div className="grid gap-6">
            {dateGroups.length === 0 && (
              <div className="rounded-[1.5rem] border border-dashed border-zinc-300 bg-white px-5 py-10 text-center text-sm font-medium text-zinc-500">
                Nenhum registro encontrado para este colaborador.
              </div>
            )}
            {dateGroups.map((group) => (
              <section key={group.dateKey}>
                <div className="mb-3 flex items-center gap-2">
                  <Calendar className="size-4 text-zinc-400" />
                  <h2 className="text-sm font-semibold text-zinc-500">{group.label}</h2>
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-600">{group.records.length}</span>
                </div>
                <div className="grid gap-3">
                  {group.records.map((record, i) => (
                    <motion.div key={record.id}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.03, 0.15) }}
                      className="group flex items-center gap-4 rounded-[1.5rem] border border-zinc-200/80 bg-white p-4 shadow-[0_14px_42px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_54px_rgba(15,23,42,0.08)]"
                    >
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl text-xs font-semibold text-white" style={{ backgroundColor: color }}>
                        {record.operatorName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className="truncate text-sm font-semibold text-zinc-950">{record.clientName}</p>
                          <p className="shrink-0 text-sm font-semibold text-zinc-950">{formatCurrency(record.amountInCents)}</p>
                        </div>
                        <div className="mt-2 flex items-center gap-3 text-xs text-zinc-500">
                          <span className="inline-flex items-center gap-1"><Timer className="size-3.5" />{formatTime(record.createdAt)}</span>
                        </div>
                      </div>
                      <button type="button" aria-label="Deletar"
                        onClick={() => setConfirmDeleteRecordId(record.id)}
                        className="flex size-8 items-center justify-center rounded-xl text-zinc-400 opacity-0 transition hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100">
                        <Trash2 className="size-4" />
                      </button>
                    </motion.div>
                  ))}
                </div>

                <AnimatePresence>
                  {confirmDeleteRecordId && group.records.some(r => r.id === confirmDeleteRecordId) && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                      className="mt-3 overflow-hidden rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="size-4 shrink-0 text-amber-600" />
                        <p className="flex-1 text-xs font-medium text-amber-800">Deletar este cartão?</p>
                        <button type="button" onClick={() => setConfirmDeleteRecordId(null)}
                          className="rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm">Cancelar</button>
                        <button type="button" onClick={() => handleDeleteRecord(confirmDeleteRecordId)}
                          disabled={actionLoading === "delete-record"}
                          className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm disabled:opacity-75">
                          {actionLoading === "delete-record" ? "..." : "Deletar"}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>
            ))}
          </div>
        )}
      </PageContainer>
    );
  }

  // ── List View ──
  return (
    <PageContainer>
      <PageHeader
        eyebrow="Equipe"
        title="Colaboradores"
        description="Gerencie sua equipe, veja o histórico de cartões de cada colaborador e corrija nomes duplicados."
      />

      <AnimatePresence>
        {successMsg && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            {successMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <MetricCard label="Colaboradores" value={formatInteger(collaborators.length)} detail="Registrados no sistema" icon={Users} tone="dark" />
        <MetricCard label="Busca" value="Filtrar" detail="Pesquise por nome" icon={Search} tone="blue" />
        <MetricCard label="Ações" value="Gerenciar" detail="Renomear, mesclar, deletar" icon={Edit3} tone="green" />
      </div>

      {/* Search */}
      <div className="mb-6 flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm transition duration-300 focus-within:border-zinc-950 focus-within:ring-4 focus-within:ring-zinc-950/10">
        <Search className="size-5 shrink-0 text-zinc-400" />
        <input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar colaborador por nome..."
          className="min-w-0 flex-1 bg-transparent text-base text-zinc-950 outline-none placeholder:text-zinc-400"
        />
        {search && (
          <button type="button" onClick={() => setSearch("")} className="text-zinc-400 hover:text-zinc-700">
            <X className="size-4" />
          </button>
        )}
      </div>

      <p className="mb-4 text-sm font-medium text-zinc-500">
        {filtered.length === 0 ? "Nenhum colaborador encontrado." : `${formatInteger(filtered.length)} colaborador${filtered.length !== 1 ? "es" : ""}`}
      </p>

      <div className="grid gap-3">
        {filtered.map((collab, index) => {
          const color = getOperatorColor(collab.name, index);
          const isRenaming = renameId === collab.id;
          const isConfirmingDelete = confirmDeleteId === collab.id;
          const isMergeSource = mergeTarget === collab.id;

          return (
            <motion.article key={collab.id}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.03, 0.15) }}
              className="overflow-hidden rounded-[1.5rem] border border-zinc-200/80 bg-white shadow-[0_14px_42px_rgba(15,23,42,0.05)] transition duration-300 hover:shadow-[0_20px_54px_rgba(15,23,42,0.08)]"
            >
              <div className="flex items-center gap-4 p-4">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold text-white shadow-md" style={{ backgroundColor: color }}>
                  {collab.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-base font-semibold text-zinc-950">{collab.name}</h3>
                  <p className="mt-0.5 text-xs text-zinc-500">Registrado em {new Date(collab.created_at).toLocaleDateString("pt-BR")}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" aria-label="Renomear" title="Renomear"
                    onClick={() => { setRenameId(collab.id); setRenameName(collab.name); }}
                    className="flex size-9 items-center justify-center rounded-xl text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700">
                    <Edit3 className="size-4" />
                  </button>
                  <button type="button" aria-label="Mesclar" title="Mesclar com outro"
                    onClick={() => setMergeTarget(collab.id)}
                    className="flex size-9 items-center justify-center rounded-xl text-zinc-400 transition hover:bg-blue-50 hover:text-blue-600">
                    <GitMerge className="size-4" />
                  </button>
                  <button type="button" aria-label="Deletar" title="Deletar"
                    onClick={() => setConfirmDeleteId(collab.id)}
                    className="flex size-9 items-center justify-center rounded-xl text-zinc-400 transition hover:bg-rose-50 hover:text-rose-600">
                    <Trash2 className="size-4" />
                  </button>
                  <button type="button" aria-label="Ver histórico"
                    onClick={() => { setSelectedId(collab.id); void loadRecords(collab.id); }}
                    className="flex size-9 items-center justify-center rounded-xl bg-zinc-950 text-white transition hover:bg-zinc-800">
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {isRenaming && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-zinc-100">
                    <div className="flex items-center gap-3 p-4">
                      <input value={renameName} onChange={(e) => setRenameName(e.target.value)}
                        className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10"
                        placeholder="Novo nome" autoFocus />
                      <button type="button" onClick={() => setRenameId(null)}
                        className="rounded-xl bg-zinc-100 px-3 py-2 text-xs font-semibold text-zinc-700"><X className="size-4" /></button>
                      <button type="button" onClick={() => handleRename(collab.id)}
                        disabled={actionLoading === "rename"}
                        className="rounded-xl bg-zinc-950 px-3 py-2 text-xs font-semibold text-white disabled:opacity-75">
                        {actionLoading === "rename" ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                      </button>
                    </div>
                  </motion.div>
                )}

                {isMergeSource && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-zinc-100">
                    <div className="p-4">
                      <p className="mb-3 text-xs font-semibold text-zinc-500">Mesclar "{collab.name}" com:</p>
                      <div className="grid max-h-40 gap-2 overflow-y-auto">
                        {collaborators.filter((c) => c.id !== collab.id).map((target) => (
                          <button key={target.id} type="button"
                            onClick={() => handleMerge(target.id, collab.id)}
                            disabled={actionLoading === "merge"}
                            className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-left text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-75">
                            <GitMerge className="size-3.5 text-blue-500" />
                            {target.name}
                          </button>
                        ))}
                      </div>
                      <button type="button" onClick={() => setMergeTarget(null)}
                        className="mt-3 text-xs font-medium text-zinc-500 hover:text-zinc-700">Cancelar</button>
                    </div>
                  </motion.div>
                )}

                {isConfirmingDelete && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-amber-100">
                    <div className="flex items-center gap-3 bg-amber-50 p-4">
                      <AlertTriangle className="size-4 shrink-0 text-amber-600" />
                      <p className="flex-1 text-xs font-medium text-amber-800">Todos os cartões serão removidos.</p>
                      <button type="button" onClick={() => setConfirmDeleteId(null)}
                        className="rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm">Cancelar</button>
                      <button type="button" onClick={() => handleDeleteCollab(collab.id)}
                        disabled={actionLoading === "delete-collab"}
                        className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm disabled:opacity-75">
                        {actionLoading === "delete-collab" ? "..." : "Deletar"}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.article>
          );
        })}
      </div>
    </PageContainer>
  );
}
