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
const ROW_ANIMATION_STAGGER_MS = 35;
const WORD_LENGTH_BOUNDS = { min: 3, max: 10 } as const;
const ATTEMPTS_BOUNDS = { min: 1, max: 5 } as const;

const SORT_FIELD_VALUES = Object.values(SORT_FIELDS) as SortField[];
const FILTER_TYPE_VALUES = Object.values(FILTER_TYPES) as FilterType[];

type FilterGroupKey = keyof typeof FILTER_TYPES;

interface HeaderConfig {
  field: SortField;
  label: string;
}

interface ApplyDisplayOptions {
  resetVisibleRows?: boolean;
}

interface NumericRangeBounds {
  min: number;
  max: number;
}

function isSortField(value: string): value is SortField {
  return SORT_FIELD_VALUES.includes(value as SortField);
}

function isFilterType(value: string): value is FilterType {
  return FILTER_TYPE_VALUES.includes(value as FilterType);
}

export class StatsManager {
  private readonly container: HTMLElement;
  private readonly originalStats: IndexedStatEntry[];
  private displayedStats: IndexedStatEntry[];
  private visibleRows: number;
  private renderedRows: number;
  private loadMoreButton: HTMLButtonElement | null;
  private loadMoreContainer: HTMLDivElement | null;
  private tableBody: HTMLDivElement | null;
  private headerCells: HTMLElement[];
  private pendingRenderTimeoutId: number | null;
  private currentSort: SortState;
  private activeFilters: ActiveFilters;
  private filtersCollapsed: boolean;
  private isDestroyed: boolean;

  constructor(container: HTMLElement, stats: IndexedStatEntry[]) {
    this.container = container;
    this.originalStats = (stats || []).map((stat, index) => ({
      ...stat,
      __originalIndex: index
    }));
    this.displayedStats = [...this.originalStats];
    this.visibleRows = INITIAL_VISIBLE_ROWS;
    this.renderedRows = 0;
    this.loadMoreButton = null;
    this.loadMoreContainer = null;
    this.tableBody = null;
    this.headerCells = [];
    this.pendingRenderTimeoutId = null;
    this.currentSort = { ...DEFAULT_SORT };
    this.activeFilters = loadFilterPreferences();
    this.filtersCollapsed = true;
    this.isDestroyed = false;

    this.init();
  }

  destroy(): void {
    if (this.isDestroyed) {
      return;
    }

    this.isDestroyed = true;

    if (this.pendingRenderTimeoutId !== null) {
      clearTimeout(this.pendingRenderTimeoutId);
      this.pendingRenderTimeoutId = null;
    }

    this.loadMoreButton = null;
    this.loadMoreContainer = null;
    this.tableBody = null;
    this.headerCells = [];
    this.displayedStats = [];
    this.renderedRows = 0;
    this.container.innerHTML = '';
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
    this.tableBody = body;

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
    this.headerCells = [];

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
      this.headerCells.push(headerCell);
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
    if (this.filtersCollapsed) {
      panel.classList.add('is-collapsed');
    }

    const panelHeader = document.createElement('div');
    panelHeader.classList.add('filter-panel-header');

    const panelTitle = document.createElement('h3');
    panelTitle.classList.add('filter-panel-title');
    panelTitle.textContent = 'Filters';
    panelHeader.appendChild(panelTitle);

    const toggleButton = document.createElement('button');
    toggleButton.classList.add('filter-panel-toggle');
    toggleButton.type = 'button';
    toggleButton.addEventListener('click', () => this.toggleFiltersCollapsed());
    panelHeader.appendChild(toggleButton);

    panel.appendChild(panelHeader);

    const controls = document.createElement('div');
    controls.classList.add('filter-controls');

    (Object.entries(FILTER_TYPES) as Array<[FilterGroupKey, FilterType]>).forEach(([groupKey, filterType]) => {
      const section = this.createFilterSection(groupKey, filterType);
      controls.appendChild(section);
    });
    panel.appendChild(controls);

    const activeFiltersDisplay = document.createElement('div');
    activeFiltersDisplay.classList.add('active-filters');
    panel.appendChild(activeFiltersDisplay);

    const actions = document.createElement('div');
    actions.classList.add('filter-panel-actions');

    const summary = document.createElement('div');
    summary.classList.add('filter-panel-summary');
    actions.appendChild(summary);

    const clearButton = document.createElement('button');
    clearButton.classList.add('clear-filters');
    clearButton.type = 'button';
    clearButton.textContent = 'Clear All Filters';
    clearButton.disabled = Object.keys(this.activeFilters).length === 0;
    clearButton.addEventListener('click', () => this.clearAllFilters());
    actions.appendChild(clearButton);
    panel.appendChild(actions);

    return panel;
  }

