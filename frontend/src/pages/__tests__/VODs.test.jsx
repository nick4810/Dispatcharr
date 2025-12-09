import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import VODsPage from '../VODs';
import useVODStore from '../../store/useVODStore';

vi.mock('../../store/useVODStore');
vi.mock('../../components/SeriesModal', () => ({
  default: ({ opened, series, onClose }) =>
    opened ? (
      <div data-testid="series-modal">
        <div data-testid="series-name">{series?.name}</div>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null
}));
vi.mock('../components/VODModal', () => ({
  default: ({ opened, vod, onClose }) =>
    opened ? (
      <div data-testid="vod-modal">
        <div data-testid="vod-name">{vod?.name}</div>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null
}));
vi.mock('@mantine/core', () => {
  const cardComponent = ({ children, onClick, ...props }) => (
    <div onClick={onClick} {...props}>{children}</div>
  );
  cardComponent.Section = ({ children }) => <div>{children}</div>;
  const gridComponent = ({ children, ...props }) => <div {...props}>{children}</div>;
  gridComponent.Col = ({ children, ...props }) => <div {...props}>{children}</div>;

  return {
    Box: ({ children, ...props }) => <div {...props}>{children}</div>,
    Stack: ({ children, ...props }) => <div {...props}>{children}</div>,
    Group: ({ children, ...props }) => <div {...props}>{children}</div>,
    Flex: ({ children, ...props }) => <div {...props}>{children}</div>,
    Title: ({ children, ...props }) => <h2 {...props}>{children}</h2>,
    Text: ({ children, ...props }) => <span {...props}>{children}</span>,
    Card: cardComponent,
    Image: ({ src, alt }) => <img src={src} alt={alt} />,
    Badge: ({ children, ...props }) => <span {...props}>{children}</span>,
    Button: ({ children, ...props }) => <button {...props}>{children}</button>,
    TextInput: ({ value, onChange, placeholder, icon }) => (
      <div>
        {icon}
        <input
          type="text"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
        />
      </div>
    ),
    Select: ({ value, onChange, data, label, placeholder }) => (
      <div>
        {label && <label>{label}</label>}
        <select
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
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
    SegmentedControl: ({ value, onChange, data }) => (
      <div>
        {data.map((item) => (
          <button
            key={item.value}
            onClick={() => onChange(item.value)}
            data-active={value === item.value}
          >
            {item.label}
          </button>
        ))}
      </div>
    ),
    Pagination: ({ page, onChange, total }) => (
      <div data-testid="pagination">
        <button onClick={() => onChange(page - 1)} disabled={page === 1}>
          Prev
        </button>
        <span>{page} of {total}</span>
        <button onClick={() => onChange(page + 1)} disabled={page === total}>
          Next
        </button>
      </div>
    ),
    Grid: gridComponent,
    Loader: () => <div data-testid="loader">Loading...</div>,
    ActionIcon: ({ children, onClick, ...props }) => (
      <button onClick={onClick} {...props}>{children}</button>
    ),
  };
});

describe('VODsPage', () => {
  const mockFetchContent = vi.fn();
  const mockFetchCategories = vi.fn();
  const mockSetFilters = vi.fn();
  const mockSetPage = vi.fn();
  const mockSetPageSize = vi.fn();

  const defaultStoreState = {
    currentPageContent: [],
    categories: {},
    filters: { type: 'all', search: '', category: '' },
    currentPage: 1,
    totalCount: 0,
    pageSize: 24,
    fetchContent: mockFetchContent,
    fetchCategories: mockFetchCategories,
    setFilters: mockSetFilters,
    setPage: mockSetPage,
    setPageSize: mockSetPageSize,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useVODStore.mockImplementation((selector) => {
      const state = defaultStoreState;
      return selector ? selector(state) : state;
    });
    mockFetchContent.mockResolvedValue();
    mockFetchCategories.mockResolvedValue();
    localStorage.clear();
  });

  it('renders page title', () => {
    render(<VODsPage />);
    expect(screen.getByText('Video on Demand')).toBeInTheDocument();
  });

  it('shows loader on initial load', () => {
    render(<VODsPage />);
    expect(screen.getByTestId('loader')).toBeInTheDocument();
  });

  it('fetches content on mount', async () => {
    render(<VODsPage />);

    await waitFor(() => {
      expect(mockFetchContent).toHaveBeenCalled();
      expect(mockFetchCategories).toHaveBeenCalled();
    });
  });

  it('renders movie cards when content is loaded', async () => {
    const movies = [
      {
        id: 1,
        contentType: 'movie',
        type: 'movie',
        name: 'Test Movie',
        year: 2023,
        duration_secs: 7200,
        rating: '8.5',
        genre: 'Action',
        logo: { url: 'http://example.com/logo.jpg' },
      },
    ];

    useVODStore.mockImplementation((selector) => {
      const state = {
        ...defaultStoreState,
        currentPageContent: movies,
      };
      return selector ? selector(state) : state;
    });

    render(<VODsPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Movie')).toBeInTheDocument();
    });
  });

  it('renders series cards when content is loaded', async () => {
    const series = [
      {
        id: 1,
        contentType: 'series',
        name: 'Test Series',
        year: 2023,
        rating: '9.0',
        genre: 'Drama',
        logo: { url: 'http://example.com/series.jpg' },
      },
    ];

    useVODStore.mockImplementation((selector) => {
      const state = {
        ...defaultStoreState,
        currentPageContent: series,
      };
      return selector ? selector(state) : state;
    });

    const { rerender } = render(<VODsPage />);

    await waitFor(() => {
      expect(mockFetchContent).toHaveBeenCalled();
    });

    rerender(<VODsPage />);

    expect(screen.getByText('Test Series')).toBeInTheDocument();
    expect(screen.getByText('Drama')).toBeInTheDocument();
  });

  it('renders episode cards with series information', async () => {
    const episodes = [
      {
        id: 1,
        contentType: 'movie',
        type: 'episode',
        name: 'Episode Title',
        season_number: 1,
        episode_number: 5,
        series: { name: 'Show Name' },
        year: 2023,
        duration_secs: 2700,
        logo: { url: 'http://example.com/ep.jpg' },
      },
    ];

    useVODStore.mockImplementation((selector) => {
      const state = {
        ...defaultStoreState,
        currentPageContent: episodes,
      };
      return selector ? selector(state) : state;
    });

    const { rerender } = render(<VODsPage />);

    await waitFor(() => {
      expect(mockFetchContent).toHaveBeenCalled();
    });

    rerender(<VODsPage />);

    expect(screen.getByText('Show Name')).toBeInTheDocument();
    expect(screen.getByText(/S01E05.*Episode Title/)).toBeInTheDocument();
  });

  it('handles search input changes', () => {
    render(<VODsPage />);

    const searchInput = screen.getByPlaceholderText('Search VODs...');
    fireEvent.change(searchInput, { target: { value: 'action' } });

    expect(mockSetFilters).toHaveBeenCalledWith({ search: 'action' });
  });

  it('handles type filter changes', () => {
    render(<VODsPage />);

    const moviesButton = screen.getByText('Movies');
    fireEvent.click(moviesButton);

    expect(mockSetFilters).toHaveBeenCalledWith({ type: 'movies', category: '' });
    expect(mockSetPage).toHaveBeenCalledWith(1);
  });

  it('handles category filter changes', () => {
    const categories = {
      'action': {
        name: 'Action',
        category_type: 'movie',
        m3u_accounts: [{ enabled: true }],
      },
    };

    useVODStore.mockImplementation((selector) => {
      const state = {
        ...defaultStoreState,
        categories,
      };
      return selector ? selector(state) : state;
    });

    render(<VODsPage />);
    screen.debug(undefined, 30000);

    const categorySelect = screen.getByLabelText('Category');
    fireEvent.change(categorySelect, { target: { value: 'Action|movie' } });

    expect(mockSetFilters).toHaveBeenCalledWith({ category: 'Action|movie' });
    expect(mockSetPage).toHaveBeenCalledWith(1);
  });

  it('handles page size changes and persists to localStorage', () => {
    render(<VODsPage />);

    const pageSizeSelect = screen.getByLabelText('Page Size');
    fireEvent.change(pageSizeSelect, { target: { value: '48' } });

    expect(mockSetPageSize).toHaveBeenCalledWith(48);
    expect(localStorage.getItem('vodsPageSize')).toBe('48');
  });

  it('loads page size from localStorage on mount', () => {
    localStorage.setItem('vodsPageSize', '96');

    render(<VODsPage />);

    expect(mockSetPageSize).toHaveBeenCalledWith(96);
  });

  it('renders pagination when multiple pages exist', async () => {
    useVODStore.mockImplementation((selector) => {
      const state = {
        ...defaultStoreState,
        totalCount: 100,
        pageSize: 24,
        currentPage: 1,
      };
      return selector ? selector(state) : state;
    });

    const { rerender } = render(<VODsPage />);

    await waitFor(() => {
      expect(mockFetchContent).toHaveBeenCalled();
    });

    rerender(<VODsPage />);

    expect(screen.getByTestId('pagination')).toBeInTheDocument();
    expect(screen.getByText('1 of 5')).toBeInTheDocument();
  });

  it('does not render pagination for single page', async () => {
    useVODStore.mockImplementation((selector) => {
      const state = {
        ...defaultStoreState,
        totalCount: 20,
        pageSize: 24,
      };
      return selector ? selector(state) : state;
    });

    const { rerender } = render(<VODsPage />);

    await waitFor(() => {
      expect(mockFetchContent).toHaveBeenCalled();
    });

    rerender(<VODsPage />);

    expect(screen.queryByTestId('pagination')).not.toBeInTheDocument();
  });

  it('filters categories based on selected type', () => {
    const categories = {
      'action': {
        name: 'Action',
        category_type: 'movie',
        m3u_accounts: [{ enabled: true }],
      },
      'drama': {
        name: 'Drama',
        category_type: 'series',
        m3u_accounts: [{ enabled: true }],
      },
    };

    useVODStore.mockImplementation((selector) => {
      const state = {
        ...defaultStoreState,
        categories,
        filters: { type: 'movies', search: '', category: '' },
      };
      return selector ? selector(state) : state;
    });

    render(<VODsPage />);

    const categorySelect = screen.getByLabelText('Category');
    const options = categorySelect.querySelectorAll('option');

    expect(options).toHaveLength(2); // "All Categories" + 1 movie category
  });

  it('excludes disabled categories from options', () => {
    const categories = {
      'action': {
        name: 'Action',
        category_type: 'movie',
        m3u_accounts: [{ enabled: true }],
      },
      'horror': {
        name: 'Horror',
        category_type: 'movie',
        m3u_accounts: [{ enabled: false }],
      },
    };

    useVODStore.mockImplementation((selector) => {
      const state = {
        ...defaultStoreState,
        categories,
      };
      return selector ? selector(state) : state;
    });

    render(<VODsPage />);

    const categorySelect = screen.getByLabelText('Category');
    expect(categorySelect).not.toHaveTextContent('Horror');
  });

  it('formats duration correctly for hours and minutes', async () => {
    const movies = [
      {
        id: 1,
        contentType: 'movie',
        type: 'movie',
        name: 'Long Movie',
        duration: true, //todo this doesn't seem to get set in useVODStore
        duration_secs: 7265, // 2h 1m 5s
        logo: { url: 'http://example.com/logo.jpg' },
      },
    ];

    useVODStore.mockImplementation((selector) => {
      const state = {
        ...defaultStoreState,
        currentPageContent: movies,
      };
      return selector ? selector(state) : state;
    });

    const { rerender } = render(<VODsPage />);

    await waitFor(() => {
      expect(mockFetchContent).toHaveBeenCalled();
    });

    rerender(<VODsPage />);

    expect(screen.getByText('2h 1m')).toBeInTheDocument();
  });

  it('formats duration correctly for minutes only', async () => {
    const movies = [
      {
        id: 1,
        contentType: 'movie',
        type: 'movie',
        name: 'Short Movie',
        duration: true, //todo this doesn't seem to get set in useVODStore
        duration_secs: 1805, // 30m 5s
        logo: { url: 'http://example.com/logo.jpg' },
      },
    ];

    useVODStore.mockImplementation((selector) => {
      const state = {
        ...defaultStoreState,
        currentPageContent: movies,
      };
      return selector ? selector(state) : state;
    });

    const { rerender } = render(<VODsPage />);

    await waitFor(() => {
      expect(mockFetchContent).toHaveBeenCalled();
    });

    rerender(<VODsPage />);

    expect(screen.getByText('30m 5s')).toBeInTheDocument();
  });

  it('refetches content when filters change', async () => {
    const { rerender } = render(<VODsPage />);

    await waitFor(() => {
      expect(mockFetchContent).toHaveBeenCalledTimes(1);
    });

    // Update the mock to return new filter state
    useVODStore.mockImplementation((selector) => {
      const state = {
        ...defaultStoreState,
        filters: { type: 'movies', search: '', category: '' },
      };
      return selector ? selector(state) : state;
    });

    rerender(<VODsPage />);

    await waitFor(() => {
      expect(mockFetchContent).toHaveBeenCalledTimes(2);
    });
  });
});