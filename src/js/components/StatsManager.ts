import {
  ANIMATION_DURATION,
  DEFAULT_SORT,
  FILTER_RANGES,
  FILTER_TYPES,
  SORT_DIRECTIONS,
  SORT_FIELDS
} from '../constants/statConstants';
import { applyFilters, loadFilterPreferences, saveFilterPreferences } from '../utils/filterUtils';
import { getNextSortDirection, getSortIndicatorClass, sortStats } from '../utils/sortUtils';
import type { ActiveFilters, IndexedStatEntry, SortState } from '../types/interface';
import type { FilterType, SortField } from '../types/types';

const INITIAL_VISIBLE_ROWS = 20;
const LOAD_MORE_BATCH_SIZE = 10;

const SORT_FIELD_VALUES = Object.values(SORT_FIELDS) as SortField[];

type FilterGroupKey = keyof typeof FILTER_TYPES;

interface HeaderConfig {
  field: SortField;
  label: string;
}

interface ApplyDisplayOptions {
  resetVisibleRows?: boolean;
}

function isSortField(value: string): value is SortField {
  return SORT_FIELD_VALUES.includes(value as SortField);
}

export class StatsManager {
  private readonly container: HTMLElement;
  private readonly originalStats: IndexedStatEntry[];
  private displayedStats: IndexedStatEntry[];
  private visibleRows: number;
  private loadMoreButton: HTMLButtonElement | null;
  private loadMoreContainer: HTMLDivElement | null;
  private pendingRenderTimeoutId: number | null;
  private currentSort: SortState;
  private activeFilters: ActiveFilters;

  constructor(container: HTMLElement, stats: IndexedStatEntry[]) {
    this.container = container;
    this.originalStats = (stats || []).map((stat, index) => ({
      ...stat,
      __originalIndex: index
    }));
    this.displayedStats = [...this.originalStats];
    this.visibleRows = INITIAL_VISIBLE_ROWS;
    this.loadMoreButton = null;
    this.loadMoreContainer = null;
    this.pendingRenderTimeoutId = null;
    this.currentSort = { ...DEFAULT_SORT };
    this.activeFilters = loadFilterPreferences();

    this.init();
  }

  private init(): void {
    this.createStatsTable();
    this.attachEventListeners();
    this.updateFilterPanelState();
    this.updateActiveFiltersDisplay();
    this.applyCurrentSortAndFilters({ resetVisibleRows: true });
  }

  private createStatsTable(): void {
    const table = document.createElement('div');
    table.classList.add('stats-table');

    const header = this.createHeader();
    table.appendChild(header);

    const body = document.createElement('div');
    body.classList.add('stats-body');
    table.appendChild(body);

    const loadMoreContainer = document.createElement('div');
    loadMoreContainer.classList.add('stats-load-more-container');

    const loadMoreButton = document.createElement('button');
    loadMoreButton.classList.add('stats-load-more-btn');
    loadMoreButton.textContent = 'Load More';
    loadMoreButton.type = 'button';
    loadMoreButton.addEventListener('click', () => this.handleLoadMore());

    loadMoreContainer.appendChild(loadMoreButton);

    this.loadMoreContainer = loadMoreContainer;
    this.loadMoreButton = loadMoreButton;

    const filterPanel = this.createFilterPanel();

    this.container.innerHTML = '';
    this.container.appendChild(filterPanel);
    this.container.appendChild(table);
    this.container.appendChild(loadMoreContainer);
  }

