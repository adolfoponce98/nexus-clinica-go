import { Injectable, signal, effect } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  // Usamos Signals de Angular para detectar si está en modo oscuro
  isDarkMode = signal<boolean>(this.getInitialTheme());

  constructor() {
    // Cada vez que cambie el estado, aplicamos la clase al body
    effect(() => {
      if (this.isDarkMode()) {
        document.body.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.body.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
    });
  }

  private getInitialTheme(): boolean {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      return savedTheme === 'dark';
    }
    // Opcional: Detectar la preferencia del sistema operativo del usuario
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  toggleTheme() {
    this.isDarkMode.update(dark => !dark);
  }
}
