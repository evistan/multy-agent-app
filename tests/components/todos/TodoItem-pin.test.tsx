import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TodoItem } from "@/components/features/todos/TodoItem";
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

import { togglePinTodo, deleteTodo } from "@/app/actions/todos";
const mockTogglePinTodo = vi.mocked(togglePinTodo);
const mockDeleteTodo = vi.mocked(deleteTodo);

describe("TodoItem pin button", () => {
  const unPinnedTodo: Todo = {
    id: "test-1",
    title: "Unpinned todo",
    createdAt: new Date().toISOString(),
    isPinned: false,
  };

  const pinnedTodo: Todo = {
    id: "test-2",
    title: "Pinned todo",
    createdAt: new Date().toISOString(),
    isPinned: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("pin button aria-label and aria-pressed", () => {
    it("renders pin button with aria-label='Pin todo' when unpinned", () => {
      render(<TodoItem {...unPinnedTodo} />);
      const pinButton = screen.getByRole("button", { name: /pin todo/i });
      expect(pinButton).toBeInTheDocument();
      expect(pinButton).toHaveAttribute("aria-label", "Pin todo");
    });

    it("renders pin button with aria-label='Unpin todo' when pinned", () => {
      render(<TodoItem {...pinnedTodo} />);
      const pinButton = screen.getByRole("button", { name: /unpin todo/i });
      expect(pinButton).toBeInTheDocument();
      expect(pinButton).toHaveAttribute("aria-label", "Unpin todo");
    });

    it("has aria-pressed=false when unpinned", () => {
      render(<TodoItem {...unPinnedTodo} />);
      const pinButton = screen.getByRole("button", { name: /pin todo/i });
      expect(pinButton).toHaveAttribute("aria-pressed", "false");
    });

    it("has aria-pressed=true when pinned", () => {
      render(<TodoItem {...pinnedTodo} />);
      const pinButton = screen.getByRole("button", { name: /unpin todo/i });
      expect(pinButton).toHaveAttribute("aria-pressed", "true");
    });
  });

  describe("container styling", () => {
    it("applies amber background classes when pinned", () => {
      const { container } = render(<TodoItem {...pinnedTodo} />);
      const wrapper = container.firstChild as HTMLElement;

      expect(wrapper.className).toContain("border-amber-200");
      expect(wrapper.className).toContain("bg-amber-50");
      expect(wrapper.className).toContain("dark:border-amber-800/30");
      expect(wrapper.className).toContain("dark:bg-amber-950/20");
    });

    it("applies default background classes when unpinned", () => {
      const { container } = render(<TodoItem {...unPinnedTodo} />);
      const wrapper = container.firstChild as HTMLElement;

      expect(wrapper.className).toContain("border-zinc-200");
      expect(wrapper.className).toContain("bg-white");
      expect(wrapper.className).toContain("dark:border-zinc-800");
      expect(wrapper.className).toContain("dark:bg-zinc-950");
    });

    it("does not have amber classes when unpinned", () => {
      const { container } = render(<TodoItem {...unPinnedTodo} />);
      const wrapper = container.firstChild as HTMLElement;

      expect(wrapper.className).not.toContain("bg-amber-50");
      expect(wrapper.className).not.toContain("border-amber-200");
    });

    it("does not have zinc classes when pinned", () => {
      const { container } = render(<TodoItem {...pinnedTodo} />);
      const wrapper = container.firstChild as HTMLElement;

      // Verify it doesn't have the unpinned background
      expect(wrapper.className).not.toContain("bg-white");
      expect(wrapper.className).not.toContain("dark:bg-zinc-950");
    });
  });

  describe("pin button interaction", () => {
    it("calls togglePinTodo with correct todo id when clicked", async () => {
      mockTogglePinTodo.mockResolvedValue({
        data: { id: "test-1", isPinned: true },
      });

      render(<TodoItem {...unPinnedTodo} />);

      const user = userEvent.setup();
      const pinButton = screen.getByRole("button", { name: /pin todo/i });
      await user.click(pinButton);

      await waitFor(() => {
        expect(mockTogglePinTodo).toHaveBeenCalledWith("test-1");
      });
    });

    it("shows Loader2 spinner while pin toggle is in progress", async () => {
      mockTogglePinTodo.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () => resolve({ data: { id: "test-1", isPinned: true } }),
              500
            )
          )
      );

      render(<TodoItem {...unPinnedTodo} />);

      const user = userEvent.setup();
      const pinButton = screen.getByRole("button", { name: /pin todo/i });
      await user.click(pinButton);

      await waitFor(() => {
        expect(screen.getByTestId("loader-icon")).toBeInTheDocument();
      });
    });

    it("disables pin button while toggling", async () => {
      mockTogglePinTodo.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () => resolve({ data: { id: "test-1", isPinned: true } }),
              500
            )
          )
      );

      render(<TodoItem {...unPinnedTodo} />);

      const user = userEvent.setup();
      const pinButton = screen.getByRole("button", { name: /pin todo/i });
      await user.click(pinButton);

      await waitFor(() => {
        expect(pinButton).toBeDisabled();
      });
    });

    it("handles error silently when toggle fails", async () => {
      mockTogglePinTodo.mockResolvedValue({
        error: { message: "Something went wrong", code: "INTERNAL_ERROR" },
      });

      render(<TodoItem {...unPinnedTodo} />);

      const user = userEvent.setup();
      const pinButton = screen.getByRole("button", { name: /pin todo/i });
      await user.click(pinButton);

      await waitFor(() => {
        // Button should be re-enabled after error
        expect(pinButton).not.toBeDisabled();
      });

      // Verify togglePinTodo was called
      expect(mockTogglePinTodo).toHaveBeenCalledWith("test-1");
    });
  });

  describe("pin button position relative to delete button", () => {
    it("pin button renders before delete button in DOM", () => {
      render(<TodoItem {...unPinnedTodo} />);

      const buttons = screen.getAllByRole("button");
      // First button should be pin, second should be delete
      // (there's a checkbox too, but it's not a button role with these aria-labels)
      const pinButton = screen.getByRole("button", { name: /pin todo/i });
      const deleteButton = screen.getByRole("button", { name: /delete todo/i });

      // Get the indices
      const pinIndex = buttons.indexOf(pinButton);
      const deleteIndex = buttons.indexOf(deleteButton);

      expect(pinIndex).toBeLessThan(deleteIndex);
    });
  });

  describe("pin icon styling", () => {
    it("renders pin icon when unpinned", () => {
      render(<TodoItem {...unPinnedTodo} />);
      const pinIcon = screen.getByTestId("pin-icon");
      expect(pinIcon).toBeInTheDocument();
    });

    it("renders star icon when pinned", () => {
      render(<TodoItem {...pinnedTodo} />);
      const starIcon = screen.getByTestId("star-icon");
      expect(starIcon).toBeInTheDocument();
    });

    it("replaces pin icon with loader when toggling", async () => {
      mockTogglePinTodo.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () => resolve({ data: { id: "test-1", isPinned: true } }),
              500
            )
          )
      );

      render(<TodoItem {...unPinnedTodo} />);

      const user = userEvent.setup();
      const pinButton = screen.getByRole("button", { name: /pin todo/i });
      await user.click(pinButton);

      await waitFor(() => {
        // While loading, loader should be present and pin icon should not
        expect(screen.getByTestId("loader-icon")).toBeInTheDocument();
        expect(screen.queryByTestId("pin-icon")).not.toBeInTheDocument();
      });
    });
  });

  describe("other button attributes", () => {
    it("pin button has type='button'", () => {
      render(<TodoItem {...unPinnedTodo} />);
      const pinButton = screen.getByRole("button", { name: /pin todo/i });
      expect(pinButton).toHaveAttribute("type", "button");
    });

    it("pin button has focus ring styling", () => {
      render(<TodoItem {...unPinnedTodo} />);
      const pinButton = screen.getByRole("button", { name: /pin todo/i });
      const className = pinButton.className;

      // Check for focus ring classes
      expect(className).toContain("focus:ring-2");
      expect(className).toContain("focus:outline-none");
    });
  });

  describe("title and metadata rendering", () => {
    it("renders todo title", () => {
      render(<TodoItem {...pinnedTodo} />);
      expect(screen.getByText("Pinned todo")).toBeInTheDocument();
    });

    it("renders formatted creation date", () => {
      const testDate = new Date("2026-05-17T10:30:00").toISOString();
      const todo: Todo = {
        id: "test-3",
        title: "Test todo",
        createdAt: testDate,
        isPinned: false,
      };

      render(<TodoItem {...todo} />);

      // The date should be formatted by toLocaleString
      const dateStr = new Date(testDate).toLocaleString();
      expect(screen.getByText(dateStr)).toBeInTheDocument();
    });
  });

  describe("checkbox rendering", () => {
    it("renders checkbox with aria-label", () => {
      render(<TodoItem {...unPinnedTodo} />);
      const checkbox = screen.getByRole("checkbox", {
        name: /mark as done/i,
      });
      expect(checkbox).toBeInTheDocument();
    });

    it("checkbox is independent of pin state", () => {
      const { rerender } = render(<TodoItem {...unPinnedTodo} />);
      let checkbox = screen.getByRole("checkbox", { name: /mark as done/i });
      expect(checkbox).toBeInTheDocument();

      rerender(<TodoItem {...pinnedTodo} />);
      checkbox = screen.getByRole("checkbox", { name: /mark as done/i });
      expect(checkbox).toBeInTheDocument();
    });
  });

  describe("integration with delete button", () => {
    it("pin and delete buttons are separate", () => {
      render(<TodoItem {...unPinnedTodo} />);

      const pinButton = screen.getByRole("button", { name: /pin todo/i });
      const deleteButton = screen.getByRole("button", { name: /delete todo/i });

      expect(pinButton).not.toBe(deleteButton);
    });

    it("can interact with pin button without affecting delete state", async () => {
      mockTogglePinTodo.mockResolvedValue({
        data: { id: "test-1", isPinned: true },
      });

      render(<TodoItem {...unPinnedTodo} />);

      const user = userEvent.setup();
      const pinButton = screen.getByRole("button", { name: /pin todo/i });

      await user.click(pinButton);

      await waitFor(() => {
        expect(mockTogglePinTodo).toHaveBeenCalled();
        // Delete button should not have been called
        expect(mockDeleteTodo).not.toHaveBeenCalled();
      });
    });

    it("delete button works independently from pin button", async () => {
      mockDeleteTodo.mockResolvedValue({ data: { id: "test-1" } });

      render(<TodoItem {...unPinnedTodo} />);

      const user = userEvent.setup();
      const deleteButton = screen.getByRole("button", { name: /delete todo/i });

      await user.click(deleteButton);

      await waitFor(() => {
        expect(mockDeleteTodo).toHaveBeenCalledWith("test-1");
        // Toggle pin should not have been called
        expect(mockTogglePinTodo).not.toHaveBeenCalled();
      });
    });
  });
});
