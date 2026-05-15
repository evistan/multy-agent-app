import { TodoForm } from "@/components/features/todos/TodoForm";

export const metadata = {
  title: "My Todos",
  description: "Manage your todos",
};

export default function TodosPage() {
  return (
    <div className="flex flex-col flex-1 items-center bg-background font-sans">
      <main className="flex flex-col w-full max-w-xl gap-6 p-4 md:p-6 pt-12 md:pt-16">
        <header>
          <h1 className="text-lg font-semibold text-foreground md:text-2xl">
            My Todos
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Add tasks to your list below.
          </p>
        </header>

        <section
          aria-labelledby="add-todo-heading"
          className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm md:p-6 dark:border-zinc-800 dark:bg-zinc-950"
        >
          <h2
            id="add-todo-heading"
            className="mb-4 text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Add a new todo
          </h2>
          <TodoForm />
        </section>

        <section aria-label="Todo list">
          <p className="text-sm text-zinc-400 dark:text-zinc-500 italic">
            Your todos will appear here.
          </p>
        </section>
      </main>
    </div>
  );
}
