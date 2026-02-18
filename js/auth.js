// ========== نظام المصادقة ==========
const Auth = {
    // المستخدم الحالي
    currentUser: null,

    // التحقق من صحة اسم المستخدم
    isValidUsername(username) {
        return /^[A-Za-z0-9_]{5,}$/.test(username);
    },

    // إنشاء حساب جديد
    async signUp() {
        const fullName = document.getElementById('signupFullname').value.trim();
        const username = document.getElementById('signupUsername').value.trim();
        const password = document.getElementById('signupPassword').value.trim();
        const confirm = document.getElementById('signupConfirm').value.trim();

        document.getElementById('signupError').innerText = '';
        document.getElementById('signupSuccess').innerText = '';

        if (!fullName || !username || !password || !confirm) {
            document.getElementById('signupError').innerText = 'جميع الحقول مطلوبة';
            return;
        }
        if (!this.isValidUsername(username)) {
            document.getElementById('signupError').innerText = 'اسم المستخدم: 5 أحرف إنجليزية أو أرقام على الأقل';
            return;
        }
        if (password.length < 6) {
            document.getElementById('signupError').innerText = 'كلمة المرور 6 أحرف على الأقل';
            return;
        }
        if (password !== confirm) {
            document.getElementById('signupError').innerText = 'كلمة المرور غير متطابقة';
            return;
        }

        try {
            const snapshot = await db.ref('users').orderByChild('username').equalTo(username).once('value');
            if (snapshot.exists()) {
                document.getElementById('signupError').innerText = 'اسم المستخدم موجود بالفعل';
                return;
            }

            const newUserRef = db.ref('users').push();
            const uid = newUserRef.key;
            const userData = {
                uid,
                fullName,
                username,
                password,
                bio: '',
                photoURL: '',
                email: '',
                subscribedChannel: false,
                createdAt: new Date().toISOString()
            };

            await newUserRef.set(userData);

            this.currentUser = { 
                uid, 
                username, 
                fullName, 
                photoURL: '', 
                bio: '', 
                email: '',
                subscribedChannel: false 
            };
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));

            document.getElementById('signupSuccess').innerText = 'تم إنشاء الحساب! جاري التحويل...';
            setTimeout(() => {
                document.getElementById('authContainer').classList.add('hidden');
                document.getElementById('mainApp').classList.remove('hidden');
                App.init();
            }, 1500);
        } catch (error) {
            document.getElementById('signupError').innerText = 'حدث خطأ، حاول مرة أخرى';
        }
    },

    // تسجيل الدخول
    async login() {
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value.trim();
        const errorDiv = document.getElementById('loginError');

        if (!username || !password) {
            errorDiv.innerText = 'أدخل اسم المستخدم وكلمة المرور';
            return;
        }

        try {
            const snapshot = await db.ref('users').orderByChild('username').equalTo(username).once('value');
            if (!snapshot.exists()) {
                errorDiv.innerText = 'الحساب غير موجود. أنشئ حساباً أولاً.';
                return;
            }

            let userData;
            snapshot.forEach(child => userData = child.val());

            if (userData.password !== password) {
                errorDiv.innerText = 'كلمة المرور غير صحيحة';
                return;
            }

            this.currentUser = {
                uid: userData.uid,
                username: userData.username,
                fullName: userData.fullName,
                photoURL: userData.photoURL || '',
                bio: userData.bio || '',
                email: userData.email || '',
                subscribedChannel: userData.subscribedChannel || false
            };

            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            window.Channel.isSubscribed = this.currentUser.subscribedChannel;

            document.getElementById('authContainer').classList.add('hidden');
            document.getElementById('mainApp').classList.remove('hidden');
            App.init();
        } catch (error) {
            errorDiv.innerText = 'خطأ في تسجيل الدخول';
        }
    },

    // تسجيل الخروج
    logout() {
        localStorage.removeItem('currentUser');
        if (window.Chat && window.Chat.messagesListener) {
            window.Chat.messagesListener.off();
        }
        if (window.Chat && window.Chat.chatListListener) {
            window.Chat.chatListListener.off();
        }
        this.currentUser = null;
        document.getElementById('mainApp').classList.add('hidden');
        document.getElementById('authContainer').classList.remove('hidden');
        UI.showLogin();
        UI.closeDrawer();
        Channel.closeChannelChat();
    },

    // تحديث حقل في قاعدة البيانات والمحلي
    async updateUserField(field, value) {
        try {
            const userSnapshot = await db.ref('users').orderByChild('uid').equalTo(this.currentUser.uid).once('value');
            userSnapshot.forEach(child => {
                child.ref.update({ [field]: value });
            });
            this.currentUser[field] = value;
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            UI.updateDrawerInfo();
            return true;
        } catch (error) {
            console.error(error);
            return false;
        }
    }
};

window.Auth = Auth;