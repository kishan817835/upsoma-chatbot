import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-root',
  imports: [],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('frontendui');
  
  constructor() {
    // Initialize Angular chat widget
    this.initAngularChatWidget();
  }
  
  private initAngularChatWidget() {
    console.log('Angular Chat Widget: Initializing...');
    
    // Configure widget
    (window as any).AI_CHAT_CONFIG = {
      apiUrl: 'http://localhost:3000',
      position: 'bottom-right',
      theme: 'blue',
      title: 'AI Assistant',
      welcomeMessage: '🤖 Hello! I\'m here to help you find information from your documents. What would you like to know?',
      placeholder: 'Ask me anything about your documents...'
    };
    
    // Load the chat widget script
    this.loadChatWidgetScript();
  }
  
  private loadChatWidgetScript() {
    const script = document.createElement('script');
    script.src = '/ai-chat-complete.js';
    script.onload = () => {
      console.log('Angular Chat Widget: Script loaded successfully');
    };
    script.onerror = () => {
      console.error('Angular Chat Widget: Failed to load script');
    };
    document.body.appendChild(script);
  }
}
