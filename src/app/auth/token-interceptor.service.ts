import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import * as CryptoJS from 'crypto-js';

@Injectable({
  providedIn: 'root'
})
export class TokenInterceptorService {
  private authService = inject(AuthService);
  private router = inject(Router);

  private readonly ENCRYPTION_KEY = 'd12f53caa18869e74ea7ccdd8ccf97618b018254d83aaf0b8037d4a89ebbde5b';
  private readonly APP_SECRET_HEADER = '0ffd8e9336c08f1d7449509b02dcfabb';
  private readonly REFRESH_TOKEN_URL = 'https://refreshtoken-o7vmreizjq-uc.a.run.app';
  private readonly UPDATE_FCM_URL = 'https://updatefcmtoken-o7vmreizjq-uc.a.run.app';

  /**
   * Envuelve una petición `fetch` con encriptación y maneja el flujo de expiración de token (401) automáticamente.
   */
  async executeWithAuth(apiCall: (token: string) => Promise<Response>): Promise<Response> {
    const sessionData = this.authService.getSession();
    let jwtToken = sessionData?.sessionToken;

    if (!jwtToken) {
      console.warn('⚠️ [TokenInterceptor] No se encontró sessionToken en la sesión.');
      this.router.navigate(['/login']);
      throw new Error('Sesión no encontrada o expirada.');
    }

    // 1️⃣ Primer intento con el token actual
    let response = await apiCall(jwtToken);

    // 2️⃣ Si el token expiró (401), intentamos refrescarlo automáticamente
    if (response.status === 401) {
      console.warn('🔄 [TokenInterceptor] Se detectó un error 401 (Unauthorized). Intentando refrescar el token...');

      const refreshTokenValue = sessionData?.refreshToken;
      console.log('🔑 [TokenInterceptor] Refresh Token disponible:', refreshTokenValue ? 'SÍ' : 'NO');

      if (!refreshTokenValue) {
        console.error('❌ [TokenInterceptor] No hay un refresh token válido guardado en la sesión.');
        this.router.navigate(['/login']);
        throw new Error('Refresh token no disponible.');
      }

      try {
        const refreshPayload = { refreshToken: refreshTokenValue };
        console.log('📤 [TokenInterceptor] Payload enviado al refresh (sin encriptar):', refreshPayload);

        const refreshCiphertext = CryptoJS.AES.encrypt(JSON.stringify(refreshPayload), this.ENCRYPTION_KEY).toString();

        const refreshResponse = await fetch(this.REFRESH_TOKEN_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-app-signature': this.APP_SECRET_HEADER,
            'x-client-source': 'angular'
          },
          body: JSON.stringify({ encryptedData: refreshCiphertext })
        });

        console.log('📥 [TokenInterceptor] Status HTTP del refresh response:', refreshResponse.status);

        if (!refreshResponse.ok) {
          console.error('❌ [TokenInterceptor] El servidor rechazó el refresh token con status:', refreshResponse.status);
          this.router.navigate(['/login']);
          throw new Error('La sesión expiró por completo.');
        }

        const refreshJsonRes = await refreshResponse.json();
        console.log('📦 [TokenInterceptor] JSON crudo recibido del refresh:', refreshJsonRes);

        const bytesRefresh = CryptoJS.AES.decrypt(refreshJsonRes.encryptedData, this.ENCRYPTION_KEY);
        const decryptedRefresh = JSON.parse(bytesRefresh.toString(CryptoJS.enc.Utf8));
        console.log('🔓 [TokenInterceptor] Respuesta desencriptada del refresh:', decryptedRefresh);

        if (decryptedRefresh.success && decryptedRefresh.accessToken) {
          jwtToken = decryptedRefresh.accessToken;
          const newRefreshToken = decryptedRefresh.refreshToken;

          console.log('✨ [TokenInterceptor] Nuevo accessToken y refreshToken obtenidos con éxito.');

          // Guardamos ambos tokens nuevos en la sesión local (rotación exitosa)
          this.authService.updateSessionTokens(jwtToken, newRefreshToken);

          // 3️⃣ Reintentamos la petición original automáticamente con el nuevo token
          console.log('🔁 [TokenInterceptor] Reintentando petición original con el nuevo token...');
          response = await apiCall(jwtToken);
        } else {
          console.error('❌ [TokenInterceptor] La respuesta del refresh no devolvió un accessToken válido.', decryptedRefresh.error);
          this.router.navigate(['/login']);
          throw new Error(decryptedRefresh.error || 'No se pudo renovar el token de acceso.');
        }
      } catch (err) {
        console.error('❌ [TokenInterceptor] Excepción ocurrida durante el proceso de refresh:', err);
        this.router.navigate(['/login']);
        throw err;
      }
    }

    return response;
  }

  /**
   * 🌟 NUEVA FUNCIÓN: Actualiza de forma exclusiva y segura el tokenFirebase en el servidor.
   * Envía el idDoctor (correo) y el tokenFirebase cifrados con AES y protegidos por el interceptor.
   */
  async updateFirebaseToken(tokenFirebase: string): Promise<any> {
    const sessionData = this.authService.getSession();
    const idDoctor = sessionData?.email; // El idDoctor es el correo electrónico

    if (!idDoctor) {
      console.warn('⚠️ [TokenInterceptor] No se encontró el correo del doctor en la sesión.');
      throw new Error('Sesión de usuario incompleta o sin correo.');
    }

    // 1️⃣ Armar el payload con el correo (idDoctor) y el token de Firebase
    const payload = {
      idDoctor: idDoctor.trim().toLowerCase(),
      tokenFirebase: tokenFirebase
    };

    // 2️⃣ Encriptar el payload con AES
    const ciphertext = CryptoJS.AES.encrypt(JSON.stringify(payload), this.ENCRYPTION_KEY).toString();

    // 3️⃣ Ejecutar la petición asegurando autenticación con executeWithAuth
    const response = await this.executeWithAuth(async (jwtToken) => {
      return await fetch(this.UPDATE_FCM_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-app-signature': this.APP_SECRET_HEADER,
          'x-client-source': 'angular',
          'Authorization': `Bearer ${jwtToken}`
        },
        body: JSON.stringify({ encryptedData: ciphertext })
      });
    });

    const jsonRes = await response.json();
    if (!response.ok) {
      throw new Error(jsonRes.error || 'Error al actualizar el token de Firebase en el servidor.');
    }

    // 4️⃣ Desencriptar la respuesta recibida del servidor
    const bytes = CryptoJS.AES.decrypt(jsonRes.encryptedData, this.ENCRYPTION_KEY);
    const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

    if (!decryptedData.success) {
      throw new Error(decryptedData.error || 'No se pudo completar la actualización del token FCM.');
    }

    console.log('💾 [TokenInterceptor] Token Firebase actualizado exitosamente.');
    return decryptedData;
  }

}