  private createHeader(): HTMLDivElement {
    const header = document.createElement('div');
    header.classList.add('stats-header');

    const headers: HeaderConfig[] = [
      { field: SORT_FIELDS.SERIAL, label: 'S/N' },
      { field: SORT_FIELDS.WORD, label: 'Word' },
      { field: SORT_FIELDS.TIME, label: 'Time(s)' },
      { field: SORT_FIELDS.ATTEMPTS, label: 'Attempts' },
      { field: SORT_FIELDS.DATE, label: 'Played' }
    ];

    headers.forEach(({ field, label }) => {
      const headerCell = document.createElement('div');
      headerCell.classList.add('header-cell');
      headerCell.dataset.field = field;

      const content = document.createElement('div');
      content.classList.add('header-content');
      content.textContent = label;

      const sortIndicator = document.createElement('span');
      sortIndicator.classList.add('sort-indicator');

      if (field === this.currentSort.field) {
        sortIndicator.classList.add(getSortIndicatorClass(this.currentSort.direction));
      } else {
        sortIndicator.classList.add(getSortIndicatorClass(SORT_DIRECTIONS.DEFAULT));
      }

      headerCell.appendChild(content);
      headerCell.appendChild(sortIndicator);
      header.appendChild(headerCell);
    });

    return header;
  }

  private formatPlayedAt(dateValue: string): string {
    const parsedDate = new Date(dateValue);
    if (Number.isNaN(parsedDate.getTime())) {
      return 'Unknown';
    }

    const month = parsedDate.toLocaleString('en-US', { month: 'short' });
    const day = String(parsedDate.getDate()).padStart(2, '0');
    const year = parsedDate.getFullYear();
    const hours = String(parsedDate.getHours()).padStart(2, '0');
    const minutes = String(parsedDate.getMinutes()).padStart(2, '0');

    return `${month} ${day}, ${year} ${hours}:${minutes}`;
  }

  private createFilterPanel(): HTMLDivElement {
    const panel = document.createElement('div');
    panel.classList.add('filter-panel');

    (Object.entries(FILTER_TYPES) as Array<[FilterGroupKey, FilterType]>).forEach(([groupKey, filterType]) => {
      const section = this.createFilterSection(groupKey, filterType);
      panel.appendChild(section);
    });

    const activeFiltersDisplay = document.createElement('div');
    activeFiltersDisplay.classList.add('active-filters');
    panel.appendChild(activeFiltersDisplay);

    const clearButton = document.createElement('button');
    clearButton.classList.add('clear-filters');
    clearButton.type = 'button';
    clearButton.textContent = 'Clear All Filters';
    clearButton.disabled = Object.keys(this.activeFilters).length === 0;
    clearButton.addEventListener('click', () => this.clearAllFilters());
    panel.appendChild(clearButton);

    return panel;
  }

  private createFilterSection(groupKey: FilterGroupKey, filterType: FilterType): HTMLDivElement {
    const section = document.createElement('div');
    section.classList.add('filter-section');
    section.dataset.filterType = filterType;

    const title = document.createElement('h3');
    title.textContent = this.getFilterTitle(groupKey);
    section.appendChild(title);

    const chipsContainer = document.createElement('div');
    chipsContainer.classList.add('filter-chips');

    FILTER_RANGES[filterType].forEach((range, index) => {
      const chip = document.createElement('div');
      chip.classList.add('filter-chip');
      chip.textContent = range.label;

      if (this.activeFilters[filterType]?.includes(index)) {
        chip.classList.add('active');
      }

      chip.addEventListener('click', () => this.toggleFilter(filterType, index, chip));
      chipsContainer.appendChild(chip);
    });

    section.appendChild(chipsContainer);
    return section;
  }

  private getFilterTitle(type: FilterGroupKey): string {
    switch (type) {
    case 'WORD_LENGTH':
      return 'Word Length';
    case 'TIME':
      return 'Time Taken';
    case 'ATTEMPTS':
      return 'Number of Attempts';
    default:
      return type;
    }
  }

