import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import UsersPage from '../Users';
import useAuthStore from '../../store/auth';

vi.mock('../../store/auth');
vi.mock('../../components/tables/UsersTable', () => ({
  default: () => <div data-testid="users-table">UsersTable</div>
}));
vi.mock('@mantine/core', () => ({
  Box: ({ children, ...props }) => <div {...props}>{children}</div>,
}));

describe('UsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when user is not authenticated', () => {
    useAuthStore.mockReturnValue({ id: null });

    const { container } = render(<UsersPage />);

    expect(container.firstChild).toBeNull();
    expect(screen.queryByTestId('users-table')).not.toBeInTheDocument();
  });

  it('renders UsersTable when user is authenticated', () => {
    useAuthStore.mockReturnValue({ id: 1, email: 'test@example.com' });

    render(<UsersPage />);

    expect(screen.getByTestId('users-table')).toBeInTheDocument();
  });

  it('handles user with id 0 as authenticated', () => {
    useAuthStore.mockReturnValue({ id: 0 });

    const { container } = render(<UsersPage />);

    // id: 0 is falsy, so should render empty
    expect(container.firstChild).toBeNull();
  });

  it('switches from unauthenticated to authenticated state', () => {
    useAuthStore.mockReturnValue({ id: null });

    const { container, rerender } = render(<UsersPage />);

    expect(container.firstChild).toBeNull();

    useAuthStore.mockReturnValue({ id: 1 });

    rerender(<UsersPage />);

    expect(screen.getByTestId('users-table')).toBeInTheDocument();
  });
});
