import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PluginsPage from '../Plugins';
import API from '../../api';
import { notifications } from '@mantine/notifications';

vi.mock('../../api');
vi.mock('@mantine/notifications');

vi.mock('@mantine/core', async () => {
  const appShellComponent = ({ children }) => <div>{children}</div>;
  appShellComponent.Main = ({ children }) => <div>{children}</div>;
  const cardComponent = ({ children, withBorder, shadow, padding, radius }) => (
    <div
      data-with-border={withBorder}
      data-shadow={shadow}
      data-padding={padding}
      data-radius={radius}
    >
      {children}
    </div>
  );
  cardComponent.Section = ({ children, withBorder, inheritPadding }) => (
    <div data-with-border={withBorder} data-inherit-padding={inheritPadding}>
      {children}
    </div>
  );

  return {
    AppShell: appShellComponent,
    Box: ({ children, style }) => <div style={style}>{children}</div>,
    Stack: ({ children, gap }) => <div data-gap={gap}>{children}</div>,
    Group: ({ children, justify, mb }) => (
      <div data-justify={justify} data-mb={mb}>
        {children}
      </div>
    ),
    Card: cardComponent,
    Alert: ({ children, color, title }) => (
      <div data-testid="alert" data-color={color}>
        {title && <div>{title}</div>}
        {children}
      </div>
    ),
    Text: ({ children, size, fw, c }) => (
      <span data-size={size} data-fw={fw} data-color={c}>
        {children}
      </span>
    ),
    Button: ({ children, onClick, leftSection, variant, color, loading, disabled, fullWidth }) => (
      <button
        onClick={onClick}
        disabled={loading || disabled}
        data-variant={variant}
        data-color={color}
        data-full-width={fullWidth}
      >
        {leftSection}
        {children}
      </button>
    ),
    Loader: () => <div data-testid="loader">Loading...</div>,
    Switch: ({ checked, onChange, label, description }) => (
      <label>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e)}
        />
        {label}
        {description && <span>{description}</span>}
      </label>
    ),
    TextInput: ({ value, onChange, label, placeholder, description, error }) => (
      <div>
        {label && <label>{label}</label>}
        {description && <span>{description}</span>}
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange?.(e)}
          placeholder={placeholder}
          aria-label={label}
        />
        {error && <span data-testid="input-error">{error}</span>}
      </div>
    ),
    NumberInput: ({ value, onChange, label, placeholder, description, min, max }) => (
      <div>
        {label && <label>{label}</label>}
        {description && <span>{description}</span>}
        <input
          type="number"
          value={value || ''}
          onChange={(e) => onChange?.(Number(e.target.value))}
          placeholder={placeholder}
          min={min}
          max={max}
          aria-label={label}
        />
      </div>
    ),
    Select: ({ value, onChange, data, label, placeholder, description }) => (
      <div>
        {label && <label>{label}</label>}
        {description && <span>{description}</span>}
        <select
          value={value || ''}
          onChange={(e) => onChange?.(e.target.value)}
          aria-label={placeholder || label}
        >
          <option value="">Select...</option>
          {data?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    ),
    Divider: ({ my }) => <hr data-my={my} />,
    ActionIcon: ({ children, onClick, color, variant, title }) => (
      <button onClick={onClick} data-color={color} data-variant={variant} title={title}>
        {children}
      </button>
    ),
    SimpleGrid: ({ children, cols }) => (
      <div data-cols={cols}>{children}</div>
    ),
    Modal: ({ opened, onClose, title, children, size, centered }) =>
      opened ? (
        <div data-testid="modal" data-size={size} data-centered={centered}>
          <div data-testid="modal-title">{title}</div>
          <button onClick={onClose}>Close Modal</button>
          {children}
        </div>
      ) : null,
    FileInput: ({ value, onChange, label, placeholder, accept }) => (
      <div>
        {label && <label>{label}</label>}
        <input
          type="file"
          onChange={(e) => onChange?.(e.target.files[0])}
          placeholder={placeholder}
          accept={accept}
          aria-label={label}
        />
      </div>
    ),
  };
});

