'use strict';
(async () => {
  const status = document.getElementById('status');
  const description = document.getElementById('connection-description');
  const login = document.getElementById('login');
  const error = document.getElementById('connection-error');
  try {
    const response = await fetch('settings.json', { cache:'no-store' });
    if (!response.ok) throw new Error('Не вдалося прочитати налаштування редактора.');
    const settings = await response.json();
    if (!settings.connected) {
      status.textContent = 'Потрібне одноразове підключення';
      description.textContent = 'Редактор підготовлено. Щоб увійти та зберігати зміни для всіх відвідувачів, підключіть цей проєкт до GitHub і Netlify за інструкцією нижче.';
      document.getElementById('setup-guide').open = true;
      return;
    }
    status.textContent = 'Репозиторій підключено';
    login.hidden = false;
    login.addEventListener('click', async () => {
      error.hidden = true; login.disabled = true; status.textContent = 'Відкриваємо редактор…';
      try {
        if (!window.CMS) await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/decap-cms@3.16.1/dist/decap-cms.js';
          script.onload = resolve;
          script.onerror = () => { script.remove(); reject(new Error('Не вдалося завантажити редактор. Перевірте інтернет і повторіть спробу.')); };
          document.head.append(script);
        });
        if (!window.CMS) throw new Error('Редактор не завантажився. Оновіть сторінку.');
        const configResponse = await fetch('config.yml', { cache:'no-store' });
        if (!configResponse.ok) throw new Error('Не вдалося прочитати конфігурацію.');
        const config = await configResponse.json();
        await window.CMS.init({ config:{...config,load_config_file:false} });
        document.getElementById('setup').hidden = true;
      } catch (e) { error.textContent = e.message; error.hidden = false; status.textContent = 'Не вдалося відкрити редактор'; login.disabled = false; }
    });
  } catch (e) { status.textContent = 'Налаштування недоступні'; error.textContent = e.message; error.hidden = false; }
})();
