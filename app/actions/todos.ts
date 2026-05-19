"use server";

import { CreateTodoSchema, type CreateTodoInput } from "@/lib/validations/todo";

export type ErrorCode = "VALIDATION" | "AUTH_REQUIRED" | "NOT_FOUND" | "INTERNAL_ERROR";

export type ActionError = {
  message: string;
  code: ErrorCode;
};

export type Todo = {
  id: string;
  title: string;
  createdAt: string;
  isPinned: boolean;
};

// In-memory store — replace with database persistence when ready
const todos: Todo[] = [];

export async function createTodo(
  input: CreateTodoInput
): Promise<{ data: Todo } | { error: ActionError }> {
  // TODO: add auth check when auth is configured
  // Example: const session = await auth(); if (!session?.user) return { error: { message: "Unauthorized", code: "AUTH_REQUIRED" } };

  try {
    const parsed = CreateTodoSchema.safeParse(input);
    if (!parsed.success) {
      return {
        error: {
          message: "Invalid input",
          code: "VALIDATION",
        },
      };
    }

    const newTodo: Todo = {
      id: crypto.randomUUID(),
      title: parsed.data.title,
      createdAt: new Date().toISOString(),
      isPinned: false,
    };

    todos.push(newTodo);

    return { data: newTodo };
  } catch (err) {
    console.error("[createTodo] Unexpected error:", err);
    return {
      error: {
        message: "Something went wrong",
        code: "INTERNAL_ERROR",
      },
    };
  }
}

export async function getTodos(): Promise<{ data: Todo[] }> {
  // TODO: add auth check when auth is configured
  // Example: const session = await auth(); if (!session?.user) return { data: [] };

  const sorted = [...todos].sort((a, b) => {
    if (a.isPinned === b.isPinned) {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
    return a.isPinned ? -1 : 1;
  });

  return { data: sorted };
}

export async function togglePinTodo(
  id: string
): Promise<{ data: { id: string; isPinned: boolean } } | { error: ActionError }> {
  // TODO: add auth check when auth is configured
  // Example: const session = await auth(); if (!session?.user) return { error: { message: "Unauthorized", code: "AUTH_REQUIRED" } };

  try {
    const todo = todos.find((t) => t.id === id);
    if (!todo) {
      return { error: { message: "Todo not found", code: "NOT_FOUND" } };
    }

    todo.isPinned = !todo.isPinned;

    return { data: { id: todo.id, isPinned: todo.isPinned } };
  } catch (err) {
    console.error("[togglePinTodo] Unexpected error:", err);
    return { error: { message: "Something went wrong", code: "INTERNAL_ERROR" } };
  }
}

export async function deleteTodo(
  id: string
): Promise<{ data: { id: string } } | { error: ActionError }> {
  // TODO: add auth check when auth is configured

  try {
    const index = todos.findIndex((t) => t.id === id);
    if (index === -1) {
      return { error: { message: "Todo not found", code: "NOT_FOUND" as ErrorCode } };
    }
    todos.splice(index, 1);
    return { data: { id } };
  } catch (err) {
    console.error("[deleteTodo] Unexpected error:", err);
    return { error: { message: "Something went wrong", code: "INTERNAL_ERROR" } };
  }
}
