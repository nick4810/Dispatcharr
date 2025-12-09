// src/pages/__tests__/Stats.test.jsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { useLocation } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import ChannelsPage from '../Stats';
import API from '../../api';
import useSettingsStore from '../../store/settings';
import useStreamProfilesStore from '../../store/streamProfiles';
import useLocalStorage from '../../hooks/useLocalStorage';
import useChannelsStore from '../../store/channels';
import useLogosStore from '../../store/logos';
import usePlaylistsStore from '../../store/playlists';
import { CustomTable } from '../../components/tables/CustomTable/index.jsx';

// Mock dependencies
vi.mock('../../api');
vi.mock('../../store/channels');
vi.mock('../../store/logos');
vi.mock('../../store/streamProfiles');
vi.mock('../../store/playlists');
vi.mock('../../store/settings');
vi.mock('../../hooks/useLocalStorage');
vi.mock('../../components/tables/CustomTable');
vi.mock('@mantine/notifications');

// Mock Mantine components
vi.mock('@mantine/core', () => ({
  ActionIcon: ({ children, onClick }) => (
    <button onClick={onClick}>{children}</button>
  ),
  Box: ({ children }) => <div>{children}</div>,
  Button: ({ children, onClick, loading }) => (
    <button onClick={onClick} disabled={loading}>
      {children}
    </button>
  ),
  Card: ({ children }) => <div>{children}</div>,
  Center: ({ children }) => <div>{children}</div>,
  Container: ({ children }) => <div>{children}</div>,
  Flex: ({ children }) => <div>{children}</div>,
  Group: ({ children }) => <div>{children}</div>,
  Progress: ({ value }) => <div data-testid="progress" data-value={value} />,
  SimpleGrid: ({ children }) => <div>{children}</div>,
  Stack: ({ children }) => <div>{children}</div>,
  Text: ({ children }) => <div>{children}</div>,
  Title: ({ children }) => <h3>{children}</h3>,
  Tooltip: ({ children, label }) => (
    <div title={label}>{children}</div>
  ),
  Select: ({ label, value, onChange, data }) => (
    <div>
      <label>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {data.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  ),
  Badge: ({ children }) => <span>{children}</span>,
  NumberInput: ({ value, onChange, min, max }) => (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      min={min}
      max={max}
    />
  ),
}));

vi.mock('@mantine/charts', () => ({
  Sparkline: () => <div data-testid="sparkline" />,
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  ChevronDown: () => <div>ChevronDown</div>,
  Gauge: () => <div>Gauge</div>,
  HardDriveDownload: () => <div>HardDriveDownload</div>,
  HardDriveUpload: () => <div>HardDriveUpload</div>,
  SquareX: () => <div>SquareX</div>,
  Timer: () => <div>Timer</div>,
  Users: () => <div>Users</div>,
  Video: () => <div>Video</div>,
}));

// Mock dayjs
vi.mock('dayjs', () => {
  const mockDayjs = () => ({
    format: vi.fn(() => '01/01 12:00:00'),
    subtract: vi.fn(() => mockDayjs()),
    fromNow: vi.fn(() => '5 minutes ago'),
  });
  mockDayjs.duration = vi.fn(() => ({
    humanize: vi.fn(() => '5 minutes'),
  }));
  mockDayjs.unix = vi.fn(() => mockDayjs());
  mockDayjs.extend = vi.fn();
  return { default: mockDayjs };
});

vi.mock('react-router-dom', async () => {
  return {
    useLocation: vi.fn(),
  };
});

describe('Stats Page', () => {
  let mockAPI;

  beforeEach(() => {
    // Create ALL stable function references at the top
    const mockSetRefreshInterval = vi.fn();
    const mockChannelsState = {
      channels: {},
      channelsByUUID: {},
      stats: { channels: [] },
      setChannelStats: vi.fn(),
    };

    // Setup API mock
    mockAPI = {
      fetchActiveChannelStats: vi.fn().mockResolvedValue({
        channels: [],
      }),
      getVODStats: vi.fn().mockResolvedValue({
        vod_connections: [],
      }),
      stopChannel: vi.fn().mockResolvedValue({}),
      stopClient: vi.fn().mockResolvedValue({}),
      getChannelStreams: vi.fn().mockResolvedValue([]),
      switchStream: vi.fn().mockResolvedValue({}),
      getStreamsByIds: vi.fn().mockResolvedValue([]),
    };

    API.fetchActiveChannelStats = mockAPI.fetchActiveChannelStats;
    API.getVODStats = mockAPI.getVODStats;
    API.stopChannel = mockAPI.stopChannel;
    API.stopClient = mockAPI.stopClient;
    API.getChannelStreams = mockAPI.getChannelStreams;
    API.switchStream = mockAPI.switchStream;
    API.getStreamsByIds = mockAPI.getStreamsByIds;

    useChannelsStore.mockImplementation((selector) => {
      return selector ? selector(mockChannelsState) : mockChannelsState;
    });

    // Setup other stores
    useLogosStore.mockReturnValue([]);
    useStreamProfilesStore.mockReturnValue([]);
    usePlaylistsStore.mockReturnValue([]);
    useSettingsStore.mockReturnValue({});

    // Setup useLocalStorage with stable reference
    useLocalStorage.mockReturnValue([5, mockSetRefreshInterval]);

    notifications.show = vi.fn();

    CustomTable.mockReturnValue(<div data-testid="custom-table" />);

    delete window.location;
    window.location = { pathname: '/stats' };

    // const { useLocation } = await import('react-router-dom');
    useLocation.mockReturnValue({ pathname: '/stats' });

    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('renders the stats page with title', () => {
    render(<ChannelsPage />);

    expect(screen.getByText('Active Connections')).toBeInTheDocument();
  });

  it('displays no active connections message when there are no connections', () => {
    render( <ChannelsPage />);

    expect(screen.getByText('No active connections')).toBeInTheDocument();
  });

  it('fetches channel stats on mount', async () => {
    render(<ChannelsPage />);

    expect(API.fetchActiveChannelStats).toHaveBeenCalled();
  });

  it('fetches VOD stats on mount', async () => {
    render(<ChannelsPage />);

    expect(API.getVODStats).toHaveBeenCalled();
  });

  it('displays refresh interval control', () => {
    render(<ChannelsPage />);

    expect(screen.getByText('Refresh Interval (seconds):')).toBeInTheDocument();
  });

  it('handles refresh interval changes', () => {
    const setRefreshInterval = vi.fn();
    useLocalStorage.mockImplementation((key, defaultValue) => {
      if (key === 'stats-refresh-interval') {
        return [5, setRefreshInterval];
      }
      return [defaultValue, vi.fn()];
    });

    render(<ChannelsPage />);

    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '10' } });

    expect(setRefreshInterval).toHaveBeenCalledWith(10);
  });

  it('calls refresh now button', async () => {
    render(<ChannelsPage />);

    const refreshButton = screen.getByText('Refresh Now');
    fireEvent.click(refreshButton);

    expect(API.fetchActiveChannelStats).toHaveBeenCalledTimes(3);
    expect(API.getVODStats).toHaveBeenCalledTimes(3);
  });

  it('polls for stats at specified interval', async () => {
    useLocalStorage.mockImplementation((key, defaultValue) => {
      if (key === 'stats-refresh-interval') {
        return [5, vi.fn()];
      }
      return [defaultValue, vi.fn()];
    });

    render(<ChannelsPage />);

    expect(API.fetchActiveChannelStats).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(5000);

    expect(API.fetchActiveChannelStats).toHaveBeenCalledTimes(3);
  });

  it('displays counts correctly', async () => {
    vi.useRealTimers();

    const mockChannelsStateWithData = {
      channels: {
        'channel-1': {
          id: 'channel-1',
          name: 'Test Channel',
          logo_id: 'logo-1',
        },
      },
      channelsByUUID: {
        'uuid-1': 'channel-1',
      },
      stats: {
        channels: [
          {
            channel_id: 'uuid-1',
            name: 'Test Channel',
            uptime: 3600,
            total_bytes: 1000000,
            client_count: 2,
            clients: [],
          },
        ],
      },
      setChannelStats: vi.fn(),
    };

    // Mock useChannelsStore to return the data
    useChannelsStore.mockImplementation((selector) => {
      return selector
        ? selector(mockChannelsStateWithData)
        : mockChannelsStateWithData;
    });

    // Mock API to return VOD connections
    API.getVODStats.mockResolvedValue({
      vod_connections: [
        {
          content_type: 'movie',
          content_uuid: 'movie-1',
          content_name: 'Test Movie',
          connections: [
            {
              client_id: 'vod_client_1',
              client_ip: '192.168.1.1',
            },
          ],
        },
      ],
    });

    render(<ChannelsPage />);

    expect(screen.getByText(/1 stream/)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/1 VOD connection/)).toBeInTheDocument();
    });
  });
});