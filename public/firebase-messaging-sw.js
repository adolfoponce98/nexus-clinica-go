importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

importScripts('/firebase-environment.js');
firebase.initializeApp(self.CLINICA_GO_FIREBASE_CONFIG);

const messaging = firebase.messaging();

messaging.onBackgroundMessage(async (payload) => {
  const data = payload.data || {};
  const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  windows.forEach((client) => client.postMessage({ type: 'CLINIQ_PUSH', data }));
  await self.registration.showNotification(
    data.title || payload.notification?.title || 'Clínica Go',
    {
      body: data.body || payload.notification?.body || 'Hay nueva información disponible.',
      icon: '/assets/logo_nexus.png',
      tag: data.eventId || data.type,
      data,
    },
  );
});