  private createFilterSection(groupKey: FilterGroupKey, filterType: FilterType): HTMLDivElement {
    const section = document.createElement('div');
    section.classList.add('filter-section');
    section.dataset.filterType = filterType;

    const title = document.createElement('h3');
    title.textContent = this.getFilterTitle(groupKey);
    section.appendChild(title);

    if (filterType === FILTER_TYPES.TIME) {
      section.appendChild(this.createTimeMultiSelect(filterType, groupKey));
      return section;
    }

    if (filterType === FILTER_TYPES.WORD_LENGTH) {
      section.appendChild(this.createNumericRangeFilter(filterType, WORD_LENGTH_BOUNDS));
      return section;
    }

    if (filterType === FILTER_TYPES.ATTEMPTS) {
      section.appendChild(this.createNumericRangeFilter(filterType, ATTEMPTS_BOUNDS));
      return section;
    }

    section.appendChild(this.createSingleSelectFilter(filterType, groupKey));
    return section;
  }

  private createSingleSelectFilter(filterType: FilterType, groupKey: FilterGroupKey): HTMLElement {
    const selectWrap = document.createElement('div');
    selectWrap.classList.add('filter-select-wrap');

    const select = document.createElement('select');
    select.classList.add('filter-select');
    select.dataset.filterType = filterType;
    select.setAttribute('aria-label', `Filter by ${this.getFilterTitle(groupKey)}`);

    const anyOption = document.createElement('option');
    anyOption.value = '-1';
    anyOption.textContent = `Any ${this.getFilterTitle(groupKey)}`;
    select.appendChild(anyOption);

    FILTER_RANGES[filterType].forEach((range, index) => {
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent = range.label;
      select.appendChild(option);
    });

    const initialSelection = this.activeFilters[filterType]?.[0];
    select.value = typeof initialSelection === 'number' ? String(initialSelection) : '-1';
    select.addEventListener('change', () => {
      const selectedValue = Number.parseInt(select.value, 10);
      this.setSingleSelectFilterValue(
        filterType,
        Number.isInteger(selectedValue) && selectedValue >= 0 ? selectedValue : null
      );
    });

    selectWrap.appendChild(select);
    return selectWrap;
  }

  private createTimeMultiSelect(filterType: FilterType, groupKey: FilterGroupKey): HTMLElement {
    const multiSelect = document.createElement('div');
    multiSelect.classList.add('filter-multi-select');
    multiSelect.setAttribute('aria-label', `Filter by ${this.getFilterTitle(groupKey)}`);

    const selectedIndices = this.activeFilters[filterType] ?? [];

    FILTER_RANGES[filterType].forEach((range, index) => {
      const optionLabel = document.createElement('label');
      optionLabel.classList.add('filter-multi-option');

      const checkbox = document.createElement('input');
      checkbox.classList.add('filter-multi-checkbox');
      checkbox.type = 'checkbox';
      checkbox.dataset.filterType = filterType;
      checkbox.dataset.filterIndex = String(index);
      checkbox.checked = selectedIndices.includes(index);
      checkbox.addEventListener('change', () => {
        this.toggleTimeFilterIndex(filterType, index, checkbox.checked);
      });

      const text = document.createElement('span');
      text.textContent = range.label;

      optionLabel.appendChild(checkbox);
      optionLabel.appendChild(text);
      multiSelect.appendChild(optionLabel);
    });

    return multiSelect;
  }

  private createNumericRangeFilter(filterType: FilterType, bounds: NumericRangeBounds): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.classList.add('filter-range-wrap');

