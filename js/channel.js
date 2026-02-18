// ========== وظائف قناة المطور ==========
const Channel = {
    isSubscribed: false,

    // فتح دردشة القناة
    openChannelChat() {
        Chat.closeChat();
        this.closeChannelChat();

        const subscribeBtn = document.getElementById('subscribeBtn');
        const channelInput = document.getElementById('channelMessageInput');
        const channelSendBtn = document.getElementById('channelSendBtn');
        
        this.isSubscribed = Auth.currentUser.subscribedChannel || false;
        
        if (this.isSubscribed) {
            subscribeBtn.innerText = 'مشترك ✓';
            subscribeBtn.classList.add('subscribed');
            channelInput.disabled = false;
            channelSendBtn.disabled = false;
            channelInput.placeholder = 'اكتب رسالة...';
        } else {
            subscribeBtn.innerText = 'اشتراك';
            subscribeBtn.classList.remove('subscribed');
            channelInput.disabled = true;
            channelSendBtn.disabled = true;
            channelInput.placeholder = 'اشترك لترسل رسالة...';
        }

        document.getElementById('channelSubscriberCount').innerText = '725,430 مشترك';
        document.getElementById('channelChatRoom').classList.add('open');
    },

    // إغلاق دردشة القناة
    closeChannelChat() {
        document.getElementById('channelChatRoom').classList.remove('open');
    },

    // تبديل حالة الاشتراك
    async toggleSubscribe() {
        if (!Auth.currentUser) return;
        
        this.isSubscribed = !this.isSubscribed;
        Auth.currentUser.subscribedChannel = this.isSubscribed;
        
        try {
            await Auth.updateUserField('subscribedChannel', this.isSubscribed);
        } catch (error) {
            console.error(error);
        }

        const subscribeBtn = document.getElementById('subscribeBtn');
        const channelInput = document.getElementById('channelMessageInput');
        const channelSendBtn = document.getElementById('channelSendBtn');

        if (this.isSubscribed) {
            subscribeBtn.innerText = 'مشترك ✓';
            subscribeBtn.classList.add('subscribed');
            channelInput.disabled = false;
            channelSendBtn.disabled = false;
            channelInput.placeholder = 'اكتب رسالة...';
            this.addChannelMessage('🎉 شكراً لاشتراكك في القناة!', true);
        } else {
            subscribeBtn.innerText = 'اشتراك';
            subscribeBtn.classList.remove('subscribed');
            channelInput.disabled = true;
            channelSendBtn.disabled = true;
            channelInput.placeholder = 'اشترك لترسل رسالة...';
        }
    },

    // إضافة رسالة إلى القناة
    addChannelMessage(text, isSystem = false) {
        const container = document.getElementById('channelMessagesContainer');
        const msgDiv = document.createElement('div');
        msgDiv.className = 'message received';
        if (isSystem) {
            msgDiv.style.background = '#fff3cd';
            msgDiv.style.color = '#856404';
        }
        msgDiv.innerHTML = `
            <div>${text}</div>
            <div class="message-time">${new Date().toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}</div>
        `;
        container.appendChild(msgDiv);
        container.scrollTop = container.scrollHeight;
    },

    // إرسال رسالة في القناة
    sendChannelMessage() {
        const input = document.getElementById('channelMessageInput');
        const text = input.value.trim();
        if (!text || !this.isSubscribed) return;

        this.addChannelMessage(`أنت: ${text}`);
        input.value = '';
    }
};

window.Channel = Channel;