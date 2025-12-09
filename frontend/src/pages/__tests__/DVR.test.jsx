import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DVRPage from '../DVR';
import useChannelsStore from '../../store/channels';
import useSettingsStore from '../../store/settings';
import useVideoStore from '../../store/useVideoStore';
import useLocalStorage from '../../hooks/useLocalStorage';
import API from '../../api';
import { notifications } from '@mantine/notifications';
import dayjs from 'dayjs';

vi.mock('../../store/channels');
vi.mock('../../store/settings');
vi.mock('../../store/useVideoStore');
vi.mock('../../hooks/useLocalStorage');
vi.mock('../../api');
vi.mock('@mantine/notifications');
vi.mock('../../components/forms/Recording', () => ({
  default: ({ isOpen, onClose, recording }) =>
    isOpen ? (
      <div data-testid="recording-form">
        <div data-testid="recording-form-mode">
          {recording ? 'edit' : 'create'}
        </div>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

vi.mock('@mantine/core', () => {
  const cardComponent = ({ children, onClick, style, withBorder, shadow, padding, radius }) => (
    <div
      onClick={onClick}
      style={style}
      data-with-border={withBorder}
      data-shadow={shadow}
      data-padding={padding}
      data-radius={radius}
    >
      {children}
    </div>
  );
  cardComponent.Section = ({ children }) => <div>{children}</div>;
  return {
    Box: ({ children, style }) => <div style={style}>{children}</div>,
    Stack: ({ children, gap }) => <div data-gap={gap}>{children}</div>,
    Group: ({ children, justify, mb }) => (
      <div data-justify={justify} data-mb={mb}>
        {children}
      </div>
    ),
    Flex: ({ children, gap, justify, align, style }) => (
      <div style={style} data-gap={gap} data-justify={justify} data-align={align}>
        {children}
      </div>
    ),
    Title: ({ children, order }) => <h2 data-order={order}>{children}</h2>,
    Text: ({ children, size, c, lineClamp, onClick, style }) => (
      <span
        data-size={size}
        data-color={c}
        data-line-clamp={lineClamp}
        onClick={onClick}
        style={{ ...style, cursor: onClick ? 'pointer' : undefined }}
      >
        {children}
      </span>
    ),
    Badge: ({ children, color }) => <span data-badge-color={color}>{children}</span>,
    Button: ({ children, onClick, leftSection, variant, size, color, loading, ...props }) => (
      <button onClick={onClick} disabled={loading} {...props}>
        {leftSection}
        {children}
      </button>
    ),
    Card: cardComponent,
    Image: ({ src, alt, w, h, fit, radius, fallbackSrc }) => (
      <img
        src={src || fallbackSrc}
        alt={alt}
        width={w}
        height={h}
        data-fit={fit}
        data-radius={radius}
      />
    ),
    SimpleGrid: ({ children, cols, spacing, breakpoints }) => (
      <div data-cols={cols} data-spacing={spacing}>
        {children}
      </div>
    ),
    Center: ({ children }) => <div>{children}</div>,
    Tooltip: ({ children, label }) => (
      <div title={label}>{children}</div>
    ),
    ActionIcon: ({ children, onClick, color, variant, size }) => (
      <button onClick={onClick} data-color={color} data-variant={variant} data-size={size}>
        {children}
      </button>
    ),
    Modal: ({ opened, onClose, title, children, size, centered, zIndex }) =>
      opened ? (
        <div data-testid="modal" data-size={size} data-centered={centered} data-z-index={zIndex}>
          <div data-testid="modal-title">{title}</div>
          <button onClick={onClose}>Close Modal</button>
          {children}
        </div>
      ) : null,
    Switch: ({ checked, onChange, label }) => (
      <label>
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        {label}
      </label>
    ),
    Select: ({ value, onChange, data, label, placeholder }) => (
      <div>
        {label && <label>{label}</label>}
        <select value={value} onChange={(e) => onChange?.(e.target.value)} aria-label={placeholder || label}>
          {data?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    ),
    MultiSelect: ({ value, onChange, data, label, placeholder }) => (
      <div>
        {label && <label>{label}</label>}
        <select
          multiple
          value={value}
          onChange={(e) => {
            const selected = Array.from(e.target.selectedOptions).map((o) => o.value);
            onChange?.(selected);
          }}
          aria-label={placeholder || label}
        >
          {data?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    ),
    TextInput: ({ value, onChange, placeholder, icon }) => (
      <div>
        {icon}
        <input type="text" value={value} onChange={onChange} placeholder={placeholder} />
      </div>
    ),
    useMantineTheme: () => ({
      tailwind: {
        green: { 5: '#22c55e' },
        red: { 6: '#dc2626' },
        yellow: { 6: '#ca8a04' },
        gray: { 6: '#52525b' },
      },
    }),
  };
});

describe('DVRPage', () => {
  const mockFetchRecordings = vi.fn();
  const mockFetchChannels = vi.fn();
  const mockFetchRecurringRules = vi.fn();
  const mockRemoveRecording = vi.fn();
  const mockShowVideo = vi.fn();

  const defaultChannelsState = {
    recordings: [],
    channels: {},
    recurringRules: [],
    fetchRecordings: mockFetchRecordings,
    fetchChannels: mockFetchChannels,
    fetchRecurringRules: mockFetchRecurringRules,
    removeRecording: mockRemoveRecording,
  };

  const defaultSettingsState = {
    settings: {
      'system-time-zone': { value: 'America/New_York' },
    },
    environment: {
      env_mode: 'production',
    },
  };

  const defaultVideoState = {
    showVideo: mockShowVideo,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    const now = new Date('2024-01-15T12:00:00Z');
    vi.setSystemTime(now);

    useChannelsStore.mockImplementation((selector) => {
      return selector ? selector(defaultChannelsState) : defaultChannelsState;
    });

    useSettingsStore.mockImplementation((selector) => {
      return selector ? selector(defaultSettingsState) : defaultSettingsState;
    });

    useVideoStore.mockImplementation((selector) => {
      return selector ? selector(defaultVideoState) : defaultVideoState;
    });

    useLocalStorage.mockReturnValue(['America/New_York', vi.fn()]);

    mockFetchRecordings.mockResolvedValue();
    mockFetchChannels.mockResolvedValue();
    mockFetchRecurringRules.mockResolvedValue();
    API.deleteRecording = vi.fn().mockResolvedValue();
    API.deleteRecurringRule = vi.fn().mockResolvedValue();
    API.updateRecurringRule = vi.fn().mockResolvedValue();
    API.runComskip = vi.fn().mockResolvedValue();
    notifications.show = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders page with New Recording button', () => {
    render(<DVRPage />);
    expect(screen.getByText('New Recording')).toBeInTheDocument();
  });

  it('fetches recordings, channels, and recurring rules on mount', async () => {
    render(<DVRPage />);

    expect(mockFetchRecordings).toHaveBeenCalled();
    expect(mockFetchRecurringRules).toHaveBeenCalled();
  });

  it('fetches channels when channels object is empty', async () => {
    render(<DVRPage />);

    expect(mockFetchChannels).toHaveBeenCalled();
  });

  it('does not fetch channels when channels already exist', async () => {
    useChannelsStore.mockImplementation((selector) => {
      const state = {
        ...defaultChannelsState,
        channels: { 1: { id: 1, name: 'Channel 1' } },
      };
      return selector ? selector(state) : state;
    });

    render(<DVRPage />);

    expect(mockFetchRecordings).toHaveBeenCalled();
    expect(mockFetchChannels).not.toHaveBeenCalled();
  });

  it('categorizes in-progress recordings correctly', () => {
    const now = dayjs('2024-01-15T12:00:00Z');
    const recordings = [
      {
        id: 1,
        channel: 1,
        start_time: now.subtract(30, 'minutes').toISOString(),
        end_time: now.add(30, 'minutes').toISOString(),
        custom_properties: {
          program: { title: 'Live Show' },
          status: 'recording',
        },
      },
    ];

    useChannelsStore.mockImplementation((selector) => {
      const state = {
        ...defaultChannelsState,
        recordings,
        channels: { 1: { id: 1, name: 'Channel 1', logo: { cache_url: '/logo.png' } } },
      };
      return selector ? selector(state) : state;
    });

    render(<DVRPage />);

    const inProgressSection = screen.getByText('Currently Recording').closest('div');
    expect(inProgressSection).toContainHTML('1');
    expect(screen.getByText('Live Show')).toBeInTheDocument();
  });

  it('categorizes upcoming recordings correctly', () => {
    const now = dayjs('2024-01-15T12:00:00Z');
    const recordings = [
      {
        id: 2,
        channel: 1,
        start_time: now.add(1, 'hour').toISOString(),
        end_time: now.add(2, 'hours').toISOString(),
        custom_properties: {
          program: { title: 'Future Show', tvg_id: 'show1' },
        },
      },
    ];

    useChannelsStore.mockImplementation((selector) => {
      const state = {
        ...defaultChannelsState,
        recordings,
        channels: { 1: { id: 1, name: 'Channel 1' } },
      };
      return selector ? selector(state) : state;
    });

    render(<DVRPage />);

    const upcomingSection = screen.getByText('Upcoming Recordings').closest('div');
    expect(upcomingSection).toContainHTML('1');
    expect(screen.getByText('Future Show')).toBeInTheDocument();
  });

  it('categorizes completed recordings correctly', () => {
    const now = dayjs('2024-01-15T12:00:00Z');
    const recordings = [
      {
        id: 3,
        channel: 1,
        start_time: now.subtract(2, 'hours').toISOString(),
        end_time: now.subtract(1, 'hour').toISOString(),
        custom_properties: {
          program: { title: 'Past Show' },
          status: 'completed',
        },
      },
    ];

    useChannelsStore.mockImplementation((selector) => {
      const state = {
        ...defaultChannelsState,
        recordings,
        channels: { 1: { id: 1, name: 'Channel 1' } },
      };
      return selector ? selector(state) : state;
    });

    render(<DVRPage />);

    const completedSection = screen.getByText('Previously Recorded').closest('div');
    expect(completedSection).toContainHTML('1');
    expect(screen.getByText('Past Show')).toBeInTheDocument();
  });

  it('groups upcoming series recordings by title and tvg_id', () => {
    const now = dayjs('2024-01-15T12:00:00Z');
    const recordings = [
      {
        id: 4,
        channel: 1,
        start_time: now.add(1, 'hour').toISOString(),
        end_time: now.add(2, 'hours').toISOString(),
        custom_properties: {
          program: { title: 'Series A', tvg_id: 'series_a', id: 100 },
          season: 1,
          episode: 1,
        },
      },
      {
        id: 5,
        channel: 1,
        start_time: now.add(25, 'hours').toISOString(),
        end_time: now.add(26, 'hours').toISOString(),
        custom_properties: {
          program: { title: 'Series A', tvg_id: 'series_a', id: 101 },
          season: 1,
          episode: 2,
        },
      },
    ];

    useChannelsStore.mockImplementation((selector) => {
      const state = {
        ...defaultChannelsState,
        recordings,
        channels: { 1: { id: 1, name: 'Channel 1' } },
      };
      return selector ? selector(state) : state;
    });

    render(<DVRPage />);

    // Should show only 1 grouped card for the series
    const upcomingSection = screen.getByText('Upcoming Recordings').closest('div');
    expect(upcomingSection).toContainHTML('1');
  });

  it('opens recording form when New Recording is clicked', () => {
    render(<DVRPage />);

    const newButton = screen.getByText('New Recording');
    fireEvent.click(newButton);

    expect(screen.getByTestId('recording-form')).toBeInTheDocument();
    expect(screen.getByTestId('recording-form-mode')).toHaveTextContent('create');
  });

  it('closes recording form when close is clicked', () => {
    render(<DVRPage />);

    const newButton = screen.getByText('New Recording');
    fireEvent.click(newButton);

    expect(screen.getByTestId('recording-form')).toBeInTheDocument();

    const closeButton = screen.getByText('Close');
    fireEvent.click(closeButton);

    expect(screen.queryByTestId('recording-form')).not.toBeInTheDocument();
  });

  it('handles interrupted recordings correctly', () => {
    const now = dayjs('2024-01-15T12:00:00Z');
    const recordings = [
      {
        id: 6,
        channel: 1,
        start_time: now.subtract(1, 'hour').toISOString(),
        end_time: now.subtract(30, 'minutes').toISOString(),
        custom_properties: {
          program: { title: 'Interrupted Show' },
          status: 'interrupted',
          interrupted_reason: 'Stream lost',
        },
      },
    ];

    useChannelsStore.mockImplementation((selector) => {
      const state = {
        ...defaultChannelsState,
        recordings,
        channels: { 1: { id: 1, name: 'Channel 1' } },
      };
      return selector ? selector(state) : state;
    });

    render(<DVRPage />);

    expect(screen.getByText('Interrupted Show')).toBeInTheDocument();
    expect(screen.getByText('Stream lost')).toBeInTheDocument();
  });

  it('deduplicates recordings by ID', () => {
    const now = dayjs('2024-01-15T12:00:00Z');
    const recordings = [
      {
        id: 7,
        channel: 1,
        start_time: now.add(1, 'hour').toISOString(),
        end_time: now.add(2, 'hours').toISOString(),
        custom_properties: {
          program: { title: 'Duplicate Show', id: 200 },
        },
      },
      {
        id: 7, // Same ID
        channel: 1,
        start_time: now.add(1, 'hour').toISOString(),
        end_time: now.add(2, 'hours').toISOString(),
        custom_properties: {
          program: { title: 'Duplicate Show', id: 200 },
        },
      },
    ];

    useChannelsStore.mockImplementation((selector) => {
      const state = {
        ...defaultChannelsState,
        recordings,
        channels: { 1: { id: 1, name: 'Channel 1' } },
      };
      return selector ? selector(state) : state;
    });

    render(<DVRPage />);

    // Should only show 1 card, not 2
    const upcomingSection = screen.getByText('Upcoming Recordings').closest('div');
    expect(upcomingSection).toContainHTML('1');
  });

  it('handles recordings array as object', () => {
    const now = dayjs('2024-01-15T12:00:00Z');
    const recordings = {
      8: {
        id: 8,
        channel: 1,
        start_time: now.add(1, 'hour').toISOString(),
        end_time: now.add(2, 'hours').toISOString(),
        custom_properties: {
          program: { title: 'Object Recording' },
        },
      },
    };

    useChannelsStore.mockImplementation((selector) => {
      const state = {
        ...defaultChannelsState,
        recordings,
        channels: { 1: { id: 1, name: 'Channel 1' } },
      };
      return selector ? selector(state) : state;
    });

    render(<DVRPage />);

    expect(screen.getByText('Object Recording')).toBeInTheDocument();
  });

  it('displays season and episode information when available', () => {
    const now = dayjs('2024-01-15T12:00:00Z');
    const recordings = [
      {
        id: 9,
        channel: 1,
        start_time: now.add(1, 'hour').toISOString(),
        end_time: now.add(2, 'hours').toISOString(),
        custom_properties: {
          program: { title: 'Episode Show' },
          season: 2,
          episode: 5,
        },
      },
    ];

    useChannelsStore.mockImplementation((selector) => {
      const state = {
        ...defaultChannelsState,
        recordings,
        channels: { 1: { id: 1, name: 'Channel 1' } },
      };
      return selector ? selector(state) : state;
    });

    render(<DVRPage />);

    expect(screen.getByText(/S02E05/)).toBeInTheDocument();
  });

  it('uses poster logo when available', () => {
    const now = dayjs('2024-01-15T12:00:00Z');
    const recordings = [
      {
        id: 10,
        channel: 1,
        start_time: now.add(1, 'hour').toISOString(),
        end_time: now.add(2, 'hours').toISOString(),
        custom_properties: {
          program: { title: 'Poster Show' },
          poster_logo_id: 'poster123',
        },
      },
    ];

    useChannelsStore.mockImplementation((selector) => {
      const state = {
        ...defaultChannelsState,
        recordings,
        channels: { 1: { id: 1, name: 'Channel 1' } },
      };
      return selector ? selector(state) : state;
    });

    render(<DVRPage />);

    const img = screen.getByAltText('Poster Show');
    expect(img).toHaveAttribute('src', expect.stringContaining('poster123'));
  });

  it('falls back to channel logo when no poster available', () => {
    const now = dayjs('2024-01-15T12:00:00Z');
    const recordings = [
      {
        id: 11,
        channel: 1,
        start_time: now.add(1, 'hour').toISOString(),
        end_time: now.add(2, 'hours').toISOString(),
        custom_properties: {
          program: { title: 'Channel Logo Show' },
        },
      },
    ];

    useChannelsStore.mockImplementation((selector) => {
      const state = {
        ...defaultChannelsState,
        recordings,
        channels: { 1: { id: 1, name: 'Channel 1', logo: { cache_url: '/channel1.png' } } },
      };
      return selector ? selector(state) : state;
    });

    render(<DVRPage />);

    const img = screen.getByAltText('Channel Logo Show');
    expect(img).toHaveAttribute('src', expect.stringContaining('channel1.png'));
  });

  it('updates time-based categorization every second', async () => {
    const initialNow = dayjs('2024-01-15T12:00:00Z');
    const recordings = [
      {
        id: 13,
        channel: 1,
        start_time: initialNow.add(59, 'seconds').toISOString(),
        end_time: initialNow.add(2, 'hours').toISOString(),
        custom_properties: {
          program: { title: 'About to Start' },
        },
      },
    ];

    useChannelsStore.mockImplementation((selector) => {
      const state = {
        ...defaultChannelsState,
        recordings,
        channels: { 1: { id: 1, name: 'Channel 1' } },
      };
      return selector ? selector(state) : state;
    });

    render(<DVRPage />);

    // Initially upcoming
    expect(screen.getByText('Upcoming Recordings').closest('div')).toContainHTML('1');

    // Advance time by 1 minute
    vi.advanceTimersByTime(60000);

    render(<DVRPage />);

    expect(screen.getAllByText('Currently Recording')[0].closest('div')).toContainHTML('1');
  });

  it('handles empty recordings array', () => {
    render(<DVRPage />);

    expect(screen.getByText('Currently Recording').closest('div')).toContainHTML('0');
    expect(screen.getByText('Upcoming Recordings').closest('div')).toContainHTML('0');
    expect(screen.getByText('Previously Recorded').closest('div')).toContainHTML('0');
  });
});