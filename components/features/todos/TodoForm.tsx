"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { createTodo, type ActionError } from "@/app/actions/todos";

interface TodoFormValues {
  title: string;
}

type SubmitState =
  | { type: "idle" }
  | { type: "success"; message: string }
  | { type: "error"; error: ActionError };

export function TodoForm() {
  const router = useRouter();
  const [submitState, setSubmitState] = useState<SubmitState>({ type: "idle" });
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Return focus to the input after a successful submission
  useEffect(() => {
    if (submitState.type === "success") {
      inputRef.current?.focus();
    }
  }, [submitState.type]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TodoFormValues>({
    defaultValues: { title: "" },
  });

  // Merge react-hook-form ref with our local ref so we can call focus()
  const { ref: rhfRef, ...titleRegistration } = register("title", {
    required: "Title is required.",
    maxLength: {
      value: 100,
      message: "Title must be 100 characters or fewer.",
    },
    validate: (value) => value.trim().length > 0 || "Title cannot be blank.",
  });

  const onSubmit = async (data: TodoFormValues) => {
    setSubmitState({ type: "idle" });

    const result = await createTodo({ title: data.title });

    if ("error" in result) {
      setSubmitState({ type: "error", error: result.error });
      return;
    }

    setSubmitState({
      type: "success",
      message: "Todo added successfully!",
    });
    reset();
    router.refresh();

    // Clear success message after 3 seconds
    setTimeout(() => {
      setSubmitState({ type: "idle" });
    }, 3000);
  };

  const hasFieldError = !!errors.title;
  const hasServerError = submitState.type === "error";

  return (
    <section aria-labelledby="add-todo-heading">
      <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm md:p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h2
          id="add-todo-heading"
          className="mb-4 text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Add a new todo
        </h2>

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          aria-label="Add a new todo"
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="todo-title"
              className="text-sm font-medium text-foreground"
            >
              Todo title
            </label>
            <input
              id="todo-title"
              type="text"
              placeholder="What needs to be done?"
              aria-required="true"
              aria-invalid={hasFieldError}
              aria-describedby={
                hasFieldError
                  ? "todo-title-error"
                  : hasServerError
                    ? "todo-submit-error"
                    : undefined
              }
              disabled={isSubmitting}
              ref={(el) => {
                rhfRef(el);
                inputRef.current = el;
              }}
              {...titleRegistration}
              className={[
                "w-full rounded-lg border px-3 py-2 text-sm text-foreground placeholder:text-zinc-400 dark:placeholder:text-zinc-500",
                "bg-background outline-none",
                "transition-colors duration-200",
                "focus:ring-2 focus:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-50",
                hasFieldError
                  ? "border-red-500 focus:ring-red-500"
                  : "border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600 focus:ring-zinc-800 dark:focus:ring-zinc-100",
              ].join(" ")}
            />
            {hasFieldError && (
              <p
                id="todo-title-error"
                role="alert"
                className="text-sm text-red-600 dark:text-red-400"
              >
                {errors.title?.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
            className={[
              "flex items-center justify-center gap-2 rounded-lg px-4 py-2",
              "text-sm font-medium md:text-base",
              "bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300",
              "transition-colors duration-200",
              "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-800 dark:focus:ring-zinc-100",
              "disabled:cursor-not-allowed disabled:opacity-50",
            ].join(" ")}
          >
            {isSubmitting ? (
              <>
                <Loader2
                  className="h-4 w-4 animate-spin"
                  aria-hidden="true"
                />
                Adding...
              </>
            ) : (
              "Add Todo"
            )}
          </button>

          {submitState.type === "error" && (
            <p
              id="todo-submit-error"
              role="alert"
              className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
            >
              {submitState.error.message}
            </p>
          )}

          {submitState.type === "success" && (
            <p
              role="status"
              className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950 dark:text-green-300"
            >
              {submitState.message}
            </p>
          )}
        </form>
      </div>
    </section>
  );
}
