import { NextRequest, NextResponse } from "next/server";
import {
  listCollaborators,
  getCollaboratorRecords,
  mergeCollaborators,
  renameCollaborator,
  deleteCollaborator,
  findSimilarCollaborators,
} from "@/lib/records/repository";

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
    const collaborators = await listCollaborators();

    return NextResponse.json({ collaborators }, { headers: noStoreHeaders });
  } catch (error) {
    console.error("Erro ao carregar colaboradores:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Erro ao carregar colaboradores." },
      { status: 500, headers: noStoreHeaders },
    );
  }
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { message: "JSON invalido." },
      { status: 400, headers: noStoreHeaders },
    );
  }

  const action = body.action as string;

  try {
    if (action === "records") {
      const records = await getCollaboratorRecords(body.collaboratorId as string);
      return NextResponse.json({ records }, { headers: noStoreHeaders });
    }

    if (action === "merge") {
      await mergeCollaborators(body.keepId as string, body.mergeId as string);
      const collaborators = await listCollaborators();
      return NextResponse.json({ collaborators, success: true }, { headers: noStoreHeaders });
    }

    if (action === "rename") {
      await renameCollaborator(body.id as string, body.newName as string);
      const collaborators = await listCollaborators();
      return NextResponse.json({ collaborators, success: true }, { headers: noStoreHeaders });
    }

    if (action === "delete") {
      await deleteCollaborator(body.id as string);
      const collaborators = await listCollaborators();
      return NextResponse.json({ collaborators, success: true }, { headers: noStoreHeaders });
    }

    if (action === "similar") {
      const results = await findSimilarCollaborators(body.name as string);
      return NextResponse.json({ results }, { headers: noStoreHeaders });
    }

    return NextResponse.json(
      { message: "Ação desconhecida." },
      { status: 400, headers: noStoreHeaders },
    );
  } catch (error) {
    console.error("Erro na operação de colaboradores:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Erro na operação." },
      { status: 500, headers: noStoreHeaders },
    );
  }
}
