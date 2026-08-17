import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { AllProvidersWrapperDefault } from './utils/testUtils';

import Table from '../components/Table';

const simpleData = [
  { id: 1, name: 'Charlie', size: 300, date: '2021-01-03T00:00:00.000Z' },
  { id: 2, name: 'Alice', size: 100, date: '2021-01-01T00:00:00.000Z' },
  { id: 3, name: 'Bob', size: 200, date: '2021-01-02T00:00:00.000Z' },
];

const sortingData = [
  {
    id: 1,
    name: 'Charlie',
    size: 300,
    date: '2021-01-03T00:00:00.000Z',
    tags: ['b', 'a'],
    meta: { label: 'Zebra' },
  },
  {
    id: 2,
    name: 'Alice',
    size: 100,
    date: '2021-01-01T00:00:00.000Z',
    tags: ['a'],
    meta: { label: 'Apple' },
  },
  {
    id: 3,
    name: 'Bob',
    size: 200,
    date: '2021-01-02T00:00:00.000Z',
    tags: ['c'],
    meta: { label: 'Mango' },
  },
];

const displayFieldsBasic = [
  { field: 'name', column: 'Name', sorter: 'alphabetical', displayer: String },
  { field: 'size', column: 'Size', displayer: Number },
  {
    field: 'id,name',
    column: 'Combined',
    displayer: (id, name) => `${id}-${name}`,
  },
];

const displayFieldsAllSorters = [
  { field: 'name', column: 'Name', sorter: 'alphabetical', displayer: String },
  { field: 'size', column: 'Size', sorter: 'numerical', displayer: Number },
  { field: 'date', column: 'Date', sorter: 'datetime', displayer: String },
  {
    field: 'tags',
    column: 'Tags',
    sorter: 'alphabetical-array',
    displayer: (tags) => tags.join(','),
  },
  {
    field: 'meta',
    column: 'Meta',
    sorter: 'alphabetical-object',
    displayer: (meta) => meta.label,
  },
];

const rowNames = () =>
  screen
    .getAllByRole('row')
    .slice(1)
    .map((row) => row.textContent);

const renderTable = (props) =>
  render(<Table idFieldName="id" {...props} />, {
    wrapper: AllProvidersWrapperDefault,
  });

describe('Table basic rendering', () => {
  it('renders headers and rows with custom + multi-field displayers', () => {
    renderTable({
      data: simpleData,
      noDataMsg: 'No data',
      isLoading: false,
      displayFields: displayFieldsBasic,
    });

    expect(
      screen.getByRole('columnheader', { name: 'Name' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Size' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Combined' }),
    ).toBeInTheDocument();

    expect(screen.getByRole('cell', { name: '1-Charlie' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '2-Alice' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '3-Bob' })).toBeInTheDocument();

    expect(screen.getByText('1-3 of 3')).toBeInTheDocument();
  });

  it('shows the loading spinner when isLoading is true, regardless of data', () => {
    renderTable({
      data: simpleData,
      noDataMsg: 'No data',
      isLoading: true,
      displayFields: displayFieldsBasic,
    });

    expect(screen.queryByText('No data')).toBeNull();
    expect(screen.queryByText('Charlie')).toBeNull();
    const cell = screen.getByRole('cell');
    expect(cell.querySelector('span')).toBeInTheDocument();
  });

  it('shows noDataMsg when there is no data and not loading', () => {
    renderTable({
      data: [],
      noDataMsg: 'No data found',
      isLoading: false,
      displayFields: displayFieldsBasic,
    });

    expect(screen.getByText('No data found')).toBeInTheDocument();
    expect(screen.queryByText(/of 0/)).toBeNull();
  });

  it('shows the loading spinner even when there is no data', () => {
    renderTable({
      data: [],
      noDataMsg: 'No data found',
      isLoading: true,
      displayFields: displayFieldsBasic,
    });

    expect(screen.queryByText('No data found')).toBeNull();
    const cell = screen.getByRole('cell');
    expect(cell.querySelector('span')).toBeInTheDocument();
  });

  it('does not attach a sort handler / cursor style to columns without a sorter', async () => {
    const user = userEvent.setup();
    renderTable({
      data: simpleData,
      noDataMsg: 'No data',
      isLoading: false,
      displayFields: displayFieldsBasic,
    });

    const combinedHeader = screen.getByRole('columnheader', {
      name: 'Combined',
    });
    expect(combinedHeader.style.cursor).toBe('');
    await user.click(combinedHeader);
    // order is unchanged since no sorter is attached
    expect(rowNames()[0]).toContain('1-Charlie');
  });

  it('leaves the row order unchanged for an unrecognized sorter type', async () => {
    const user = userEvent.setup();
    renderTable({
      data: simpleData,
      noDataMsg: 'No data',
      isLoading: false,
      displayFields: [
        {
          field: 'name',
          column: 'Name',
          sorter: 'not-a-real-sorter',
          displayer: String,
        },
      ],
    });

    const nameHeader = screen.getByRole('columnheader', { name: 'Name' });
    await user.click(nameHeader);
    expect(rowNames()[0]).toContain('Charlie');
  });

  it('shows sort arrow matching initial sortedCol/sortedAsc props', () => {
    renderTable({
      data: simpleData,
      noDataMsg: 'No data',
      isLoading: false,
      displayFields: displayFieldsBasic,
      sortedCol: 'name',
      sortedAsc: true,
    });

    const nameHeader = screen.getByRole('columnheader', { name: 'Name' });
    // arrow + filter icon (alphabetical sorter, client-side mode)
    expect(nameHeader.querySelectorAll('svg')).toHaveLength(2);

    const sizeHeader = screen.getByRole('columnheader', { name: 'Size' });
    expect(sizeHeader.querySelectorAll('svg')).toHaveLength(0);
  });
});

