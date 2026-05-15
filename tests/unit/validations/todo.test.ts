import { CreateTodoSchema } from "@/lib/validations/todo";

describe("CreateTodoSchema", () => {
  describe("valid inputs", () => {
    it("accepts a simple valid title", () => {
      const result = CreateTodoSchema.safeParse({ title: "Buy milk" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe("Buy milk");
      }
    });

    it("trims whitespace from title before validation", () => {
      const result = CreateTodoSchema.safeParse({
        title: "  Buy milk  ",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe("Buy milk");
      }
    });

    it("accepts title exactly 100 characters long", () => {
      const title = "a".repeat(100);
      const result = CreateTodoSchema.safeParse({ title });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe(title);
      }
    });
  });

  describe("invalid inputs", () => {
    it("rejects empty string", () => {
      const result = CreateTodoSchema.safeParse({ title: "" });
      expect(result.success).toBe(false);
    });

    it("rejects whitespace-only string (fails after trim)", () => {
      const result = CreateTodoSchema.safeParse({ title: "   " });
      expect(result.success).toBe(false);
    });

    it("rejects title longer than 100 characters", () => {
      const title = "a".repeat(101);
      const result = CreateTodoSchema.safeParse({ title });
      expect(result.success).toBe(false);
    });

    it("rejects missing title field", () => {
      const result = CreateTodoSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("rejects null title", () => {
      const result = CreateTodoSchema.safeParse({ title: null });
      expect(result.success).toBe(false);
    });

    it("rejects non-string title", () => {
      const result = CreateTodoSchema.safeParse({ title: 123 });
      expect(result.success).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("accepts single character", () => {
      const result = CreateTodoSchema.safeParse({ title: "a" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe("a");
      }
    });

    it("accepts title with leading/trailing spaces and other whitespace types", () => {
      const result = CreateTodoSchema.safeParse({ title: "\n  hello  \t" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe("hello");
      }
    });

    it("accepts title with internal spaces", () => {
      const result = CreateTodoSchema.safeParse({
        title: "Buy milk and bread",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe("Buy milk and bread");
      }
    });
  });
});
