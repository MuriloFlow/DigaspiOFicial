import { NextRequest, NextResponse } from "next/server";

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
    // Dados mock se Supabase não estiver configurado
    const mockData = {
      records: [
        {
          id: "1",
          collaboratorId: "col-1",
          operatorName: "Demo Operador",
          clientName: "Cliente Demo",
          amountInCents: 50000,
          activated: true,
          createdAt: new Date().toISOString(),
        },
      ],
      summary: {
        totalCards: 1,
        totalAmountInCents: 50000,
        operatorCount: 1,
        topOperator: {
          operatorName: "Demo Operador",
          count: 1,
        },
      },
    };

    return NextResponse.json(mockData, {
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
    // Simular criação de registro
    const newRecord = {
      id: Math.random().toString(),
      collaboratorId: "col-new",
      operatorName: (body as any)?.operatorName || "Novo Operador",
      clientName: (body as any)?.clientName || "Novo Cliente",
      amountInCents: (body as any)?.amountInCents || 10000,
      activated: true,
      createdAt: new Date().toISOString(),
    };

    const mockData = {
      record: newRecord,
      records: [newRecord],
      summary: {
        totalCards: 1,
        totalAmountInCents: 10000,
        operatorCount: 1,
        topOperator: {
          operatorName: newRecord.operatorName,
          count: 1,
        },
      },
    };

    return NextResponse.json(mockData, {
      status: 201,
      headers: noStoreHeaders,
    });
  } catch (error) {
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

    // Simular deleção
    const mockData = {
      records: [],
      summary: {
        totalCards: 0,
        totalAmountInCents: 0,
        operatorCount: 0,
        topOperator: null,
      },
    };

    return NextResponse.json(mockData, {
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
