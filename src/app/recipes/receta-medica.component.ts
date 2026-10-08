import { Component, signal, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  LucideAngularModule, Stethoscope, User, Calendar, MapPin,
  FileText, Printer, Save, ArrowLeft, ShieldCheck, Pill, Phone, Sparkles, Upload, Image as ImageIcon
} from 'lucide-angular';
import * as CryptoJS from 'crypto-js';

@Component({
  selector: 'app-receta-medica',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: 'receta-medica.component.html'
})
export class RecetaMedicaComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  readonly icons = {
    Stethoscope, User, Calendar, MapPin,
    FileText, Printer, Save, ArrowLeft, ShieldCheck, Pill, Phone, Sparkles, Upload, ImageIcon
  };

  // 🔀 Control de Vistas actualizado
  currentView = signal<'listado' | 'editor-receta' | 'digitalizador' | 'digitalizador-firma'>('listado');

  recetaForm: FormGroup;
  isLoading = signal(false);

  // Estados para los módulos de Digitalización con IA
  selectedFile: File | null = null;
  localPreviewUrl: string | null = null;
  isGeneratingAI = signal(false);
  generatedAiImageUrl: string | null = null;

  // Credenciales y URL de la Cloud Function
  private readonly GENERATE_BLANK_URL = 'https://generatecoachportrait-fjo7ia7ora-uc.a.run.app';
  private readonly ENCRYPTION_KEY = 'd12f53caa18869e74ea7ccdd8ccf97618b018254d83aaf0b8037d4a89ebbde5b';
  private readonly APP_SECRET_HEADER = '0ffd8e9336c08f1d7449509b02dcfabb';

  doctorData = {
    nombre: 'Dr. Adolfo Angel Ponce Meza',
    especialidad: 'Traumatología y Ortopedia / Medicina General',
    cedula: 'CED. PROF. 12345678',
    consultorio: 'Centro Médico Zapopan',
    direccion: 'Av. Juan Gil Preciado #1500, Int. 402, Zapopan, Jal.',
    telefono: '33 1234 5678',
    correo: 'dr.ponce@nexosalud.com'
  };

  fechaActual = new Date();
  folioReceta = 'NX-' + Math.floor(100000 + Math.random() * 900000);

  constructor() {
    this.recetaForm = this.fb.group({
      pacienteNombre: ['', [Validators.required]],
      pacienteEdad: ['', [Validators.required]],
      pacientePeso: [''],
      diagnostico: ['', [Validators.required]],
      medicamentos: ['', [Validators.required]],
      indicaciones: ['', [Validators.required]],
      proximaCita: ['']
    });
  }

  cambiarVista(vista: 'listado' | 'editor-receta' | 'digitalizador' | 'digitalizador-firma') {
    this.currentView.set(vista);
    // Limpiar archivos temporales al cambiar de vista si es necesario
    if (vista === 'listado') {
      this.selectedFile = null;
      this.localPreviewUrl = null;
      this.generatedAiImageUrl = null;
    }
    this.cdr.detectChanges();
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.generatedAiImageUrl = null;
      const reader = new FileReader();
      reader.onload = () => {
        this.localPreviewUrl = reader.result as string;
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    }
  }

  // Método unificado para consumir la IA enviando typeDocument (1 para receta, 2 para firma)
  async generarDigitalizacionAI(typeDoc: number) {
    if (!this.selectedFile) return;

    this.isGeneratingAI.set(true);
    this.cdr.detectChanges();

    try {
      const sessionData = JSON.parse(localStorage.getItem('session') || '{}');
      const jwtToken = sessionData?.sessionToken || '';

      const reader = new FileReader();
      reader.readAsDataURL(this.selectedFile);
      reader.onload = async () => {
        const base64String = (reader.result as string).split(',')[1];

        const payload = {
          typeDocument: typeDoc,
          imageBase64: base64String,
          mimeType: this.selectedFile?.type || 'image/jpeg'
        };

        const ciphertext = CryptoJS.AES.encrypt(JSON.stringify(payload), this.ENCRYPTION_KEY).toString();

        const response = await fetch(this.GENERATE_BLANK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-app-signature': this.APP_SECRET_HEADER,
            'x-client-source': 'angular',
            'Authorization': `Bearer ${jwtToken}`
          },
          body: JSON.stringify({ encryptedData: ciphertext })
        });

        const jsonRes = await response.json();
        if (!response.ok) {
          throw new Error(jsonRes.error || 'Error al procesar la solicitud con IA.');
        }

        let decryptedResponse;
        try {
          const bytes = CryptoJS.AES.decrypt(jsonRes.encryptedData, this.ENCRYPTION_KEY);
          decryptedResponse = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
        } catch (err) {
          throw new Error('Fallo al desencriptar la respuesta de la IA.');
        }

        if (decryptedResponse.success && decryptedResponse.imageBase64) {
          this.generatedAiImageUrl = `data:${decryptedResponse.mimeType};base64,${decryptedResponse.imageBase64}`;
        } else {
          throw new Error('La IA no devolvió una imagen válida.');
        }

        this.isGeneratingAI.set(false);
        this.cdr.detectChanges();
      };
    } catch (error: any) {
      console.error('Error en digitalización:', error);
      alert(error.message || 'Hubo un error al procesar la imagen.');
      this.isGeneratingAI.set(false);
      this.cdr.detectChanges();
    }
  }

  guardarRecetarioDigitalStorage() {
    alert('¡Plantilla digitalizada guardada y vinculada al expediente con éxito!');
    this.cambiarVista('listado');
  }

