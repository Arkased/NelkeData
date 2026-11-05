export {};

const toolbar = document.querySelector<HTMLElement>('[data-filters]');
const grid = document.querySelector<HTMLElement>('[data-grid]');

/**
 * Reads the selected values of each filter group from the query of the URL; a value that no toggle has is dropped.
 * @param groups - the filter groups by query parameter
 * @returns the selected values by query parameter
 */
function readSelection(groups: Map<string, HTMLElement>): Map<string, Set<string>> {
  const params = new URLSearchParams(location.search);
  const selection = new Map<string, Set<string>>();
  for (const [param, group] of groups) {
    const known = new Set([...group.querySelectorAll<HTMLElement>('[data-value]')].map((button) => button.dataset.value ?? ''));
    const wanted = (params.get(param) ?? '').split(',').filter((value) => known.has(value));
    selection.set(param, new Set(wanted));
  }
  return selection;
}

if (toolbar && grid) {
  const groups = new Map<string, HTMLElement>(
    [...toolbar.querySelectorAll<HTMLElement>('[data-param]')].map((group) => [group.dataset.param ?? '', group]),
  );
  const cells = [...grid.querySelectorAll<HTMLElement>('[data-filterable]')];
  const empty = grid.querySelector<HTMLElement>('[data-empty]');
  const clearButton = toolbar.querySelector<HTMLElement>('[data-clear]');
  const count = toolbar.querySelector<HTMLElement>('[data-filters-count]');
  const toggle = toolbar.querySelector<HTMLElement>('[data-filters-toggle]');
  const selection = readSelection(groups);

  /** Shows the toggles, the cells and the URL for the current selection. */
  const apply = (): void => {
    let selected = 0;
    for (const [param, group] of groups) {
      const values = selection.get(param) ?? new Set<string>();
      selected += values.size;
      for (const button of group.querySelectorAll<HTMLElement>('[data-value]')) {
        button.setAttribute('aria-pressed', String(values.has(button.dataset.value ?? '')));
      }
    }
    let visible = 0;
    for (const cell of cells) {
      const matches = [...selection].every(([param, values]) => {
        if (values.size === 0) return true;
        return (cell.dataset[param] ?? '').split(' ').some((value) => values.has(value));
      });
      cell.hidden = !matches;
      if (matches) visible += 1;
    }
    if (empty) empty.hidden = visible > 0;
    if (clearButton) clearButton.hidden = selected === 0;
    if (count) {
      count.hidden = selected === 0;
      count.textContent = String(selected);
    }
    const query = new URLSearchParams();
    for (const [param, values] of selection) {
      if (values.size > 0) query.set(param, [...values].join(','));
    }
    const text = query.toString();
    history.replaceState(history.state, '', location.pathname + (text ? `?${text}` : ''));
  };

  toolbar.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest<HTMLElement>('[data-value]');
    const group = button?.closest<HTMLElement>('[data-param]');
    if (button && group) {
      const values = selection.get(group.dataset.param ?? '');
      const value = button.dataset.value ?? '';
      if (values?.has(value)) values.delete(value);
      else values?.add(value);
      apply();
    }
  });
  const clear = (): void => {
    for (const values of selection.values()) values.clear();
    apply();
  };
  document.addEventListener('click', (event) => {
    if (event.target instanceof Element && event.target.closest('[data-clear]')) clear();
  });
  toggle?.addEventListener('click', () => {
    toggle.setAttribute('aria-expanded', String(toolbar.classList.toggle('fopen')));
  });
  apply();
}