    const currentRange = this.getNumericRangeFilterValue(filterType, bounds);

    const valueDisplay = document.createElement('div');
    valueDisplay.classList.add('filter-range-value');
    valueDisplay.dataset.filterType = filterType;

    const minInput = document.createElement('input');
    minInput.classList.add('filter-range-input', 'filter-range-input-min');
    minInput.type = 'range';
    minInput.dataset.filterType = filterType;
    minInput.dataset.rangeRole = 'min';
    minInput.min = String(bounds.min);
    minInput.max = String(bounds.max);
    minInput.step = '1';
    minInput.value = String(currentRange[0]);

    const maxInput = document.createElement('input');
    maxInput.classList.add('filter-range-input', 'filter-range-input-max');
    maxInput.type = 'range';
    maxInput.dataset.filterType = filterType;
    maxInput.dataset.rangeRole = 'max';
    maxInput.min = String(bounds.min);
    maxInput.max = String(bounds.max);
    maxInput.step = '1';
    maxInput.value = String(currentRange[1]);

    const updateRange = (role: 'min' | 'max'): void => {
      const rawMin = Number.parseInt(minInput.value, 10);
      const rawMax = Number.parseInt(maxInput.value, 10);

      let nextMin = Number.isInteger(rawMin) ? rawMin : bounds.min;
      let nextMax = Number.isInteger(rawMax) ? rawMax : bounds.max;

      if (role === 'min' && nextMin > nextMax) {
        nextMax = nextMin;
      }

      if (role === 'max' && nextMax < nextMin) {
        nextMin = nextMax;
      }

      const [sanitizedMin, sanitizedMax] = this.normalizeNumericRange(nextMin, nextMax, bounds);
      minInput.value = String(sanitizedMin);
      maxInput.value = String(sanitizedMax);
      valueDisplay.textContent = sanitizedMin === sanitizedMax ? String(sanitizedMin) : `${sanitizedMin} - ${sanitizedMax}`;
      this.setNumericRangeFilterValue(filterType, sanitizedMin, sanitizedMax, bounds);
    };

    minInput.addEventListener('input', () => updateRange('min'));
    maxInput.addEventListener('input', () => updateRange('max'));

    valueDisplay.textContent = currentRange[0] === currentRange[1]
      ? String(currentRange[0])
      : `${currentRange[0]} - ${currentRange[1]}`;

    const inputs = document.createElement('div');
    inputs.classList.add('filter-range-inputs');
    inputs.appendChild(minInput);
    inputs.appendChild(maxInput);

