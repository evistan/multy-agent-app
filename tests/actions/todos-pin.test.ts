import { describe, it, expect } from "vitest";
import { createTodo, deleteTodo, getTodos, togglePinTodo } from "@/app/actions/todos";

// Note: The in-memory store is module-level and shared between tests.
// We clean up using deleteTodo between test groups to avoid cross-test contamination.
// Each test function creates unique todo titles using Date.now() to avoid collisions.

describe("togglePinTodo", () => {
  describe("pin and unpin", () => {
    it("pins an unpinned todo", async () => {
      const timestamp = Date.now();
      const createResult = await createTodo({ title: `Pin test ${timestamp}` });
      expect("data" in createResult).toBe(true);

      if ("data" in createResult) {
        const todoId = createResult.data.id;
        const toggleResult = await togglePinTodo(todoId);

        expect("data" in toggleResult).toBe(true);
        if ("data" in toggleResult) {
          expect(toggleResult.data.id).toBe(todoId);
          expect(toggleResult.data.isPinned).toBe(true);
        }

        // Verify the state persisted in getTodos
        const listResult = await getTodos();
        expect("data" in listResult).toBe(true);
        if ("data" in listResult) {
          const updated = listResult.data.find((t) => t.id === todoId);
          expect(updated?.isPinned).toBe(true);
        }

        // Cleanup
        await deleteTodo(todoId);
      }
    });

    it("unpins a pinned todo", async () => {
      const timestamp = Date.now();
      const createResult = await createTodo({ title: `Unpin test ${timestamp}` });
      expect("data" in createResult).toBe(true);

      if ("data" in createResult) {
        const todoId = createResult.data.id;

        // First pin it
        await togglePinTodo(todoId);

        // Then unpin it
        const toggleResult = await togglePinTodo(todoId);

        expect("data" in toggleResult).toBe(true);
        if ("data" in toggleResult) {
          expect(toggleResult.data.id).toBe(todoId);
          expect(toggleResult.data.isPinned).toBe(false);
        }

        // Verify the state persisted in getTodos
        const listResult = await getTodos();
        expect("data" in listResult).toBe(true);
        if ("data" in listResult) {
          const updated = listResult.data.find((t) => t.id === todoId);
          expect(updated?.isPinned).toBe(false);
        }

        // Cleanup
        await deleteTodo(todoId);
      }
    });

    it("handles multiple toggles correctly (pin → unpin → pin)", async () => {
      const timestamp = Date.now();
      const createResult = await createTodo({
        title: `Multiple toggle test ${timestamp}`,
      });
      expect("data" in createResult).toBe(true);

      if ("data" in createResult) {
        const todoId = createResult.data.id;

        // First toggle: pin (false → true)
        let toggleResult = await togglePinTodo(todoId);
        expect("data" in toggleResult).toBe(true);
        if ("data" in toggleResult) {
          expect(toggleResult.data.isPinned).toBe(true);
        }

        // Second toggle: unpin (true → false)
        toggleResult = await togglePinTodo(todoId);
        expect("data" in toggleResult).toBe(true);
        if ("data" in toggleResult) {
          expect(toggleResult.data.isPinned).toBe(false);
        }

        // Third toggle: pin again (false → true)
        toggleResult = await togglePinTodo(todoId);
        expect("data" in toggleResult).toBe(true);
        if ("data" in toggleResult) {
          expect(toggleResult.data.isPinned).toBe(true);
        }

        // Cleanup
        await deleteTodo(todoId);
      }
    });
  });

  describe("error handling", () => {
    it("returns NOT_FOUND error for unknown id", async () => {
      const result = await togglePinTodo("non-existent-id-xyz-123");

      expect("error" in result).toBe(true);
      if ("error" in result) {
        expect(result.error.code).toBe("NOT_FOUND");
        expect(result.error.message).toBe("Todo not found");
      }
    });
  });
});

