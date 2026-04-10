// ══════════════════════════════════════════════════════════════════════
//  firebase-messaging-sw.js — Service Worker do BarberBook
//
//  ⚠️  ESTE ARQUIVO DEVE FICAR NA RAIZ DO SEU DOMÍNIO,
//      no mesmo nível do barbearia.html
//      Ex: https://seusite.com/firebase-messaging-sw.js
//
//  ✏️  Substitua os valores de firebaseConfig pelos seus.
// ══════════════════════════════════════════════════════════════════════

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// ─── 🔑 MESMAS CREDENCIAIS DO barbearia.html ─────────────────────────
firebase.initializeApp({
code firebase aqui
});
// ─────────────────────────────────────────────────────────────────────

const messaging = firebase.messaging();

// Recebe mensagens em background (app fechado/minimizado)
messaging.onBackgroundMessage(payload => {
  const { title, body, icon } = payload.notification || {};
  self.registration.showNotification(title || 'BarberBook', {
    body:  body  || '',
    icon:  icon  || '/icon-192.png',
    badge: '/icon-192.png',
    tag:   'barberbook-reminder',
    vibrate: [200, 100, 200],
    data: payload.data || {}
  });
});

// ── Notificações agendadas localmente ────────────────────────────────
// Armazena lembretes pendentes em memória do SW
let scheduledReminders = [];

// Verifica a cada 30 segundos se algum lembrete deve disparar
setInterval(() => {
  const now = Date.now();
  scheduledReminders = scheduledReminders.filter(r => {
    if (now >= r.fireAt) {
      self.registration.showNotification(r.title, {
        body:    r.body,
        icon:    '/icon-192.png',
        badge:   '/icon-192.png',
        tag:     'barberbook-reminder-' + r.id,
        vibrate: [200, 100, 200],
        requireInteraction: true,
        actions: [{ action: 'open', title: 'Abrir app' }]
      });
      return false; // remove da lista após disparar
    }
    return true;
  });
}, 30000);

// Recebe mensagens da página principal para agendar lembretes
self.addEventListener('message', event => {
  if (event.data?.type === 'SCHEDULE_REMINDER') {
    // Evita duplicatas pelo id
    const exists = scheduledReminders.find(r => r.id === event.data.id);
    if (!exists) {
      scheduledReminders.push(event.data);
    }
  }

  if (event.data?.type === 'CANCEL_REMINDER') {
    scheduledReminders = scheduledReminders.filter(r => r.id !== event.data.id);
  }

  if (event.data?.type === 'PING') {
    event.ports[0]?.postMessage({ type: 'PONG', count: scheduledReminders.length });
  }
});

// Ao clicar na notificação, abre/foca o app
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('/');
    })
  );
});
