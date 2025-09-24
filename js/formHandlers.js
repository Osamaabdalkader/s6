// formHandlers.js - معالجات النماذج
class FormHandlers {
    // معالجة نموذج تسجيل الدخول
    static async handleLoginForm(formData) {
        const email = formData.get('email');
        const password = formData.get('password');

        if (!email || !password) {
            Utils.showStatus('يرجى ملء جميع الحقول', 'error', 'login-status');
            return;
        }

        try {
            Utils.showStatus('جاري تسجيل الدخول...', 'success', 'login-status');
            await Auth.login(email, password);
        } catch (error) {
            Utils.showStatus(`فشل تسجيل الدخول: ${error.message}`, 'error', 'login-status');
        }
    }

    // معالجة نموذج إنشاء حساب
    static async handleRegisterForm(formData) {
        const userData = {
            name: formData.get('name'),
            phone: formData.get('phone'),
            address: formData.get('address'),
            email: formData.get('email'),
            password: formData.get('password'),
            confirmPassword: formData.get('confirmPassword'),
            referralCode: formData.get('referralCode')
        };

        console.log('بيانات التسجيل المستلمة:', userData);

        // التحقق من البيانات
        if (!userData.name || !userData.phone || !userData.address || 
            !userData.email || !userData.password || !userData.confirmPassword) {
            Utils.showStatus('يرجى ملء جميع الحقول الإلزامية', 'error', 'register-status');
            return;
        }

        if (userData.password !== userData.confirmPassword) {
            Utils.showStatus('كلمة المرور غير متطابقة', 'error', 'register-status');
            return;
        }

        if (userData.password.length < 6) {
            Utils.showStatus('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'error', 'register-status');
            return;
        }

        try {
            Utils.showStatus('جاري إنشاء الحساب...', 'success', 'register-status');
            await Auth.register(userData);
        } catch (error) {
            console.error('Error in handleRegisterForm:', error);
        }
    }

    // معالجة نموذج النشر
    static async handlePublishForm(formData) {
        if (!currentUser) {
            Utils.showStatus('يجب تسجيل الدخول لنشر منشور', 'error');
            Navigation.showPage('login');
            return;
        }

        const postData = {
            name: formData.get('name'),
            description: formData.get('description'),
            location: formData.get('location'),
            category: formData.get('category'),
            price: formData.get('price'),
            imageFile: formData.get('image')
        };

        if (!postData.name || !postData.description || !postData.location || 
            !postData.category || !postData.price) {
            Utils.showStatus('يرجى ملء جميع الحقول المطلوبة', 'error');
            return;
        }

        try {
            Utils.showStatus('جاري نشر المنشور...', 'success');
            await Posts.publishPost(postData);
            Utils.showStatus('تم نشر المنشور بنجاح!', 'success');
            
            setTimeout(() => {
                Navigation.showPage('home');
            }, 1500);
        } catch (error) {
            Utils.showStatus(`فشل في النشر: ${error.message}`, 'error');
        }
    }
    }
