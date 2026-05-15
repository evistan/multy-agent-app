"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { createTodo } from "@/app/actions/todos";

interface TodoFormValues {
  title: string;
}

interface SubmitState {
  type: "idle" | "success" | "error";
  message: string;
}

export function TodoForm() {
  const [submitState, setSubmitState] = useState<SubmitState>({
    type: "idle",
    message: "",
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TodoFormValues>({
    defaultValues: { title: "" },
  });

  const onSubmit = async (data: TodoFormValues) => {
    setSubmitState({ type: "idle", message: "" });

    const result = await createTodo({ title: data.title });

    if ("error" in result) {
      setSubmitState({
        type: "error",
        message: result.error.message,
      });
      return;
    }

    setSubmitState({
      type: "success",
      message: "Todo added successfully!",
    });
    reset();

    // Clear success message after 3 seconds
    setTimeout(() => {
      setSubmitState({ type: "idle", message: "" });
    }, 3000);
  };

  return (
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
          aria-describedby={
            errors.title
              ? "todo-title-error"
              : submitState.type === "error"
                ? "todo-submit-error"
                : undefined
          }
          aria-invalid={!!errors.title}
          disabled={isSubmitting}
          className={[
            "w-full rounded-lg border px-3 py-2 text-sm text-foreground placeholder:text-zinc-400",
            "bg-background outline-none",
            "transition-colors duration-200",
            "focus:ring-2 focus:ring-zinc-800 dark:focus:ring-zinc-100 focus:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            errors.title
              ? "border-red-500 focus:ring-red-500"
              : "border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600",
          ].join(" ")}
          {...register("title", {
            required: "Title is required.",
            maxLength: {
              value: 100,
              message: "Title must be 100 characters or fewer.",
            },
            validate: (value) =>
              value.trim().length > 0 || "Title cannot be blank.",
          })}
        />
        {errors.title && (
          <p
            id="todo-title-error"
            role="alert"
            className="text-sm text-red-600 dark:text-red-400"
          >
            {errors.title.message}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        aria-busy={isSubmitting}
        className={[
          "flex items-center justify-center gap-2 rounded-lg px-4 py-2",
          "text-sm font-medium text-white md:text-base",
          "bg-zinc-900 hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300",
          "transition-colors duration-200",
          "focus:outline-none focus:ring-2 focus:ring-zinc-800 dark:focus:ring-zinc-100 focus:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
        ].join(" ")}
      >
        {isSubmitting ? (
          <>
            <span
              aria-hidden="true"
              className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
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
          {submitState.message}
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
  );
}
