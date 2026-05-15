"use server";

import { CreateTodoSchema, type CreateTodoInput } from "@/lib/validations/todo";

export type Todo = {
  id: string;
  title: string;
  createdAt: string;
};

// In-memory store — replace with database persistence when ready
const todos: Todo[] = [];

export async function createTodo(
  input: CreateTodoInput
): Promise<{ data: Todo } | { error: { message: string; code: string } }> {
  // TODO: add auth check when auth is configured
  // Example: const session = await auth(); if (!session?.user) return { error: { message: "Unauthorized", code: "AUTH_REQUIRED" } };

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
  };

  todos.push(newTodo);

  return { data: newTodo };
}