describe("getTodos sorting", () => {
  describe("pinned vs unpinned order", () => {
    it("returns pinned todos before unpinned todos", async () => {
      const baseTimestamp = Date.now();
      const unpinnedResult1 = await createTodo({
        title: `Unpinned 1 ${baseTimestamp}`,
      });
      const unpinnedResult2 = await createTodo({
        title: `Unpinned 2 ${baseTimestamp}`,
      });
      const pinnedResult1 = await createTodo({ title: `Pinned 1 ${baseTimestamp}` });

      const unpinnedId1 =
        "data" in unpinnedResult1 ? unpinnedResult1.data.id : "";
      const unpinnedId2 =
        "data" in unpinnedResult2 ? unpinnedResult2.data.id : "";
      const pinnedId1 = "data" in pinnedResult1 ? pinnedResult1.data.id : "";

      // Pin the middle todo
      if (pinnedId1) {
        await togglePinTodo(pinnedId1);
      }

      const listResult = await getTodos();
      expect("data" in listResult).toBe(true);

      if ("data" in listResult) {
        const filteredTodos = listResult.data.filter(
          (t) =>
            t.id === unpinnedId1 || t.id === unpinnedId2 || t.id === pinnedId1
        );

        // Pinned should come first
        expect(filteredTodos[0]?.isPinned).toBe(true);
        expect(filteredTodos[1]?.isPinned).toBe(false);
        expect(filteredTodos[2]?.isPinned).toBe(false);
      }

      // Cleanup
      if (unpinnedId1) await deleteTodo(unpinnedId1);
      if (unpinnedId2) await deleteTodo(unpinnedId2);
      if (pinnedId1) await deleteTodo(pinnedId1);
    });

    it("sorts within pinned group by createdAt ASC", async () => {
      const baseTimestamp = Date.now();

      // Create three todos with small delays to ensure distinct timestamps
      const result1 = await createTodo({ title: `Pinned A ${baseTimestamp}` });
      // Small delay to ensure createdAt is different
      await new Promise((r) => setTimeout(r, 10));
      const result2 = await createTodo({ title: `Pinned B ${baseTimestamp}` });
      await new Promise((r) => setTimeout(r, 10));
      const result3 = await createTodo({ title: `Pinned C ${baseTimestamp}` });

      const id1 = "data" in result1 ? result1.data.id : "";
      const id2 = "data" in result2 ? result2.data.id : "";
      const id3 = "data" in result3 ? result3.data.id : "";

      // Pin all three
      if (id1) await togglePinTodo(id1);
      if (id2) await togglePinTodo(id2);
      if (id3) await togglePinTodo(id3);

      const listResult = await getTodos();
      expect("data" in listResult).toBe(true);

      if ("data" in listResult) {
        const pinnedTodos = listResult.data.filter(
          (t) => t.id === id1 || t.id === id2 || t.id === id3
        );

        // All should be pinned
        expect(pinnedTodos.every((t) => t.isPinned)).toBe(true);

        // Order should be by createdAt ASC: id1, id2, id3
        expect(pinnedTodos[0]?.id).toBe(id1);
        expect(pinnedTodos[1]?.id).toBe(id2);
        expect(pinnedTodos[2]?.id).toBe(id3);
      }

      // Cleanup
      if (id1) await deleteTodo(id1);
      if (id2) await deleteTodo(id2);
      if (id3) await deleteTodo(id3);
    });

    it("sorts within unpinned group by createdAt ASC", async () => {
      const baseTimestamp = Date.now();

      const result1 = await createTodo({
        title: `Unpinned X ${baseTimestamp}`,
      });
      await new Promise((r) => setTimeout(r, 10));
      const result2 = await createTodo({
        title: `Unpinned Y ${baseTimestamp}`,
      });
      await new Promise((r) => setTimeout(r, 10));
      const result3 = await createTodo({
        title: `Unpinned Z ${baseTimestamp}`,
      });

      const id1 = "data" in result1 ? result1.data.id : "";
      const id2 = "data" in result2 ? result2.data.id : "";
      const id3 = "data" in result3 ? result3.data.id : "";

      const listResult = await getTodos();
      expect("data" in listResult).toBe(true);

      if ("data" in listResult) {
        const unpinnedTodos = listResult.data.filter(
          (t) => t.id === id1 || t.id === id2 || t.id === id3
        );

        // All should be unpinned
        expect(unpinnedTodos.every((t) => !t.isPinned)).toBe(true);

        // Order should be by createdAt ASC: id1, id2, id3
        expect(unpinnedTodos[0]?.id).toBe(id1);
        expect(unpinnedTodos[1]?.id).toBe(id2);
        expect(unpinnedTodos[2]?.id).toBe(id3);
      }

      // Cleanup
      if (id1) await deleteTodo(id1);
      if (id2) await deleteTodo(id2);
      if (id3) await deleteTodo(id3);
    });

    it("handles mixed pinned and unpinned with correct order", async () => {
      const baseTimestamp = Date.now();

      // Create in order: unpin, pin, unpin, pin
      const result1 = await createTodo({ title: `Mixed 1 ${baseTimestamp}` });
      await new Promise((r) => setTimeout(r, 10));
      const result2 = await createTodo({ title: `Mixed 2 ${baseTimestamp}` });
      await new Promise((r) => setTimeout(r, 10));
      const result3 = await createTodo({ title: `Mixed 3 ${baseTimestamp}` });
      await new Promise((r) => setTimeout(r, 10));
      const result4 = await createTodo({ title: `Mixed 4 ${baseTimestamp}` });

      const id1 = "data" in result1 ? result1.data.id : "";
      const id2 = "data" in result2 ? result2.data.id : "";
      const id3 = "data" in result3 ? result3.data.id : "";
      const id4 = "data" in result4 ? result4.data.id : "";

      // Pin id2 and id4
      if (id2) await togglePinTodo(id2);
      if (id4) await togglePinTodo(id4);

      const listResult = await getTodos();
      expect("data" in listResult).toBe(true);

      if ("data" in listResult) {
        const mixedTodos = listResult.data.filter(
          (t) => t.id === id1 || t.id === id2 || t.id === id3 || t.id === id4
        );

        // First two should be pinned (id2, id4)
        expect(mixedTodos[0]?.isPinned).toBe(true);
        expect(mixedTodos[1]?.isPinned).toBe(true);
        // Last two should be unpinned (id1, id3)
        expect(mixedTodos[2]?.isPinned).toBe(false);
        expect(mixedTodos[3]?.isPinned).toBe(false);

        // Within pinned: id2 before id4 (by createdAt)
        expect(mixedTodos[0]?.id).toBe(id2);
        expect(mixedTodos[1]?.id).toBe(id4);

        // Within unpinned: id1 before id3 (by createdAt)
        expect(mixedTodos[2]?.id).toBe(id1);
        expect(mixedTodos[3]?.id).toBe(id3);
      }

      // Cleanup
      if (id1) await deleteTodo(id1);
      if (id2) await deleteTodo(id2);
      if (id3) await deleteTodo(id3);
      if (id4) await deleteTodo(id4);
    });

    it("returns all pinned todos in order by createdAt when no unpinned exist", async () => {
      const baseTimestamp = Date.now();

      const result1 = await createTodo({
        title: `All pinned 1 ${baseTimestamp}`,
      });
      await new Promise((r) => setTimeout(r, 10));
      const result2 = await createTodo({
        title: `All pinned 2 ${baseTimestamp}`,
      });
      await new Promise((r) => setTimeout(r, 10));
      const result3 = await createTodo({
        title: `All pinned 3 ${baseTimestamp}`,
      });

      const id1 = "data" in result1 ? result1.data.id : "";
      const id2 = "data" in result2 ? result2.data.id : "";
      const id3 = "data" in result3 ? result3.data.id : "";

      // Pin all
      if (id1) await togglePinTodo(id1);
      if (id2) await togglePinTodo(id2);
      if (id3) await togglePinTodo(id3);

      const listResult = await getTodos();
      expect("data" in listResult).toBe(true);

      if ("data" in listResult) {
        const allPinned = listResult.data.filter(
          (t) => t.id === id1 || t.id === id2 || t.id === id3
        );

        expect(allPinned.length).toBe(3);
        expect(allPinned.every((t) => t.isPinned)).toBe(true);
        expect(allPinned[0]?.id).toBe(id1);
        expect(allPinned[1]?.id).toBe(id2);
        expect(allPinned[2]?.id).toBe(id3);
      }

      // Cleanup
      if (id1) await deleteTodo(id1);
      if (id2) await deleteTodo(id2);
      if (id3) await deleteTodo(id3);
    });

    it("returns all unpinned todos in order by createdAt when no pinned exist", async () => {
      const baseTimestamp = Date.now();

      const result1 = await createTodo({
        title: `All unpinned 1 ${baseTimestamp}`,
      });
      await new Promise((r) => setTimeout(r, 10));
      const result2 = await createTodo({
        title: `All unpinned 2 ${baseTimestamp}`,
      });
      await new Promise((r) => setTimeout(r, 10));
      const result3 = await createTodo({
        title: `All unpinned 3 ${baseTimestamp}`,
      });

      const id1 = "data" in result1 ? result1.data.id : "";
      const id2 = "data" in result2 ? result2.data.id : "";
      const id3 = "data" in result3 ? result3.data.id : "";

      // Don't pin any (all remain unpinned)

      const listResult = await getTodos();
      expect("data" in listResult).toBe(true);

      if ("data" in listResult) {
        const allUnpinned = listResult.data.filter(
          (t) => t.id === id1 || t.id === id2 || t.id === id3
        );

        expect(allUnpinned.length).toBe(3);
        expect(allUnpinned.every((t) => !t.isPinned)).toBe(true);
        expect(allUnpinned[0]?.id).toBe(id1);
        expect(allUnpinned[1]?.id).toBe(id2);
        expect(allUnpinned[2]?.id).toBe(id3);
      }

      // Cleanup
      if (id1) await deleteTodo(id1);
      if (id2) await deleteTodo(id2);
      if (id3) await deleteTodo(id3);
    });
  });
});

describe("createTodo initialization", () => {
  it("creates new todo with isPinned set to false", async () => {
    const timestamp = Date.now();
    const result = await createTodo({ title: `New todo ${timestamp}` });

    expect("data" in result).toBe(true);
    if ("data" in result) {
      expect(result.data.isPinned).toBe(false);

      // Cleanup
      await deleteTodo(result.data.id);
    }
  });

  it("new todo appears in getTodos with isPinned false", async () => {
    const timestamp = Date.now();
    const createResult = await createTodo({
      title: `New todo in list ${timestamp}`,
    });

    expect("data" in createResult).toBe(true);

    if ("data" in createResult) {
      const todoId = createResult.data.id;
      const listResult = await getTodos();

      expect("data" in listResult).toBe(true);
      if ("data" in listResult) {
        const created = listResult.data.find((t) => t.id === todoId);
        expect(created?.isPinned).toBe(false);
      }

      // Cleanup
      await deleteTodo(todoId);
    }
  });
});
