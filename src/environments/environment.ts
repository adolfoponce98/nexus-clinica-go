// Configuración pública del cliente; no contiene credenciales privadas.
export const environment = {
  production: false,
  name: 'development',
  functionsUrlSuffix: '-r5d3nvgypq-uc.a.run.app',
  firestoreDatabaseId: 'clinica-go-desarrollo',
  vapidKey: '',
  apiSecurity: {
    ENCRYPTION_KEY: 'd12f53caa18869e74ea7ccdd8ccf97618b018254d83aaf0b8037d4a89ebbde5b',
    APP_SECRET_HEADER: '0ffd8e9336c08f1d7449509b02dcfabb',
  },
  firebaseConfig: {
    apiKey: 'AIzaSyDBYlo2EIsltiqO9EZOBSC-JrgtLtVz03U',
    authDomain: 'clinq-go-dev.firebaseapp.com',
    projectId: 'clinq-go-dev',
    storageBucket: 'clinq-go-dev.firebasestorage.app',
    messagingSenderId: '623304623750',
    appId: '1:623304623750:web:79785ad2e84b5503c4b307',
    measurementId: 'G-NPYYLE701M',
  },
};
