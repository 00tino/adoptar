"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { esES } from "@clerk/localizations";
import type { ReactNode } from "react";

export default function ProveedorClerk({ children, proxyUrl }: { children: ReactNode; proxyUrl: string }) {
  return <ClerkProvider localization={esES} proxyUrl={proxyUrl}>{children}</ClerkProvider>;
}