describe('Table sorting', () => {
  it('sorts alphabetically ascending then descending on repeated clicks', async () => {
    const user = userEvent.setup();
    renderTable({
      data: sortingData,
      noDataMsg: 'No data',
      isLoading: false,
      displayFields: displayFieldsAllSorters,
    });

    const nameHeader = screen.getByRole('columnheader', { name: 'Name' });
    await user.click(nameHeader);
    expect(rowNames().map((r) => r.split(',')[0])).toEqual([
      expect.stringContaining('Alice'),
      expect.stringContaining('Bob'),
      expect.stringContaining('Charlie'),
    ]);

    await user.click(nameHeader);
    expect(rowNames().map((r) => r.split(',')[0])).toEqual([
      expect.stringContaining('Charlie'),
      expect.stringContaining('Bob'),
      expect.stringContaining('Alice'),
    ]);
  });

  it('sorts numerically', async () => {
    const user = userEvent.setup();
    renderTable({
      data: sortingData,
      noDataMsg: 'No data',
      isLoading: false,
      displayFields: displayFieldsAllSorters,
    });

    const sizeHeader = screen.getByRole('columnheader', { name: 'Size' });
    await user.click(sizeHeader);
    let rows = screen.getAllByRole('row').slice(1);
    expect(rows[0].textContent).toContain('Alice');
    expect(rows[2].textContent).toContain('Charlie');

    await user.click(sizeHeader);
    rows = screen.getAllByRole('row').slice(1);
    expect(rows[0].textContent).toContain('Charlie');
    expect(rows[2].textContent).toContain('Alice');
  });

  it('sorts by datetime', async () => {
    const user = userEvent.setup();
    renderTable({
      data: sortingData,
      noDataMsg: 'No data',
      isLoading: false,
      displayFields: displayFieldsAllSorters,
    });

    const dateHeader = screen.getByRole('columnheader', { name: 'Date' });
    await user.click(dateHeader);
    let rows = screen.getAllByRole('row').slice(1);
    expect(rows[0].textContent).toContain('Alice');
    expect(rows[2].textContent).toContain('Charlie');

    await user.click(dateHeader);
    rows = screen.getAllByRole('row').slice(1);
    expect(rows[0].textContent).toContain('Charlie');
    expect(rows[2].textContent).toContain('Alice');
  });

  it('sorts by alphabetical-array', async () => {
    const user = userEvent.setup();
    renderTable({
      data: sortingData,
      noDataMsg: 'No data',
      isLoading: false,
      displayFields: displayFieldsAllSorters,
    });

    const tagsHeader = screen.getByRole('columnheader', { name: 'Tags' });
    await user.click(tagsHeader);
    let rows = screen.getAllByRole('row').slice(1);
    // 'a' < 'b,a' < 'c'
    expect(rows[0].textContent).toContain('Alice');
    expect(rows[2].textContent).toContain('Bob');
  });

  it('sorts by alphabetical-object', async () => {
    const user = userEvent.setup();
    renderTable({
      data: sortingData,
      noDataMsg: 'No data',
      isLoading: false,
      displayFields: displayFieldsAllSorters,
    });

    const metaHeader = screen.getByRole('columnheader', { name: 'Meta' });
    await user.click(metaHeader);
    let rows = screen.getAllByRole('row').slice(1);
    // Apple < Mango < Zebra
    expect(rows[0].textContent).toContain('Alice');
    expect(rows[1].textContent).toContain('Bob');
    expect(rows[2].textContent).toContain('Charlie');
  });

  it('does not crash when a sortable column header is clicked on an empty table', async () => {
    const user = userEvent.setup();
    renderTable({
      data: [],
      noDataMsg: 'No data',
      isLoading: false,
      displayFields: displayFieldsAllSorters,
    });

    // the 'alphabetical-object' sorter reads data[0][field] to find which
    // key to sort on, which throws when there are no rows to read from.
    // userEvent.click (rather than fireEvent.click) is required here: React
    // reports errors from event handlers via a queued reportError() call
    // instead of throwing them synchronously out of the dispatch, so a bare
    // fireEvent.click() would return normally even when the handler threw -
    // only userEvent's awaited dispatch actually surfaces it as a failure.
    const metaHeader = screen.getByRole('columnheader', { name: 'Meta' });
    await user.click(metaHeader);

    expect(screen.getByText('No data')).toBeInTheDocument();
  });

  it('sorts alphabetically treating null values as coming first/last', async () => {
    const user = userEvent.setup();
    const dataWithNull = [
      { id: 1, name: 'Bob', size: 1 },
      { id: 2, name: null, size: 2 },
      { id: 3, name: 'Alice', size: 3 },
    ];
    renderTable({
      data: dataWithNull,
      noDataMsg: 'No data',
      isLoading: false,
      displayFields: [
        {
          field: 'name',
          column: 'Name',
          sorter: 'alphabetical',
          displayer: (v) => v ?? '-',
        },
      ],
    });

    const nameHeader = screen.getByRole('columnheader', { name: 'Name' });
    // ascending: nulls sort last
    await user.click(nameHeader);
    let rows = screen.getAllByRole('row').slice(1);
    expect(rows[2].textContent).toBe('-');

    // descending: nulls sort first
    await user.click(nameHeader);
    rows = screen.getAllByRole('row').slice(1);
    expect(rows[0].textContent).toBe('-');
  });

  it('sorts by datetime treating null values as coming first/last', async () => {
    const user = userEvent.setup();
    const dataWithNull = [
      { id: 1, date: '2021-01-02T00:00:00.000Z', name: 'Bob' },
      { id: 2, date: null, name: 'NullDate' },
      { id: 3, date: '2021-01-01T00:00:00.000Z', name: 'Alice' },
    ];
    renderTable({
      data: dataWithNull,
      noDataMsg: 'No data',
      isLoading: false,
      displayFields: [
        { field: 'name', column: 'Name', displayer: String },
        {
          field: 'date',
          column: 'Date',
          sorter: 'datetime',
          displayer: String,
        },
      ],
    });

    const dateHeader = screen.getByRole('columnheader', { name: 'Date' });
    // ascending: nulls sort first for datetime
    await user.click(dateHeader);
    let rows = screen.getAllByRole('row').slice(1);
    expect(rows[0].textContent).toContain('NullDate');

    // descending: nulls sort last
    await user.click(dateHeader);
    rows = screen.getAllByRole('row').slice(1);
    expect(rows[2].textContent).toContain('NullDate');
  });

  it('sorts by alphabetical-array treating null values as coming first/last', async () => {
    const user = userEvent.setup();
    const dataWithNull = [
      { id: 1, tags: ['b'], name: 'Bob' },
      { id: 2, tags: null, name: 'NullTags' },
      { id: 3, tags: ['a'], name: 'Alice' },
    ];
    renderTable({
      data: dataWithNull,
      noDataMsg: 'No data',
      isLoading: false,
      displayFields: [
        { field: 'name', column: 'Name', displayer: String },
        {
          field: 'tags',
          column: 'Tags',
          sorter: 'alphabetical-array',
          displayer: (tags) => (tags ? tags.join(',') : '-'),
        },
      ],
    });

    const tagsHeader = screen.getByRole('columnheader', { name: 'Tags' });
    await user.click(tagsHeader);
    let rows = screen.getAllByRole('row').slice(1);
    expect(rows[2].textContent).toContain('NullTags');

    await user.click(tagsHeader);
    rows = screen.getAllByRole('row').slice(1);
    expect(rows[0].textContent).toContain('NullTags');
  });

  it('sorts by alphabetical-object treating null values as coming first/last', async () => {
    const user = userEvent.setup();
    const dataWithNull = [
      { id: 1, meta: { label: 'Mango' }, name: 'Bob' },
      { id: 2, meta: { label: null }, name: 'NullMeta' },
      { id: 3, meta: { label: 'Apple' }, name: 'Alice' },
    ];
    renderTable({
      data: dataWithNull,
      noDataMsg: 'No data',
      isLoading: false,
      displayFields: [
        { field: 'name', column: 'Name', displayer: String },
        {
          field: 'meta',
          column: 'Meta',
          sorter: 'alphabetical-object',
          displayer: (meta) => meta.label ?? '-',
        },
      ],
    });

    const metaHeader = screen.getByRole('columnheader', { name: 'Meta' });
    await user.click(metaHeader);
    let rows = screen.getAllByRole('row').slice(1);
    expect(rows[2].textContent).toContain('NullMeta');

    await user.click(metaHeader);
    rows = screen.getAllByRole('row').slice(1);
    expect(rows[0].textContent).toContain('NullMeta');
  });
});

