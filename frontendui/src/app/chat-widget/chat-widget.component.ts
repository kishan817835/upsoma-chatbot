import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-chat-widget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-widget.component.html',
  styleUrls: ['./chat-widget.component.css']
})
export class ChatWidgetComponent {
  isOpen = false;
  messages: Array<{text: string, sender: 'user' | 'bot', time: string}> = [];
  currentMessage = '';
  isLoading = false;
  sessionId = 'user-' + Math.random().toString(36).substr(2, 9); // Generate unique session ID

  private readonly API_BASE = 'http://localhost:3000';
  config = {
    apiUrl: 'http://localhost:3000',
    position: 'bottom-right',
    theme: 'blue',
    title: 'AI Assistant',
    welcomeMessage: '🤖 Hello! I\'m here to help you find information from your documents. What would you like to know?',
    placeholder: 'Ask me anything about your documents...',
    zIndex: 999999
  };

  constructor(private cdr: ChangeDetectorRef) {
    // Check for global configuration
    if (typeof window !== 'undefined' && (window as any).AI_CHAT_CONFIG) {
      this.config = { ...this.config, ...(window as any).AI_CHAT_CONFIG };
    }
    
    // Initialize with welcome message
    this.messages.push({
      text: this.config.welcomeMessage,
      sender: 'bot',
      time: this.getCurrentTime()
    });
  }

  toggleChat() {
    this.isOpen = !this.isOpen;
    this.cdr.detectChanges();
  }

  async sendMessage() {
    if (!this.currentMessage.trim() || this.isLoading) return;

    const userMessage = this.currentMessage;
    
    // Add user message immediately
    this.messages.push({
      text: userMessage,
      sender: 'user',
      time: this.getCurrentTime()
    });

    this.currentMessage = '';
    this.isLoading = true;
    this.cdr.detectChanges();

    // Add typing indicator
    this.addTypingIndicator();

    try {
      const response = await fetch(`${this.config.apiUrl}/v1/chatbot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          message: userMessage,
          sessionId: this.sessionId 
        })
      });

      const result = await response.json();

      // Remove typing indicator
      this.removeTypingIndicator();

      if (result.success) {
        let botResponse = result.response;
        
        // Add contextual query info if available
        if (result.contextual_query && result.contextual_query !== userMessage) {
          botResponse += `\n\n*(Searched for: "${result.contextual_query}")*`;
        }
        
        // Add suggestions if available
        if (result.suggestions && result.suggestions.length > 0) {
          botResponse += `\n\n💡 *You might also be interested in: ${result.suggestions.map((s: any) => s.text).join(', ')}*`;
        }

        this.messages.push({
          text: botResponse,
          sender: 'bot',
          time: this.getCurrentTime()
        });
      } else {
        this.messages.push({
          text: 'Sorry, I encountered an error while processing your request.',
          sender: 'bot',
          time: this.getCurrentTime()
        });
      }
    } catch (error) {
      // Remove typing indicator
      this.removeTypingIndicator();
      
      this.messages.push({
        text: 'Sorry, I encountered an error while connecting to the server.',
        sender: 'bot',
        time: this.getCurrentTime()
      });
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  handleKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  private getCurrentTime(): string {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  formatMessage(text: string): string {
    // Convert **bold** to <strong>
    let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Convert bullet points with better formatting
    if (formatted.includes('•')) {
      const lines = formatted.split('\n');
      let inList = false;
      let htmlLines = [];
      
      lines.forEach(line => {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('•')) {
          if (!inList) {
            htmlLines.push('<ul class="chat-points">');
            inList = true;
          }
          const bulletContent = trimmedLine.substring(1).trim();
          // Handle nested bold formatting in bullet points
          const formattedBullet = bulletContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
          htmlLines.push(`<li>${formattedBullet}</li>`);
        } else {
          if (inList) {
            htmlLines.push('</ul>');
            inList = false;
          }
          if (trimmedLine) {
            htmlLines.push(`<p>${trimmedLine}</p>`);
          }
        }
      });
      
      if (inList) {
        htmlLines.push('</ul>');
      }
      
      formatted = htmlLines.join('');
    } else {
      formatted = formatted.replace(/\n/g, '<br>');
    }
    
    return formatted;
  }

  private addTypingIndicator() {
    this.messages.push({
      text: 'TYPING_INDICATOR',
      sender: 'bot',
      time: this.getCurrentTime()
    });
  }

  private removeTypingIndicator() {
    this.messages = this.messages.filter(msg => msg.text !== 'TYPING_INDICATOR');
  }

  get themeColors() {
    const themes = {
      blue: {
        primary: '#1976d2',
        secondary: '#1565c0',
        hover: '#1565c0'
      },
      green: {
        primary: '#4caf50',
        secondary: '#388e3c',
        hover: '#388e3c'
      },
      purple: {
        primary: '#9c27b0',
        secondary: '#7b1fa2',
        hover: '#7b1fa2'
      }
    };
    return themes[this.config.theme as keyof typeof themes] || themes.blue;
  }

  get containerPosition() {
    const positions = {
      'bottom-right': 'bottom: 20px; right: 20px;',
      'bottom-left': 'bottom: 20px; left: 20px;',
      'top-right': 'top: 20px; right: 20px;',
      'top-left': 'top: 20px; left: 20px;'
    };
    return positions[this.config.position as keyof typeof positions] || positions['bottom-right'];
  }

  get windowPosition() {
    const isBottom = this.config.position.includes('bottom');
    const isRight = this.config.position.includes('right');
    return {
      bottom: isBottom ? '80px' : 'auto',
      top: !isBottom ? '80px' : 'auto',
      right: isRight ? '0' : 'auto',
      left: !isRight ? '0' : 'auto'
    };
  }
}
