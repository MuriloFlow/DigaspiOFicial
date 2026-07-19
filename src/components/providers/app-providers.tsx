"use client";

import type { ReactNode } from "react";
import { RecordsProvider } from "./records-provider";

export function AppProviders({ children }: { children: ReactNode }) {
  return <RecordsProvider>{children}</RecordsProvider>;
}
