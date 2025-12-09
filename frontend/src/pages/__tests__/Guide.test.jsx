import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import dayjs from 'dayjs';
import Guide from '../Guide';
import useChannelsStore from '../../store/channels';
import useLogosStore from '../../store/logos';
import useEPGsStore from '../../store/epgs';
import useSettingsStore from '../../store/settings';
import useVideoStore from '../../store/useVideoStore';
import useLocalStorage from '../../hooks/useLocalStorage';
import API from '../../api';
import { notifications } from '@mantine/notifications';

// Mock dependencies
vi.mock('../../store/channels');
vi.mock('../../store/logos');
vi.mock('../../store/epgs');
vi.mock('../../store/settings');
vi.mock('../../store/useVideoStore');
vi.mock('../../hooks/useLocalStorage');
vi.mock('../../api');
vi.mock('@mantine/notifications');

vi.mock('@mantine/core', async () => {
  const actual = await vi.importActual('@mantine/core');
  return {
    ...actual,
    Box: ({ children, style, onClick, className, ref }) => (
      <div style={style} onClick={onClick} className={className} ref={ref}>
        {children}
      </div>
    ),
    Flex: ({ children, direction, justify, align, gap, mb, style }) => (
      <div
        style={style}
        data-direction={direction}
        data-justify={justify}
        data-align={align}
        data-gap={gap}
        data-mb={mb}
      >
        {children}
      </div>
    ),
    Stack: ({ children, gap }) => <div data-gap={gap}>{children}</div>,
    Group: ({ children, gap, justify }) => (
      <div data-gap={gap} data-justify={justify}>
        {children}
      </div>
    ),
    Title: ({ children, order, size }) => (
      <h2 data-order={order} data-size={size}>
        {children}
      </h2>
    ),
    Text: ({ children, size, c, fw, lineClamp, style, onClick }) => (
      <span
        data-size={size}
        data-color={c}
        data-fw={fw}
        data-line-clamp={lineClamp}
        style={style}
        onClick={onClick}
      >
        {children}
      </span>
    ),
    Paper: ({ children, style, onClick }) => (
      <div style={style} onClick={onClick}>
        {children}
      </div>
    ),
    Button: ({ children, onClick, leftSection, variant, size, color, disabled }) => (
      <button onClick={onClick} disabled={disabled} data-variant={variant} data-size={size} data-color={color}>
        {leftSection}
        {children}
      </button>
    ),
    Badge: ({ children, color, variant }) => (
      <span data-badge-color={color} data-variant={variant}>
        {children}
      </span>
    ),
    TextInput: ({ value, onChange, placeholder, icon, rightSection }) => (
      <div>
        {icon}
        <input type="text" value={value} onChange={onChange} placeholder={placeholder} />
        {rightSection}
      </div>
    ),
    Select: ({ value, onChange, data, placeholder, clearable }) => (
      <select
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        aria-label={placeholder}
        data-clearable={clearable}
      >
        <option value="">Select...</option>
        {data?.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    ),
    ActionIcon: ({ children, onClick, variant, size, color }) => (
      <button onClick={onClick} data-variant={variant} data-size={size} data-color={color}>
        {children}
      </button>
    ),
    Tooltip: ({ children, label }) => <div title={label}>{children}</div>,
    Transition: ({ children, mounted, transition }) =>
      mounted ? <div data-transition={transition}>{children}</div> : null,
    Modal: ({ opened, onClose, title, children, centered, radius, zIndex, overlayProps, styles, size }) =>
      opened ? (
        <div
          data-testid="modal"
          data-title={title}
          data-centered={centered}
          data-radius={radius}
          data-z-index={zIndex}
          data-size={size}
        >
          <div>{title}</div>
          <button onClick={onClose}>Close</button>
          {children}
        </div>
      ) : null,
    useMantineTheme: () => ({
      tailwind: {
        green: { 5: '#22c55e' },
        red: { 6: '#dc2626' },
        blue: { 6: '#2563eb' },
        gray: { 6: '#52525b', 7: '#3f3f46' },
      },
    }),
  };
});

describe('Guide', () => {
  let mockAPI;
  let mockChannelsState;
  let mockShowVideo;

  beforeEach(() => {
    vi.clearAllMocks();

    mockChannelsState = {
      channels: {
        'channel-1': {
          id: 'channel-1',
          uuid: 'uuid-1',
          name: 'Test Channel',
          channel_number: 1,
          logo_id: 'logo-1',
        },
      },
      recordings: [],
      channelGroups: {},
      profiles: {},
    };

    mockShowVideo = vi.fn();

    useChannelsStore.mockImplementation((selector) =>
      selector ? selector(mockChannelsState) : mockChannelsState
    );

    useLogosStore.mockReturnValue({});
    useEPGsStore.mockImplementation((selector) =>
      selector ? selector({ tvgsById: {}, epgs: {}, }) : {}
    );
    useSettingsStore.mockReturnValue('production');
    useVideoStore.mockReturnValue(mockShowVideo);
    useLocalStorage.mockReturnValue(['12h', vi.fn()]);

    mockAPI = {
      getGrid: vi.fn().mockResolvedValue([]),
      createRecording: vi.fn().mockResolvedValue({}),
      deleteRecording: vi.fn().mockResolvedValue({}),
      createSeriesRule: vi.fn().mockResolvedValue({}),
      deleteSeriesRule: vi.fn().mockResolvedValue({}),
      evaluateSeriesRules: vi.fn().mockResolvedValue({}),
      listSeriesRules: vi.fn().mockResolvedValue([]),
      bulkRemoveSeriesRecordings: vi.fn().mockResolvedValue({}),
    };

    Object.assign(API, mockAPI);
    notifications.show = vi.fn();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('renders the guide with title', async () => {
    render(<Guide />);

    expect(screen.getByText('TV Guide')).toBeInTheDocument();
  });

  it('fetches and displays program data on mount', async () => {
    mockAPI.getGrid.mockResolvedValue([
      {
        id: 'program-1',
        tvg_id: 'tvg-1',
        title: 'Test Program',
        start_time: dayjs().toISOString(),
        end_time: dayjs().add(1, 'hour').toISOString(),
      },
    ]);

    render(<Guide />);

    await waitFor(() => {
      expect(mockAPI.getGrid).toHaveBeenCalled();
    });
  });

  it('displays search input and filters', () => {
    render(<Guide />);

    expect(
      screen.getByPlaceholderText('Search channels...')
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Filter by group')).toBeInTheDocument();
    expect(screen.getByLabelText('Filter by profile')).toBeInTheDocument();
  });

  it('filters channels by search query', async () => {
    mockChannelsState.channels = {
      'channel-1': {
        id: 'channel-1',
        name: 'ABC Channel',
        channel_number: 1,
      },
      'channel-2': {
        id: 'channel-2',
        name: 'XYZ Channel',
        channel_number: 2,
      },
    };

    render(<Guide />);

    const searchInput = screen.getByPlaceholderText('Search channels...');
    fireEvent.change(searchInput, { target: { value: 'ABC' } });

    await waitFor(() => {
      expect(screen.getByText('1 channel')).toBeInTheDocument();
    });
  });

  it('clears filters when clear button is clicked', async () => {
    render(<Guide />);

    const searchInput = screen.getByPlaceholderText('Search channels...');
    fireEvent.change(searchInput, { target: { value: 'test' } });

    await waitFor(() => {
      expect(screen.getByText('Clear Filters')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Clear Filters'));

    await waitFor(() => {
      expect(searchInput).toHaveValue('');
    });
  });

  it('handles logo click to play channel', async () => {
    render(<Guide />);

    await waitFor(() => {
      const channelLogo = screen.getAllByRole('img')[0];
      fireEvent.click(channelLogo.closest('.channel-logo'));
    });

    expect(mockShowVideo).toHaveBeenCalledWith(
      '/proxy/ts/stream/uuid-1'
    );
  });

  it('displays current time and date', () => {
    render(<Guide />);

    const now = dayjs();
    expect(screen.getByText(new RegExp(now.format('dddd')))).toBeInTheDocument();
  });

  it('shows no channels message when filtered list is empty', async () => {
    mockChannelsState.channels = {};

    render(<Guide />);

    const searchInput = screen.getByPlaceholderText('Search channels...');
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

    await waitFor(() => {
      expect(
        screen.getByText('No channels match your filters')
      ).toBeInTheDocument();
    });
  });

  it('opens series rules modal', async () => {
    render(<Guide />);

    fireEvent.click(screen.getByText('Series Rules'));

    await waitFor(() => {
      expect(screen.getByText('Series Recording Rules')).toBeInTheDocument();
    });
  });

  it('displays channel count correctly', async () => {
    mockChannelsState.channels = {
      'channel-1': { id: 'channel-1', name: 'Channel 1', channel_number: 1 },
      'channel-2': { id: 'channel-2', name: 'Channel 2', channel_number: 2 },
    };

    render(<Guide />);

    await waitFor(() => {
      expect(screen.getByText('2 channels')).toBeInTheDocument();
    });
  });
});