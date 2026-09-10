import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'waterside-content-'));
try {
  for (const dir of ['content','src','cms','dist']) fs.cpSync(path.join(root, dir), path.join(temp, dir), {recursive:true});
  const file = path.join(temp, 'content/site.json');
  const d = JSON.parse(fs.readFileSync(file, 'utf8'));
  const env = {...process.env, CMS_REPOSITORY:'', REPOSITORY_URL:'', URL:'', BRANCH:'', CMS_BRANCH:''};
  const build = (extra={}) => execFileSync(process.execPath, [path.join(root,'scripts/build-content.mjs'), temp], {env:{...env,...extra},stdio:'pipe'});
  const config = () => { const context={window:{}}; vm.runInNewContext(fs.readFileSync(path.join(temp,'dist/config.js'),'utf8'), context); return context.window.SITE_CONFIG; };
  build();
  assert.equal(config().GALLERY.length, 13);
  assert.equal(JSON.parse(fs.readFileSync(path.join(temp,'dist/admin/settings.json'))).connected, false);

  d.GENERAL.NAME = 'Тестова оселя'; d.GENERAL.HERO_LINE_1 = 'Новий заголовок <script>bad()</script>';
  d.CONTACTS.PHONE = '+380501112233'; d.CONTACTS.EMAIL = 'owner@example.com'; d.CONTACTS.TELEGRAM = '@test_owner';
  d.PRICE.WEEKDAY = 2100; d.PRICE.WEEKEND = 2600; d.PRICE.WEEKEND_MIN_NIGHTS = 3; d.PRICE.NOTE = 'Додаткова примітка';
  d.MAP.LAT = 50.5; d.MAP.LNG = 30.6; d.MAP.BUTTON_TEXT = 'Маршрут до оселі'; d.MAP.URL = 'https://www.google.com/maps?q=50.5,30.6';
  d.MAP.INSTRUCTIONS = 'Перший абзац.\n\n**Важливо:** орієнтир.\n\n- Перший поворот\n\n- Другий поворот\n\n1. Пункт один\n2. Пункт два\n\n<img src=x onerror=bad()>';
  d.HOUSE.MAIN_PLACES = 4; d.HOUSE.EXTRA_PLACES = 2; d.HOUSE.TITLE = 'Оновлений *будиночок*'; d.HOUSE.AMENITIES.push('Тестова зручність');
  d.CONDITIONS.reverse(); d.CONDITIONS.push({title:'Нова умова',body:'Тест **форматування**'});
  fs.copyFileSync(path.join(temp,'dist/images/hero.jpg'),path.join(temp,'dist/images/upload-check.jpg'));
  d.PHOTOS.GALLERY.reverse(); d.PHOTOS.GALLERY.pop(); d.PHOTOS.GALLERY.unshift({src:'/images/upload-check.jpg',caption:'Нове фото',alt:'Перевірка завантаженого фото'}); d.PHOTOS.HERO='/images/upload-check.jpg';
  fs.writeFileSync(file,JSON.stringify(d));
  build({REPOSITORY_URL:'https://github.com/example/cabins.git',URL:'https://cabins-example.netlify.app',BRANCH:'main'});
  const c=config(), html=fs.readFileSync(path.join(temp,'dist/index.html'),'utf8');
  assert.equal(c.PHONE,'+380501112233'); assert.equal(c.PRICE.WEEKDAY,2100); assert.equal(c.GALLERY[0].src,'images/upload-check.jpg'); assert.equal(c.GALLERY.length,13);
  assert.equal(c.IMAGES.HERO,'images/upload-check.jpg'); assert.equal(c.MAP.LAT,50.5); assert.equal(c.NAME,'Тестова оселя');
  for (const expected of ['tel:+380501112233','viber://chat?number=%2B380501112233','https://t.me/test_owner','mailto:owner@example.com','destination=50.5%2C30.6','Маршрут до оселі','<strong>Важливо:</strong>','<ul><li>Перший поворот</li><li>Другий поворот</li></ul>','<ol><li>Пункт один</li><li>Пункт два</li></ol>','Тестова зручність','Нова умова']) assert.ok(html.includes(expected),expected);
  for (const absent of ['+380965227525','+380 96 522 7525','50.760377','<script>bad()','<img src=x']) assert.ok(!html.includes(absent),absent);
  const cms=JSON.parse(fs.readFileSync(path.join(temp,'dist/admin/config.yml')));
  assert.equal(cms.backend.repo,'example/cabins'); assert.equal(cms.backend.site_domain,'cabins-example.netlify.app'); assert.equal(cms.backend.branch,'main');
  assert.equal(cms.media_folder,'dist/images'); assert.equal(cms.collections[0].files[0].file,'content/site.json');
  const cBefore=fs.readFileSync(path.join(temp,'dist/config.js'),'utf8');
  fs.unlinkSync(path.join(temp,'dist/images/upload-check.jpg'));
  assert.throws(()=>build(),/Фото не знайдено/);
  assert.equal(fs.readFileSync(path.join(temp,'dist/config.js'),'utf8'),cBefore);
  console.log('PASS: centralized text, contacts, prices, map, formatted directions, amenities, conditions, uploaded asset integration, gallery deletion/order, hero selection, GitHub/Netlify configuration and invalid-media protection.');
  console.log('Scope: build integration only. OAuth login, remote publishing and browser interactions require connected accounts and authorized browser access.');
} finally { fs.rmSync(temp,{recursive:true,force:true}); }
