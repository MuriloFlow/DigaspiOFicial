import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { buildRecordsPayload } from "@/lib/records/domain";
import { createRecord, listRecords, deleteRecord } from "@/lib/records/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const noStoreHeaders = {
  "Cache-Control": "no-store, max-age=0, must-revalidate",
  "Pragma": "no-cache",
  "Expires": "0",
};

export async function GET(request: NextRequest) {
  try {
    const records = await listRecords();

    return NextResponse.json(buildRecordsPayload(records), {
      headers: noStoreHeaders,
    });
  } catch (error) {
    console.error("Erro ao carregar registros:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Erro ao carregar registros." },
      { status: 500, headers: noStoreHeaders },
    );
  }
}

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "JSON invalido. Revise os dados enviados." },
      { status: 400, headers: noStoreHeaders },
    );
  }

  try {
    const record = await createRecord(body);
    const records = await listRecords();

    return NextResponse.json(
      {
        record,
        ...buildRecordsPayload(records),
      },
      { status: 201, headers: noStoreHeaders },
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          message: "Dados invalidos.",
          errors: error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 422, headers: noStoreHeaders },
      );
    }

    console.error("Erro ao criar registro:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Nao foi possivel salvar o registro agora." },
      { status: 500, headers: noStoreHeaders },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { message: "ID do registro é obrigatório." },
        { status: 400, headers: noStoreHeaders },
      );
    }

    await deleteRecord(id);
    const records = await listRecords();

    return NextResponse.json(buildRecordsPayload(records), {
      headers: noStoreHeaders,
    });
  } catch (error) {
    console.error("Erro ao deletar registro:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Erro ao deletar registro." },
      { status: 500, headers: noStoreHeaders },
    );
  }
}
