// ========== وظائف الدردشة ==========
const Chat = {
    currentChatUser: null,
    currentChatId: null,
    messagesListener: null,
    chatListListener: null,

    // تحميل قائمة المحادثات
    loadChatList() {
        const messagesRef = db.ref('messages');
        this.chatListListener = messagesRef.on('value', (snapshot) => {
            const conversations = new Map();

            snapshot.forEach(chatSnapshot => {
                const messages = chatSnapshot.val();
                Object.values(messages).forEach(msg => {
                    if (msg.senderId === Auth.currentUser.uid || msg.receiverId === Auth.currentUser.uid) {
                        const otherId = msg.senderId === Auth.currentUser.uid ? msg.receiverId : msg.senderId;
                        if (!conversations.has(otherId) || conversations.get(otherId).timestamp < msg.timestamp) {
                            conversations.set(otherId, {
                                userId: otherId,
                                lastMessage: msg.text,
                                timestamp: msg.timestamp
                            });
                        }
                    }
                });
            });

            const chatList = Array.from(conversations.values()).sort((a, b) => b.timestamp - a.timestamp);
            this.renderChatList(chatList);
        });
    },

    // عرض قائمة المحادثات
    async renderChatList(chatList) {
        const container = document.getElementById('chatListContainer');
        container.innerHTML = '';

        for (let item of chatList) {
            const userSnapshot = await db.ref('users').orderByChild('uid').equalTo(item.userId).once('value');
            if (!userSnapshot.exists()) continue;
            let userData;
            userSnapshot.forEach(child => userData = child.val());

            const chatItem = document.createElement('div');
            chatItem.className = 'chat-list-item';
            chatItem.onclick = () => this.openChat(userData);

            const avatar = document.createElement('div');
            avatar.className = 'chat-avatar';
            if (userData.photoURL) {
                avatar.innerHTML = `<img src="${userData.photoURL}" alt="avatar">`;
            } else {
                avatar.innerText = userData.fullName.charAt(0);
            }

            const info = document.createElement('div');
            info.className = 'chat-info';
            info.innerHTML = `
                <div class="chat-name">
                    <span>${userData.fullName}</span>
                    <span class="chat-time">${new Date(item.timestamp).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div class="chat-last-msg">${item.lastMessage || '🗣️ أرسل رسالة'}</div>
            `;

            chatItem.appendChild(avatar);
            chatItem.appendChild(info);
            container.appendChild(chatItem);
        }

        if (chatList.length === 0) {
            container.innerHTML = '<div style="text-align: center; padding: 30px; color: #999;">لا توجد محادثات بعد</div>';
        }
    },

    // فتح محادثة مع مستخدم
    openChat(user) {
        this.currentChatUser = {
            uid: user.uid,
            username: user.username,
            fullName: user.fullName,
            photoURL: user.photoURL
        };

        const ids = [Auth.currentUser.uid, user.uid].sort();
        this.currentChatId = `chat_${ids[0]}_${ids[1]}`;

        document.getElementById('chatName').innerText = user.fullName;
        if (user.photoURL) {
            document.getElementById('chatAvatar').innerHTML = `<img src="${user.photoURL}" style="width:100%;height:100%;border-radius:50%;">`;
        } else {
            document.getElementById('chatAvatar').innerText = user.fullName.charAt(0);
        }

        document.getElementById('chatRoom').classList.add('open');
        this.loadMessages();
    },

    // إغلاق المحادثة
    closeChat() {
        document.getElementById('chatRoom').classList.remove('open');
        if (this.messagesListener) {
            this.messagesListener.off();
            this.messagesListener = null;
        }
        this.currentChatUser = null;
        this.currentChatId = null;
    },

    // تحميل الرسائل
    loadMessages() {
        const messagesRef = db.ref(`messages/${this.currentChatId}`);
        this.messagesListener = messagesRef.orderByChild('timestamp').on('value', (snapshot) => {
            const container = document.getElementById('messagesContainer');
            container.innerHTML = '';

            if (!snapshot.exists()) {
                container.innerHTML = '<div style="text-align:center;color:#999;padding:20px;">أرسل أول رسالة 👋</div>';
                return;
            }

            const messages = [];
            snapshot.forEach(child => messages.push(child.val()));
            messages.sort((a, b) => a.timestamp - b.timestamp);

            messages.forEach(msg => {
                const msgDiv = document.createElement('div');
                msgDiv.className = `message ${msg.senderId === Auth.currentUser.uid ? 'sent' : 'received'}`;
                msgDiv.innerHTML = `
                    <div>${msg.text}</div>
                    <div class="message-time">${new Date(msg.timestamp).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}</div>
                `;
                container.appendChild(msgDiv);
            });

            container.scrollTop = container.scrollHeight;
        });
    },

    // إرسال رسالة
    async sendMessage() {
        const input = document.getElementById('messageInput');
        const text = input.value.trim();
        if (!text || !this.currentChatId) return;

        const messageData = {
            messageId: db.ref().push().key,
            senderId: Auth.currentUser.uid,
            receiverId: this.currentChatUser.uid,
            text,
            timestamp: Date.now()
        };

        try {
            await db.ref(`messages/${this.currentChatId}/${messageData.messageId}`).set(messageData);
            input.value = '';
        } catch (error) {
            alert('فشل الإرسال');
        }
    },

    // فتح الرسائل المحفوظة
    openSavedMessages() {
        this.openChat({
            uid: Auth.currentUser.uid,
            username: Auth.currentUser.username,
            fullName: 'رسائلي المحفوظة',
            photoURL: Auth.currentUser.photoURL
        });
    },

    // البحث عن مستخدمين
    async searchUsers() {
        const query = document.getElementById('searchInput').value.trim();
        const resultsDiv = document.getElementById('searchResults');

        if (query.length < 2) {
            resultsDiv.classList.remove('show');
            return;
        }

        try {
            const snapshot = await db.ref('users').once('value');
            const users = [];
            snapshot.forEach(child => {
                const user = child.val();
                if (user.username.includes(query) && user.uid !== Auth.currentUser.uid) {
                    users.push(user);
                }
            });

            if (users.length === 0) {
                resultsDiv.innerHTML = '<div style="padding: 12px; color: #999;">لا يوجد مستخدمين</div>';
            } else {
                let html = '';
                users.slice(0, 5).forEach(user => {
                    html += `
                        <div class="search-result-item" onclick="Chat.startChatFromSearch('${user.uid}', '${user.username}', '${user.fullName}')">
                            <div class="chat-avatar" style="width: 40px; height: 40px;">${user.fullName.charAt(0)}</div>
                            <div>
                                <div><strong>${user.fullName}</strong></div>
                                <div style="color: #666; font-size: 12px;">@${user.username}</div>
                            </div>
                        </div>
                    `;
                });
                resultsDiv.innerHTML = html;
            }
            resultsDiv.classList.add('show');
        } catch (error) {
            console.error(error);
        }
    },

    // بدء محادثة من نتائج البحث
    startChatFromSearch(uid, username, fullName) {
        UI.closeSearch();
        this.openChat({ uid, username, fullName, photoURL: '' });
    }
};

window.Chat = Chat;