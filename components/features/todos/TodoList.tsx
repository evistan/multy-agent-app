"use client";

import { type Todo } from "@/app/actions/todos";
import { EmptyState } from "./EmptyState";
import { TodoItem } from "./TodoItem";

interface TodoListProps {
  todos: Todo[];
}

export function TodoList({ todos }: TodoListProps) {
  if (todos.length === 0) {
    return <EmptyState />;
  }

  return (
    <ul className="flex flex-col gap-2" aria-label="Todo list">
      {todos.map((todo) => (
        <li key={todo.id}>
          <TodoItem
            id={todo.id}
            title={todo.title}
            createdAt={todo.createdAt}
            isPinned={todo.isPinned}
          />
        </li>
      ))}
    </ul>
  );
}