describe('Table filtering', () => {
  const getFilterIcon = (columnName) => {
    const header = screen.getByRole('columnheader', { name: columnName });
    const svgs = header.querySelectorAll('svg');
    return svgs[svgs.length - 1];
  };

  it('filters rows by a column value (case-insensitive substring)', async () => {
    const user = userEvent.setup();
    renderTable({
      data: sortingData,
      noDataMsg: 'No data',
      isLoading: false,
      displayFields: displayFieldsAllSorters,
    });

    await user.click(getFilterIcon('Name'));
    const filterInput = await screen.findByPlaceholderText('Filter');
    await user.type(filterInput, 'ali');

    let rows = screen.getAllByRole('row').slice(1);
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain('Alice');

    // narrow the filter further (startsWith branch), no longer matching anything
    await user.type(filterInput, 'z');
    expect(screen.getByText('No data')).toBeInTheDocument();
    expect(screen.queryByText('Alice')).toBeNull();

    // replace the filter text (without clearing first) with a value that
    // does not start with the previous one, e.g. a user selecting-all and
    // retyping - exercises the "widen against dataRaw, keep the key" branch
    fireEvent.change(filterInput, { target: { value: 'ob' } });
    rows = screen.getAllByRole('row').slice(1);
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain('Bob');

    // widen back out - filterText no longer starts with previous filter value
    await user.clear(filterInput);
    await user.type(filterInput, 'o');
    rows = screen.getAllByRole('row').slice(1);
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain('Bob');

    // clearing the filter entirely restores all rows
    await user.clear(filterInput);
    rows = screen.getAllByRole('row').slice(1);
    expect(rows).toHaveLength(3);
  });

  it('combines filters from multiple columns using AND logic', async () => {
    const user = userEvent.setup();
    const cityData = [
      { id: 1, name: 'Charlie', city: 'Berlin' },
      { id: 2, name: 'Alice', city: 'Vienna' },
      { id: 3, name: 'Bob', city: 'Berlin' },
    ];
    renderTable({
      data: cityData,
      noDataMsg: 'No data',
      isLoading: false,
      displayFields: [
        {
          field: 'name',
          column: 'Name',
          sorter: 'alphabetical',
          displayer: String,
        },
        {
          field: 'city',
          column: 'City',
          sorter: 'alphabetical',
          displayer: String,
        },
      ],
    });

    await user.click(getFilterIcon('Name'));
    let filterInput = await screen.findByPlaceholderText('Filter');
    // "Charlie" and "Alice" both contain 'e', "Bob" does not
    await user.type(filterInput, 'e');
    let rows = screen.getAllByRole('row').slice(1);
    expect(rows).toHaveLength(2);

    // now also filter City so only one of the two remains, exercising the
    // multi-key AND branch against dataRaw
    await user.click(getFilterIcon('City'));
    // the Name filter's overlay auto-closes (rootClose) once we click
    // elsewhere, so only the City filter input is present now
    const cityFilterInput = await screen.findByPlaceholderText('Filter');
    await user.type(cityFilterInput, 'vien');

    rows = screen.getAllByRole('row').slice(1);
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain('Alice');

    // clearing just the city filter falls back to the remaining name filter
    await user.clear(cityFilterInput);
    rows = screen.getAllByRole('row').slice(1);
    expect(rows).toHaveLength(2);
  });

  it('does not render a filter control for columns without a sorter', () => {
    renderTable({
      data: simpleData,
      noDataMsg: 'No data',
      isLoading: false,
      displayFields: displayFieldsBasic,
    });
    const combinedHeader = screen.getByRole('columnheader', {
      name: 'Combined',
    });
    expect(combinedHeader.querySelectorAll('svg')).toHaveLength(0);
  });
});

