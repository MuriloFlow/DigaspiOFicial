import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";
import { normalizePersonName } from "./domain";
import { createRecordSchema } from "./schema";
import type { OperatorRecord } from "./types";

type DbRecord = {
  id: string;
  collaborator_id: string;
  operator_name: string;
  client_name: string;
  amount_in_cents: number;
  activated: boolean;
  created_at: string;
};

function toOperatorRecord(row: DbRecord): OperatorRecord {
  return {
    id: row.id,
    collaboratorId: row.collaborator_id,
    operatorName: row.operator_name,
    clientName: row.client_name,
    amountInCents: row.amount_in_cents,
    activated: row.activated,
    createdAt: row.created_at,
  };
}

export async function listRecords(): Promise<OperatorRecord[]> {
  const { data, error } = await supabaseAdmin
    .from("records")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Erro ao carregar registros: ${error.message}`);

  return (data as DbRecord[]).map(toOperatorRecord);
}

async function findOrCreateCollaborator(name: string): Promise<string> {
  const normalizedName = normalizePersonName(name);

  // Try exact match first
  const { data: existing } = await supabaseAdmin
    .from("collaborators")
    .select("id, name")
    .ilike("name", normalizedName)
    .limit(1);

  if (existing && existing.length > 0) {
    return existing[0].id;
  }

  // Create new collaborator
  const { data: created, error } = await supabaseAdmin
    .from("collaborators")
    .insert({ name: normalizedName })
    .select("id")
    .single();

  if (error) throw new Error(`Erro ao criar colaborador: ${error.message}`);

  return created.id;
}

export async function createRecord(input: unknown): Promise<OperatorRecord> {
  const payload = createRecordSchema.parse(input);
  const operatorName = normalizePersonName(payload.operatorName);
  const clientName = normalizePersonName(payload.clientName);

  const collaboratorId = await findOrCreateCollaborator(operatorName);

  const { data, error } = await supabaseAdmin
    .from("records")
    .insert({
      collaborator_id: collaboratorId,
      operator_name: operatorName,
      client_name: clientName,
      amount_in_cents: payload.amountInCents,
      activated: payload.activated,
    })
    .select("*")
    .single();

  if (error) throw new Error(`Erro ao criar registro: ${error.message}`);

  return toOperatorRecord(data as DbRecord);
}

export async function deleteRecord(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("records")
    .delete()
    .eq("id", id);

  if (error) throw new Error(`Erro ao deletar registro: ${error.message}`);
}

export async function listCollaborators() {
  const { data, error } = await supabaseAdmin
    .from("collaborators")
    .select("id, name, created_at")
    .order("name", { ascending: true });

  if (error) throw new Error(`Erro ao carregar colaboradores: ${error.message}`);

  return data as Array<{ id: string; name: string; created_at: string }>;
}

export async function getCollaboratorRecords(collaboratorId: string): Promise<OperatorRecord[]> {
  const { data, error } = await supabaseAdmin
    .from("records")
    .select("*")
    .eq("collaborator_id", collaboratorId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Erro ao carregar registros do colaborador: ${error.message}`);

  return (data as DbRecord[]).map(toOperatorRecord);
}

export async function mergeCollaborators(
  keepId: string,
  mergeId: string,
): Promise<void> {
  // Get the name to keep
  const { data: keepData } = await supabaseAdmin
    .from("collaborators")
    .select("name")
    .eq("id", keepId)
    .single();

  if (!keepData) throw new Error("Colaborador principal não encontrado.");

  // Update all records from mergeId to keepId
  const { error: updateError } = await supabaseAdmin
    .from("records")
    .update({
      collaborator_id: keepId,
      operator_name: keepData.name,
    })
    .eq("collaborator_id", mergeId);

  if (updateError) throw new Error(`Erro ao mesclar registros: ${updateError.message}`);

  // Delete the duplicate collaborator
  const { error: deleteError } = await supabaseAdmin
    .from("collaborators")
    .delete()
    .eq("id", mergeId);

  if (deleteError) throw new Error(`Erro ao remover colaborador duplicado: ${deleteError.message}`);
}

export async function renameCollaborator(id: string, newName: string): Promise<void> {
  const normalized = normalizePersonName(newName);

  const { error: collabError } = await supabaseAdmin
    .from("collaborators")
    .update({ name: normalized })
    .eq("id", id);

  if (collabError) throw new Error(`Erro ao renomear colaborador: ${collabError.message}`);

  // Also update operator_name in all records
  const { error: recordsError } = await supabaseAdmin
    .from("records")
    .update({ operator_name: normalized })
    .eq("collaborator_id", id);

  if (recordsError) throw new Error(`Erro ao atualizar registros: ${recordsError.message}`);
}

export async function deleteCollaborator(id: string): Promise<void> {
  // Records will be cascade-deleted by the DB constraint
  const { error } = await supabaseAdmin
    .from("collaborators")
    .delete()
    .eq("id", id);

  if (error) throw new Error(`Erro ao deletar colaborador: ${error.message}`);
}

/**
 * Smart name matching — finds collaborators with similar names
 * Uses Levenshtein-like comparison for typo detection
 */
export async function findSimilarCollaborators(name: string) {
  const normalized = normalizePersonName(name).toLowerCase();
  const { data: all } = await supabaseAdmin
    .from("collaborators")
    .select("id, name");

  if (!all) return [];

  return all
    .map((c) => ({
      ...c,
      similarity: computeSimilarity(normalized, c.name.toLowerCase()),
    }))
    .filter((c) => c.similarity > 0.6 && c.name.toLowerCase() !== normalized)
    .sort((a, b) => b.similarity - a.similarity);
}

/**
 * Compute similarity between two strings (0 to 1)
 * Based on bigram overlap — fast and effective for typo detection
 */
function computeSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;

  const bigramsA = new Map<string, number>();
  for (let i = 0; i < a.length - 1; i++) {
    const bigram = a.substring(i, i + 2);
    bigramsA.set(bigram, (bigramsA.get(bigram) ?? 0) + 1);
  }

  let matches = 0;
  for (let i = 0; i < b.length - 1; i++) {
    const bigram = b.substring(i, i + 2);
    const count = bigramsA.get(bigram);
    if (count && count > 0) {
      bigramsA.set(bigram, count - 1);
      matches++;
    }
  }

  return (2 * matches) / (a.length + b.length - 2);
}
