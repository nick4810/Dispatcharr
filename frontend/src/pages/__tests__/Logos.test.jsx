import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LogosPage from '../Logos';
import useLogosStore from '../../store/logos';
import useVODLogosStore from '../../store/vodLogos';
import { notifications } from '@mantine/notifications';

vi.mock('../../store/logos');
vi.mock('../../store/vodLogos');
vi.mock('@mantine/notifications');
vi.mock('../../components/tables/LogosTable', () => ({
  default: () => <div data-testid="logos-table">LogosTable</div>
}));
vi.mock('../../components/tables/VODLogosTable', () => ({
  default: () => <div data-testid="vod-logos-table">VODLogosTable</div>
}));
vi.mock('@mantine/core', () => {
  const tabsComponent = ({ children, value, onChange }) =>
    <div data-testid="tabs" data-value={value} onClick={() => onChange('vod')}>{children}</div>;
  tabsComponent.List = ({ children }) => <div>{children}</div>;
  tabsComponent.Tab = ({ children, value }) => <button data-value={value}>{children}</button>;

  return {
    Box: ({ children, ...props }) => <div {...props}>{children}</div>,
    Flex: ({ children, ...props }) => <div {...props}>{children}</div>,
    Text: ({ children, ...props }) => <span {...props}>{children}</span>,
    Tabs: tabsComponent,
  };
});

describe('LogosPage', () => {
  const mockFetchAllLogos = vi.fn();
  const mockNeedsAllLogos = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    useLogosStore.mockReturnValue({
      fetchAllLogos: mockFetchAllLogos,
      needsAllLogos: mockNeedsAllLogos,
      logos: { 1: {}, 2: {}, 3: {} },
    });

    useVODLogosStore.mockReturnValue({
      totalCount: 5,
    });

    notifications.show = vi.fn();
    mockNeedsAllLogos.mockReturnValue(true);
    mockFetchAllLogos.mockResolvedValue();
  });

  it('renders with channel logos tab by default', () => {
    render(<LogosPage />);

    expect(screen.getByText('Logos')).toBeInTheDocument();
    expect(screen.getByTestId('logos-table')).toBeInTheDocument();
    expect(screen.queryByTestId('vod-logos-table')).not.toBeInTheDocument();
  });

  it('displays correct channel logos count', () => {
    render(<LogosPage />);

    expect(screen.getByText(/\(3 logos\)/i)).toBeInTheDocument();
  });

  it('displays singular "logo" when count is 1', () => {
    useLogosStore.mockReturnValue({
      fetchAllLogos: mockFetchAllLogos,
      needsAllLogos: mockNeedsAllLogos,
      logos: { 1: {} },
    });

    render(<LogosPage />);

    expect(screen.getByText(/\(1 logo\)/i)).toBeInTheDocument();
  });

  it('fetches all logos on mount when needed', async () => {
    render(<LogosPage />);

    await waitFor(() => {
      expect(mockNeedsAllLogos).toHaveBeenCalled();
      expect(mockFetchAllLogos).toHaveBeenCalled();
    });
  });

  it('does not fetch logos when not needed', async () => {
    mockNeedsAllLogos.mockReturnValue(false);

    render(<LogosPage />);

    await waitFor(() => {
      expect(mockNeedsAllLogos).toHaveBeenCalled();
      expect(mockFetchAllLogos).not.toHaveBeenCalled();
    });
  });

  it('shows error notification when fetching logos fails', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = new Error('Failed to fetch');
    mockFetchAllLogos.mockRejectedValue(error);

    render(<LogosPage />);

    await waitFor(() => {
      expect(notifications.show).toHaveBeenCalledWith({
        title: 'Error',
        message: 'Failed to load channel logos',
        color: 'red',
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to load channel logos:',
        error
      );
    });

    consoleErrorSpy.mockRestore();
  });

  it('switches to VOD logos tab when clicked', () => {
    const { rerender } = render(<LogosPage />);

    expect(screen.getByTestId('logos-table')).toBeInTheDocument();

    const tabs = screen.getByTestId('tabs');
    fireEvent.click(tabs);

    rerender(<LogosPage />);

    expect(screen.getByTestId('vod-logos-table')).toBeInTheDocument();
    expect(screen.queryByTestId('logos-table')).not.toBeInTheDocument();
  });

  it('renders both tab options', () => {
    render(<LogosPage />);

    expect(screen.getByText('Channel Logos')).toBeInTheDocument();
    expect(screen.getByText('VOD Logos')).toBeInTheDocument();
  });

  it('displays zero logos correctly', () => {
    useLogosStore.mockReturnValue({
      fetchAllLogos: mockFetchAllLogos,
      needsAllLogos: mockNeedsAllLogos,
      logos: {},
    });

    render(<LogosPage />);

    expect(screen.getByText(/\(0 logos\)/i)).toBeInTheDocument();
  });
});
