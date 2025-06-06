document.addEventListener('DOMContentLoaded', () => {
  // Chatbot functionality
  class Chatbot {
    constructor() {
      this.container = document.querySelector('.chatbot-container');
      this.messagesEl = document.querySelector('.chatbot-messages');
      this.inputEl = document.querySelector('.chatbot-text');
      this.sendBtn = document.querySelector('.chatbot-send');
      this.closeBtn = document.querySelector('.chatbot-close');
      
      this.chatHistory = [];
      this.isTyping = false;
      
      this.init();
      this.checkProactiveMessage();
      
      // Add initial greeting
      this.addMessage("Hello! I'm your productivity assistant. How can I help you today?", 'bot');
    }
    
    init() {
      this.sendBtn.addEventListener('click', () => this.handleSend());
      this.inputEl.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !this.isTyping) this.handleSend();
      });
      
      this.closeBtn.addEventListener('click', () => {
        window.close();
      });
    }
    
    async handleSend() {
      const text = this.inputEl.value.trim();
      if (text && !this.isTyping) {
        this.addMessage(text, 'user');
        this.inputEl.value = '';
        this.chatHistory.push({role: "user", content: text});
        
        this.showTypingIndicator();
        this.isTyping = true;
        
        try {
          const response = await this.getAIResponse(this.chatHistory);
          this.addMessage(response, 'bot');
          this.chatHistory.push({role: "assistant", content: response});
        } catch (error) {
          console.error("AI Error:", error);
          this.addMessage("I'm having trouble connecting to the AI service. Please try again later.", 'bot');
        }
        
        this.isTyping = false;
        this.hideTypingIndicator();
      }
    }
    
    async getAIResponse(messages) {
      // You'll need to replace this with actual API calls
      // Here's an example using the fetch API to call your backend
      
      // IMPORTANT: For security, don't put API keys in frontend code
      // Instead, set up a backend service that your extension calls
      
      const response = await fetch('YOUR_BACKEND_ENDPOINT', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messages,
          // Add context about being a productivity assistant
          system: "You are a helpful productivity assistant designed to help users stay focused and avoid procrastination. Provide concise, actionable advice and encouragement."
        })
      });
      
      if (!response.ok) {
        throw new Error("API request failed");
      }
      
      const data = await response.json();
      return data.response;
    }
    
    showTypingIndicator() {
      const typingDiv = document.createElement('div');
      typingDiv.className = 'typing-indicator';
      typingDiv.innerHTML = '<span></span><span></span><span></span>';
      typingDiv.id = 'typing-indicator';
      this.messagesEl.appendChild(typingDiv);
      this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
    }
    
    hideTypingIndicator() {
      const indicator = document.getElementById('typing-indicator');
      if (indicator) {
        this.messagesEl.removeChild(indicator);
      }
    }
    
    addMessage(text, sender) {
      const messageDiv = document.createElement('div');
      messageDiv.className = `message ${sender}-message`;
      messageDiv.textContent = text;
      this.messagesEl.appendChild(messageDiv);
      this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
    }
    
    checkProactiveMessage() {
      const urlParams = new URLSearchParams(window.location.search);
      const proactiveType = urlParams.get('proactive');
      
      if (proactiveType === 'reminder') {
        this.addMessage("I notice you're not on a whitelisted site. Remember your goals!", 'bot');
        setTimeout(() => {
          this.addMessage("Would you like help getting back to a productive task?", 'bot');
        }, 1500);
      } else if (proactiveType === 'encouragement') {
        this.addMessage("Great job staying focused! You're making excellent progress!", 'bot');
      }
    }
  }

  // Initialize the chatbot
  new Chatbot();
});