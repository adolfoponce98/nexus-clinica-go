import { Component, EventEmitter, Input, Output, signal, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LucideAngularModule, X, Edit2 } from 'lucide-angular';
import { TypeClassModel } from '../../home.model';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import { AuthService } from '../../../auth/auth.service';

@Component({
  selector: 'app-type-class-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './type-class-modal.component.html'
})
export class TypeClassModalComponent implements OnChanges {
  readonly icons = { X, Edit2 };
  userData: any = null;
  @Input() isOpen = false;
  @Input() idBranch: string = '';
  @Output() close = new EventEmitter<void>();
  @Output() updateList = new EventEmitter<TypeClassModel[]>();

  private authService = inject(AuthService);

  typeClassForm: FormGroup;
  typeClasses = signal<TypeClassModel[]>([]);
  editingIndex: number | null = null;

  constructor(private fb: FormBuilder) {
    this.typeClassForm = this.fb.group({
      name: ['', Validators.required],
      descripcion: ['', Validators.required],
      duracion: ['', Validators.required],
      dificultad: [1, Validators.required]
    });
  }

  // Cada vez que se abra el modal, cargamos directamente de la memoria local (AuthService)
  ngOnChanges(changes: SimpleChanges) {
    if (changes['isOpen'] && this.isOpen) {
      this.cargarClasesDesdeMemoriaLocal();
    }
  }

    ngOnInit(): void {
        this.userData = this.authService.getSession();
        this.idBranch =  this.userData?.brancheInUser?.[0] || ""
 }

cargarClasesDesdeMemoriaLocal() {
    const sucursal = this.authService.getSucursal();
    console.log("DATOSDESUCURSAL", sucursal?.branchInfo?.typeClasses);

    // Verificamos si existen clases guardadas localmente en branchInfo
    if (sucursal && sucursal.branchInfo && sucursal.branchInfo.typeClasses) {
      this.typeClasses.set(sucursal.branchInfo.typeClasses); // 🌟 Corregido (typeClasses)
    } else {
      this.typeClasses.set([]);
    }
  }

  getDificultadColor(d: number): string {
    const colors = ['bg-emerald-500', 'bg-violet-500', 'bg-orange-500', 'bg-rose-600'];
    return colors[d - 1] || 'bg-zinc-400';
  }

  seleccionarParaEditar(index: number) {
    const item = this.typeClasses()[index];
    this.editingIndex = index;
    this.typeClassForm.patchValue({
      name: item.name,
      descripcion: item.descripcion,
      duracion: item.duracion,
      dificultad: item.dificultad
    });
  }

 // 2. Guardar o actualizar (Remoto y Local)
  async onSave() {
    if (this.typeClassForm.valid) {
      const formValues: TypeClassModel = this.typeClassForm.value;
      const currentList = [...this.typeClasses()];

      if (this.editingIndex !== null) {
        currentList[this.editingIndex] = formValues;
      } else {
        currentList.push(formValues);
      }

      try {
        const db = getFirestore();
        const branchRef = doc(db, 'branches', this.idBranch);

        // 1. Actualizar en Firebase (Remoto)
        await updateDoc(branchRef, {
          typeClasses: currentList
        });

        // 2. Actualizar en la sesión/memoria local mediante AuthService
        const sucursal = this.authService.getSucursal();
        if (sucursal && sucursal.branchInfo) {
          sucursal.branchInfo.typeClasses = currentList;

          // 🌟 Asegúrate de persistir el cambio en el almacenamiento local del navegador (ej. localStorage)
          // Dependiendo de cómo lo guarde tu AuthService, puedes usar una de estas opciones:

          // Opción A (Si tu AuthService tiene un método dedicado):
          // this.authService.updateLocalSucursal(sucursal);

          // Opción B (Si se guarda directamente en localStorage bajo una llave, por ejemplo 'sucursal' o 'session'):
          localStorage.setItem('sucursal', JSON.stringify(sucursal));
          // O si actualiza todo el objeto de sesión:
          // const session = this.authService.getSession();
          // session.sucursal = sucursal;
          // localStorage.setItem('session', JSON.stringify(session));
        }

        // 3. Actualizamos señal local y emitimos al componente padre
        this.typeClasses.set(currentList);
        this.updateList.emit(currentList);

        this.resetForm();
      } catch (error) {
        console.error('Error al actualizar clases en Firebase:', error);
        alert('No se pudo guardar la clase.');
      }
    }
  }

  // 3. Eliminar clase (Remoto y Local)
  async deleteItem(index: number) {
    const currentList = [...this.typeClasses()];
    currentList.splice(index, 1);

    try {
      const db = getFirestore();
      const branchRef = doc(db, 'branches', this.idBranch);

      // Actualizar en Firebase (Remoto)
      await updateDoc(branchRef, {
        typeClasses: currentList
      });

      // Actualizar en memoria local
      const sucursal = this.authService.getSucursal();
      if (sucursal && sucursal.branchInfo) {
        sucursal.branchInfo.typeClasses = currentList;
      }

      this.typeClasses.set(currentList);
      this.updateList.emit(currentList);

      if (this.editingIndex === index) {
        this.resetForm();
      }
    } catch (error) {
      console.error('Error al eliminar clase:', error);
      alert('No se pudo eliminar la clase.');
    }
  }

  resetForm() {
    this.typeClassForm.reset({ dificultad: 1 });
    this.editingIndex = null;
  }

  onClose() {
    this.resetForm();
    this.close.emit();
  }
}
