export {};

const overlay = document.querySelector<HTMLElement>('[data-overlay]');
const modal = overlay?.querySelector<HTMLElement>('.modal');
const body = overlay?.querySelector<HTMLElement>('[data-modal-body]');
const page = document.querySelector<HTMLElement>('.page');

/** The detail of an entity page: the markup of its detail panel and its document title. */
interface Loaded {
  html: string;
  title: string;
}

if (overlay && modal && body && page) {
  const cache = new Map<string, Loaded>();
  const entryPath = location.pathname;
  const entryTitle = document.title;
  /** The number of history entries that the modal added; Back this many times shows the page again. */
  let depth = 0;
  let opener: Element | null = null;
  let request = 0;

  const load = async (url: string): Promise<Loaded> => {
    const cached = cache.get(url);
    if (cached) return cached;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${url}: ${response.status}`);
    const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
    const detail = doc.querySelector('[data-detail]');
    if (!detail) throw new Error(`${url}: no detail panel`);
    const loaded = { html: detail.outerHTML, title: doc.title };
    cache.set(url, loaded);
    return loaded;
  };

  /**
   * Shows the detail of an entity page in the modal, with the close button next to its title.
   * @param url - the URL of the entity page
   * @returns false when a newer load or a close replaced this load, so nothing was shown
   */
  const show = async (url: string): Promise<boolean> => {
    request += 1;
    const mine = request;
    const loaded = await load(url);
    if (mine !== request) return false;
    if (overlay.hidden) opener = document.activeElement;
    body.innerHTML = loaded.html;
    const head = body.querySelector('.mhead');
    head?.insertAdjacentHTML('beforeend', '<button class="close btn" type="button" data-close aria-label="Close">&times;</button>');
    modal.setAttribute('aria-label', body.querySelector('.name')?.textContent ?? '');
    body.scrollTop = 0;
    overlay.hidden = false;
    page.inert = true;
    document.body.style.overflow = 'hidden';
    document.title = loaded.title;
    modal.focus({ preventScroll: true });
    return true;
  };

  const hide = (): void => {
    request += 1;
    overlay.hidden = true;
    body.innerHTML = '';
    page.inert = false;
    document.body.style.overflow = '';
    document.title = entryTitle;
    depth = 0;
    if (opener instanceof HTMLElement && document.contains(opener)) opener.focus({ preventScroll: true });
    opener = null;
  };

  const close = (): void => {
    // A load that is still running must not show or push after the close, also while the history jump is pending.
    request += 1;
    if (depth > 0) history.go(-depth);
    else hide();
  };

  document.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;
    if (event.target === overlay || event.target.closest('[data-close]')) {
      close();
      return;
    }
    const link = event.target.closest<HTMLAnchorElement>('a[data-modal]');
    if (!link || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    show(link.href)
      .then((shown) => {
        if (!shown) return;
        depth += 1;
        history.pushState({ depth }, '', link.href);
      })
      .catch((error: unknown) => {
        console.error(error);
        location.href = link.href;
      });
  });

  addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !overlay.hidden) close();
  });

  addEventListener('popstate', (event: PopStateEvent) => {
    const state: unknown = event.state;
    depth = typeof state === 'object' && state !== null && 'depth' in state && typeof state.depth === 'number' ? state.depth : 0;
    if (location.pathname === entryPath) hide();
    else {
      show(location.href).catch((error: unknown) => {
        console.error(error);
        location.reload();
      });
    }
  });
}
