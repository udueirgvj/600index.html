// ===================================================
// chat.js - نسخة تشخيصية للبحث
// ===================================================

let chatListListener = null;

const Chat = {
    currentChatType: null,
    currentChatId: null,
    currentChatUser: null,
    currentChatGroup: null,
    messagesListener: null,
    presenceListeners: {},
    replyToMessage: null,
    forwardMessage: null,

    // دالة البحث عن المستخدمين (نسخة تشخيصية)
    async searchUsers() {
        const query = document.getElementById('searchInput').value.trim().toLowerCase();
        const resultsDiv = document.getElementById('searchResults');

        // إخفاء النتائج إذا كان النص أقل من حرفين
        if (query.length < 2) {
            resultsDiv.classList.remove('show');
            return;
        }

        alert('🔍 جاري البحث عن: ' + query);

        let html = '';

        try {
            // جلب جميع المستخدمين من قاعدة البيانات
            const usersSnap = await db.ref('users').once('value');
            const totalUsers = usersSnap.numChildren();
            alert('📊 عدد المستخدمين الكلي: ' + totalUsers);

            let foundCount = 0;

            usersSnap.forEach(child => {
                const u = child.val();
                // التأكد من أن المستخدم الحالي لا يظهر في النتائج
                if (u.uid === currentUser.uid) return;

                // طباعة معلومات كل مستخدم (للتشخيص)
                console.log('مستخدم:', u.username, '← هل يطابق؟', u.username?.toLowerCase().includes(query));

                // التحقق من وجود اسم المستخدم ومطابقته
                if (u.username && u.username.toLowerCase().includes(query)) {
                    foundCount++;
                    html += `<div class="search-result-item" onclick="Chat.startPrivate('${u.uid}', '${u.username}', '${u.fullName}')">
                        <div class="chat-avatar">${u.fullName ? u.fullName.charAt(0) : '👤'}</div>
                        <div><strong>${u.fullName || 'مستخدم'}</strong><br><span style="color:#666;">@${u.username}</span></div>
                    </div>`;
                }
            });

            alert('✅ عدد النتائج: ' + foundCount);
        } catch (e) {
            alert('❌ خطأ: ' + e.message);
            console.error(e);
        }

        resultsDiv.innerHTML = html || '<div style="padding:12px; color:#999;">لا توجد نتائج</div>';
        resultsDiv.classList.add('show');
    },

    // بدء محادثة خاصة مع مستخدم
    async startPrivate(uid, username, fullName) {
        this.currentChatType = 'private';
        this.currentChatUser = { uid, username, fullName };
        const ids = [currentUser.uid, uid].sort();
        this.currentChatId = `private_${ids[0]}_${ids[1]}`;
        
        const statusSnap = await db.ref(`status/${uid}`).once('value');
        const status = statusSnap.val();
        let statusText = '';
        if (status && status.state === 'online') statusText = '🟢 متصل';
        else {
            const lastSeen = status ? status.lastSeen : null;
            statusText = lastSeen ? `آخر ظهور ${this.timeAgo(lastSeen)}` : 'آخر ظهور غير معروف';
        }

        this.openChatUI(fullName, fullName.charAt(0), statusText);
        this.loadPrivateMessages(uid);
        
        this.presenceListeners[uid] = db.ref(`status/${uid}`).on('value', (snap) => {
            const s = snap.val();
            if (s && s.state === 'online') {
                document.getElementById('chatStatus').innerText = '🟢 متصل';
            } else {
                const lastSeen = s ? s.lastSeen : null;
                document.getElementById('chatStatus').innerText = lastSeen ? `آخر ظهور ${this.timeAgo(lastSeen)}` : 'آخر ظهور غير معروف';
            }
        });
    },

    timeAgo(timestamp) {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        if (seconds < 60) return 'منذ لحظات';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `منذ ${minutes} دقيقة`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `منذ ${hours} ساعة`;
        const days = Math.floor(hours / 24);
        return `منذ ${days} يوم`;
    },

    openChatUI(name, avatarChar, status) {
        document.getElementById('chatName').innerText = name;
        document.getElementById('chatAvatar').innerText = avatarChar;
        document.getElementById('chatStatus').innerText = status;
        document.getElementById('chatRoom').classList.add('open');
    },

    close() {
        document.getElementById('chatRoom').classList.remove('open');
        if (this.messagesListener) this.messagesListener.off();
        Object.values(this.presenceListeners).forEach(listener => listener.off());
        this.presenceListeners = {};
        this.messagesListener = null;
        this.currentChat = null;
        this.currentChatId = null;
        this.currentChatUser = null;
        this.currentGroupId = null;
        this.replyToMessage = null;
        this.forwardMessage = null;
    },

    loadPrivateMessages() {
        const messagesRef = db.ref(`messages/${this.currentChatId}`);
        this.messagesListener = messagesRef.orderByChild('timestamp').on('value', (snap) => {
            this.displayMessages(snap);
        });
    },

    async displayMessages(snapshot) {
        const container = document.getElementById('messagesContainer');
        container.innerHTML = '';
        if (!snapshot.exists()) {
            container.innerHTML = '<div style="text-align:center;color:#999;padding:20px;">أرسل أول رسالة 👋</div>';
            return;
        }
        const messages = [];
        snapshot.forEach(child => messages.push(child.val()));
        messages.sort((a, b) => a.timestamp - b.timestamp);

        for (let msg of messages) {
            const div = document.createElement('div');
            div.className = `message ${msg.senderId === currentUser.uid ? 'sent' : 'received'}`;
            div.innerHTML = `<div>${msg.text}</div><div class="message-time">${new Date(msg.timestamp).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}</div>`;
            container.appendChild(div);
        }
        container.scrollTop = container.scrollHeight;
    },

    async sendMessage() {
        const input = document.getElementById('messageInput');
        const text = input.value.trim();
        if (!text || !this.currentChatId) return;

        const msg = {
            messageId: db.ref().push().key,
            senderId: currentUser.uid,
            receiverId: this.currentChatUser.uid,
            text,
            timestamp: Date.now()
        };
        await db.ref(`messages/${this.currentChatId}/${msg.messageId}`).set(msg);
        input.value = '';
    },

    banUser() { alert('خاصية الحظر قيد التطوير'); }
};