vi.mock('@mantine/dropzone', () => ({
  Dropzone: ({ children, onDrop, accept, maxSize }) => (
    <div
      data-testid="dropzone"
      data-accept={accept}
      data-max-size={maxSize}
      onClick={() => {
        const file = new File(['content'], 'plugin.zip', { type: 'application/zip' });
        onDrop([file]);
      }}
    >
      <div>Drop files</div>
      {children}
    </div>
  ),
}));

describe('PluginsPage', () => {
  const mockPlugins = [
    {
      key: 'plugin1',
      name: 'Test Plugin',
      version: '1.0.0',
      description: 'A test plugin',
      enabled: true,
      trusted: true,
      fields: [
        {
          id: 'api_key',
          name: 'api_key',
          label: 'API Key',
          type: 'text',
          required: true,
          description: 'Your API key',
        },
        {
          id: 'max_items',
          name: 'max_items',
          label: 'Max Items',
          type: 'number',
          default: 10,
        },
      ],
      settings: {
        api_key: 'test-key',
        max_items: 5,
      },
    },
    {
      key: 'plugin2',
      name: 'Another Plugin',
      version: '2.0.0',
      description: 'Another test plugin',
      enabled: false,
      trusted: false,
      fields: [],
      settings: {},
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    API.getPlugins = vi.fn().mockResolvedValue(mockPlugins);
    API.reloadPlugins = vi.fn().mockResolvedValue();
    API.updatePluginSettings = vi.fn().mockResolvedValue();
    API.runPluginAction = vi.fn().mockResolvedValue();
    API.deletePlugin = vi.fn().mockResolvedValue({ success: true});
    API.setPluginEnabled = vi.fn().mockResolvedValue();
    API.importPlugin = vi.fn().mockResolvedValue({ success: true, plugin: {} });
    notifications.show = vi.fn();
    notifications.update = vi.fn();
  });

  it('renders loading state initially', () => {
    render(<PluginsPage />);
    expect(screen.getByTestId('loader')).toBeInTheDocument();
  });

  it('fetches and displays plugins on mount', async () => {
    render(<PluginsPage />);

    await waitFor(() => {
      expect(API.getPlugins).toHaveBeenCalled();
    });

    expect(screen.getByText('Test Plugin')).toBeInTheDocument();
    expect(screen.getByText('Another Plugin')).toBeInTheDocument();
  });

  it('displays plugin information correctly', async () => {
    render(<PluginsPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Plugin')).toBeInTheDocument();
    });

    expect(screen.getByText(/1.0.0/)).toBeInTheDocument();
    expect(screen.getByText('A test plugin')).toBeInTheDocument();
  });

  it('requires trust confirmation before enabling untrusted plugin', async () => {
    render(<PluginsPage />);

    await waitFor(() => {
      expect(screen.getByText('Another Plugin')).toBeInTheDocument();
    });

    const disabledSwitch = screen.getAllByRole('checkbox')[1];
    expect(disabledSwitch).not.toBeChecked();

    fireEvent.click(disabledSwitch);

    expect(screen.getByTestId('modal')).toBeInTheDocument();
    expect(screen.getByText(/I understand, enable/)).toBeInTheDocument();
  });

  it('trusts and enables plugin when confirmed', async () => {
    render(<PluginsPage />);

    await waitFor(() => {
      expect(screen.getByText('Another Plugin')).toBeInTheDocument();
    });

    const disabledSwitch = screen.getAllByRole('checkbox')[1];
    fireEvent.click(disabledSwitch);

    const trustButton = screen.getByText('I understand, enable');
    fireEvent.click(trustButton);

    await waitFor(() => {
      expect(API.setPluginEnabled).toHaveBeenCalledWith('plugin2', true);
    });
  });

  it('displays plugin configuration fields', async () => {
    render(<PluginsPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Plugin')).toBeInTheDocument();
    });

    expect(screen.getByLabelText('API Key')).toBeInTheDocument();
    expect(screen.getByLabelText('Max Items')).toBeInTheDocument();
  });

  it('shows current plugin settings values', async () => {
    render(<PluginsPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Plugin')).toBeInTheDocument();
    });

    const apiKeyInput = screen.getByLabelText('API Key');
    expect(apiKeyInput).toHaveValue('test-key');

    const maxItemsInput = screen.getByLabelText('Max Items');
    expect(maxItemsInput).toHaveValue(5);
  });

  it('updates plugin settings when field changes', async () => {
    render(<PluginsPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Plugin')).toBeInTheDocument();
    });

    const apiKeyInput = screen.getByLabelText('API Key');
    fireEvent.change(apiKeyInput, { target: { value: 'new-key' } });

    const saveButton = screen.getByText('Save Settings');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(API.updatePluginSettings).toHaveBeenCalledWith('plugin1', {
        api_key: 'new-key',
        max_items: 5,
      });
    });
  });

  it('opens import modal when Import Plugin button is clicked', async () => {
    render(<PluginsPage />);

    await waitFor(() => {
      expect(API.getPlugins).toHaveBeenCalled();
    });

    const importButton = screen.getByText('Import Plugin');
    fireEvent.click(importButton);

    expect(screen.getByTestId('modal')).toBeInTheDocument();
    const modalTitle = screen.getByTestId('modal-title');
    expect(modalTitle).toHaveTextContent('Import Plugin');
  });

  it('handles file selection in import modal', async () => {
    render(<PluginsPage />);

    await waitFor(() => {
      expect(API.getPlugins).toHaveBeenCalled();
    });

    const importButton = screen.getByText('Import Plugin');
    fireEvent.click(importButton);

    const dropzone = screen.getByTestId('dropzone');
    fireEvent.click(dropzone);

    await waitFor(() => {
      const uploadButton = screen.getByText('Upload');
      expect(uploadButton).not.toBeDisabled();
    });
  });

  it('imports plugin when Upload button is clicked', async () => {
    render(<PluginsPage />);

    await waitFor(() => {
      expect(API.getPlugins).toHaveBeenCalled();
    });

    const importButton = screen.getByText('Import Plugin');
    fireEvent.click(importButton);

    const dropzone = screen.getByTestId('dropzone');
    fireEvent.click(dropzone);

    const uploadButton = screen.getByText('Upload');
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(API.importPlugin).toHaveBeenCalled();
    });
  });

  it('shows success notification after import', async () => {
    render(<PluginsPage />);

    await waitFor(() => {
      expect(API.getPlugins).toHaveBeenCalled();
    });

    const importButton = screen.getByText('Import Plugin');
    fireEvent.click(importButton);

    const dropzone = screen.getByTestId('dropzone');
    fireEvent.click(dropzone);

    const uploadButton = screen.getByText('Upload');
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(notifications.update).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Imported',
          color: 'green',
        })
      );
    });
  });

  it('enables plugin after import when checkbox is checked', async () => {
    API.importPlugin = vi.fn().mockResolvedValue({
      success: true, plugin: {
        'ever_enabled': true,
        'key': 'imported-plugin'
      } });

    render(<PluginsPage />);

    await waitFor(() => {
      expect(API.getPlugins).toHaveBeenCalled();
    });

    const importButton = screen.getByText('Import Plugin');
    fireEvent.click(importButton);

    const dropzone = screen.getByTestId('dropzone');
    fireEvent.click(dropzone);

    const uploadButton = screen.getByText('Upload');
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(API.importPlugin).toHaveBeenCalled();
    });

    //grab the checkbox after the span with text 'Enable now'
    const span = screen.getByText('Enable now');
    const enableCheckbox = span.nextSibling;
    fireEvent.click(enableCheckbox);

    const enableButton = screen.getByText('Enable');
    fireEvent.click(enableButton);

    await waitFor(() => {
      expect(API.setPluginEnabled).toHaveBeenCalledWith('imported-plugin', true);
    });
  });

  it('opens delete confirmation modal', async () => {
    render(<PluginsPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Plugin')).toBeInTheDocument();
    });

    const deleteButton = screen.getAllByTitle('Delete plugin')[0];
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText('Delete Test Plugin?')).toBeInTheDocument();
    });
  });

  it('deletes plugin when confirmed', async () => {
    render(<PluginsPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Plugin')).toBeInTheDocument();
    });

    const deleteButton = screen.getAllByTitle('Delete plugin')[0];
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText('Delete Test Plugin?')).toBeInTheDocument();
    });

    const confirmButton = screen.getByText('Delete');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(API.deletePlugin).toHaveBeenCalledWith('plugin1');
    });
  });

  it('shows success notification after deletion', async () => {
    render(<PluginsPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Plugin')).toBeInTheDocument();
    });

    const deleteButton = screen.getAllByTitle('Delete plugin')[0];
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText('Delete Test Plugin?')).toBeInTheDocument();
    });

    const confirmButton = screen.getByText('Delete');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(notifications.show).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Plugin deleted',
          color: 'green',
        })
      );
    });
  });

  it('refreshes plugins list', async () => {
    render(<PluginsPage />);

    await waitFor(() => {
      expect(API.getPlugins).toHaveBeenCalled();
    });

    const refreshButton = screen.getByTitle('Reload')
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(API.reloadPlugins).toHaveBeenCalled();
    });
  });

  it('handles API error when importing plugin', async () => {
    API.importPlugin.mockRejectedValue(new Error('Failed to import'));

    render(<PluginsPage />);

    await waitFor(() => {
      expect(API.getPlugins).toHaveBeenCalled();
    });

    const importButton = screen.getByText('Import Plugin');
    fireEvent.click(importButton);

    const dropzone = screen.getByTestId('dropzone');
    fireEvent.click(dropzone);

    const uploadButton = screen.getByText('Upload');
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(notifications.update).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Import failed',
          color: 'red',
        })
      );
    });
  });

  it('displays empty state when no plugins', async () => {
    API.getPlugins.mockResolvedValue([]);

    render(<PluginsPage />);

    await waitFor(() => {
      expect(API.getPlugins).toHaveBeenCalled();
    });

    expect(screen.getByText(/No plugins found/)).toBeInTheDocument();
  });

  it('handles select field type', async () => {
    const pluginsWithSelect = [
      {
        ...mockPlugins[0],
        fields: [
          {
            id: 'mode',
            name: 'mode',
            label: 'Mode',
            type: 'select',
            default: 'auto',
            options: [
              { value: 'auto', label: 'Auto' },
              { value: 'manual', label: 'Manual' },
            ],
          },
        ],
        settings: {
          mode: 'auto',
        },
      },
    ];

    API.getPlugins.mockResolvedValue(pluginsWithSelect);

    render(<PluginsPage />);

    await waitFor(() => {
      expect(screen.getByLabelText('Mode')).toBeInTheDocument();
    });

    const select = screen.getByLabelText('Mode');
    expect(select).toHaveValue('auto');

    fireEvent.change(select, { target: { value: 'manual' } });

    const saveButton = screen.getByText('Save Settings');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(API.updatePluginSettings).toHaveBeenCalledWith('plugin1', {
        mode: 'manual',
      });
    });
  });

  it('handles boolean/switch field type', async () => {
    const pluginsWithSwitch = [
      {
        ...mockPlugins[0],
        fields: [
          {
            id: 'debug',
            name: 'debug',
            label: 'Debug Mode',
            type: 'boolean',
          },
        ],
        settings: {
          debug: false,
        },
      },
    ];

    API.getPlugins.mockResolvedValue(pluginsWithSwitch);

    render(<PluginsPage />);

    await waitFor(() => {
      expect(screen.getByLabelText('Debug Mode')).toBeInTheDocument();
    });

    const debugSwitch = screen.getByLabelText('Debug Mode');
    expect(debugSwitch).not.toBeChecked();

    fireEvent.click(debugSwitch);

    const saveButton = screen.getByText('Save Settings');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(API.updatePluginSettings).toHaveBeenCalledWith('plugin1', {
        debug: true,
      });
    });
  });

  it('uses default values for unset settings', async () => {
    const pluginsWithDefaults = [
      {
        ...mockPlugins[0],
        fields: [
          {
            name: 'timeout',
            label: 'Timeout',
            type: 'number',
            default: 30,
          },
        ],
        settings: {},
      },
    ];

    API.getPlugins.mockResolvedValue(pluginsWithDefaults);

    render(<PluginsPage />);

    await waitFor(() => {
      expect(screen.getByLabelText('Timeout')).toBeInTheDocument();
    });

    const timeoutInput = screen.getByLabelText('Timeout');
    expect(timeoutInput).toHaveValue(30);
  });
});