private readonly SIGNED_URL_FUNCTION = 'https://getsigneduploadurl-o7vmreizjq-uc.a.run.app';

  async guardarFirmaConUrlFirmada() {
    if (!this.selectedFile) return;

    this.isGeneratingAI.set(true);
    this.cdr.detectChanges();

    try {
      // 1. Obtener el token JWT de sesión
      const sessionData = JSON.parse(localStorage.getItem('session') || '{}');
      const jwtToken = sessionData?.sessionToken || '';

      const payload = {
        customFileName: 'firma_oficial.png', // O puedes usar `firma_${Date.now()}.png` si prefieres conservar versiones
        contentType: this.selectedFile.type || 'image/png'
      };

      // 2. Solicitar la URL firmada a la Cloud Function (con expiración de 10 min)
      const response = await fetch(this.SIGNED_URL_FUNCTION, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Error al obtener permiso de subida.');
      }

      const { uploadUrl, publicUrl } = data;

      // 3. Subir la imagen procesada directamente al bucket usando la URL firmada
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': this.selectedFile.type || 'image/png'
        },
        body: this.selectedFile
      });

      if (!uploadResponse.ok) {
        throw new Error('Fallo al subir la imagen directamente al bucket de Storage.');
      }

      // 4. Éxito
      console.log('Firma guardada en la ruta estructurada. URL pública:', publicUrl);
      alert('¡Firma electrónica guardada y estructurada correctamente en el bucket!');
      this.cambiarVista('listado');

    } catch (error: any) {
      console.error('Error en el proceso:', error);
      alert(error.message || 'Hubo un error al almacenar la firma.');
    } finally {
      this.isGeneratingAI.set(false);
      this.cdr.detectChanges();
    }
  }
  imprimirReceta() {
    window.print();
  }

  guardarReceta() {
    if (this.recetaForm.invalid) {
      alert('Por favor complete los campos obligatorios.');
      return;
    }
    this.isLoading.set(true);
    setTimeout(() => {
      this.isLoading.set(false);
      alert('¡Receta médica guardada con éxito!');
      this.cambiarVista('listado');
    }, 1200);
  }

  volverAlHome() {
    this.router.navigate(['/home']);
  }
}
