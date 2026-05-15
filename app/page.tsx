import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

const projects = [
  {
    slug: "todo-app",
    name: "Todo App",
    description:
      "Task management application with full CRUD, auth and real-time updates.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <ThemeToggle />
      <main className="flex flex-1 w-full max-w-3xl flex-col py-16 px-8 bg-white dark:bg-black">
        <div className="mb-10">
          <h1 className="text-4xl font-bold tracking-tight text-black dark:text-white">
            AgentFlow
          </h1>
          <p className="mt-2 text-lg text-zinc-500 dark:text-zinc-400">
            Multi-agent project orchestration platform
          </p>
        </div>

        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-4">
            Projects
          </h2>
          <div className="flex flex-col gap-3">
            {projects.map((project) => (
              <Link
                key={project.slug}
                href={`/projects/${project.slug}`}
                className="group flex items-center justify-between rounded-lg border border-zinc-200 dark:border-zinc-800 px-5 py-4 hover:border-zinc-400 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all"
              >
                <div>
                  <p className="font-medium text-black dark:text-white group-hover:text-zinc-700 dark:group-hover:text-zinc-300">
                    {project.name}
                  </p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {project.description}
                  </p>
                </div>
                <ArrowRight
                  size={16}
                  className="text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 flex-shrink-0 ml-4"
                />
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
