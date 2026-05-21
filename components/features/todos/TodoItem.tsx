"use client";

import { Loader2, Pin, Star, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { deleteTodo, togglePinTodo } from "@/app/actions/todos";

interface TodoItemProps {
  id: string;
  title: string;
  createdAt: string;
  isPinned: boolean;
}

export function TodoItem({ id, title, createdAt, isPinned }: TodoItemProps) {
  const formattedDate = new Date(createdAt).toLocaleString();
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPinning, setIsPinning] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteTodo(id);
    if ("error" in result) {
      // silently reset — no complex error UI for now
      setIsDeleting(false);
      return;
    }
    router.refresh();
    // no need to setIsDeleting(false) — component unmounts after refresh
  };

  const handleTogglePin = async () => {
    setIsPinning(true);
    const result = await togglePinTodo(id);
    if ("error" in result) {
      setIsPinning(false);
      return;
    }
    router.refresh();
    setIsPinning(false);
  };

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border p-3 ${
        isPinned
          ? "border-amber-200 bg-amber-50 dark:border-amber-800/30 dark:bg-amber-950/20"
          : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
      }`}
    >
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
        aria-label={isPinned ? "Unpin todo" : "Pin todo"}
        aria-pressed={isPinned}
        onClick={handleTogglePin}
        disabled={isPinning}
        className="shrink-0 rounded p-0.5 focus:outline-none focus:ring-2 focus:ring-zinc-800 focus:ring-offset-1 dark:focus:ring-zinc-100"
      >
        {isPinning ? (
          <Loader2 size={14} className="animate-spin" aria-hidden="true" />
        ) : isPinned ? (
          <Star
            size={16}
            aria-hidden="true"
            className="text-amber-600 dark:text-amber-400 transition-colors duration-200"
          />
        ) : (
          <Pin
            size={16}
            aria-hidden="true"
            className="text-zinc-400 transition-colors duration-200 hover:text-amber-600 dark:hover:text-amber-400"
          />
        )}
      </button>
      <button
        type="button"
        aria-label={isDeleting ? "Deleting..." : "Delete todo"}
        onClick={handleDelete}
        disabled={isDeleting}
        className="shrink-0 rounded p-0.5 focus:outline-none focus:ring-2 focus:ring-zinc-800 focus:ring-offset-1 dark:focus:ring-zinc-100"
      >
        {isDeleting ? (
          <Loader2 size={14} className="animate-spin" aria-hidden="true" />
        ) : (
          <Trash2
            size={16}
            aria-hidden="true"
            className="text-zinc-400 transition-colors duration-200 hover:text-red-500"
          />
        )}
      </button>
    </div>
  );
}
