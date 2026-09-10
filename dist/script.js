'use strict';
(() => {
  const C = window.SITE_CONFIG;
  if (!C) return;
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const money = n => new Intl.NumberFormat('uk-UA').format(n);
  const phone = '+' + C.PHONE.replace(/\D/g, '');
  const pretty = /^\+380\d{9}$/.test(phone) ? phone.replace(/^(\+380)(\d{2})(\d{3})(\d{4})$/, '$1 $2 $3 $4') : phone;
  const telegramName = C.TELEGRAM.trim().replace(/^@/, '');
  const telegram = telegramName ? 'https://t.me/' + encodeURIComponent(telegramName) : 'https://t.me/' + phone;
  const viber = 'viber://chat?number=' + encodeURIComponent('+' + (C.VIBER || phone).replace(/\D/g, ''));
  $$('[data-phone]').forEach(a => a.href = 'tel:' + phone);
  $$('[data-phone-text]').forEach(el => el.textContent = pretty);
  $$('[data-viber]').forEach(a => a.href = viber);
  $$('[data-telegram]').forEach(a => a.href = telegram);
  $$('[data-telegram-note]').forEach(el => el.hidden = !!telegramName);
  $$('[data-email]').forEach(a => { a.hidden = !C.EMAIL.trim(); if (C.EMAIL.trim()) a.href = 'mailto:' + C.EMAIL.trim(); });
  $$('[data-location]').forEach(el => el.textContent = C.LOCATION);
  $$('[data-water]').forEach(el => el.textContent = C.WATER);
  $$('[data-price]').forEach(el => el.textContent = money(C.PRICE[el.dataset.price]));
  $$('[data-min-nights]').forEach(el => el.textContent = C.PRICE.WEEKEND_MIN_NIGHTS);
  $$('[data-weekend-total]').forEach(el => el.textContent = money(C.PRICE.WEEKEND * C.PRICE.WEEKEND_MIN_NIGHTS));
  $$('[data-text]').forEach(el => { if (C.TEXT[el.dataset.text] !== undefined) el.textContent = C.TEXT[el.dataset.text]; });
  $$('[data-image]').forEach(el => el.src = C.IMAGES[el.dataset.image]);
  document.title = C.NAME + ' — відпочинок · ' + C.LOCATION;

  const menu = $('.menu-toggle');
  const nav = $('#navigation');
  const header = $('.site-header');
  function closeMenu(returnFocus = false) { menu.setAttribute('aria-expanded', 'false'); menu.setAttribute('aria-label', 'Відкрити меню'); nav.classList.remove('is-open'); header.classList.remove('menu-open'); if (returnFocus) menu.focus(); }
  menu.addEventListener('click', () => { const open = menu.getAttribute('aria-expanded') !== 'true'; menu.setAttribute('aria-expanded', String(open)); menu.setAttribute('aria-label', open ? 'Закрити меню' : 'Відкрити меню'); nav.classList.toggle('is-open', open); header.classList.toggle('menu-open', open); });
  nav.addEventListener('click', e => { if (e.target.closest('a')) closeMenu(); });
  document.addEventListener('click', e => { if (!e.target.closest('.site-header')) closeMenu(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') closeMenu(true); });
  matchMedia('(min-width:1051px)').addEventListener('change', () => closeMenu());

  const bookDialog = $('#booking-dialog');
  const lightbox = $('#lightbox');
  let returnFocus = null;
  function openDialog(dialog) {
    returnFocus = document.activeElement;
    closeMenu();
    dialog.showModal();
    document.body.classList.add('modal-open');
  }
  [bookDialog, lightbox].forEach(dialog => {
    dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', e => {
      if (e.target !== dialog || dialog === lightbox) return;
      const b = dialog.getBoundingClientRect();
      if (e.clientX < b.left || e.clientX > b.right || e.clientY < b.top || e.clientY > b.bottom) dialog.close();
    });
    dialog.addEventListener('close', () => { document.body.classList.remove('modal-open'); if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true }); });
  });
  $$('[data-book]').forEach(b => b.addEventListener('click', () => openDialog(bookDialog)));

  const photos = C.GALLERY.filter(p => p.src && p.alt);
  const gallery = $('#gallery-grid');
  gallery.replaceChildren();
  gallery.dataset.count = Math.min(photos.length, 5);
  const lbImage = $('#lightbox-image');
  const lbCaption = $('#lightbox-caption');
  let photoIndex = 0;
  function showPhoto(index) {
    photoIndex = (index + photos.length) % photos.length;
    const p = photos[photoIndex];
    lbImage.src = p.src;
    lbImage.alt = p.alt;
    lbCaption.textContent = p.caption || p.alt;
    $('#lightbox-count').textContent = `${photoIndex + 1} / ${photos.length}`;
  }
  function openPhoto(index) { if (!photos.length) return; showPhoto(index); openDialog(lightbox); }
  photos.slice(0, 5).forEach((photo, i) => {
    const button = document.createElement('button');
    button.className = 'gallery-item';
    button.setAttribute('aria-label', 'Відкрити фото: ' + (photo.caption || photo.alt));
    const img = document.createElement('img');
    img.src = photo.src; img.alt = photo.alt; img.loading = 'lazy'; img.decoding = 'async';
    const caption = document.createElement('span'); caption.textContent = photo.caption || photo.alt;
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); icon.setAttribute('class', 'icon'); icon.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use'); use.setAttribute('href', '#i-expand'); icon.append(use);
    button.append(img, caption, icon); button.addEventListener('click', () => openPhoto(i)); gallery.append(button);
  });
  $$('[data-gallery-count]').forEach(el => el.textContent = photos.length);
  $('#all-photos').disabled = !photos.length;
  $('#all-photos').addEventListener('click', () => openPhoto(0));
  $('.photo-prev').addEventListener('click', () => showPhoto(photoIndex - 1));
  $('.photo-next').addEventListener('click', () => showPhoto(photoIndex + 1));
  lightbox.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') { e.preventDefault(); showPhoto(photoIndex - 1); } if (e.key === 'ArrowRight') { e.preventDefault(); showPhoto(photoIndex + 1); } });
  let swipe = null;
  lbImage.addEventListener('touchstart', e => { swipe = e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null; }, { passive: true });
  lbImage.addEventListener('touchend', e => { if (!swipe) return; const dx = e.changedTouches[0].clientX - swipe.x; const dy = e.changedTouches[0].clientY - swipe.y; if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) showPhoto(photoIndex + (dx < 0 ? 1 : -1)); swipe = null; }, { passive: true });

  let toastTimer;
  const toast = $('#toast');
  function notice(message) {
    const activeDialog = document.querySelector('dialog[open]');
    (activeDialog || document.body).append(toast);
    toast.textContent = message; toast.classList.add('visible'); clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('visible'), 3200);
  }
  async function copyPhone() {
    let copied = false;
    try { await navigator.clipboard.writeText(phone); copied = true; } catch {
      const input = document.createElement('textarea'); input.value = phone;
      input.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0';
      const focus = document.activeElement;
      (document.querySelector('dialog[open]') || document.body).append(input);
      input.focus(); input.select();
      try { copied = document.execCommand('copy'); } catch { copied = false; }
      input.remove(); focus?.focus({ preventScroll: true });
    }
    notice(copied ? 'Номер скопійовано' : 'Скопіюйте номер вручну: ' + pretty);
  }
  $$('.copy-phone').forEach(b => b.addEventListener('click', copyPhone));

  // Легкі ефекти: один кадр на подію прокрутки, без постійного циклу.
  // Контент видимий за замовчуванням; анімації не потрібні для роботи сайту.
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const desktopMotion = matchMedia('(min-width:1001px) and (hover:hover) and (pointer:fine)');
  const hero = $('.hero');
  const heroPhoto = $('.hero-photo');
  let heroHeight = hero.offsetHeight;
  let scrollFrame = 0;
  let revealObserver = null;
  function updateScroll() {
    scrollFrame = 0;
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 28);
    const offset = !reducedMotion.matches && desktopMotion.matches ? Math.min(y, heroHeight) * .045 : 0;
    heroPhoto.style.setProperty('--hero-offset', offset + 'px');
  }
  function queueScroll() { if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScroll); }
  window.addEventListener('scroll', queueScroll, { passive: true });
  window.addEventListener('resize', () => { heroHeight = hero.offsetHeight; queueScroll(); }, { passive: true });
  desktopMotion.addEventListener('change', queueScroll);
  updateScroll();
  function showAllReveals() {
    revealObserver?.disconnect();
    $$('.reveal-pending').forEach(el => el.classList.remove('reveal-pending'));
  }
  if (!reducedMotion.matches && 'IntersectionObserver' in window) {
    revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.remove('reveal-pending'); revealObserver.unobserve(entry.target); } });
    }, { threshold: .06, rootMargin: '0px 0px 20px 0px' });
    $$('.directions-heading, .map-card, .directions-copy, .intro-grid, .features, .house-visual, .house-content, .water-copy, .water-photo, .section-heading, .gallery-item, .price-card, .booking-notes, .faq, .contacts-grid > div').forEach((el, index) => {
      el.classList.add('reveal');
      el.style.setProperty('--reveal-delay', (index % 3) * 65 + 'ms');
      if (el.getBoundingClientRect().top > window.innerHeight) {
        el.classList.add('reveal-pending');
        revealObserver.observe(el);
      }
    });
  }
  // Перехід з клавіатури негайно показує елемент, навіть до анімації.
  document.addEventListener('focusin', e => e.target.closest('.reveal-pending')?.classList.remove('reveal-pending'));
  reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) showAllReveals(); queueScroll(); });
  window.addEventListener('beforeprint', showAllReveals);
  lbImage.addEventListener('load', () => {
    if (!reducedMotion.matches && lightbox.open && typeof lbImage.animate === 'function') {
      lbImage.getAnimations().forEach(animation => animation.cancel());
      lbImage.animate([{ opacity: .35, transform: 'scale(.985)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 260, easing: 'ease-out' });
    }
  });
})();
