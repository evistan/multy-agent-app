import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

const projects = [
  {
    slug: "todo-app",
    name: "Todo App",
    description:
      "Task management application with full CRUD, auth and real-time updates.",
  },
];

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = projects.find((p) => p.slug === slug);

  if (!project) {
    notFound();
  }

  return (
    <div className="flex flex-col flex-1 bg-zinc-50 dark:bg-black min-h-screen">
      <main className="w-full max-w-3xl mx-auto px-8 py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-black dark:hover:text-white transition-colors mb-10"
        >
          <ArrowLeft size={14} />
          All projects
        </Link>

        <h1 className="text-3xl font-bold tracking-tight text-black dark:text-white mb-2">
          {project.name}
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 mb-12">
          {project.description}
        </p>

        <div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 px-8 py-16 text-center">
          <p className="text-zinc-400 dark:text-zinc-600 text-sm">
            Project workspace — coming soon
          </p>
        </div>
      </main>
    </div>
  );
}
