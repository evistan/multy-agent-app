import { z } from "zod";

export const CreateTodoSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title must be 100 characters or fewer"),
});

export type CreateTodoInput = z.infer<typeof CreateTodoSchema>;
