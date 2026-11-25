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

messaging.onBackgroundMessage(async payload => {
  const data=payload.data||{};
  const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  windows.forEach(client=>client.postMessage({type:'CLINIQ_PUSH',data}));
  await self.registration.showNotification(data.title||payload.notification?.title||'Clínica Go', {
    body:data.body||payload.notification?.body||'Hay nueva información disponible.',
    icon:'/assets/logo_nexus.png',tag:data.eventId||data.type,data
  });
});
