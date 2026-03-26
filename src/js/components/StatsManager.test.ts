// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StatsManager } from './StatsManager';
import type { IndexedStatEntry } from '../types/interface';

function createStat(index: number, overrides: Partial<IndexedStatEntry> = {}): IndexedStatEntry {
  const row = index + 1;
  return {
    word: `word${String(row).padStart(2, '0')}`,
    time: row * 3,
    attempts: ((row - 1) % 5) + 1,
    wordLength: 4,
    date: `2026-02-${String(((row - 1) % 28) + 1).padStart(2, '0')}T09:30:00.000Z`,
    difficultyLabel: 'Medium',
    hintsUsed: row % 3,
    solvedWithoutHints: row % 3 === 0,
    averageFreshLettersPerGuess: 3.25,
    averageEliminatedLetterReusePerGuess: 0.5,
    __originalIndex: index,
    ...overrides
  };
}

function buildStats(count: number): IndexedStatEntry[] {
  return Array.from({ length: count }, (_, index) => createStat(index));
}

function getRenderedRows(container: HTMLElement): HTMLDivElement[] {
  return Array.from(container.querySelectorAll<HTMLDivElement>('.stats-body .stat-row'));
}

describe('StatsManager', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '<div id="stats-root"></div>';
    localStorage.clear();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('renders first 20 rows and loads the final remainder without extra button state', () => {
    const container = document.getElementById('stats-root');
    expect(container).toBeTruthy();
    if (!container) {
      return;
    }

    const manager = new StatsManager(container, buildStats(23));
    vi.runAllTimers();

    expect(getRenderedRows(container)).toHaveLength(20);

    const loadMoreButton = container.querySelector<HTMLButtonElement>('.stats-load-more-btn');
    const loadMoreContainer = container.querySelector<HTMLDivElement>('.stats-load-more-container');
    expect(loadMoreButton).toBeTruthy();
    expect(loadMoreContainer).toBeTruthy();
    expect(loadMoreButton?.textContent).toBe('Load 3 More');

    loadMoreButton?.click();
    expect(getRenderedRows(container)).toHaveLength(23);
    expect(loadMoreContainer?.style.display).toBe('none');

    manager.destroy();
  });

  it('renders ability summary cards above the table', () => {
    const container = document.getElementById('stats-root');
    expect(container).toBeTruthy();
    if (!container) {
      return;
    }

    const manager = new StatsManager(container, [
      createStat(0, {
        hintsUsed: 0,
        solvedWithoutHints: true,
        averageFreshLettersPerGuess: 4,
        averageEliminatedLetterReusePerGuess: 0.25
      }),
      createStat(1, {
        hintsUsed: 2,
        solvedWithoutHints: false,
        averageFreshLettersPerGuess: 3,
        averageEliminatedLetterReusePerGuess: 1
      })
    ]);
    vi.runAllTimers();

    const cards = container.querySelectorAll('.stats-summary-card');
    expect(cards).toHaveLength(4);
    expect(container.textContent).toContain('Clean Wins');
    expect(container.textContent).toContain('1/2');
    expect(container.textContent).toContain('50% solved without reveals');
    expect(container.textContent).toContain('4 letters');
    expect(container.textContent).toContain('2 hints used in 2 wins');

    manager.destroy();
  });

  it('shows pending fresh-letter data and no-hint copy for legacy-style clean wins', () => {
    const container = document.getElementById('stats-root');
    expect(container).toBeTruthy();
    if (!container) {
      return;
    }

    const manager = new StatsManager(container, [
      createStat(0, {
        hintsUsed: 0,
        solvedWithoutHints: true,
        averageFreshLettersPerGuess: 0,
        averageEliminatedLetterReusePerGuess: 0
      })
    ]);
    vi.runAllTimers();

    expect(container.textContent).toContain('Pending');
    expect(container.textContent).toContain('No hints used across 1 win');
    expect(container.textContent).toContain('Low');

    manager.destroy();
  });

  it('loads in 10-row batches and hides load-more once all rows are visible', () => {
    const container = document.getElementById('stats-root');
    expect(container).toBeTruthy();
    if (!container) {
      return;
    }

    const manager = new StatsManager(container, buildStats(35));
    vi.runAllTimers();

    const loadMoreButton = container.querySelector<HTMLButtonElement>('.stats-load-more-btn');
    expect(loadMoreButton).toBeTruthy();
    expect(loadMoreButton?.textContent).toBe('Load 10 More');

    loadMoreButton?.click();
    expect(getRenderedRows(container)).toHaveLength(30);
    expect(loadMoreButton?.textContent).toBe('Load 5 More');

    loadMoreButton?.click();
    expect(getRenderedRows(container)).toHaveLength(35);
    expect(loadMoreButton?.style.display).toBe('none');

    manager.destroy();
  });

  it('resets to 20 rows on sort/filter rerender after additional rows were appended', () => {
    const container = document.getElementById('stats-root');
    expect(container).toBeTruthy();
    if (!container) {
      return;
    }

    const manager = new StatsManager(container, buildStats(40));
    vi.runAllTimers();

    const loadMoreButton = container.querySelector<HTMLButtonElement>('.stats-load-more-btn');
    loadMoreButton?.click();
    expect(getRenderedRows(container)).toHaveLength(30);

    const wordHeader = container.querySelector<HTMLElement>('.header-cell[data-field="word"]');
    expect(wordHeader).toBeTruthy();
    wordHeader?.click();
    vi.runAllTimers();

    expect(getRenderedRows(container)).toHaveLength(20);
    expect(loadMoreButton?.textContent).toBe('Load 10 More');

    manager.destroy();
  });

  it('supports date filtering with single-select behavior', () => {
    const container = document.getElementById('stats-root');
    expect(container).toBeTruthy();
    if (!container) {
      return;
    }

    const now = new Date();
    const older = new Date(now);
    older.setMonth(older.getMonth() - 8);

    const stats: IndexedStatEntry[] = [
      createStat(0, {
        word: 'fresh',
        time: 12,
        attempts: 2,
        wordLength: 5,
        date: now.toISOString()
      }),
      createStat(1, {
        word: 'older',
        time: 65,
        attempts: 4,
        wordLength: 5,
        date: older.toISOString()
      })
    ];

    const manager = new StatsManager(container, stats);
    vi.runAllTimers();

    const dateSelect = container.querySelector<HTMLSelectElement>(
      '.filter-section[data-filter-type="DATE"] .filter-select'
    );
    expect(dateSelect).toBeTruthy();
    if (!dateSelect) {
      return;
    }

    dateSelect.value = '0';
    dateSelect.dispatchEvent(new Event('change'));
    vi.runAllTimers();
    expect(getRenderedRows(container)).toHaveLength(1);
    expect(container.querySelector('.stats-body')?.textContent).toContain('fresh');

    dateSelect.value = '5';
    dateSelect.dispatchEvent(new Event('change'));
    vi.runAllTimers();
    expect(getRenderedRows(container)).toHaveLength(2);
    expect(dateSelect.value).toBe('5');

    manager.destroy();
  });

  it('collapses advanced controls and keeps filter summary visible', () => {
    const container = document.getElementById('stats-root');
    expect(container).toBeTruthy();
    if (!container) {
      return;
    }

    const manager = new StatsManager(container, buildStats(5));
    vi.runAllTimers();

    const panel = container.querySelector<HTMLElement>('.filter-panel');
    const toggleButton = container.querySelector<HTMLButtonElement>('.filter-panel-toggle');
    const summary = container.querySelector<HTMLElement>('.filter-panel-summary');
    const wordLengthMinRange = container.querySelector<HTMLInputElement>(
      '.filter-section[data-filter-type="WORD_LENGTH"] .filter-range-input-min'
    );
    const wordLengthMaxRange = container.querySelector<HTMLInputElement>(
      '.filter-section[data-filter-type="WORD_LENGTH"] .filter-range-input-max'
    );

    expect(panel).toBeTruthy();
    expect(panel?.classList.contains('is-collapsed')).toBe(true);
    expect(toggleButton?.textContent).toBe('Show Filters');
    expect(summary?.textContent).toBe('No filters applied');

    toggleButton?.click();
    expect(panel?.classList.contains('is-collapsed')).toBe(false);
    expect(toggleButton?.textContent).toBe('Hide Filters');

    if (wordLengthMinRange && wordLengthMaxRange) {
      wordLengthMinRange.value = '4';
      wordLengthMinRange.dispatchEvent(new Event('input'));
      wordLengthMaxRange.value = '4';
      wordLengthMaxRange.dispatchEvent(new Event('input'));
      vi.runAllTimers();
      expect(summary?.textContent).toBe('1 filter active');
    }

    toggleButton?.click();
    expect(panel?.classList.contains('is-collapsed')).toBe(true);
    expect(toggleButton?.textContent).toBe('Show Filters');

    manager.destroy();
  });

  it('supports time multi-select and exact attempts slider filtering', () => {
    const container = document.getElementById('stats-root');
    expect(container).toBeTruthy();
    if (!container) {
      return;
    }

    const stats: IndexedStatEntry[] = [
      createStat(0, {
        word: 'first',
        time: 20,
        attempts: 1,
        wordLength: 5,
        date: '2026-02-01T09:00:00.000Z'
      }),
      createStat(1, {
        word: 'second',
        time: 75,
        attempts: 3,
        wordLength: 6,
        date: '2026-02-02T09:00:00.000Z'
      }),
      createStat(2, {
        word: 'third',
        time: 190,
        attempts: 3,
        wordLength: 5,
        date: '2026-02-03T09:00:00.000Z'
      })
    ];

    const manager = new StatsManager(container, stats);
    vi.runAllTimers();

    const toggleButton = container.querySelector<HTMLButtonElement>('.filter-panel-toggle');
    toggleButton?.click();

    const attemptsMin = container.querySelector<HTMLInputElement>(
      '.filter-section[data-filter-type="ATTEMPTS"] .filter-range-input-min'
    );
    const attemptsMax = container.querySelector<HTMLInputElement>(
      '.filter-section[data-filter-type="ATTEMPTS"] .filter-range-input-max'
    );

    expect(attemptsMin).toBeTruthy();
    expect(attemptsMax).toBeTruthy();
    if (!attemptsMin || !attemptsMax) {
      return;
    }

    attemptsMin.value = '3';
    attemptsMin.dispatchEvent(new Event('input'));
    attemptsMax.value = '3';
    attemptsMax.dispatchEvent(new Event('input'));
    vi.runAllTimers();

    expect(getRenderedRows(container)).toHaveLength(2);
    expect(container.querySelector('.stats-body')?.textContent).toContain('second');
    expect(container.querySelector('.stats-body')?.textContent).toContain('third');

    const timeOptionFast = container.querySelector<HTMLInputElement>(
      '.filter-section[data-filter-type="TIME"] .filter-multi-checkbox[data-filter-index="0"]'
    );
    const timeOptionMedium = container.querySelector<HTMLInputElement>(
      '.filter-section[data-filter-type="TIME"] .filter-multi-checkbox[data-filter-index="2"]'
    );

    expect(timeOptionFast).toBeTruthy();
    expect(timeOptionMedium).toBeTruthy();
    if (!timeOptionFast || !timeOptionMedium) {
      return;
    }

    timeOptionFast.checked = true;
    timeOptionFast.dispatchEvent(new Event('change'));
    timeOptionMedium.checked = true;
    timeOptionMedium.dispatchEvent(new Event('change'));
    vi.runAllTimers();

    expect(getRenderedRows(container)).toHaveLength(1);
    expect(container.querySelector('.stats-body')?.textContent).toContain('second');
    expect(container.querySelector('.filter-panel-summary')?.textContent).toBe('3 filters active');

    manager.destroy();
  });

  it('removes active filter chips through their click handlers', () => {
    const container = document.getElementById('stats-root');
    expect(container).toBeTruthy();
    if (!container) {
      return;
    }

    const manager = new StatsManager(container, buildStats(6));
    vi.runAllTimers();

    const toggleButton = container.querySelector<HTMLButtonElement>('.filter-panel-toggle');
    toggleButton?.click();

    const wordLengthMin = container.querySelector<HTMLInputElement>(
      '.filter-section[data-filter-type="WORD_LENGTH"] .filter-range-input-min'
    );
    const wordLengthMax = container.querySelector<HTMLInputElement>(
      '.filter-section[data-filter-type="WORD_LENGTH"] .filter-range-input-max'
    );
    const timeOption = container.querySelector<HTMLInputElement>(
      '.filter-section[data-filter-type="TIME"] .filter-multi-checkbox[data-filter-index="0"]'
    );

    expect(wordLengthMin && wordLengthMax && timeOption).toBeTruthy();
    if (!wordLengthMin || !wordLengthMax || !timeOption) {
      return;
    }

    wordLengthMin.value = '4';
    wordLengthMin.dispatchEvent(new Event('input'));
    wordLengthMax.value = '4';
    wordLengthMax.dispatchEvent(new Event('input'));
    timeOption.checked = true;
    timeOption.dispatchEvent(new Event('change'));
    vi.runAllTimers();

    const rangeRemove = container.querySelector<HTMLElement>('.remove-filter[data-filter-index="-1"]');
    const optionRemove = Array.from(container.querySelectorAll<HTMLElement>('.remove-filter'))
      .find((element) => element.dataset.filterIndex === '0');

    rangeRemove?.click();
    optionRemove?.click();
    vi.runAllTimers();

    expect(container.querySelectorAll('.active-filter')).toHaveLength(0);

    manager.destroy();
  });

  it('covers internal guard branches, helper fallbacks, and idempotent destroy', () => {
    const container = document.getElementById('stats-root');
    expect(container).toBeTruthy();
    if (!container) {
      return;
    }

    const manager = new StatsManager(container, buildStats(3));
    const internal = manager as unknown as Record<string, unknown>;

    // Helper fallbacks.
    expect((internal.formatPlayedAt as (date: string) => string)('not-a-date')).toBe('Unknown');
    expect((internal.getFilterTitle as (key: string) => string)('CUSTOM_FILTER')).toBe('CUSTOM_FILTER');
    expect((internal.normalizeNumericRange as (min: number, max: number, bounds: { min: number; max: number }) => [number, number])(
      Number.NaN,
      Number.POSITIVE_INFINITY,
      { min: 1, max: 5 }
    )).toEqual([1, 5]);

    // Destroy should clear pending timeout and be safe when called repeatedly.
    internal.pendingRenderTimeoutId = window.setTimeout(() => {}, 100);
    manager.destroy();
    expect(container.innerHTML).toBe('');
    expect(() => manager.destroy()).not.toThrow();

    // Destroyed-instance guards should no-op.
    expect(() => (internal.setSingleSelectFilterValue as (type: string, value: number | null) => void)('DATE', 0)).not.toThrow();
    expect(() => (internal.toggleTimeFilterIndex as (type: string, index: number, checked: boolean) => void)('TIME', 0, true)).not.toThrow();
    expect(() => (internal.setNumericRangeFilterValue as (type: string, min: number, max: number, bounds: { min: number; max: number }) => void)(
      'ATTEMPTS',
      1,
      5,
      { min: 1, max: 5 }
    )).not.toThrow();
    expect(() => (internal.clearAllFilters as () => void)()).not.toThrow();
    expect(() => (internal.removeFilter as (type: string, index: number) => void)('DATE', -1)).not.toThrow();
    expect(() => (internal.handleSort as (field: string) => void)('word')).not.toThrow();
    expect(() => (internal.handleLoadMore as () => void)()).not.toThrow();
  });

  it('handles control sync edge cases and filter removal branches', () => {
    const container = document.getElementById('stats-root');
    expect(container).toBeTruthy();
    if (!container) {
      return;
    }

    const manager = new StatsManager(container, buildStats(6));
    vi.runAllTimers();
    const internal = manager as unknown as Record<string, unknown>;

    // Invalid select dataset should be ignored.
    const dateSelect = container.querySelector<HTMLSelectElement>('.filter-select');
    if (dateSelect) {
      dateSelect.dataset.filterType = 'INVALID_FILTER';
    }

    // Invalid checkbox metadata should be ignored.
    const anyCheckbox = container.querySelector<HTMLInputElement>('.filter-multi-checkbox');
    if (anyCheckbox) {
      anyCheckbox.dataset.filterType = 'TIME';
      anyCheckbox.dataset.filterIndex = 'NaN';
    }

    expect(() => (internal.syncFilterControlValues as () => void)()).not.toThrow();

    // Range sync: no section and incomplete section paths.
    expect(() => (internal.syncRangeFilterControls as (type: string, bounds: { min: number; max: number }) => void)(
      'UNKNOWN',
      { min: 1, max: 5 }
    )).not.toThrow();
    expect(() => (internal.syncRangeFilterControls as (type: string, bounds: { min: number; max: number }) => void)(
      'DATE',
      { min: 1, max: 5 }
    )).not.toThrow();

    // Filter removal branches.
    internal.activeFilters = {
      DATE: [0],
      ATTEMPTS: [2],
      TIME: [1, 2]
    };
    (internal.removeFilter as (type: string, index: number) => void)('TIME', 99); // selected does not include index
    (internal.removeFilter as (type: string, index: number) => void)('TIME', 1); // delegates to toggle path
    (internal.removeFilter as (type: string, index: number) => void)('ATTEMPTS', 2); // generic delete path
    (internal.removeFilter as (type: string, index: number) => void)('DATE', 0); // date path
    vi.runAllTimers();

    manager.destroy();
  });

  it('covers load-more, display rendering guards, and sparse-row handling', () => {
    const container = document.getElementById('stats-root');
    expect(container).toBeTruthy();
    if (!container) {
      return;
    }

    const manager = new StatsManager(container, buildStats(25));
    vi.runAllTimers();
    const internal = manager as unknown as Record<string, unknown>;

    // Load-more guards.
    internal.pendingRenderTimeoutId = 9999;
    (internal.handleLoadMore as () => void)();
    internal.pendingRenderTimeoutId = null;
    internal.visibleRows = (internal.displayedStats as IndexedStatEntry[]).length;
    (internal.handleLoadMore as () => void)();

    // Update load-more state guard without elements.
    internal.loadMoreButton = null;
    internal.loadMoreContainer = null;
    (internal.updateLoadMoreState as () => void)();

    // Sort indicators guard with malformed header entry.
    const malformedHeader = document.createElement('div');
    malformedHeader.className = 'header-cell';
    internal.headerCells = [malformedHeader];
    (internal.updateSortIndicators as () => void)();

    // Sparse rows branch in fragment builder.
    const sparse: Array<IndexedStatEntry | undefined> = [buildStats(1)[0], undefined, buildStats(1)[0]];
    internal.displayedStats = sparse as IndexedStatEntry[];
    const fragment = (internal.buildRowsFragment as (from: number, to: number, animationStart?: number) => DocumentFragment)(0, 3, 0);
    expect(fragment.childNodes.length).toBe(2);

    // replaceRowsWithAnimation guards.
    internal.tableBody = null;
    (internal.replaceRowsWithAnimation as (rows: DocumentFragment, nextVisibleRows: number) => void)(fragment, 2);

    const body = container.querySelector<HTMLDivElement>('.stats-body');
    expect(body).toBeTruthy();
    if (!body) {
      return;
    }
    internal.tableBody = body;
    internal.pendingRenderTimeoutId = window.setTimeout(() => {}, 50);
    (internal.replaceRowsWithAnimation as (rows: DocumentFragment, nextVisibleRows: number) => void)(fragment, 2);
    internal.isDestroyed = true;
    vi.runAllTimers();

    // appendRows / updateDisplay guards.
    internal.isDestroyed = false;
    internal.tableBody = null;
    (internal.appendRows as (from: number, to: number) => void)(1, 1);
    (internal.updateDisplay as (opts: { forceFullRerender: boolean }) => void)({ forceFullRerender: true });
    internal.isDestroyed = true;
    (internal.updateDisplay as (opts: { forceFullRerender: boolean }) => void)({ forceFullRerender: false });

    manager.destroy();
  });

  it('clears filters and updates panel only when required nodes exist', () => {
    const container = document.getElementById('stats-root');
    expect(container).toBeTruthy();
    if (!container) {
      return;
    }

    const manager = new StatsManager(container, buildStats(8));
    vi.runAllTimers();
    const internal = manager as unknown as Record<string, unknown>;

    internal.activeFilters = { DATE: [0] };
    (internal.clearAllFilters as () => void)();
    expect(Object.keys((internal.activeFilters as Record<string, number[]>))).toHaveLength(0);

    // Missing panel state nodes should short-circuit gracefully.
    container.querySelector('.filter-panel-summary')?.remove();
    expect(() => (internal.updateFilterPanelState as () => void)()).not.toThrow();

    // Missing active-filters container should short-circuit gracefully.
    container.querySelector('.active-filters')?.remove();
    expect(() => (internal.updateActiveFiltersDisplay as () => void)()).not.toThrow();

    manager.destroy();
  });

  it('covers remaining branch edges in filters, ranges, sorting and constructor fallbacks', () => {
    const container = document.getElementById('stats-root');
    expect(container).toBeTruthy();
    if (!container) {
      return;
    }

    const manager = new StatsManager(container, null as unknown as IndexedStatEntry[]);
    vi.runAllTimers();
    const internal = manager as unknown as Record<string, unknown>;

    // Recreate panel while expanded (line 206 false branch).
    internal.filtersCollapsed = false;
    const expandedPanel = (internal.createFilterPanel as () => HTMLDivElement)();
    expect(expandedPanel.classList.contains('is-collapsed')).toBe(false);

    // Single-select initialization with active index + invalid selection branch.
    internal.activeFilters = { DATE: [2] };
    const singleSelectWrap = (internal.createSingleSelectFilter as (type: string, group: string) => HTMLElement)('DATE', 'DATE');
    const dateSelect = singleSelectWrap.querySelector<HTMLSelectElement>('select');
    expect(dateSelect?.value).toBe('2');
    if (dateSelect) {
      dateSelect.value = '-1';
      dateSelect.dispatchEvent(new Event('change'));
    }

    // Numeric-range update: crossing min/max and invalid raw values.
    const rangeWrap = (internal.createNumericRangeFilter as (type: string, bounds: { min: number; max: number }) => HTMLElement)(
      'ATTEMPTS',
      { min: 1, max: 5 }
    );
    const minInput = rangeWrap.querySelector<HTMLInputElement>('.filter-range-input-min');
    const maxInput = rangeWrap.querySelector<HTMLInputElement>('.filter-range-input-max');
    const rangeValue = rangeWrap.querySelector<HTMLElement>('.filter-range-value');
    expect(minInput && maxInput && rangeValue).toBeTruthy();
    if (minInput && maxInput && rangeValue) {
      minInput.value = '5';
      maxInput.value = '2';
      minInput.dispatchEvent(new Event('input'));
      expect(rangeValue.textContent).toBe('5');

      minInput.value = '4';
      maxInput.value = '1';
      maxInput.dispatchEvent(new Event('input'));
      expect(rangeValue.textContent).toBe('1');

      minInput.value = 'foo';
      maxInput.value = 'bar';
      minInput.dispatchEvent(new Event('input'));
    }

    // Time toggle removing final selected index.
    internal.activeFilters = { TIME: [1] };
    (internal.toggleTimeFilterIndex as (type: string, index: number, checked: boolean) => void)('TIME', 1, false);
    expect((internal.activeFilters as Record<string, number[]>).TIME).toBeUndefined();

    // Numeric range full-bounds branch removes filter.
    internal.activeFilters = { ATTEMPTS: [2, 3] };
    (internal.setNumericRangeFilterValue as (
      type: string,
      min: number,
      max: number,
      bounds: { min: number; max: number }
    ) => void)('ATTEMPTS', 1, 5, { min: 1, max: 5 });
    expect((internal.activeFilters as Record<string, number[]>).ATTEMPTS).toBeUndefined();

    // Missing filter panel guard.
    container.querySelector('.filter-panel')?.remove();
    expect(() => (internal.toggleFiltersCollapsed as () => void)()).not.toThrow();

    // Active filter counting and range normalization reverse branch.
    internal.activeFilters = { TIME: [] };
    expect((internal.getActiveFilterCount as () => number)()).toBe(0);
    expect((internal.normalizeNumericRange as (min: number, max: number, bounds: { min: number; max: number }) => [number, number])(
      5,
      2,
      { min: 1, max: 5 }
    )).toEqual([2, 5]);
    internal.activeFilters = { ATTEMPTS: [4, 2] };
    expect((internal.getNumericRangeFilterValue as (type: string, bounds: { min: number; max: number }) => [number, number])(
      'ATTEMPTS',
      { min: 1, max: 5 }
    )).toEqual([2, 4]);

    // Missing range definition branch for active-filter chips.
    internal.activeFilters = { TIME: [99] };
    (internal.updateActiveFiltersDisplay as () => void)();

    // Remove filter early-return when index is not active.
    internal.activeFilters = { TIME: [1] };
    (internal.removeFilter as (type: string, index: number) => void)('TIME', 99);

    // Sort guard + same-field sort-direction toggle.
    (internal.handleSort as (field: string | undefined) => void)(undefined);
    internal.currentSort = { field: 'word', direction: 'ascending' };
    (internal.handleSort as (field: string | undefined) => void)('word');

    // Reset visible rows branch in sorter.
    internal.visibleRows = 1;
    (internal.applyCurrentSortAndFilters as (opts?: { resetVisibleRows?: boolean }) => void)({ resetVisibleRows: true });
    expect(internal.visibleRows).toBe(20);

    manager.destroy();
  });
});
