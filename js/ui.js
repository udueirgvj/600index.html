// ========== وظائف واجهة المستخدم ==========
const UI = {
    // تبديل شاشات المصادقة
    showLogin() {
        document.getElementById('loginContainer').classList.remove('hidden');
        document.getElementById('signupContainer').classList.add('hidden');
    },

    showSignup() {
        document.getElementById('loginContainer').classList.add('hidden');
        document.getElementById('signupContainer').classList.remove('hidden');
    },

    // تحديث معلومات القائمة الجانبية
    updateDrawerInfo() {
        document.getElementById('drawerFullName').innerText = Auth.currentUser.fullName;
        document.getElementById('drawerUsername').innerText = '@' + Auth.currentUser.username;
        const avatarDiv = document.getElementById('drawerAvatar');
        if (Auth.currentUser.photoURL) {
            avatarDiv.innerHTML = `<img src="${Auth.currentUser.photoURL}" alt="avatar">`;
        } else {
            avatarDiv.innerHTML = '<span>👤</span>';
        }
    },

    // القائمة الجانبية
    toggleDrawer() {
        document.getElementById('drawer').classList.toggle('open');
        document.getElementById('drawerOverlay').classList.toggle('open');
    },

    closeDrawer() {
        document.getElementById('drawer').classList.remove('open');
        document.getElementById('drawerOverlay').classList.remove('open');
    },

    // البحث
    toggleSearch() {
        const searchBar = document.getElementById('searchBar');
        searchBar.classList.toggle('show');
        if (searchBar.classList.contains('show')) {
            document.getElementById('searchInput').focus();
        } else {
            document.getElementById('searchResults').classList.remove('show');
        }
    },

    closeSearch() {
        document.getElementById('searchBar').classList.remove('show');
        document.getElementById('searchResults').classList.remove('show');
        document.getElementById('searchInput').value = '';
    },

    // تغيير الصورة الشخصية
    changePhoto() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = async (event) => {
                    const photoURL = event.target.result;
                    await Auth.updateUserField('photoURL', photoURL);
                    this.updateDrawerInfo();
                    alert('تم تغيير الصورة بنجاح');
                };
                reader.readAsDataURL(file);
            }
        };
        input.click();
        this.closeDrawer();
    },

    // تعديل الاسم
    editName() {
        const newName = prompt('أدخل الاسم الجديد:', Auth.currentUser.fullName);
        if (newName && newName.trim()) {
            Auth.updateUserField('fullName', newName.trim());
            alert('تم تحديث الاسم');
        }
        this.closeDrawer();
    },

    // تعديل اسم المستخدم
    async editUsername() {
        const newUsername = prompt('أدخل اسم المستخدم الجديد (5 أحرف إنجليزية أو أرقام على الأقل):');
        if (newUsername && Auth.isValidUsername(newUsername)) {
            const snapshot = await db.ref('users').orderByChild('username').equalTo(newUsername).once('value');
            if (snapshot.exists()) {
                alert('اسم المستخدم موجود بالفعل');
                return;
            }
            await Auth.updateUserField('username', newUsername);
            alert('تم تحديث اسم المستخدم');
        } else {
            alert('اسم مستخدم غير صالح');
        }
        this.closeDrawer();
    },

    // إضافة نبذة
    editBio() {
        const bio = prompt('أدخل نبذة عنك:', Auth.currentUser.bio || '');
        if (bio !== null) {
            Auth.updateUserField('bio', bio);
            alert('تم تحديث النبذة');
        }
        this.closeDrawer();
    },

    // عرض البريد
    viewEmail() {
        const email = prompt('أدخل بريدك الإلكتروني (للعرض فقط):', Auth.currentUser.email || '');
        if (email !== null) {
            Auth.updateUserField('email', email);
            alert('تم تحديث البريد');
        }
        this.closeDrawer();
    },

    // تغيير كلمة المرور
    changePassword() {
        const newPass = prompt('أدخل كلمة المرور الجديدة (6 أحرف على الأقل):');
        if (newPass && newPass.length >= 6) {
            Auth.updateUserField('password', newPass);
            alert('تم تغيير كلمة المرور');
        } else {
            alert('كلمة المرور قصيرة');
        }
        this.closeDrawer();
    },

    // الوضع الداكن
    toggleDarkMode() {
        document.body.classList.toggle('dark-mode');
        this.closeDrawer();
    },

    // إعدادات مؤقتة
    showSettings(type) {
        alert(`إعدادات ${type} - سيتم تفعيلها قريباً`);
        this.closeDrawer();
    },

    // السلاله شاعه
    openSharea() {
        alert('قسم "السلاله شاعه" قيد التطوير');
        this.closeDrawer();
    }
};

window.UI = UI;