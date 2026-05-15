"use client";

import { CheckCircle2 } from "lucide-react";

export function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-center">
      <CheckCircle2
        size={48}
        className="text-muted-foreground"
        aria-hidden="true"
      />
      <p className="text-base font-medium text-foreground">No todos yet</p>
      <p className="text-sm text-muted-foreground">Create one to get started</p>
    </div>
  );
}
