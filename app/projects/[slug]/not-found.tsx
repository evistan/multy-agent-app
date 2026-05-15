import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center min-h-screen bg-zinc-50 dark:bg-black">
      <p className="text-zinc-500 dark:text-zinc-400 mb-4">
        Project not found.
      </p>
      <Link href="/" className="text-sm text-black dark:text-white underline">
        Back to projects
      </Link>
    </div>
  );
}
