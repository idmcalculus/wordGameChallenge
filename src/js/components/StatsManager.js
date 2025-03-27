import { SORT_DIRECTIONS, SORT_FIELDS, DEFAULT_SORT, ANIMATION_DURATION, FILTER_TYPES, FILTER_RANGES } from '../constants/statConstants.js';
import { sortStats, getNextSortDirection, getSortIndicatorClass } from '../utils/sortUtils.js';
import { applyFilters, getAvailableFilters, saveFilterPreferences, loadFilterPreferences } from '../utils/filterUtils.js';

export class StatsManager {
  constructor(container, stats) {
    this.container = container;
    this.originalStats = stats;
    this.displayedStats = [...stats];
    this.currentSort = { ...DEFAULT_SORT };
    this.activeFilters = loadFilterPreferences();
    this.availableFilters = getAvailableFilters(stats);
    
    this.init();
  }

  init() {
    this.createStatsTable();
    this.attachEventListeners();
    this.applyCurrentSortAndFilters();
  }

  createStatsTable() {
    // Create table structure
    const table = document.createElement('div');
    table.classList.add('stats-table');

    // Create header
    const header = this.createHeader();
    table.appendChild(header);

    // Create body
    const body = document.createElement('div');
    body.classList.add('stats-body');
    table.appendChild(body);

    // Create filter panel
    const filterPanel = this.createFilterPanel();
    
    // Add to container
    this.container.innerHTML = '';
    this.container.appendChild(filterPanel);
    this.container.appendChild(table);
  }

