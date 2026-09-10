import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(process.argv[2] || fileURLToPath(new URL('..', import.meta.url)));
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const write = (name, value) => { fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true }); fs.writeFileSync(path.join(root, name), value); };
const d = JSON.parse(read('content/site.json'));
const g = d.GENERAL, c = d.CONTACTS, p = d.PRICE, h = d.HOUSE, m = d.MAP, photos = d.PHOTOS;
const escape = value => String(value ?? '').replace(/[&<>"']/g, x => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[x]));
const inline = value => escape(value).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/__(.+?)__/g, '<strong>$1</strong>').replace(/\*([^*\n]+)\*/g, '<em>$1</em>').replace(/_([^_\n]+)_/g, '<em>$1</em>');
// Deliberately small, escaped Markdown: paragraphs, bold/italic, lists and line breaks.
function markdown(value) {
  let html = '', list = '', paragraph = [];
  const flush = () => { if (paragraph.length) { html += '<p>' + inline(paragraph.join('\n')).replace(/\n/g, '<br>') + '</p>'; paragraph = []; } };
  const close = () => { if (list) { html += '</' + list + '>'; list = ''; } };
  for (const line of String(value || '').replace(/\r/g, '').split('\n')) {
    const item = line.match(/^\s*(?:([-+*])|\d+[.)])\s+(.+)$/);
    if (item) { flush(); const type = item[1] ? 'ul' : 'ol'; if (list !== type) { close(); list = type; html += '<' + type + '>'; } html += '<li>' + inline(item[2]) + '</li>'; }
    else if (!line.trim()) { flush(); /* Blank lines between Markdown list items keep a list open. */ }
    else { close(); paragraph.push(line); }
  }
  flush(); close(); return html;
}
const assert = (condition, message) => { if (!condition) throw new Error(message); };
function phone(value, label) {
  const result = '+' + String(value || '').replace(/\D/g, '');
  assert(/^\+[1-9]\d{7,14}$/.test(result), label + ': потрібен міжнародний номер телефону');
  return result;
}
function image(value) {
  const result = String(value || '').replace(/^\//, '');
  assert(/^images\/.+\.(?:jpe?g|png|webp|avif|gif)$/i.test(result) && !result.split('/').includes('..'), 'Фото має бути завантажене у розділ Медіа: ' + value);
  assert(fs.existsSync(path.join(root, 'dist', result)), 'Фото не знайдено: ' + result + '. Замініть його в налаштуваннях перед видаленням з Медіа.');
  return result;
}
function plural(n, one, few, many) { const a = n % 10, b = n % 100; return a === 1 && b !== 11 ? one : a >= 2 && a <= 4 && (b < 12 || b > 14) ? few : many; }
const number = (value, min, max, label, integer = true) => { assert(typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max && (!integer || Number.isInteger(value)), 'Некоректне значення: ' + label); return value; };
number(p.WEEKDAY, 0, 1000000, 'Ціна у будні'); number(p.WEEKEND, 0, 1000000, 'Ціна у вихідні'); number(p.WEEKEND_MIN_NIGHTS, 1, 90, 'Мінімум ночей');
number(h.MAIN_PLACES, 1, 50, 'Основні місця'); number(h.EXTRA_PLACES, 0, 50, 'Додаткові місця'); number(m.LAT, -90, 90, 'Широта', false); number(m.LNG, -180, 180, 'Довгота', false);
assert(g.NAME?.trim() && g.HERO_LINE_1?.trim(), 'Назва та головний заголовок не можуть бути порожніми');
const mapURL = new URL(m.URL); assert(mapURL.protocol === 'https:' && ['maps.app.goo.gl','maps.google.com','www.google.com','google.com'].includes(mapURL.hostname), 'Вкажіть HTTPS-посилання Google Maps');
const primary = phone(c.PHONE, 'Телефон');
const pretty = /^\+380\d{9}$/.test(primary) ? primary.replace(/^(\+380)(\d{2})(\d{3})(\d{4})$/, '$1 $2 $3 $4') : primary;
const telegramName = (c.TELEGRAM || '').trim().replace(/^@/, '');
assert(!telegramName || /^[a-zA-Z0-9_]{5,32}$/.test(telegramName), 'Telegram: username без посилання або порожнє поле');
const email = (c.EMAIL || '').trim(); assert(!email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), 'Некоректний email');
const links = { PHONE: 'tel:' + primary, VIBER: 'viber://chat?number=' + encodeURIComponent(phone(c.VIBER || primary, 'Viber')), TELEGRAM: 'https://t.me/' + (telegramName || primary), ROUTE: 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(m.LAT + ',' + m.LNG) + '&travelmode=driving' };
const gallery = photos.GALLERY.map(x => ({ src: image(x.src), alt: (x.alt || x.caption || 'Фотографія території').trim(), caption: x.caption || x.alt || '' }));
const images = Object.fromEntries(['HERO','HOUSE','WATER'].map(k => [k, image(photos[k])]));
const C = { NAME:g.NAME, PHONE:primary, VIBER:c.VIBER || '', TELEGRAM:telegramName, EMAIL:email, PRICE:p, LOCATION:g.LOCATION, WATER:g.WATER, TEXT:{ HERO_LINE_1:g.HERO_LINE_1, HERO_LINE_2:g.HERO_LINE_2, HERO_DESCRIPTION:g.HERO_DESCRIPTION, HOUSE_DESCRIPTION:h.DESCRIPTION }, HOUSE:h, MAP:{...m, DIRECTIONS_URL:links.ROUTE}, IMAGES:images, GALLERY:gallery };
const money = n => new Intl.NumberFormat('uk-UA').format(n);
const tokens = {
  PAGE_TITLE:g.NAME + ' — відпочинок · ' + g.LOCATION, META_DESCRIPTION:g.HERO_DESCRIPTION + ' ' + g.LOCATION + ' · ' + g.WATER,
  NAME:g.NAME, BRAND_TOP:g.NAME.split(' ')[0].toLocaleLowerCase('uk'), BRAND_BOTTOM:g.NAME.split(' ').slice(1).join(' '), LOCATION:g.LOCATION, WATER:g.WATER,
  ...C.TEXT, PHONE_URL:links.PHONE, PHONE_PRETTY:pretty, VIBER_URL:links.VIBER, TELEGRAM_URL:links.TELEGRAM,
  PRICE_WEEKDAY:money(p.WEEKDAY), PRICE_WEEKEND:money(p.WEEKEND), MIN_NIGHTS:p.WEEKEND_MIN_NIGHTS, WEEKEND_TOTAL:money(p.WEEKEND * p.WEEKEND_MIN_NIGHTS), NIGHTS_LABEL:plural(p.WEEKEND_MIN_NIGHTS, 'ночі','ночей','ночей'), PRICE_NOTE:p.NOTE,
  MAIN_PLACES:h.MAIN_PLACES, MAIN_LABEL:plural(h.MAIN_PLACES,'основне місце','основні місця','основних місць'), EXTRA_PLACES:h.EXTRA_PLACES ? '+' + h.EXTRA_PLACES : '—', EXTRA_LABEL:plural(h.EXTRA_PLACES,'додаткове місце','додаткові місця','додаткових місць'), EXTRA_NOTE:h.EXTRA_NOTE,
  MAP_TITLE:m.TITLE, MAP_INTRO:m.INTRO, MAP_BUTTON:m.BUTTON_TEXT, MAP_URL:m.URL, ROUTE_URL:links.ROUTE,
  MAP_EMBED:'https://www.google.com/maps?q=' + encodeURIComponent(m.LAT + ',' + m.LNG) + '&z=14&output=embed&hl=uk', GALLERY_COUNT:gallery.length
};
for (const k of ['HERO','HOUSE','WATER']) { tokens['IMAGE_' + k] = images[k]; tokens['ALT_' + k] = photos[k + '_ALT']; }
const raw = {
  HOUSE_TITLE:inline(h.TITLE).replace(/\n/g, '<br>'), SHARED_NOTE:inline(h.SHARED_NOTE).replace(/\n/g, '<br>'), AMENITIES:h.AMENITIES.map(x => '<li>' + escape(x) + '</li>').join(''),
  CONDITIONS:d.CONDITIONS.map(x => '<details><summary>' + escape(x.title) + '<span aria-hidden="true">+</span></summary><div class="condition-body">' + markdown(x.body) + '</div></details>').join(''),
  MAP_INSTRUCTIONS:markdown(m.INSTRUCTIONS), INSTRUCTIONS_HIDDEN:m.INSTRUCTIONS?.trim() ? '' : ' hidden', PRICE_NOTE_HIDDEN:p.NOTE?.trim() ? '' : ' hidden',
  EMAIL_ATTRS:email ? ' href="mailto:' + escape(email) + '"' : ' hidden', TELEGRAM_NOTE_HIDDEN:telegramName ? ' hidden' : '',
  GALLERY_HTML:gallery.slice(0,5).map(x => '<button class="gallery-item" aria-label="Відкрити фото: ' + escape(x.caption || x.alt) + '"><img src="' + escape(x.src) + '" alt="' + escape(x.alt) + '" loading="lazy" decoding="async"><span>' + escape(x.caption || x.alt) + '</span></button>').join('')
};
const html = read('src/index.template.html').replace(/\{\{([A-Z_0-9]+)\}\}/g, (_, key) => { assert(key in tokens || key in raw, 'Невідоме поле шаблону: ' + key); return key in raw ? raw[key] : escape(tokens[key]); });
write('dist/index.html', html);
write('dist/config.js', '// Generated from content/site.json. Edit through /admin.\nwindow.SITE_CONFIG = ' + JSON.stringify(C, null, 2).replace(/</g, '\\u003c') + ';\n');

// Netlify supplies the repository and canonical site URL automatically.
const repositoryURL = process.env.CMS_REPOSITORY || process.env.REPOSITORY_URL || '';
const repo = repositoryURL.replace(/^git@github\.com:/, '').replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '').replace(/\/$/, '');
const connected = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo);
const canonical = process.env.URL || '';
const schema = JSON.parse(read('cms/schema.json'));
const config = { ...schema, backend: { name:'github', repo:connected ? repo : 'SETUP_REQUIRED', branch:process.env.CMS_BRANCH || process.env.BRANCH || 'main', base_url:'https://api.netlify.com', auth_endpoint:'auth', ...(canonical ? {site_domain:new URL(canonical).hostname} : {}) }, ...(canonical ? {site_url:canonical, display_url:canonical} : {}) };
write('dist/admin/config.yml', JSON.stringify(config, null, 2) + '\n');
write('dist/admin/settings.json', JSON.stringify({ connected, repository:connected ? repo : null, site_url:canonical || null }) + '\n');
console.log('Content rendered: ' + gallery.length + ' photos; CMS ' + (connected ? 'configured for ' + repo : 'awaiting GitHub/Netlify connection') + '.');
