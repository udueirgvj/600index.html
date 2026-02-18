// ===================================================
// chat.js - كل ما يتعلق بالمحادثات والبحث
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

    // دالة البحث عن المستخدمين (مُحسَّنة)
    async searchUsers() {
        const query = document.getElementById('searchInput').value.trim().toLowerCase();
        const resultsDiv = document.getElementById('searchResults');

        // إخفاء النتائج إذا كان النص أقل من حرفين
        if (query.length < 2) {
            resultsDiv.classList.remove('show');
            return;
        }

        let html = '';

        // البحث في Firebase باستخدام orderByChild (أسرع)
        try {
            const usersSnap = await db.ref('users')
                .orderByChild('username')
                .startAt(query)
                .endAt(query + '\uf8ff')
                .limitToFirst(10)
                .once('value');

            usersSnap.forEach(child => {
                const u = child.val();
                if (u.uid !== currentUser.uid) {
                    html += `<div class="search-result-item" onclick="Chat.startPrivate('${u.uid}', '${u.username}', '${u.fullName}')">
                        <div class="chat-avatar">${u.fullName.charAt(0)}</div>
                        <div><strong>${u.fullName}</strong><br><span style="color:#666;">@${u.username}</span></div>
                    </div>`;
                }
            });
        } catch (e) {
            console.log('البحث المتقدم فشل، نستخدم البحث البسيط', e);
            // إذا فشل البحث المتقدم (مثلاً بسبب عدم وجود indexOn)، نستخدم البحث البسيط
            const usersSnap = await db.ref('users').once('value');
            usersSnap.forEach(child => {
                const u = child.val();
                if (u.username && u.username.toLowerCase().includes(query) && u.uid !== currentUser.uid) {
                    html += `<div class="search-result-item" onclick="Chat.startPrivate('${u.uid}', '${u.username}', '${u.fullName}')">
                        <div class="chat-avatar">${u.fullName.charAt(0)}</div>
                        <div><strong>${u.fullName}</strong><br><span style="color:#666;">@${u.username}</span></div>
                    </div>`;
                }
            });
        }

        // عرض النتائج
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

    // دالة مساعدة لحساب الوقت المنقضي
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

    // فتح واجهة الدردشة
    openChatUI(name, avatarChar, status) {
        document.getElementById('chatName').innerText = name;
        document.getElementById('chatAvatar').innerText = avatarChar;
        document.getElementById('chatStatus').innerText = status;
        document.getElementById('chatRoom').classList.add('open');
    },

    // إغلاق الدردشة
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

    // تحميل الرسائل الخاصة
    loadPrivateMessages() {
        const messagesRef = db.ref(`messages/${this.currentChatId}`);
        this.messagesListener = messagesRef.orderByChild('timestamp').on('value', (snap) => {
            this.displayMessages(snap);
        });
    },

    // تحميل رسائل المجموعة (إذا أردت لاحقاً)
    loadGroupMessages(groupId) {
        // يمكن إضافتها لاحقاً
    },

    // عرض الرسائل في الواجهة
    async displayMessages(snapshot, isGroup = false) {
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

    // إرسال رسالة (وهمية حالياً)
    async sendMessage() {
        const input = document.getElementById('messageInput');
        const text = input.value.trim();
        if (!text || !this.currentChatId) return;
        alert('إرسال رسالة: ' + text);
        input.value = '';
    },

    // دالة وهمية (للتوسع لاحقاً)
    banUser() { alert('خاصية الحظر قيد التطوير'); }
};

// ===================================================
// قائمة المحادثات (وهمية للاختبار)
// ===================================================
function loadChatList() {
    const container = document.getElementById('chatListContainer');
    if (!container) return;
    container.innerHTML = `
        <div class="chat-list-item" onclick="alert('فتح محادثة مع وكيل ابو الياس')">
            <div class="chat-avatar">👤</div>
            <div class="chat-info">
                <div class="chat-name"><span>وكيل ابو الياس</span><span class="chat-time">الاثنين</span></div>
                <div class="chat-last-msg">حساب يجي للبيع 🔥</div>
            </div>
        </div>
        <div class="chat-list-item" onclick="alert('فتح محادثة مع سوبر القائد')">
            <div class="chat-avatar">👤</div>
            <div class="chat-info">
                <div class="chat-name"><span>سوبر القائد</span><span class="chat-time">01:00</span></div>
                <div class="chat-last-msg">السلام عليكم يا شبابنا الطيبة</div>
            </div>
        </div>
    `;
}

window.Chat = Chat;
window.loadChatList = loadChatList;