  private toggleFilter(filterType: FilterType, rangeIndex: number, chipElement: Element | null = null): void {
    if (!this.activeFilters[filterType]) {
      this.activeFilters[filterType] = [];
    }

    const selected = this.activeFilters[filterType] ?? [];
    const index = selected.indexOf(rangeIndex);

    if (index === -1) {
      selected.push(rangeIndex);
      this.activeFilters[filterType] = selected;
      if (chipElement) {
        chipElement.classList.add('adding');
        window.setTimeout(() => chipElement.classList.add('active'), 150);
        window.setTimeout(() => chipElement.classList.remove('adding'), 300);
      }
    } else {
      if (chipElement) {
        chipElement.classList.add('removing');
        window.setTimeout(() => {
          chipElement.classList.remove('active');
          chipElement.classList.remove('removing');
        }, 150);
      }

      selected.splice(index, 1);

      if (selected.length === 0) {
        delete this.activeFilters[filterType];
      } else {
        this.activeFilters[filterType] = selected;
      }
    }

    this.updateFilterPanelState();
    saveFilterPreferences(this.activeFilters);
    this.updateActiveFiltersDisplay();
    this.applyCurrentSortAndFilters({ resetVisibleRows: true });
  }

  private updateFilterPanelState(): void {
    const filterPanel = this.container.querySelector<HTMLElement>('.filter-panel');
    const clearButton = this.container.querySelector<HTMLButtonElement>('.clear-filters');

    if (!filterPanel || !clearButton) {
      return;
    }

    const hasActiveFilters = Object.keys(this.activeFilters).length > 0;
    clearButton.disabled = !hasActiveFilters;

    if (hasActiveFilters) {
      filterPanel.classList.add('has-active-filters');
    } else {
      filterPanel.classList.remove('has-active-filters');
    }
  }

  private clearAllFilters(): void {
    this.activeFilters = {};
    saveFilterPreferences(this.activeFilters);

    const chips = this.container.querySelectorAll<HTMLElement>('.filter-chip');
    chips.forEach((chip, index) => {
      window.setTimeout(() => {
        chip.classList.add('removing');
        window.setTimeout(() => {
          chip.classList.remove('active', 'removing');
        }, 150);
      }, index * 50);
    });

    this.updateFilterPanelState();
    this.updateActiveFiltersDisplay();
    this.applyCurrentSortAndFilters({ resetVisibleRows: true });
  }

  private updateActiveFiltersDisplay(): void {
    const display = this.container.querySelector<HTMLElement>('.active-filters');
    if (!display) {
      return;
    }

    display.innerHTML = '';

    (Object.entries(this.activeFilters) as Array<[FilterType, number[]]>).forEach(([filterType, indices]) => {
      const title = this.getFilterTitle(filterType as FilterGroupKey);
      indices.forEach((index, filterIndex) => {
        const range = FILTER_RANGES[filterType][index];
        if (!range) {
          return;
        }

        const filter = document.createElement('div');
        filter.classList.add('active-filter');
        filter.style.animation = `activeFilterIn ${ANIMATION_DURATION}ms ease forwards`;
        filter.style.animationDelay = `${filterIndex * 100}ms`;

        const label = document.createElement('span');
        label.textContent = `${title}: ${range.label}`;

        const removeButton = document.createElement('span');
        removeButton.classList.add('remove-filter');
        removeButton.setAttribute('data-filter-type', filterType);
        removeButton.setAttribute('data-filter-index', String(index));
        removeButton.setAttribute('aria-label', `Remove ${title} filter: ${range.label}`);
        removeButton.addEventListener('click', () => {
          this.removeFilter(filterType, index);
        });

        filter.appendChild(label);
        filter.appendChild(removeButton);
        display.appendChild(filter);
      });
    });
  }

  private removeFilter(filterType: FilterType, rangeIndex: number): void {
    const section = this.container.querySelector<HTMLElement>(`.filter-section[data-filter-type="${filterType}"]`);
    const chips = section?.querySelectorAll<HTMLElement>('.filter-chip');
    const chip = chips?.[rangeIndex] ?? null;

    this.toggleFilter(filterType, rangeIndex, chip);
  }

  private attachEventListeners(): void {
    const headers = this.container.querySelectorAll<HTMLElement>('.header-cell');
    headers.forEach((header) => {
      header.addEventListener('click', () => this.handleSort(header.dataset.field));
    });
  }