describe('Table pagination (client-side)', () => {
  const manyRows = Array.from({ length: 95 }, (_, i) => ({
    id: i + 1,
    value: i + 1,
  }));
  const displayFieldsPaged = [
    { field: 'value', column: 'Value', displayer: Number },
  ];

  it('paginates through pages using First/Prev/Next/Last', async () => {
    const user = userEvent.setup();
    renderTable({
      data: manyRows,
      noDataMsg: 'No data',
      isLoading: false,
      displayFields: displayFieldsPaged,
      rowsPerPage: 10,
    });

    expect(screen.getByText('1-10 of 95')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Previous' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'First' })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('11-20 of 95')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Previous' }));
    expect(screen.getByText('1-10 of 95')).toBeInTheDocument();

    // clicking the current (active, non-interactive) page item should not
    // change the page
    const activePageLink = document.querySelector(
      '.page-item.active .page-link',
    );
    fireEvent.click(activePageLink);
    expect(screen.getByText('1-10 of 95')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('11-20 of 95')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Last' }));
    expect(screen.getByText('91-95 of 95')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Next' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Last' })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'First' }));
    expect(screen.getByText('1-10 of 95')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Previous' })).toBeNull();

    // move to a middle page via repeated "Next" clicks
    for (let i = 0; i < 4; i++) {
      await user.click(screen.getByRole('button', { name: 'Next' }));
    }
    expect(screen.getByText('41-50 of 95')).toBeInTheDocument();

    // ellipses should appear on both sides when in the middle of many pages
    expect(screen.getAllByText('…')).toHaveLength(2);

    // clicking a visible page number jumps directly to that page
    await user.click(screen.getByRole('button', { name: '6' }));
    expect(screen.getByText('51-60 of 95')).toBeInTheDocument();
  });

  it('allows jumping directly to a page number via the "Go to page" input', async () => {
    const user = userEvent.setup();
    renderTable({
      data: manyRows,
      noDataMsg: 'No data',
      isLoading: false,
      displayFields: displayFieldsPaged,
      rowsPerPage: 10,
    });

    const pageInput = screen.getByLabelText('Page');
    await user.type(pageInput, '999');
    expect(pageInput).toHaveClass('is-invalid');

    await user.clear(pageInput);
    await user.type(pageInput, '7');
    expect(pageInput).not.toHaveClass('is-invalid');
    await user.click(screen.getByRole('button', { name: 'Go' }));
    expect(screen.getByText('61-70 of 95')).toBeInTheDocument();

    // pressing Enter also triggers the jump
    await user.clear(pageInput);
    await user.type(pageInput, '2');
    fireEvent.keyPress(pageInput, {
      key: 'Enter',
      code: 'Enter',
      charCode: 13,
    });
    expect(screen.getByText('11-20 of 95')).toBeInTheDocument();
  });

  it('ignores the "Go" action while the page number is invalid', async () => {
    const user = userEvent.setup();
    renderTable({
      data: manyRows,
      noDataMsg: 'No data',
      isLoading: false,
      displayFields: displayFieldsPaged,
      rowsPerPage: 10,
    });

    const pageInput = screen.getByLabelText('Page');
    await user.type(pageInput, '0');
    expect(pageInput).toHaveClass('is-invalid');
    await user.click(screen.getByRole('button', { name: 'Go' }));
    expect(screen.getByText('1-10 of 95')).toBeInTheDocument();
  });

  it('does not render the "Go to page" input when there are few pages', () => {
    renderTable({
      data: simpleData,
      noDataMsg: 'No data',
      isLoading: false,
      displayFields: displayFieldsBasic,
    });
    expect(screen.queryByLabelText('Page')).toBeNull();
  });

  it('changes rows per page and recomputes the number of pages', async () => {
    const user = userEvent.setup();
    renderTable({
      data: manyRows,
      noDataMsg: 'No data',
      isLoading: false,
      displayFields: displayFieldsPaged,
      rowsPerPage: 10,
    });

    const select = screen.getByLabelText('Rows per page');
    await user.selectOptions(select, '20');
    expect(screen.getByText('1-20 of 95')).toBeInTheDocument();
  });

  it('shows a single, fully-disabled page when everything fits on one page', () => {
    renderTable({
      data: simpleData,
      noDataMsg: 'No data',
      isLoading: false,
      displayFields: displayFieldsBasic,
    });
    expect(screen.queryByRole('button', { name: 'Next' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Previous' })).toBeNull();
    expect(screen.queryByText('…')).toBeNull();
  });
});

describe('Table server-side mode (onChange provided)', () => {
  const serverRows = [
    { id: 1, name: 'Charlie' },
    { id: 2, name: 'Alice' },
  ];
  const displayFieldsServer = [
    {
      field: 'name',
      column: 'Name',
      sorter: 'alphabetical',
      displayer: String,
    },
  ];

  it('calls onChange on mount and does not slice/filter data client-side', () => {
    const onChange = vi.fn();
    renderTable({
      data: serverRows,
      noDataMsg: 'No data',
      isLoading: false,
      displayFields: displayFieldsServer,
      onChange,
      total: 50,
      rowsPerPage: 2,
      sortedCol: 'name',
      sortedAsc: true,
    });

    expect(onChange).toHaveBeenCalledWith(0, 'name', true, 2);
    // total drives pagination, not data.length
    expect(screen.getByText('1-2 of 50')).toBeInTheDocument();
    // no filter icon rendered in server-side mode
    const nameHeader = screen.getByRole('columnheader', { name: 'Name' });
    expect(nameHeader.querySelectorAll('svg')).toHaveLength(1); // just the arrow
  });

  it('calls onChange with the new page when navigating', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderTable({
      data: serverRows,
      noDataMsg: 'No data',
      isLoading: false,
      displayFields: displayFieldsServer,
      onChange,
      total: 50,
      rowsPerPage: 2,
    });

    onChange.mockClear();
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(onChange).toHaveBeenCalledWith(1, undefined, false, 2);
  });

  it('calls onChange with updated sort info when a sortable header is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderTable({
      data: serverRows,
      noDataMsg: 'No data',
      isLoading: false,
      displayFields: displayFieldsServer,
      onChange,
      total: 50,
      rowsPerPage: 2,
    });

    onChange.mockClear();
    await user.click(screen.getByRole('columnheader', { name: 'Name' }));
    expect(onChange).toHaveBeenCalledWith(0, 'name', true, 2);
  });
});

