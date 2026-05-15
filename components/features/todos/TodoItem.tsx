"use client";

import { Trash2 } from "lucide-react";

interface TodoItemProps {
  id: string;
  title: string;
  createdAt: string;
}

export function TodoItem({ id, title, createdAt }: TodoItemProps) {
  const formattedDate = new Date(createdAt).toLocaleString();

  return (
    <div className="flex items-start gap-3 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
      <input
        type="checkbox"
        aria-label="Mark as done"
        className="mt-0.5 h-4 w-4 shrink-0 rounded"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm text-foreground md:text-base">{title}</span>
        <span className="text-xs text-muted-foreground">{formattedDate}</span>
      </div>
      <button
        type="button"
        aria-label="Delete todo"
        onClick={() => console.log("delete", id)}
        className="shrink-0 rounded p-0.5 focus:outline-none focus:ring-2 focus:ring-zinc-800 focus:ring-offset-1 dark:focus:ring-zinc-100"
      >
        <Trash2
          size={16}
          aria-hidden="true"
          className="text-zinc-400 transition-colors duration-200 hover:text-red-500"
        />
      </button>
    </div>
  );
}