    wrapper.appendChild(valueDisplay);
    wrapper.appendChild(inputs);
    return wrapper;
  }

  private getFilterTitle(type: FilterGroupKey): string {
    switch (type) {
    case 'WORD_LENGTH':
      return 'Word Length';
    case 'TIME':
      return 'Time Taken';
    case 'ATTEMPTS':
      return 'Number of Attempts';
    case 'DATE':
      return 'Date Played';
    default:
      return type;
    }
  }

  private setSingleSelectFilterValue(filterType: FilterType, rangeIndex: number | null): void {
    if (this.isDestroyed) {
      return;
    }

    if (rangeIndex === null) {
      delete this.activeFilters[filterType];
    } else {
      this.activeFilters[filterType] = [rangeIndex];
    }

    this.syncFilterControlValues();
    this.updateFilterPanelState();
    saveFilterPreferences(this.activeFilters);
    this.updateActiveFiltersDisplay();
    this.applyCurrentSortAndFilters({ resetVisibleRows: true });
  }

  private toggleTimeFilterIndex(filterType: FilterType, index: number, checked: boolean): void {
    if (this.isDestroyed) {
      return;
    }

    const selected = [...(this.activeFilters[filterType] ?? [])];
    const existingIndex = selected.indexOf(index);

    if (checked && existingIndex === -1) {
      selected.push(index);
    }

    if (!checked && existingIndex !== -1) {
      selected.splice(existingIndex, 1);
    }

    if (selected.length === 0) {
      delete this.activeFilters[filterType];
    } else {
      this.activeFilters[filterType] = selected;
    }

    this.syncFilterControlValues();
    this.updateFilterPanelState();
    saveFilterPreferences(this.activeFilters);
    this.updateActiveFiltersDisplay();
    this.applyCurrentSortAndFilters({ resetVisibleRows: true });
  }

  private setNumericRangeFilterValue(
    filterType: FilterType,
    minValue: number,
    maxValue: number,
    bounds: NumericRangeBounds
  ): void {
    if (this.isDestroyed) {
      return;
    }

    const [minRange, maxRange] = this.normalizeNumericRange(minValue, maxValue, bounds);
    const isFullRange = minRange === bounds.min && maxRange === bounds.max;

    if (isFullRange) {
      delete this.activeFilters[filterType];
    } else {
      this.activeFilters[filterType] = [minRange, maxRange];
    }

    this.syncFilterControlValues();
    this.updateFilterPanelState();
    saveFilterPreferences(this.activeFilters);
    this.updateActiveFiltersDisplay();
    this.applyCurrentSortAndFilters({ resetVisibleRows: true });
  }

  private toggleFiltersCollapsed(): void {
    const filterPanel = this.container.querySelector<HTMLElement>('.filter-panel');
    if (!filterPanel) {
      return;
    }

    this.filtersCollapsed = !this.filtersCollapsed;
    filterPanel.classList.toggle('is-collapsed', this.filtersCollapsed);
    this.updateFilterPanelState();
  }

  private getActiveFilterCount(): number {
    return (Object.entries(this.activeFilters) as Array<[FilterType, number[]]>).reduce((count, [filterType, indices]) => {
      if (!Array.isArray(indices) || indices.length === 0) {
        return count;
      }

      if (
        filterType === FILTER_TYPES.DATE ||
        filterType === FILTER_TYPES.WORD_LENGTH ||
        filterType === FILTER_TYPES.ATTEMPTS
      ) {
        return count + 1;
      }

      return count + indices.length;
    }, 0);
  }

  private syncFilterControlValues(): void {
    const selects = this.container.querySelectorAll<HTMLSelectElement>('.filter-select');
    selects.forEach((select) => {
      const typeValue = select.dataset.filterType;
      if (!typeValue || !isFilterType(typeValue)) {
        return;
      }

      const selectedRange = this.activeFilters[typeValue]?.[0];
      select.value = typeof selectedRange === 'number' ? String(selectedRange) : '-1';
    });

    const checkboxes = this.container.querySelectorAll<HTMLInputElement>('.filter-multi-checkbox');
    checkboxes.forEach((checkbox) => {
      const typeValue = checkbox.dataset.filterType;
      const indexValue = Number.parseInt(checkbox.dataset.filterIndex ?? '', 10);
      if (!typeValue || !isFilterType(typeValue) || !Number.isInteger(indexValue)) {
        return;
      }

      checkbox.checked = Boolean(this.activeFilters[typeValue]?.includes(indexValue));
    });

    this.syncRangeFilterControls(FILTER_TYPES.WORD_LENGTH, WORD_LENGTH_BOUNDS);
    this.syncRangeFilterControls(FILTER_TYPES.ATTEMPTS, ATTEMPTS_BOUNDS);
  }

  private syncRangeFilterControls(filterType: FilterType, bounds: NumericRangeBounds): void {
    const section = this.container.querySelector<HTMLElement>(`.filter-section[data-filter-type="${filterType}"]`);
    if (!section) {
      return;
    }

    const minInput = section.querySelector<HTMLInputElement>('.filter-range-input-min');
    const maxInput = section.querySelector<HTMLInputElement>('.filter-range-input-max');
    const valueDisplay = section.querySelector<HTMLElement>('.filter-range-value');
    if (!minInput || !maxInput || !valueDisplay) {
      return;
    }

    const [rangeMin, rangeMax] = this.getNumericRangeFilterValue(filterType, bounds);
    minInput.value = String(rangeMin);
    maxInput.value = String(rangeMax);
    valueDisplay.textContent = rangeMin === rangeMax ? String(rangeMin) : `${rangeMin} - ${rangeMax}`;
  }

  private getNumericRangeFilterValue(filterType: FilterType, bounds: NumericRangeBounds): [number, number] {
    const selected = this.activeFilters[filterType];
    if (!selected || selected.length !== 2) {
      return [bounds.min, bounds.max];
    }

    return this.normalizeNumericRange(selected[0] ?? bounds.min, selected[1] ?? bounds.max, bounds);
  }

  private normalizeNumericRange(
    minValue: number,
    maxValue: number,
    bounds: NumericRangeBounds
  ): [number, number] {
    const safeMinValue = Number.isFinite(minValue) ? minValue : bounds.min;
    const safeMaxValue = Number.isFinite(maxValue) ? maxValue : bounds.max;
    const normalizedMin = Math.max(bounds.min, Math.min(bounds.max, Math.floor(safeMinValue)));
    const normalizedMax = Math.max(bounds.min, Math.min(bounds.max, Math.floor(safeMaxValue)));
    return normalizedMin <= normalizedMax
      ? [normalizedMin, normalizedMax]
      : [normalizedMax, normalizedMin];
  }

  private updateFilterPanelState(): void {
    const filterPanel = this.container.querySelector<HTMLElement>('.filter-panel');
    const toggleButton = this.container.querySelector<HTMLButtonElement>('.filter-panel-toggle');
    const summary = this.container.querySelector<HTMLElement>('.filter-panel-summary');
    const clearButton = this.container.querySelector<HTMLButtonElement>('.clear-filters');

    if (!filterPanel || !clearButton || !toggleButton || !summary) {
      return;
    }

    const hasActiveFilters = Object.keys(this.activeFilters).length > 0;
    const activeFilterCount = this.getActiveFilterCount();
    clearButton.disabled = !hasActiveFilters;
    summary.textContent = hasActiveFilters
      ? `${activeFilterCount} filter${activeFilterCount === 1 ? '' : 's'} active`
      : 'No filters applied';
    toggleButton.textContent = this.filtersCollapsed ? 'Show Filters' : 'Hide Filters';
    toggleButton.setAttribute('aria-expanded', String(!this.filtersCollapsed));

    if (hasActiveFilters) {
      filterPanel.classList.add('has-active-filters');
    } else {
      filterPanel.classList.remove('has-active-filters');
    }
  }

  private clearAllFilters(): void {
    if (this.isDestroyed) {
      return;
    }

    this.activeFilters = {};
    saveFilterPreferences(this.activeFilters);
    this.syncFilterControlValues();
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
      const isNumericRangeFilter = filterType === FILTER_TYPES.WORD_LENGTH || filterType === FILTER_TYPES.ATTEMPTS;

      if (isNumericRangeFilter && indices.length === 2) {
        const bounds = filterType === FILTER_TYPES.WORD_LENGTH ? WORD_LENGTH_BOUNDS : ATTEMPTS_BOUNDS;
        const [rangeMin, rangeMax] = this.normalizeNumericRange(indices[0], indices[1], bounds);
        const filter = document.createElement('div');
        filter.classList.add('active-filter');
        filter.style.animation = `activeFilterIn ${ANIMATION_DURATION}ms ease forwards`;

        const label = document.createElement('span');
        label.textContent = `${title}: ${rangeMin === rangeMax ? String(rangeMin) : `${rangeMin}-${rangeMax}`}`;

        const removeButton = document.createElement('span');
        removeButton.classList.add('remove-filter');
        removeButton.setAttribute('data-filter-type', filterType);
        removeButton.setAttribute('data-filter-index', '-1');
        removeButton.setAttribute('aria-label', `Remove ${title} filter`);
        removeButton.addEventListener('click', () => {
          this.removeFilter(filterType, -1);
        });

        filter.appendChild(label);
        filter.appendChild(removeButton);
        display.appendChild(filter);
        return;
      }

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
    if (this.isDestroyed) {
      return;
    }

    if (rangeIndex === -1 || filterType === FILTER_TYPES.DATE) {
      delete this.activeFilters[filterType];
      this.syncFilterControlValues();
      this.updateFilterPanelState();
      saveFilterPreferences(this.activeFilters);
      this.updateActiveFiltersDisplay();
      this.applyCurrentSortAndFilters({ resetVisibleRows: true });
      return;
    }

    const selected = this.activeFilters[filterType] ?? [];
    if (!selected.includes(rangeIndex)) {
      return;
    }

    if (filterType === FILTER_TYPES.TIME) {
      this.toggleTimeFilterIndex(filterType, rangeIndex, false);
      return;
    }

    delete this.activeFilters[filterType];
    this.syncFilterControlValues();
    this.updateFilterPanelState();
    saveFilterPreferences(this.activeFilters);
    this.updateActiveFiltersDisplay();
    this.applyCurrentSortAndFilters({ resetVisibleRows: true });
  }

  private attachEventListeners(): void {
    this.headerCells.forEach((header) => {
      header.addEventListener('click', () => this.handleSort(header.dataset.field));
    });
  }

  private handleSort(field: string | undefined): void {
    if (this.isDestroyed) {
      return;
    }

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

    this.updateDisplay({ forceFullRerender: true });
  }

  private handleLoadMore(): void {
    if (this.isDestroyed) {
      return;
    }

    if (this.pendingRenderTimeoutId !== null) {
      return;
    }

    if (this.visibleRows >= this.displayedStats.length) {
      return;
    }

    this.visibleRows = Math.min(this.visibleRows + LOAD_MORE_BATCH_SIZE, this.displayedStats.length);
    this.updateDisplay({ forceFullRerender: false });
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

  private updateSortIndicators(): void {
    this.headerCells.forEach((header) => {
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
  }

  private createStatRow(stat: IndexedStatEntry, index: number, animationOrder: number): HTMLDivElement {
    const row = document.createElement('div');
    row.classList.add('stat-row');
    row.style.animationDelay = `${animationOrder * ROW_ANIMATION_STAGGER_MS}ms`;

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

    return row;
  }

  private buildRowsFragment(
    fromIndex: number,
    toIndexExclusive: number,
    animationStart = 0
  ): DocumentFragment {
    const fragment = document.createDocumentFragment();

    for (let index = fromIndex; index < toIndexExclusive; index++) {
      const stat = this.displayedStats[index];
      if (!stat) {
        continue;
      }

      const animationOrder = animationStart + (index - fromIndex);
      fragment.appendChild(this.createStatRow(stat, index, animationOrder));
    }

    return fragment;
  }

  private replaceRowsWithAnimation(rowsFragment: DocumentFragment, nextVisibleRows: number): void {
    if (!this.tableBody) {
      return;
    }

    if (this.pendingRenderTimeoutId !== null) {
      clearTimeout(this.pendingRenderTimeoutId);
      this.pendingRenderTimeoutId = null;
    }

    this.tableBody.style.opacity = '0';
    this.pendingRenderTimeoutId = window.setTimeout(() => {
      if (this.isDestroyed || !this.tableBody) {
        return;
      }

      this.tableBody.innerHTML = '';
      this.tableBody.appendChild(rowsFragment);
      this.tableBody.style.opacity = '1';
      this.renderedRows = nextVisibleRows;
      this.pendingRenderTimeoutId = null;
    }, ANIMATION_DURATION / 2);
  }

  private appendRows(fromIndex: number, toIndexExclusive: number): void {
    if (!this.tableBody || toIndexExclusive <= fromIndex) {
      return;
    }

    this.tableBody.appendChild(this.buildRowsFragment(fromIndex, toIndexExclusive, 0));
    this.tableBody.style.opacity = '1';
    this.renderedRows = toIndexExclusive;
  }

  private updateDisplay({ forceFullRerender }: { forceFullRerender: boolean }): void {
    if (this.isDestroyed) {
      return;
    }

    if (!this.tableBody) {
      return;
    }

    this.updateSortIndicators();
    const nextVisibleRows = Math.min(this.visibleRows, this.displayedStats.length);
    const requiresFullRerender = forceFullRerender || nextVisibleRows < this.renderedRows;

    if (requiresFullRerender) {
      this.replaceRowsWithAnimation(this.buildRowsFragment(0, nextVisibleRows), nextVisibleRows);
      this.updateLoadMoreState();
      return;
    }

    this.appendRows(this.renderedRows, nextVisibleRows);

    this.updateLoadMoreState();
  }
}
