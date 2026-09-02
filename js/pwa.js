(() => {
  const btn = document.getElementById('pwaInstallBtn');
  const hint = document.getElementById('pwaInstallHint');
  let deferredPrompt = null;
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isMobile = /android|iphone|ipad|ipod/i.test(navigator.userAgent);

  function showButton(label) {
    if (!btn || standalone) return;
    btn.hidden = false;
    btn.textContent = label;
  }

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(err => console.warn('SW:', err)));
  }

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredPrompt = event;
    showButton('Instalar app');
  });

  if (isIOS && !standalone) showButton('Instalar en iPhone');
  else if (isMobile && !standalone) setTimeout(() => { if (!deferredPrompt) showButton('Cómo instalar'); }, 1200);

  btn?.addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice.catch(() => null);
      deferredPrompt = null;
      btn.hidden = true;
      return;
    }
    const msg = isIOS
      ? 'En iPhone/iPad: abre el menú Compartir del navegador y pulsa “Añadir a pantalla de inicio”.'
      : 'En Android: abre el menú del navegador y elige “Instalar aplicación” o “Añadir a pantalla de inicio”.';
    if (hint) {
      hint.textContent = msg;
      hint.hidden = false;
      setTimeout(() => { hint.hidden = true; }, 9000);
    } else alert(msg);
  });

  window.addEventListener('appinstalled', () => {
    if (btn) btn.hidden = true;
    if (hint) hint.hidden = true;
  });
})();
