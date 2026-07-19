import { z } from "zod";

const textField = (label: string) =>
  z
    .string()
    .trim()
    .min(2, `${label} precisa ter pelo menos 2 caracteres.`)
    .max(80, `${label} deve ter no maximo 80 caracteres.`)
    .regex(/\p{L}/u, `${label} precisa conter letras.`);

export const createRecordSchema = z
  .object({
    operatorName: textField("Nome do operador"),
    clientName: textField("Nome do cliente"),
    amountInCents: z
      .coerce
      .number()
      .int("Valor do cartao precisa ser um numero inteiro em centavos.")
      .min(1, "Valor do cartao precisa ser maior que zero.")
      .max(99_999_999, "Valor do cartao excede o limite permitido."),
    activated: z.boolean().default(false),
  })
  .strict();

export const storedRecordSchema = createRecordSchema.extend({
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
});

export const recordsStoreSchema = z.object({
  version: z.literal(1),
  records: z.array(storedRecordSchema),
});

export type CreateRecordInput = z.infer<typeof createRecordSchema>;
export type RecordsStore = z.infer<typeof recordsStoreSchema>;
