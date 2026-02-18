// ========== تهيئة التطبيق ==========
const App = {
    // تهيئة التطبيق بعد تسجيل الدخول
    init() {
        UI.updateDrawerInfo();
        Chat.loadChatList();
        Channel.isSubscribed = Auth.currentUser.subscribedChannel || false;
    },

    // استعادة الجلسة عند تحميل الصفحة
    loadSession() {
        const saved = localStorage.getItem('currentUser');
        if (saved) {
            Auth.currentUser = JSON.parse(saved);
            Channel.isSubscribed = Auth.currentUser.subscribedChannel || false;
            document.getElementById('authContainer').classList.add('hidden');
            document.getElementById('mainApp').classList.remove('hidden');
            this.init();
        } else {
            UI.showLogin();
        }
    }
};

// ربط دوال المصادقة العامة (للاستخدام من onclick)
window.signUp = Auth.signUp.bind(Auth);
window.login = Auth.login.bind(Auth);

// تشغيل استعادة الجلسة عند تحميل الصفحة
window.onload = () => App.loadSession();