// ===================================================
// قائمة المحادثات (تحميل حقيقي)
// ===================================================
function loadChatList() {
    if (!currentUser) return;
    const uid = currentUser.uid;
    const conversations = new Map();

    db.ref('messages').on('value', (snapshot) => {
        conversations.clear();
        snapshot.forEach(chatSnap => {
            const msgs = chatSnap.val();
            if (msgs && typeof msgs === 'object') {
                Object.values(msgs).forEach(msg => {
                    if (msg.senderId === uid || msg.receiverId === uid) {
                        const otherId = msg.senderId === uid ? msg.receiverId : msg.senderId;
                        if (!conversations.has(otherId) || conversations.get(otherId).timestamp < msg.timestamp) {
                            conversations.set(otherId, {
                                id: otherId,
                                lastMessage: msg.text,
                                timestamp: msg.timestamp
                            });
                        }
                    }
                });
            }
        });
        renderChatList(Array.from(conversations.values()));
    });
}

async function renderChatList(list) {
    const container = document.getElementById('chatListContainer');
    if (!container) return;
    container.innerHTML = '';
    list.sort((a, b) => b.timestamp - a.timestamp);

    for (let item of list) {
        const userSnap = await db.ref('users').orderByChild('uid').equalTo(item.id).once('value');
        if (!userSnap.exists()) continue;
        let user;
        userSnap.forEach(u => user = u.val());

        const statusSnap = await db.ref(`status/${user.uid}`).once('value');
        const status = statusSnap.val();
        const isOnline = status && status.state === 'online';

        const div = document.createElement('div');
        div.className = 'chat-list-item';
        div.innerHTML = `
            <div class="chat-avatar" style="position:relative;">
                ${user.photoURL ? `<img src="${user.photoURL}">` : user.fullName.charAt(0)}
                <span class="${isOnline ? 'online-indicator' : 'offline-indicator'}"></span>
            </div>
            <div class="chat-info">
                <div class="chat-name"><span>${user.fullName}</span><span class="chat-time">${new Date(item.timestamp).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}</span></div>
                <div class="chat-last-msg">${item.lastMessage}</div>
            </div>
        `;
        div.onclick = () => Chat.startPrivate(user.uid, user.username, user.fullName);
        container.appendChild(div);
    }
    if (list.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:30px;color:#999;">لا توجد محادثات بعد</div>';
    }
}

window.Chat = Chat;
window.loadChatList = loadChatList;
