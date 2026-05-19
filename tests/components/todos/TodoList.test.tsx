import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TodoList } from "@/components/features/todos/TodoList";
import { EmptyState } from "@/components/features/todos/EmptyState";
import type { Todo } from "@/app/actions/todos";

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  CheckCircle2: () =>
    React.createElement("svg", { "data-testid": "check-circle-icon" }),
  Trash2: () =>
    React.createElement("svg", { "data-testid": "trash-icon" }),
  Loader2: () =>
    React.createElement("svg", { "data-testid": "loader-icon" }),
  Pin: () =>
    React.createElement("svg", { "data-testid": "pin-icon" }),
  Star: () =>
    React.createElement("svg", { "data-testid": "star-icon" }),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
}));

// Mock server actions
vi.mock("@/app/actions/todos", () => ({
  deleteTodo: vi.fn(),
  togglePinTodo: vi.fn(),
}));

import { deleteTodo } from "@/app/actions/todos";
const mockDeleteTodo = vi.mocked(deleteTodo);

describe("TodoList", () => {
  describe("empty state", () => {
    it("renders EmptyState when todos array is empty", () => {
      render(<TodoList todos={[]} />);
      expect(screen.getByText("No todos yet")).toBeInTheDocument();
    });

    it("does not render list when empty", () => {
      render(<TodoList todos={[]} />);
      const list = screen.queryByRole("list");
      expect(list).not.toBeInTheDocument();
    });
  });

  describe("with todos", () => {
    it("renders list element when todos array has entries", () => {
      const todos: Todo[] = [
        {
          id: "1",
          title: "Buy milk",
          createdAt: new Date().toISOString(),
          isPinned: false,
        },
      ];

      render(<TodoList todos={todos} />);
      const list = screen.getByRole("list");
      expect(list).toBeInTheDocument();
    });

    it("does not render EmptyState when todos array has entries", () => {
      const todos: Todo[] = [
        {
          id: "1",
          title: "Buy milk",
          createdAt: new Date().toISOString(),
          isPinned: false,
        },
      ];

      render(<TodoList todos={todos} />);
      expect(screen.queryByText("No todos yet")).not.toBeInTheDocument();
    });

    it("renders single todo item", () => {
      const todos: Todo[] = [
        {
          id: "1",
          title: "Buy milk",
          createdAt: new Date().toISOString(),
          isPinned: false,
        },
      ];

      render(<TodoList todos={todos} />);
      expect(screen.getByText("Buy milk")).toBeInTheDocument();
    });

    it("renders multiple todo items", () => {
      const now = new Date().toISOString();
      const todos: Todo[] = [
        { id: "1", title: "Buy milk", createdAt: now, isPinned: false },
        { id: "2", title: "Walk the dog", createdAt: now, isPinned: false },
        { id: "3", title: "Read a book", createdAt: now, isPinned: false },
      ];

      render(<TodoList todos={todos} />);
      expect(screen.getByText("Buy milk")).toBeInTheDocument();
      expect(screen.getByText("Walk the dog")).toBeInTheDocument();
      expect(screen.getByText("Read a book")).toBeInTheDocument();
    });

    it("renders correct number of list items", () => {
      const now = new Date().toISOString();
      const todos: Todo[] = [
        { id: "1", title: "Todo 1", createdAt: now, isPinned: false },
        { id: "2", title: "Todo 2", createdAt: now, isPinned: false },
        { id: "3", title: "Todo 3", createdAt: now, isPinned: false },
      ];

      render(<TodoList todos={todos} />);
      const items = screen.getAllByRole("listitem");
      expect(items).toHaveLength(3);
    });

    it("has aria-label on list", () => {
      const todos: Todo[] = [
        {
          id: "1",
          title: "Buy milk",
          createdAt: new Date().toISOString(),
          isPinned: false,
        },
      ];

      render(<TodoList todos={todos} />);
      const list = screen.getByRole("list");
      expect(list).toHaveAttribute("aria-label", "Todo list");
    });
  });

  describe("todo item rendering", () => {
    it("renders todo title in each item", () => {
      const now = new Date().toISOString();
      const todos: Todo[] = [
        { id: "1", title: "First task", createdAt: now, isPinned: false },
        { id: "2", title: "Second task", createdAt: now, isPinned: false },
      ];

      render(<TodoList todos={todos} />);
      expect(screen.getByText("First task")).toBeInTheDocument();
      expect(screen.getByText("Second task")).toBeInTheDocument();
    });

    it("renders checkbox in each todo item", () => {
      const todos: Todo[] = [
        {
          id: "1",
          title: "Buy milk",
          createdAt: new Date().toISOString(),
          isPinned: false,
        },
      ];

      render(<TodoList todos={todos} />);
      const checkboxes = screen.getAllByRole("checkbox");
      expect(checkboxes.length).toBeGreaterThan(0);
    });
  });
});

describe("EmptyState", () => {
  describe("rendering", () => {
    it("renders heading text", () => {
      render(<EmptyState />);
      expect(screen.getByText("No todos yet")).toBeInTheDocument();
    });

    it("renders subtitle text", () => {
      render(<EmptyState />);
      expect(screen.getByText("Create one to get started")).toBeInTheDocument();
    });

    it("renders all text elements together", () => {
      render(<EmptyState />);
      expect(screen.getByText("No todos yet")).toBeInTheDocument();
      expect(screen.getByText("Create one to get started")).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("heading and subtitle are readable by screen readers", () => {
      render(<EmptyState />);
      // These elements should not be hidden from screen readers
      const heading = screen.getByText("No todos yet");
      const subtitle = screen.getByText("Create one to get started");

      expect(heading).toBeVisible();
      expect(subtitle).toBeVisible();
    });
  });
});

describe("TodoItem delete button", () => {
  const todo: Todo = {
    id: "test-1",
    title: "Buy milk",
    createdAt: new Date().toISOString(),
    isPinned: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders a delete button with aria-label", () => {
    render(<TodoList todos={[todo]} />);
    const deleteButton = screen.getByRole("button", { name: /delete todo/i });
    expect(deleteButton).toBeInTheDocument();
  });

  it("calls deleteTodo with the todo id when delete button is clicked", async () => {
    mockDeleteTodo.mockResolvedValue({ data: { id: "test-1" } });
    render(<TodoList todos={[todo]} />);

    const user = userEvent.setup();
    const deleteButton = screen.getByRole("button", { name: /delete todo/i });
    await user.click(deleteButton);

    await waitFor(() => {
      expect(mockDeleteTodo).toHaveBeenCalledWith("test-1");
    });
  });

  it("shows Loader2 spinner while deleting (button becomes disabled)", async () => {
    mockDeleteTodo.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () => resolve({ data: { id: "test-1" } }),
            500
          )
        )
    );

    render(<TodoList todos={[todo]} />);

    const user = userEvent.setup();
    const deleteButton = screen.getByRole("button", { name: /delete todo/i });
    await user.click(deleteButton);

    await waitFor(() => {
      const deletingButton = screen.getByRole("button", {
        name: /deleting/i,
      });
      expect(deletingButton).toBeDisabled();
    });
  });
});
