/* AI Assistant Chat Workspace Controller */

const ChatPage = {
  state: {
    messages: [
      { sender: 'ai', text: 'Hello! I am your Smart Expense AI Assistant. Ask me anything about your monthly spending, savings goals, category budgets, or financial advice!', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    ]
  },

  init() {
    this.bindChatEvents();
    this.renderMessages();
  },

  bindChatEvents() {
    const input = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendChatBtn');
    const chips = document.querySelectorAll('.chip');

    if (sendBtn && input) {
      sendBtn.addEventListener('click', () => this.sendMessage());
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.sendMessage();
      });
    }

    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        if (input) {
          input.value = chip.textContent;
          this.sendMessage();
        }
      });
    });
  },

  async sendMessage() {
    const input = document.getElementById('chatInput');
    if (!input) return;

    const text = input.value.trim();
    if (!text) return;

    // Add user message
    const userMsg = {
      sender: 'user',
      text: text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    this.state.messages.push(userMsg);
    input.value = '';
    this.renderMessages();

    // Show Typing Indicator
    this.showTypingIndicator();

    try {
      const response = await API.sendChatMessage(text);
      this.hideTypingIndicator();

      const aiMsg = {
        sender: 'ai',
        text: response.response,
        time: response.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      this.state.messages.push(aiMsg);
      this.renderMessages();
    } catch (e) {
      this.hideTypingIndicator();
      Utils.showToast(e.message || 'Failed to reach AI assistant', 'danger');
    }
  },

  renderMessages() {
    const container = document.getElementById('chatMessagesContainer');
    if (!container) return;

    const profile = Utils.storage.get('user_profile', { name: 'User' });
    const userInitials = (profile.name || 'U').split(' ').map(n => n[0]).join('').toUpperCase() || 'U';

    container.innerHTML = this.state.messages.map(msg => {
      const isUser = msg.sender === 'user';
      const formattedText = (msg.text || '').replace(/\n/g, '<br>');
      return `
        <div class="message-bubble ${isUser ? 'user-message' : ''}">
          <div class="message-avatar ${isUser ? 'user-avatar' : 'ai-avatar'}">
            ${isUser ? userInitials : '<i class="fa-solid fa-robot"></i>'}
          </div>
          <div>
            <div class="message-content">
              ${formattedText}
            </div>
            <div class="message-time">${msg.time}</div>
          </div>
        </div>
      `;
    }).join('');

    container.scrollTop = container.scrollHeight;
  },

  showTypingIndicator() {
    const container = document.getElementById('chatMessagesContainer');
    if (!container) return;

    const typingEl = document.createElement('div');
    typingEl.id = 'typingIndicator';
    typingEl.className = 'message-bubble';
    typingEl.innerHTML = `
      <div class="message-avatar ai-avatar"><i class="fa-solid fa-robot"></i></div>
      <div class="message-content" style="display: flex; gap: 0.35rem; align-items: center; padding: 0.75rem 1rem;">
        <span class="skeleton" style="width: 8px; height: 8px; border-radius: 50%;"></span>
        <span class="skeleton" style="width: 8px; height: 8px; border-radius: 50%;"></span>
        <span class="skeleton" style="width: 8px; height: 8px; border-radius: 50%;"></span>
      </div>
    `;
    container.appendChild(typingEl);
    container.scrollTop = container.scrollHeight;
  },

  hideTypingIndicator() {
    const el = document.getElementById('typingIndicator');
    if (el) el.remove();
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.includes('chat.html')) {
    ChatPage.init();
  }
});
