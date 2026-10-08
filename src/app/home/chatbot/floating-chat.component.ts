import { Component, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common'; // <-- Necesario para *ngIf, *ngFor, [ngClass]
import { FormsModule } from '@angular/forms';
interface Message {
  sender: 'doctor' | 'bot';
  text: string;
  time: string;
}

@Component({
  selector: 'app-floating-chat',
  templateUrl: 'floating-chat.component.html',
  imports: [CommonModule, FormsModule], // <-- Agrégalos aquí
})
export class FloatingChatComponent implements AfterViewChecked {
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  isOpen = false;
  newMessage = '';

  messages: Message[] = [
    {
      sender: 'bot',
      text: 'Hola, Doctor/a. Bienvenido al asistente de incidencias. ¿Qué reporte o pregunta desea realizar?',
      time: this.getCurrentTime()
    }
  ];

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  toggleChat() {
    this.isOpen = !this.isOpen;
  }

  sendMessage() {
    if (!this.newMessage.trim()) return;

    // Agregar mensaje del doctor
    const userText = this.newMessage;
    this.messages.push({
      sender: 'doctor',
      text: userText,
      time: this.getCurrentTime()
    });

    this.newMessage = '';

    // Simular respuesta del bot o llamada a tu API / backend
    setTimeout(() => {
      this.handleBotResponse(userText);
    }, 1000);
  }

  handleBotResponse(query: string) {
    let reply = 'He registrado su reporte correctamente. El equipo técnico lo revisará a la brevedad.';

    const lowerQuery = query.toLowerCase();
    if (lowerQuery.includes('error') || lowerQuery.includes('falla') || lowerQuery.includes('sistema')) {
      reply = '⚠️ Entendido. He creado un ticket de soporte urgente con base en su descripción.';
    } else if (lowerQuery.includes('receta') || lowerQuery.includes('paciente')) {
      reply = '💡 Para dudas sobre el módulo clínico, recuerde verificar que los datos del paciente estén guardados.';
    }

    this.messages.push({
      sender: 'bot',
      text: reply,
      time: this.getCurrentTime()
    });
  }

  getCurrentTime(): string {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  private scrollToBottom(): void {
    try {
      if (this.scrollContainer) {
        this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
      }
    } catch (err) {}
  }
}
