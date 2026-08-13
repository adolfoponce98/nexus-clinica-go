import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LucideAngularModule, X } from 'lucide-angular';
import { TypeClassModel } from '../../home.model'; // Ajusta la ruta a tu modelo

@Component({
  selector: 'app-type-class-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './type-class-modal.component.html'
})
export class TypeClassModalComponent {
  readonly icons = { X };

  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<TypeClassModel>();

  typeClassForm: FormGroup;
  typeClasses = signal<TypeClassModel[]>([]);

  constructor(private fb: FormBuilder) {
    this.typeClassForm = this.fb.group({
      name: ['', Validators.required],
      descripcion: ['', Validators.required],
      duracion: ['', Validators.required],
      dificultad: [1, Validators.required]
    });
  }

  getDificultadColor(d: number): string {
    const colors = ['bg-emerald-500', 'bg-violet-500', 'bg-orange-500', 'bg-rose-600'];
    return colors[d - 1] || 'bg-zinc-400';
  }

  onSave() {
    if (this.typeClassForm.valid) {
      const nuevo: TypeClassModel = this.typeClassForm.value;
      this.typeClasses.update(list => [...list, nuevo]);
      this.save.emit(nuevo); // Emites el dato al padre si deseas guardarlo allá
      this.typeClassForm.reset({ dificultad: 1 });
    }
  }

  deleteItem(index: number) {
    this.typeClasses.update(list => list.filter((_, i) => i !== index));
  }

  onClose() {
    this.close.emit();
  }
}