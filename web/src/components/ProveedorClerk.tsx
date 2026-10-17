"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { esES } from "@clerk/localizations";
import type { ReactNode } from "react";

export default function ProveedorClerk({ children }: { children: ReactNode }) {
  return <ClerkProvider localization={esES}>{children}</ClerkProvider>;
}