  createHeader() {
    const header = document.createElement('div');
    header.classList.add('stats-header');

    const headers = [
      { field: SORT_FIELDS.SERIAL, label: 'S/N' },
      { field: SORT_FIELDS.WORD, label: 'Word' },
      { field: SORT_FIELDS.TIME, label: 'Time(s)' },
      { field: SORT_FIELDS.ATTEMPTS, label: 'Attempts' }
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

  createFilterPanel() {
    const panel = document.createElement('div');
    panel.classList.add('filter-panel');

    // Create sections for each filter type
    Object.entries(FILTER_TYPES).forEach(([type, value]) => {
      const section = this.createFilterSection(type, value);
      panel.appendChild(section);
    });

    // Create active filters display
    const activeFiltersDisplay = document.createElement('div');
    activeFiltersDisplay.classList.add('active-filters');
    panel.appendChild(activeFiltersDisplay);

    // Create clear filters button
    const clearButton = document.createElement('button');
    clearButton.classList.add('clear-filters');
    clearButton.textContent = 'Clear All Filters';
    clearButton.disabled = Object.keys(this.activeFilters).length === 0;
    clearButton.addEventListener('click', () => this.clearAllFilters());
    panel.appendChild(clearButton);

    return panel;
  }

  createFilterSection(type, value) {
    const section = document.createElement('div');
    section.classList.add('filter-section');

    const title = document.createElement('h3');
    title.textContent = this.getFilterTitle(type);
    section.appendChild(title);

    const chipsContainer = document.createElement('div');
    chipsContainer.classList.add('filter-chips');

    FILTER_RANGES[value].forEach((range, index) => {
      const chip = document.createElement('div');
      chip.classList.add('filter-chip');
      chip.textContent = range.label;
      
      // Check if this filter is active
      if (this.activeFilters[value]?.includes(index)) {
        chip.classList.add('active');
      }

      chip.addEventListener('click', () => this.toggleFilter(value, index, chip));
      chipsContainer.appendChild(chip);
    });

    section.appendChild(chipsContainer);
    return section;
  }

  getFilterTitle(type) {
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

  toggleFilter(filterType, rangeIndex, chipElement) {
    // Initialize filter type array if it doesn't exist
    if (!this.activeFilters[filterType]) {
      this.activeFilters[filterType] = [];
    }

    const index = this.activeFilters[filterType].indexOf(rangeIndex);
    if (index === -1) {
      // Add filter
      this.activeFilters[filterType].push(rangeIndex);
      chipElement.classList.add('active');
    } else {
      // Remove filter
      this.activeFilters[filterType].splice(index, 1);
      chipElement.classList.remove('active');
      
      // Remove empty filter type
      if (this.activeFilters[filterType].length === 0) {
        delete this.activeFilters[filterType];
      }
    }

    // Update clear button state
    const clearButton = this.container.querySelector('.clear-filters');
    clearButton.disabled = Object.keys(this.activeFilters).length === 0;

    // Save preferences
    saveFilterPreferences(this.activeFilters);

    // Update display
    this.updateActiveFiltersDisplay();
    this.applyCurrentSortAndFilters();
  }

  clearAllFilters() {
    this.activeFilters = {};
    saveFilterPreferences(this.activeFilters);

    // Reset all chips
    const chips = this.container.querySelectorAll('.filter-chip');
    chips.forEach(chip => chip.classList.remove('active'));

    // Disable clear button
    const clearButton = this.container.querySelector('.clear-filters');
    clearButton.disabled = true;

    // Update display
    this.updateActiveFiltersDisplay();
    this.applyCurrentSortAndFilters();
  }

  updateActiveFiltersDisplay() {
    const display = this.container.querySelector('.active-filters');
    display.innerHTML = '';

    Object.entries(this.activeFilters).forEach(([type, indices]) => {
      indices.forEach(index => {
        const range = FILTER_RANGES[type][index];
        const filter = document.createElement('div');
        filter.classList.add('active-filter');
        
        const label = document.createElement('span');
        label.textContent = `${this.getFilterTitle(type)}: ${range.label}`;
        
        const removeButton = document.createElement('span');
        removeButton.classList.add('remove-filter');
        removeButton.addEventListener('click', () => {
          const chip = this.container.querySelector(`.filter-chip:nth-child(${index + 1})`);
          this.toggleFilter(type, index, chip);
        });

        filter.appendChild(label);
        filter.appendChild(removeButton);
        display.appendChild(filter);
      });
    });
  }

  attachEventListeners() {
    // Attach sort listeners to headers
    const headers = this.container.querySelectorAll('.header-cell');
    headers.forEach(header => {
      header.addEventListener('click', () => this.handleSort(header.dataset.field));
    });

    // Filter listeners will be added here
  }

  handleSort(field) {
    if (field === this.currentSort.field) {
      this.currentSort.direction = getNextSortDirection(this.currentSort.direction);
    } else {
      this.currentSort = {
        field,
        direction: SORT_DIRECTIONS.ASC
      };
    }

    this.applyCurrentSortAndFilters();
  }

  applyCurrentSortAndFilters() {
    // First apply filters
    let filteredStats = applyFilters(this.originalStats, this.activeFilters);
    
    // Then apply sorting
    this.displayedStats = sortStats(filteredStats, this.currentSort.field, this.currentSort.direction);
    
    // Update the display
    this.updateDisplay();
  }

  updateDisplay() {
    const body = this.container.querySelector('.stats-body');
    const fragment = document.createDocumentFragment();

    // Update headers
    const headers = this.container.querySelectorAll('.header-cell');
    headers.forEach(header => {
      const indicator = header.querySelector('.sort-indicator');
      const field = header.dataset.field;
      
      indicator.className = 'sort-indicator ' + (
        field === this.currentSort.field
          ? getSortIndicatorClass(this.currentSort.direction)
          : getSortIndicatorClass(SORT_DIRECTIONS.DEFAULT)
      );
    });

    // Update rows with animation
    this.displayedStats.forEach((stat, index) => {
      const row = document.createElement('div');
      row.classList.add('stat-row');
      row.style.animationDelay = `${index * 50}ms`;

      const cells = [
        { content: (index + 1).toString() },
        { content: stat.word },
        { content: stat.time.toString() },
        { content: stat.attempts.toString() }
      ];

      cells.forEach(({ content }) => {
        const cell = document.createElement('div');
        cell.classList.add('stat-cell');
        cell.textContent = content;
        row.appendChild(cell);
      });

      fragment.appendChild(row);
    });

    // Replace body content with animation
    body.style.opacity = '0';
    setTimeout(() => {
      body.innerHTML = '';
      body.appendChild(fragment);
      body.style.opacity = '1';
    }, ANIMATION_DURATION / 2);
  }
} 