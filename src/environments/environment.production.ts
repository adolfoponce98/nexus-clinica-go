// Configuración pública del cliente; no contiene credenciales privadas.
export const environment = {
  production: true,
  name: 'production',
  functionsUrlSuffix: '-o7vmreizjq-uc.a.run.app',
  firestoreDatabaseId: 'nexus-cliniq-dev',
  vapidKey:
    'BOAWodenFSAHbDkNWvq9sXK118FQMqf_fM1iUKqjnpSwD9OOddSpjS6nG32hbjb64PrWmCdrcCy_RVjR9rOO6Kc',
  apiSecurity: {
    ENCRYPTION_KEY: 'd12f53caa18869e74ea7ccdd8ccf97618b018254d83aaf0b8037d4a89ebbde5b',
    APP_SECRET_HEADER: '0ffd8e9336c08f1d7449509b02dcfabb',
  },
  firebaseConfig: {
    apiKey: 'AIzaSyBi8n-tbluJauTXONX3-lXBonEUfYBXbJ4',
    authDomain: 'clinq-go.firebaseapp.com',
    projectId: 'clinq-go',
    storageBucket: 'clinq-go.firebasestorage.app',
    messagingSenderId: '587524646807',
    appId: '1:587524646807:web:8393bea4dab5084d9286d2',
    measurementId: 'G-HP3ED79LLZ',
  },
};
