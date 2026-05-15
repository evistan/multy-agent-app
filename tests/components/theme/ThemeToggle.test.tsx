import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock lucide-react icons with testid
vi.mock('lucide-react', () => ({
  Sun: () => React.createElement('svg', { 'data-testid': 'sun-icon' }),
  Moon: () => React.createElement('svg', { 'data-testid': 'moon-icon' }),
}));

// Mock next-themes with a controllable hook
const mockSetTheme = vi.fn();
let mockTheme = 'light';

vi.mock('next-themes', () => ({
  useTheme: vi.fn(() => ({
    theme: mockTheme,
    setTheme: mockSetTheme,
  })),
}));

// Now import the component after mocks are set up
import { ThemeToggle } from '@/components/theme/ThemeToggle';

describe('ThemeToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTheme = 'light';
    mockSetTheme.mockClear();
  });

  describe('rendering', () => {
    it('should render a button when mounted', () => {
      render(<ThemeToggle />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should render Moon icon when in light mode', () => {
      mockTheme = 'light';
      render(<ThemeToggle />);

      const moonIcon = screen.getByTestId('moon-icon');
      expect(moonIcon).toBeInTheDocument();
      expect(screen.queryByTestId('sun-icon')).not.toBeInTheDocument();
    });

    it('should render Sun icon when in dark mode', () => {
      mockTheme = 'dark';
      render(<ThemeToggle />);

      const sunIcon = screen.getByTestId('sun-icon');
      expect(sunIcon).toBeInTheDocument();
      expect(screen.queryByTestId('moon-icon')).not.toBeInTheDocument();
    });
  });

  describe('aria-labels', () => {
    it('should have "Switch to dark theme" aria-label in light mode', () => {
      mockTheme = 'light';
      render(<ThemeToggle />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Switch to dark theme');
    });

    it('should have "Switch to light theme" aria-label in dark mode', () => {
      mockTheme = 'dark';
      render(<ThemeToggle />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Switch to light theme');
    });
  });

  describe('click behavior', () => {
    it('should call setTheme("dark") when clicking in light mode', async () => {
      mockTheme = 'light';
      render(<ThemeToggle />);

      const button = screen.getByRole('button');
      await userEvent.click(button);

      expect(mockSetTheme).toHaveBeenCalledWith('dark');
      expect(mockSetTheme).toHaveBeenCalledOnce();
    });

    it('should call setTheme("light") when clicking in dark mode', async () => {
      mockTheme = 'dark';
      render(<ThemeToggle />);

      const button = screen.getByRole('button');
      await userEvent.click(button);

      expect(mockSetTheme).toHaveBeenCalledWith('light');
      expect(mockSetTheme).toHaveBeenCalledOnce();
    });

    it('should toggle theme when clicked multiple times', async () => {
      mockTheme = 'light';
      const { rerender } = render(<ThemeToggle />);

      let button = screen.getByRole('button');
      await userEvent.click(button);
      expect(mockSetTheme).toHaveBeenCalledWith('dark');

      mockTheme = 'dark';
      rerender(<ThemeToggle />);
      button = screen.getByRole('button');
      await userEvent.click(button);
      expect(mockSetTheme).toHaveBeenCalledWith('light');

      expect(mockSetTheme).toHaveBeenCalledTimes(2);
    });
  });

  describe('button attributes', () => {
    it('should have type="button" to prevent form submission', () => {
      render(<ThemeToggle />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'button');
    });

    it('should have appropriate CSS classes for styling', () => {
      render(<ThemeToggle />);

      const button = screen.getByRole('button');
      const classList = button.className;

      // Check for key styling classes
      expect(classList).toContain('fixed');
      expect(classList).toContain('rounded-lg');
      expect(classList).toContain('h-10');
      expect(classList).toContain('w-10');
    });
  });

  describe('icon toggling', () => {
    it('should toggle between Moon and Sun icons when theme changes', () => {
      mockTheme = 'light';
      const { rerender } = render(<ThemeToggle />);

      const moonIcon = screen.getByTestId('moon-icon');
      expect(moonIcon).toBeInTheDocument();

      mockTheme = 'dark';
      rerender(<ThemeToggle />);

      const sunIcon = screen.getByTestId('sun-icon');
      expect(sunIcon).toBeInTheDocument();
      expect(screen.queryByTestId('moon-icon')).not.toBeInTheDocument();
    });
  });
});
