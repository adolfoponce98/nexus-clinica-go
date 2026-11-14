import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { routes } from './app.routes';

// Importaciones directas del SDK modular de Firebase (sin @angular/fire)
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getMessaging } from 'firebase/messaging';
import { environment } from '../environments/environment';

// Inicializar Firebase globalmente
const firebaseApp = initializeApp(environment.firebaseConfig);
const db = getFirestore(firebaseApp);
const messaging = getMessaging(firebaseApp);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(),
    // Proveer las instancias directas para inyectarlas donde las necesites
    { provide: 'FIREBASE_APP', useValue: firebaseApp },
    { provide: 'FIRESTORE_DB', useValue: db },
    { provide: 'FIREBASE_MESSAGING', useValue: messaging }
  ]
};
