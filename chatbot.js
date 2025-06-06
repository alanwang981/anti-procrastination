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
    
    // Integrating AI chatbot
    async getAIResponse(messages) {
      const API_ENDPOINT = "https://your-service.onrender.com/chat";
      
      try {
        const response = await fetch(API_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages,
            system: "You're a productivity assistant. Keep responses under 3 sentences."
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data.response;
        
      } catch (error) {
        console.error("API Error:", error);
        // Smart fallback based on last message
        const lastMsg = messages[messages.length-1]?.content.toLowerCase() || "";
        
        if (lastMsg.includes("focus") || lastMsg.includes("tips")) return "Try the Pomodoro technique: 25min work + 5min break";
        if (lastMsg.includes("distract")) return "Consider using Focus Mode to block distractions";
        return "I'm having temporary connection issues. Try asking about productivity techniques!";
      }
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