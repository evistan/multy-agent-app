import { getTodos } from "@/app/actions/todos";
import { TodoForm } from "@/components/features/todos/TodoForm";
import { TodoList } from "@/components/features/todos/TodoList";

export const metadata = {
  title: "My Todos",
  description: "Manage your todos",
};

export default async function TodosPage() {
  const { data: todos } = await getTodos();

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

        <TodoForm />

        <section aria-label="Your todo items">
          <TodoList todos={todos} />
        </section>
      </main>
    </div>
  );
}
