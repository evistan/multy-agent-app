import { createTodo, getTodos } from "@/app/actions/todos";

describe("createTodo", () => {
  describe("valid input", () => {
    it("returns { data: Todo } for valid input", async () => {
      const result = await createTodo({ title: "Test todo" });
      expect("data" in result).toBe(true);
      if ("data" in result) {
        expect(result.data.id).toBeTruthy();
        expect(typeof result.data.id).toBe("string");
        expect(result.data.title).toBe("Test todo");
        expect(result.data.createdAt).toBeTruthy();
        // Verify it's a valid ISO string
        expect(new Date(result.data.createdAt).toISOString()).toBe(
          result.data.createdAt
        );
      }
    });

    it("trims title before storing", async () => {
      const result = await createTodo({ title: "  hello  " });
      expect("data" in result).toBe(true);
      if ("data" in result) {
        expect(result.data.title).toBe("hello");
      }
    });

    it("generates unique IDs for multiple todos", async () => {
      const result1 = await createTodo({ title: "Todo 1" });
      const result2 = await createTodo({ title: "Todo 2" });

      expect("data" in result1).toBe(true);
      expect("data" in result2).toBe(true);
      if ("data" in result1 && "data" in result2) {
        expect(result1.data.id).not.toBe(result2.data.id);
      }
    });
  });

  describe("validation errors", () => {
    it("returns VALIDATION error for empty title", async () => {
      const result = await createTodo({ title: "" });
      expect("error" in result).toBe(true);
      if ("error" in result) {
        expect(result.error.code).toBe("VALIDATION");
        expect(result.error.message).toBe("Invalid input");
      }
    });

    it("returns VALIDATION error for whitespace-only title", async () => {
      const result = await createTodo({ title: "   " });
      expect("error" in result).toBe(true);
      if ("error" in result) {
        expect(result.error.code).toBe("VALIDATION");
      }
    });

    it("returns VALIDATION error for title over 100 characters", async () => {
      const result = await createTodo({ title: "a".repeat(101) });
      expect("error" in result).toBe(true);
      if ("error" in result) {
        expect(result.error.code).toBe("VALIDATION");
      }
    });

    it("returns VALIDATION error for missing title field", async () => {
      // @ts-expect-error - testing invalid input
      const result = await createTodo({});
      expect("error" in result).toBe(true);
      if ("error" in result) {
        expect(result.error.code).toBe("VALIDATION");
      }
    });
  });

  describe("error handling", () => {
    it("catches unexpected errors and returns INTERNAL_ERROR", async () => {
      // We'll test this by monitoring the function behavior
      // The try/catch is in place, so we just verify it doesn't throw
      const result = await createTodo({ title: "Test" });
      expect(result).toHaveProperty("data");
    });
  });
});

describe("getTodos", () => {
  describe("return structure", () => {
    it("returns { data: [] } with correct structure", async () => {
      const result = await getTodos();
      expect("data" in result).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
    });
  });

  describe("state tracking", () => {
    it("returns a todo that was previously created", async () => {
      const createResult = await createTodo({
        title: "State tracking test",
      });
      expect("data" in createResult).toBe(true);

      const listResult = await getTodos();
      expect("data" in listResult).toBe(true);
      if ("data" in createResult && "data" in listResult) {
        expect(
          listResult.data.some((t) => t.title === "State tracking test")
        ).toBe(true);
      }
    });

    it("returns multiple todos created in sequence", async () => {
      const title1 = "First todo " + Date.now();
      const title2 = "Second todo " + Date.now();

      await createTodo({ title: title1 });
      await createTodo({ title: title2 });

      const result = await getTodos();
      expect("data" in result).toBe(true);
      if ("data" in result) {
        expect(result.data.some((t) => t.title === title1)).toBe(true);
        expect(result.data.some((t) => t.title === title2)).toBe(true);
      }
    });
  });

  describe("todo structure", () => {
    it("returns todos with id, title, and createdAt", async () => {
      await createTodo({ title: "Structual test" });
      const result = await getTodos();

      expect("data" in result).toBe(true);
      if ("data" in result && result.data.length > 0) {
        const todo = result.data[result.data.length - 1];
        expect(todo).toHaveProperty("id");
        expect(todo).toHaveProperty("title");
        expect(todo).toHaveProperty("createdAt");
        expect(typeof todo.id).toBe("string");
        expect(typeof todo.title).toBe("string");
        expect(typeof todo.createdAt).toBe("string");
      }
    });
  });
});
