import { environment } from './environments/environment';
import { prepareEnvironmentStorage } from './app/config/environment-storage';
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

prepareEnvironmentStorage(environment.firebaseConfig.projectId);

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
