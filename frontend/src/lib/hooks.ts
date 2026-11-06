"use client";

import { useMemo } from "react";

/** Return today's date as YYYY-MM-DD (local). Stable per render pass. */
export function useToday(): string {
  return useMemo(() => new Date().toISOString().slice(0, 10), []);
}
