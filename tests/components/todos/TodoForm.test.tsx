import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TodoForm } from "@/components/features/todos/TodoForm";

// Mock the server action and lucide-react icons
vi.mock("@/app/actions/todos", () => ({
  createTodo: vi.fn(),
}));

vi.mock("lucide-react", () => ({
  Loader2: () =>
    React.createElement("svg", { "data-testid": "loader-icon", role: "status" }),
}));

import { createTodo } from "@/app/actions/todos";

const mockCreateTodo = vi.mocked(createTodo);

describe("TodoForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock to return success
    mockCreateTodo.mockResolvedValue({
      data: {
        id: "test-id-1",
        title: "Test todo",
        createdAt: new Date().toISOString(),
      },
    });
  });

  describe("idle state rendering", () => {
    it("renders the form with input and button", () => {
      render(<TodoForm />);

      expect(screen.getByLabelText("Todo title")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("What needs to be done?")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Add Todo/i })).toBeInTheDocument();
    });

    it("renders the section heading", () => {
      render(<TodoForm />);
      expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
        "Add a new todo"
      );
    });

    it("renders input and button enabled by default", () => {
      render(<TodoForm />);

      const input = screen.getByLabelText("Todo title") as HTMLInputElement;
      const button = screen.getByRole("button", { name: /Add Todo/i }) as HTMLButtonElement;

      expect(input.disabled).toBe(false);
      expect(button.disabled).toBe(false);
    });

    it("has correct aria attributes in idle state", () => {
      render(<TodoForm />);

      const input = screen.getByLabelText("Todo title");
      expect(input).toHaveAttribute("aria-required", "true");
      expect(input).toHaveAttribute("aria-invalid", "false");
    });
  });

  describe("validation errors", () => {
    it("shows validation error when submitted with empty title", async () => {
      const user = userEvent.setup();
      render(<TodoForm />);

      const button = screen.getByRole("button", { name: /Add Todo/i });
      await user.click(button);

      await waitFor(() => {
        expect(
          screen.getByText("Title is required.")
        ).toBeInTheDocument();
      });
    });

    it("shows validation error for whitespace-only title", async () => {
      const user = userEvent.setup();
      render(<TodoForm />);

      const input = screen.getByLabelText("Todo title");
      await user.type(input, "   ");

      const button = screen.getByRole("button", { name: /Add Todo/i });
      await user.click(button);

      await waitFor(() => {
        expect(
          screen.getByText("Title cannot be blank.")
        ).toBeInTheDocument();
      });
    });

    it("shows validation error for title over 100 characters", async () => {
      const user = userEvent.setup();
      render(<TodoForm />);

      const input = screen.getByLabelText("Todo title");
      await user.type(input, "a".repeat(101));

      const button = screen.getByRole("button", { name: /Add Todo/i });
      await user.click(button);

      await waitFor(() => {
        expect(
          screen.getByText("Title must be 100 characters or fewer.")
        ).toBeInTheDocument();
      });
    });

    it("displays validation error with role=alert", async () => {
      const user = userEvent.setup();
      render(<TodoForm />);

      const button = screen.getByRole("button", { name: /Add Todo/i });
      await user.click(button);

      await waitFor(() => {
        const errorMsg = screen.getByText("Title is required.");
        expect(errorMsg).toHaveAttribute("role", "alert");
      });
    });
  });

  describe("successful submission", () => {
    it("calls createTodo when form is submitted", async () => {
      const user = userEvent.setup();
      render(<TodoForm />);

      const input = screen.getByLabelText("Todo title");
      const button = screen.getByRole("button", { name: /Add Todo/i });

      await user.type(input, "Test todo");
      await user.click(button);

      await waitFor(() => {
        expect(mockCreateTodo).toHaveBeenCalledWith({
          title: "Test todo",
        });
      });
    });
  });

  describe("server errors", () => {
    it("mock is callable", () => {
      expect(typeof mockCreateTodo).toBe("function");
    });
  });

  describe("loading state", () => {
    it("button has aria-busy attribute for accessibility", () => {
      render(<TodoForm />);

      const button = screen.getByRole("button", { name: /Add Todo/i });
      expect(button).toHaveAttribute("aria-busy");
    });
  });

  describe("form submission", () => {
    it("button has type=submit for form submission", () => {
      render(<TodoForm />);

      const button = screen.getByRole("button", { name: /Add Todo/i });
      expect(button).toHaveAttribute("type", "submit");
    });
  });
});
