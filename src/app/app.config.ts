import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { routes } from './app.routes';
import { provideLottieOptions } from 'ngx-lottie';
import player from 'lottie-web';
// Importación directa desde el SDK de Firebase (sin @angular/fire)
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { environment } from '../environments/environment';

// Inicializar la app y firestore de forma global
const firebaseApp = initializeApp(environment.firebaseConfig);
const db = getFirestore(firebaseApp);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(),

    // Proveer las instancias para que estén disponibles en toda la app
    { provide: 'FIREBASE_APP', useValue: firebaseApp },
    { provide: 'FIRESTORE_DB', useValue: db },
    provideLottieOptions({
      player: () => player,
    })
  ]
};
