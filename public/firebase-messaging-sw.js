importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBi8n-tbluJauTXONX3-lXBonEUfYBXbJ4",
  authDomain: "clinq-go.firebaseapp.com",
  projectId: "clinq-go",
  storageBucket: "clinq-go.firebasestorage.app",
  messagingSenderId: "587524646807",
  appId: "1:587524646807:web:8393bea4dab5084d9286d2",
  measurementId: "G-HP3ED79LLZ"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Mensaje en segundo plano recibido:', payload);
  
  const notificationTitle = payload.notification?.title || 'Actualización de Cita - Nexus Cliniq';
  const notificationOptions = {
    body: payload.notification?.body || 'Un paciente ha respondido a su cita.',
    icon: '/assets/logo_nexus.png' // Asegúrate de tener un ícono válido
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});