describe('Table reacting to prop changes', () => {
  it('resets to the first page when resetPageNumber becomes true', async () => {
    const user = userEvent.setup();
    const manyRows = Array.from({ length: 30 }, (_, i) => ({
      id: i + 1,
      value: i + 1,
    }));
    const displayFieldsPaged = [
      { field: 'value', column: 'Value', displayer: Number },
    ];

    const { rerender } = render(
      <Table
        idFieldName="id"
        data={manyRows}
        noDataMsg="No data"
        isLoading={false}
        displayFields={displayFieldsPaged}
        rowsPerPage={10}
        resetPageNumber={false}
      />,
      { wrapper: AllProvidersWrapperDefault },
    );

    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('11-20 of 30')).toBeInTheDocument();

    rerender(
      <Table
        idFieldName="id"
        data={manyRows}
        noDataMsg="No data"
        isLoading={false}
        displayFields={displayFieldsPaged}
        rowsPerPage={10}
        resetPageNumber={true}
      />,
    );
    expect(screen.getByText('1-10 of 30')).toBeInTheDocument();
  });

  it('clamps the current page when data shrinks after a prop update', async () => {
    const user = userEvent.setup();
    const bigData = Array.from({ length: 20 }, (_, i) => ({
      id: i + 1,
      value: i + 1,
    }));
    const smallData = [{ id: 1, value: 999 }];
    const displayFieldsPaged = [
      { field: 'value', column: 'Value', displayer: Number },
    ];

    const { rerender } = render(
      <Table
        idFieldName="id"
        data={bigData}
        noDataMsg="No data"
        isLoading={false}
        displayFields={displayFieldsPaged}
        rowsPerPage={10}
      />,
      { wrapper: AllProvidersWrapperDefault },
    );

    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('11-20 of 20')).toBeInTheDocument();

    rerender(
      <Table
        idFieldName="id"
        data={smallData}
        noDataMsg="No data"
        isLoading={false}
        displayFields={displayFieldsPaged}
        rowsPerPage={10}
      />,
    );

    expect(screen.getByText('1-1 of 1')).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '999' })).toBeInTheDocument();
  });
});
