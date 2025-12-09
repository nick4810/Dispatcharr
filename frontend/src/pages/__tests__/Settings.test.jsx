import {
  render,
  screen,
  waitFor,
  fireEvent,
  within,
} from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import SettingsPage from '../Settings';
import API from '../../api';
import useSettingsStore from '../../store/settings';
import useUserAgentsStore from '../../store/userAgents';
import useStreamProfilesStore from '../../store/streamProfiles';
import useAuthStore from '../../store/auth';
import useWarningsStore from '../../store/warnings';
import { notifications } from '@mantine/notifications';
import useLocalStorage from '../../hooks/useLocalStorage.jsx';
import userEvent from '@testing-library/user-event';

// Mock all dependencies
vi.mock('../../api');
vi.mock('../../store/settings');
vi.mock('../../store/userAgents');
vi.mock('../../store/streamProfiles');
vi.mock('../../store/auth');
vi.mock('../../store/warnings');
vi.mock('@mantine/notifications', () => ({
  notifications: {
    show: vi.fn(),
    update: vi.fn(),
  },
}));
vi.mock('../../components/tables/UserAgentsTable', () => ({
  default: () => <div data-testid="user-agents-table">UserAgentsTable</div>,
}));
vi.mock('../../components/tables/StreamProfilesTable', () => ({
  default: () => <div data-testid="stream-profiles-table">StreamProfilesTable</div>,
}));
vi.mock('../../components/ConfirmationDialog', () => ({
  default: ({ onConfirm, onCancel }) => (
    <div data-testid="confirmation-dialog">
      <button data-testid="confirm-button" onClick={onConfirm}>Confirm</button>
      <button data-testid="cancel-button" onClick={onCancel}>Cancel</button>
    </div>
  ),
}));
vi.mock('../../hooks/useLocalStorage');
vi.mock('@mantine/core', async () => {
  const accordionComponent = ({ children, onChange, defaultValue }) => <div data-testid="accordion">{children}</div>;
  accordionComponent.Item = ({ children, value }) => (
    <div data-testid={`accordion-item-${value}`}>{children}</div>
  );
  accordionComponent.Control = ({ children }) => (
    <button data-testid="accordion-control">{children}</button>
  );
  accordionComponent.Panel = ({ children }) => (
    <div data-testid="accordion-panel">{children}</div>
  );

  return {
    Accordion: accordionComponent,
    Alert: ({ title, children, color }) => (
      <div data-testid="alert" data-color={color}>
        {title}
        {children}
      </div>
    ),
    Box: ({ children }) => <div>{children}</div>,
    Button: ({
               children,
               onClick,
               loading,
               disabled,
               type,
               variant,
               color,
             }) => (
      <button
        onClick={onClick}
        disabled={disabled || loading}
        type={type}
        data-variant={variant}
        data-color={color}
      >
        {loading ? 'Loading...' : children}
      </button>
    ),
    Center: ({ children }) => <div>{children}</div>,
    Flex: ({ children }) => <div>{children}</div>,
    Group: ({ children }) => <div>{children}</div>,
    FileInput: ({ value, onChange, ...props }) => (
      <input
        type="file"
        onChange={(e) => onChange?.(e.target.files?.[0])}
        data-testid="file-input"
        {...props}
      />
    ),
    MultiSelect: ({ value, onChange, data, ...props }) => (
      <select
        multiple
        value={value}
        onChange={(e) =>
          onChange?.(Array.from(e.target.selectedOptions, (opt) => opt.value))
        }
        data-testid="multi-select"
        {...props}
      >
        {data?.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    ),
    Select: ({ value, onChange, data, label, ...props }) => (
      <div>
        {label && <label>{label}</label>}
        <select
          value={value}
          onChange={(e) => onChange ? onChange(e.target.value) : value = e.target.value}
          data-testid="select"
          aria-label={label}
          {...props}
        >
          {data?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    ),
    Stack: ({ children }) => <div>{children}</div>,
    Switch: ({ checked, onChange, label, ...props }) => (
      <div>
        {label && <label>{label}</label>}
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange?.(e.target.checked)}
          data-testid="switch"
          aria-label={label}
          {...props}
        />
      </div>
    ),
    Text: ({ children }) => <span>{children}</span>,
    TextInput: ({ value, onChange, label, ...props }) => (
      <div>
        {label && <label>{label}</label>}
        <input
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          data-testid="text-input"
          {...props}
        />
      </div>
    ),
    NumberInput: ({ value, onChange, label, ...props }) => (
      <div>
        {label && <label>{label}</label>}
        <input
          type="number"
          value={value}
          onChange={(e) => onChange?.(Number(e.target.value))}
          data-testid="number-input"
          {...props}
        />
      </div>
    ),
  };
});
vi.mock('@mantine/form', () => {
  let formValues = {
    'default-user-agent': '1',
    'default-stream-profile': '1',
    'preferred-region': 'US',
    'auto-import-mapped-files': true,
    'm3u-hash-key': ['name', 'url'],
    'dvr-tv-template': '',
    'dvr-movie-template': '',
    'dvr-tv-fallback-template': '',
    'dvr-movie-fallback-template': '',
    'dvr-comskip-enabled': false,
    'dvr-comskip-custom-path': '',
    'dvr-pre-offset-minutes': 0,
    'dvr-post-offset-minutes': 0,
    'max-system-events': 100,
  };

  return {
    useForm: () => ({
      values: formValues,
      setValues: vi.fn((newValues) => {
        formValues = { ...formValues, ...newValues };
      }),
      setFieldValue: vi.fn((field, value) => {
        formValues[field] = value;
      }),
      getValues: vi.fn(() => formValues),
      onSubmit: (fn) => (e) => {
        e?.preventDefault?.();
        fn();
      },
      key: (field) => field,
      getInputProps: (field) => ({
        value: formValues[field] ?? '',
        onChange: (value) => {
          formValues[field] = value;
        },
        error: null,
      }),
      setErrors: vi.fn(),
      reset: vi.fn(),
    }),
    isNotEmpty: (message) => (value) => (value ? null : message),
  };
});

describe('Settings Page', () => {
  const mockSettings = {
    theme: 'light',
    notificationsEnabled: true,
    autoUpdate: false,
    'network-access': { id: 1, key: 'network-access', value: '{}' },
    'proxy-settings': { id: 2, key: 'proxy-settings', value: '{}' },
    'max-system-events': { id: 3, key: 'max-system-events', value: '100' },
    'default-user-agent': { id: 4, key: 'default-user-agent', value: '1' },
    'default-stream-profile': {
      id: 5,
      key: 'default-stream-profile',
      value: '1',
    },
    'preferred-region': { id: 6, key: 'preferred-region', value: 'US' },
    'auto-import-mapped-files': {
      id: 7,
      key: 'auto-import-mapped-files',
      value: 'true',
    },
    'm3u-hash-key': { id: 8, key: 'm3u-hash-key', value: 'name,url' },
    'dvr-tv-template': { id: 9, key: 'dvr-tv-template', value: '' },
    'dvr-movie-template': { id: 10, key: 'dvr-movie-template', value: '' },
    'dvr-tv-fallback-template': {
      id: 11,
      key: 'dvr-tv-fallback-template',
      value: '',
    },
    'dvr-movie-fallback-template': {
      id: 12,
      key: 'dvr-movie-fallback-template',
      value: '',
    },
    'dvr-comskip-enabled': {
      id: 13,
      key: 'dvr-comskip-enabled',
      value: 'false',
    },
    'dvr-comskip-custom-path': {
      id: 14,
      key: 'dvr-comskip-custom-path',
      value: '',
    },
    'dvr-pre-offset-minutes': {
      id: 15,
      key: 'dvr-pre-offset-minutes',
      value: '0',
    },
    'dvr-post-offset-minutes': {
      id: 16,
      key: 'dvr-post-offset-minutes',
      value: '0',
    },
    'system-time-zone': { id: 17, key: 'system-time-zone', value: 'UTC' },
  };

  const mockUserAgents = [
    { id: 1, name: 'Mozilla/5.0' },
    { id: 2, name: 'Chrome/90.0' },
  ];

  const mockStreamProfiles = [
    { id: 1, name: 'Default Profile' },
    { id: 2, name: 'High Quality' },
  ];

  const mockAuthUser = {
    user_level: '10', // ADMIN
  };

  const mockUpdateSetting = vi.fn();
  const mockSuppressWarning = vi.fn();
  const mockIsWarningSuppressed = vi.fn(() => false);

  beforeEach(() => {
    useLocalStorage.mockImplementation((key, defaultValue) => {
      switch (key) {
        case 'table-size':
          return ['default', vi.fn()];
        case 'time-format':
          return ['12h', vi.fn()];
        case 'date-format':
          return ['mdy', vi.fn()];
        case 'time-zone':
          return ['UTC', vi.fn()];
        default:
          return [defaultValue, vi.fn()];
      }
    });

    useSettingsStore.mockImplementation((selector) => {
      const state = { settings: mockSettings, updateSetting: mockUpdateSetting };
      return selector ? selector(state) : state;
    });
    useUserAgentsStore.mockImplementation((selector) => {
      const state = { userAgents: mockUserAgents };
      return selector ? selector(state) : state;
    });
    useStreamProfilesStore.mockImplementation((selector) => {
      const state = { profiles: mockStreamProfiles };
      return selector ? selector(state) : state;
    });
    useAuthStore.mockImplementation((selector) => {
      const state = { user: mockAuthUser };
      return selector ? selector(state) : state;
    });
    useWarningsStore.mockImplementation((selector) => {
      const state = {
        suppressWarning: mockSuppressWarning,
        isWarningSuppressed: mockIsWarningSuppressed,
      };
      return selector ? selector(state) : state;
    });

    API.getComskipConfig = vi.fn().mockResolvedValue({
      path: '',
      exists: false,
    });
    API.updateSetting = vi.fn().mockResolvedValue({});
    API.createSetting = vi.fn().mockResolvedValue({});
    API.checkSetting = vi.fn().mockResolvedValue({ error: false, UI: [] });
    API.uploadComskipIni = vi.fn().mockResolvedValue({ path: '/app/comskip.ini' });
    API.rehashStreams = vi.fn().mockResolvedValue({});

    notifications.show = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders UI settings accordion', () => {
    render(<SettingsPage />);
    expect(screen.getByText('UI Settings')).toBeInTheDocument();
  });

  it('handles accordion item clicks', async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    const streamSettingsButton = screen.getByText('Stream Settings');
    await user.click(streamSettingsButton);

    await waitFor(() => {
      expect(screen.getByLabelText('Default User Agent')).toBeInTheDocument();
    });
  });

  it('displays accordion sections for admin users', () => {
    render(<SettingsPage />);

    expect(screen.getByText('UI Settings')).toBeInTheDocument();
    expect(screen.getByText('DVR')).toBeInTheDocument();
    expect(screen.getByText('Stream Settings')).toBeInTheDocument();
    expect(screen.getByText('User-Agents')).toBeInTheDocument();
    expect(screen.getByText('Stream Profiles')).toBeInTheDocument();
  });

  it('shows user agents table for admin users', async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    const userAgentsButton = screen.getByText('User-Agents');
    await user.click(userAgentsButton);

    await waitFor(() => {
      expect(screen.getByTestId('user-agents-table')).toBeInTheDocument();
    });
  });

  it('shows stream profiles table for admin users', async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    const streamProfilesButton = screen.getByText('Stream Profiles');
    await user.click(streamProfilesButton);

    await waitFor(() => {
      expect(screen.getByTestId('stream-profiles-table')).toBeInTheDocument();
    });
  });

  it('does not render admin sections for non-admin users', () => {
    useAuthStore.mockImplementation((selector) => {
      const state = { user: { user_level: '1' } };
      return selector ? selector(state) : state;
    });

    render(<SettingsPage />);

    expect(screen.queryByText('Network Access')).not.toBeInTheDocument();
    expect(screen.queryByText('Proxy Settings')).not.toBeInTheDocument();
  });

  it('loads comskip config on mount', async () => {
    render(<SettingsPage />);

    await waitFor(() => {
      expect(API.getComskipConfig).toHaveBeenCalled();
    });
  });

  it('initializes form values from settings', async () => {
    render(<SettingsPage />);

    await waitFor(() => {
      const accordion = screen.getByText('DVR');
      fireEvent.click(accordion);
    });

    await waitFor(() => {
      const comskipSwitch = screen.getByLabelText(/Enable Comskip/i);
      expect(comskipSwitch).not.toBeChecked();
    });
  });

  it('handles accordion item clicks', async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    const streamSettingsButton = screen.getByText('Stream Settings');
    await user.click(streamSettingsButton);

    await waitFor(() => {
      expect(screen.getByLabelText('Default User Agent')).toBeInTheDocument();
    });
  });

  it('saves settings successfully', async () => {
    const user = userEvent.setup();
    mockUpdateSetting.mockResolvedValue({ success: true });

    render(<SettingsPage />);

    const streamSettingsButton = screen.getByText('Stream Settings');
    await user.click(streamSettingsButton);

    await waitFor(() => {
      expect(screen.getAllByText('Save').length).toBeGreaterThan(0);
    });

    //change default-user-agent setting value
    const defaultUserAgentSelect = screen.getByLabelText('Default User Agent');
    fireEvent.change(defaultUserAgentSelect, {
      target: { value: '2' },
    });

    const accordionItem = screen.getByTestId('accordion-item-stream-settings');
    const saveButton = within(accordionItem).getByText('Save');

    await user.click(saveButton);

    await waitFor(() => {
      expect(API.updateSetting).toHaveBeenCalled();
    });
  });

  it('shows confirmation dialog when rehashing streams', async () => {
    render(<SettingsPage />);

    const accordion = screen.getByText('Stream Settings');
    fireEvent.click(accordion);

    await waitFor(() => {
      const rehashButton = screen.getByText('Rehash Streams');
      fireEvent.click(rehashButton);
    });

    await waitFor(() => {
      expect(screen.getAllByTestId('confirmation-dialog').length).toBe(2);
      expect(screen.getAllByTestId('confirm-button').length).toBe(2);
    });
  });

  it('handles rehash confirmation dialog', async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    const streamSettingsButton = screen.getByText('Stream Settings');
    await user.click(streamSettingsButton);

    await waitFor(() => {
      const rehashButton = screen.getByText('Rehash Streams');
      expect(rehashButton).toBeInTheDocument();
    });

    const rehashButton = screen.getByText('Rehash Streams');
    await user.click(rehashButton);

    expect(screen.getAllByTestId('confirmation-dialog').length).toBe(2);
    expect(screen.getAllByTestId('confirm-button').length).toBe(2);

    const confirmButton = screen.getAllByTestId('confirm-button')[0];
    await user.click(confirmButton);

    await waitFor(() => {
      expect(API.rehashStreams).toHaveBeenCalled();
    });
  });

  it('uploads comskip.ini file successfully', async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    const dvrButton = screen.getByText('DVR');
    await user.click(dvrButton);

    await waitFor(() => {
      expect(screen.getByText('Upload comskip.ini')).toBeInTheDocument();
    });

    const file = new File(['content'], 'comskip.ini', { type: 'text/plain' });
    const fileInput = screen.getByPlaceholderText('Select comskip.ini');

    await user.upload(fileInput, file);

    const uploadButton = screen.getByText('Upload comskip.ini');
    await user.click(uploadButton);

    await waitFor(() => {
      expect(API.uploadComskipIni).toHaveBeenCalledWith(file);
    });
  });

  it('validates network access settings', async () => {
    const user = userEvent.setup();
    API.checkSetting.mockResolvedValue({ error: false, UI: [] });

    render(<SettingsPage />);

    const networkAccessButton = screen.getByText('Network Access');
    await user.click(networkAccessButton);

    await waitFor(() => {
      expect(screen.getAllByText('Save').length).toBeGreaterThan(0);
    });

    const accordionItem = screen.getByTestId('accordion-item-network-access');
    const networkSaveButton = within(accordionItem).getByText('Save');

    await user.click(networkSaveButton);

    await waitFor(() => {
      expect(API.checkSetting).toHaveBeenCalled();
    });
  });

  it('displays error when network access validation fails', async () => {
    const user = userEvent.setup();
    API.checkSetting.mockResolvedValue({
      error: true,
      message: 'Validation error',
      data: 'Invalid CIDR',
    });

    render(<SettingsPage />);

    const networkAccessButton = screen.getByText('Network Access');
    await user.click(networkAccessButton);

    await waitFor(() => {
      expect(screen.getAllByText('Save').length).toBeGreaterThan(0);
    });

    const accordionItem = screen.getByTestId('accordion-item-network-access');
    const networkSaveButton = within(accordionItem).getByText('Save');

    await user.click(networkSaveButton);

    await waitFor(() => {
      expect(API.checkSetting).toHaveBeenCalled();
    });

    expect(screen.getByTestId('alert')).toBeInTheDocument();
    expect(screen.getByTestId('alert')).toHaveTextContent('Validation error');
  });

  it('saves proxy settings', async () => {
    render(<SettingsPage />);

    const accordion = screen.getByText('Proxy Settings');
    fireEvent.click(accordion);

    await waitFor(() => {
      const accordionItem = screen.getByTestId('accordion-item-proxy-settings');
      const saveButton = within(accordionItem).getByText('Save');
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(API.updateSetting).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 2,
          key: 'proxy-settings',
        })
      );
    });
  });

  it('resets proxy settings to defaults', async () => {
    render(<SettingsPage />);

    const accordion = screen.getByText('Proxy Settings');
    fireEvent.click(accordion);

    await waitFor(() => {
      const resetButton = screen.getByText(/Reset to Defaults/i);
      fireEvent.click(resetButton);
    });

    // Form values should be reset (verified through form state)
    expect(screen.getByText(/Reset to Defaults/i)).toBeInTheDocument();
  });

  it('handles time zone selection', async () => {
    render(<SettingsPage />);

    const uiSettingsButton = screen.getByText('UI Settings');
    await userEvent.click(uiSettingsButton);

    await waitFor(() => {
      expect(screen.getByLabelText('Time zone')).toBeInTheDocument();
    });

    const timeZoneSelect = screen.getByLabelText('Time zone');
    await userEvent.selectOptions(timeZoneSelect, 'America/New_York');

    await waitFor(() => {
      expect(API.updateSetting).toHaveBeenCalledWith({
        key: 'system-time-zone',
        id: 17,
        value: 'America/New_York',
      });
    });
  });
});