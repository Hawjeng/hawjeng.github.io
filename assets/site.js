(() => {
  const openPreface = () => {
    if (window.location.hash === '#preface') {
      document.querySelector('.preface-section')?.setAttribute('open', '');
    } else if (window.location.hash.startsWith('#preface-')) {
      document.getElementById(window.location.hash.slice(1))?.setAttribute('open', '');
    }
  };
  openPreface();
  window.addEventListener('hashchange', openPreface);
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('#primary-nav');
  const closeMenu = () => {
    toggle?.setAttribute('aria-expanded', 'false');
    toggle?.setAttribute('aria-label', '開啟導覽選單');
    nav?.classList.remove('is-open');
  };
  toggle?.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? '關閉導覽選單' : '開啟導覽選單');
    nav.classList.toggle('is-open', open);
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && toggle?.getAttribute('aria-expanded') === 'true') {
      closeMenu(); toggle.focus();
    }
  });
  nav?.addEventListener('click', e => {
    if (e.target.closest('a')) closeMenu();
  });
  const filters = document.querySelector('[data-filters]');
  if (filters) {
    const items = [...document.querySelectorAll('[data-category]')];
    const search = document.querySelector('#catalog-search');
    const count = document.querySelector('#result-count');
    const empty = document.querySelector('#empty-results');
    let category = 'all';
    const apply = () => {
      const query = (search?.value || '').trim().toLocaleLowerCase();
      let visible = 0;
      items.forEach(item => {
        const match = (category === 'all' || item.dataset.category === category) &&
          item.textContent.toLocaleLowerCase().includes(query);
        item.hidden = !match;
        if (match) visible++;
      });
      if (count) count.textContent = `${visible} ${filters.dataset.unit || '項結果'}`;
      if (empty) empty.hidden = visible !== 0;
    };
    filters.addEventListener('click', e => {
      const button = e.target.closest('[data-filter]');
      if (!button) return;
      category = button.dataset.filter;
      filters.querySelectorAll('[data-filter]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
      apply();
    });
    search?.addEventListener('input', apply);
    apply();
  }
  document.querySelectorAll('[data-copy]').forEach(button => {
    button.hidden = !navigator.clipboard || !window.isSecureContext;
    button.addEventListener('click', async () => {
      const message = button.parentElement.querySelector('[role=status]');
      try {
        await navigator.clipboard.writeText(button.dataset.copy);
        if (message) message.textContent = 'Email 已複製';
      } catch {
        if (message) message.textContent = '請選取 Email 文字後複製';
      }
    });
  });
})();
