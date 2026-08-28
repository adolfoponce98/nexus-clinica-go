import { Injectable } from '@angular/core';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

interface CachedMonthData {
  yearMonthKey: string;
  ultimaActualizacion: number; // Timestamp
  classes: any[];
}

@Injectable({
  providedIn: 'root'
})
export class CalendarCacheService {
  private dbName = 'BeastCalendarDB';
  private storeName = 'monthly_schedules';
  private dbVersion = 1;

  constructor() {}

  // Abrir la base de datos de IndexedDB de forma asíncrona
  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'yearMonthKey' });
        }
      };
    });
  }

  // Obtener la copia local de un mes específico
 async getLocalMonth(yearMonthKey: string): Promise<CachedMonthData | null> {
   console.log('EMPIEZO CONSULTA LOCAL');
  const db = await this.openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(this.storeName, 'readonly');
    const store = transaction.objectStore(this.storeName);
    const request = store.get(yearMonthKey);
    request.onsuccess = () => {
      const result = request.result;
      if (result) {
        console.log(`%c[CACHE HIT] Datos de ${yearMonthKey} encontrados en IndexedDB local.`, 'color: #10b981; font-weight: bold;');
      } else {
        console.log(`%c[CACHE MISS] No hay datos locales para ${yearMonthKey}.`, 'color: #f59e0b; font-weight: bold;');
      }

      resolve(result || null);
    };
    request.onerror = () => reject(request.error);
  });
}

  // Guardar o actualizar la copia local de un mes junto con su timestamp
  async saveLocalMonth(yearMonthKey: string, ultimaActualizacion: number, classes: any[]): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const data: CachedMonthData = { yearMonthKey, ultimaActualizacion, classes };
      const request = store.put(data);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

// Consultar únicamente el metadato 'ultimaActualizacion' en la raíz del mes en Firestore
  async getRemoteUltimaActualizacion(idBranch: string, yearMonthKey: string): Promise<number> {
    try {
      const db = getFirestore();
      const metaDocRef = doc(db, `classes/studios/${idBranch}/${yearMonthKey}`);
      const metaSnap = await getDoc(metaDocRef);

      if (metaSnap.exists()) {
        const data = metaSnap.data();
        const rawTimestamp = data['ultimaActualizacion'];

        // 🌟 Caso 1: Si Firestore devuelve un objeto Timestamp nativo (tiene .seconds)
        if (rawTimestamp && typeof rawTimestamp === 'object' && 'seconds' in rawTimestamp) {
          return rawTimestamp.seconds * 1000; // Convertimos segundos a milisegundos
        }

        // 🌟 Caso 2: Si ya viene como un número directo en milisegundos
        if (typeof rawTimestamp === 'number') {
          return rawTimestamp;
        }

        // 🌟 Caso 3: Si viene como un objeto con un método toMillis() de Firebase
        if (rawTimestamp && typeof rawTimestamp.toMillis === 'function') {
          return rawTimestamp.toMillis();
        }
      }
      return Date.now(); // Si no existe el campo, forzamos la descarga
    } catch (e) {
      console.warn('No se pudo obtener el metadato de actualización, procediendo a descarga normal:', e);
      return Date.now();
    }
  }
}