  private handleSort(field: string | undefined): void {
    if (!field || !isSortField(field)) {
      return;
    }

    if (field === this.currentSort.field) {
      this.currentSort.direction = getNextSortDirection(this.currentSort.direction);
    } else {
      this.currentSort = {
        field,
        direction: SORT_DIRECTIONS.ASC
      };
    }

    this.applyCurrentSortAndFilters({ resetVisibleRows: true });
  }

  private applyCurrentSortAndFilters({ resetVisibleRows = false }: ApplyDisplayOptions = {}): void {
    if (resetVisibleRows) {
      this.visibleRows = INITIAL_VISIBLE_ROWS;
    }

    const filteredStats = applyFilters(this.originalStats, this.activeFilters);
    this.displayedStats = sortStats(filteredStats, this.currentSort.field, this.currentSort.direction);

    this.updateDisplay();
  }

  private handleLoadMore(): void {
    if (this.visibleRows >= this.displayedStats.length) {
      return;
    }

    this.visibleRows = Math.min(this.visibleRows + LOAD_MORE_BATCH_SIZE, this.displayedStats.length);
    this.updateDisplay();
  }

  private updateLoadMoreState(): void {
    if (!this.loadMoreContainer || !this.loadMoreButton) {
      return;
    }

    const remainingRows = Math.max(0, this.displayedStats.length - this.visibleRows);
    const hasMoreRows = remainingRows > 0;
    const nextBatchSize = Math.min(LOAD_MORE_BATCH_SIZE, remainingRows);

    if (hasMoreRows) {
      this.loadMoreButton.textContent = `Load ${nextBatchSize} More`;
      this.loadMoreButton.setAttribute(
        'aria-label',
        `Load ${nextBatchSize} more rows. ${remainingRows} rows remaining in total`
      );
    }

    this.loadMoreContainer.style.display = hasMoreRows ? 'flex' : 'none';
    this.loadMoreButton.style.display = hasMoreRows ? 'inline-flex' : 'none';
  }

  private updateDisplay(): void {
    const body = this.container.querySelector<HTMLElement>('.stats-body');
    if (!body) {
      return;
    }

    const fragment = document.createDocumentFragment();

    if (this.pendingRenderTimeoutId !== null) {
      clearTimeout(this.pendingRenderTimeoutId);
      this.pendingRenderTimeoutId = null;
    }

    const headers = this.container.querySelectorAll<HTMLElement>('.header-cell');
    headers.forEach((header) => {
      const indicator = header.querySelector<HTMLElement>('.sort-indicator');
      const field = header.dataset.field;
      if (!indicator || !field || !isSortField(field)) {
        return;
      }

      indicator.className = `sort-indicator ${
        field === this.currentSort.field
          ? getSortIndicatorClass(this.currentSort.direction)
          : getSortIndicatorClass(SORT_DIRECTIONS.DEFAULT)
      }`;
    });

    const rowsToRender = this.displayedStats.slice(0, this.visibleRows);
    rowsToRender.forEach((stat, index) => {
      const row = document.createElement('div');
      row.classList.add('stat-row');
      row.style.animationDelay = `${index * 50}ms`;

      const cells = [
        { content: String(index + 1) },
        { content: stat.word },
        { content: String(stat.time) },
        { content: String(stat.attempts) },
        { content: this.formatPlayedAt(stat.date) }
      ];

      cells.forEach(({ content }) => {
        const cell = document.createElement('div');
        cell.classList.add('stat-cell');
        cell.textContent = content;
        cell.title = content;
        row.appendChild(cell);
      });

      fragment.appendChild(row);
    });

    body.style.opacity = '0';
    this.pendingRenderTimeoutId = window.setTimeout(() => {
      body.innerHTML = '';
      body.appendChild(fragment);
      body.style.opacity = '1';
      this.pendingRenderTimeoutId = null;
    }, ANIMATION_DURATION / 2);

    this.updateLoadMoreState();
  }
}
