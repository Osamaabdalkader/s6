// auth.js - نظام المصادقة مع الإحالة
class Auth {
    static async login(email, password) {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password: password.trim()
            });

            if (error) {
                let errorMessage = 'فشل تسجيل الدخول';
                if (error.message.includes('Invalid login credentials')) {
                    errorMessage = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
                } else if (error.message.includes('Email not confirmed')) {
                    errorMessage = 'يرجى تأكيد البريد الإلكتروني أولاً';
                }
                throw new Error(errorMessage);
            }

            currentUser = data.user;
            this.onAuthStateChange();
            
            Utils.showStatus('تم تسجيل الدخول بنجاح!', 'success', 'login-status');
            
            setTimeout(() => {
                Navigation.showPage('home');
            }, 1000);

            return true;
        } catch (error) {
            console.error('Error signing in:', error);
            throw error;
        }
    }

    static async register(userData) {
        try {
            console.log('بدء عملية التسجيل...', {
                email: userData.email,
                name: userData.name,
                hasReferralCode: !!userData.referralCode
            });

            // التحقق من رمز الإحالة إذا تم تقديمه
            let referredBy = null;
            if (userData.referralCode && userData.referralCode.trim() !== '') {
                console.log('التحقق من رمز الإحالة:', userData.referralCode);
                referredBy = await ReferralSystem.validateReferralCode(userData.referralCode.trim());
                console.log('نتيجة التحقق:', referredBy);
                if (!referredBy) {
                    throw new Error('رمز الإحالة غير صحيح');
                }
            }

            console.log('إنشاء حساب في Supabase Auth...');
            const { data, error } = await supabase.auth.signUp({
                email: userData.email.trim(),
                password: userData.password.trim(),
                options: {
                    data: {
                        full_name: userData.name.trim(),
                        phone: userData.phone.trim(),
                        address: userData.address.trim()
                    }
                }
            });

            if (error) {
                console.error('Error signing up:', error);
                let errorMessage = 'فشل في إنشاء الحساب';
                if (error.message.includes('User already registered')) {
                    errorMessage = 'هذا البريد الإلكتروني مسجل مسبقاً';
                } else if (error.message.includes('Password should be at least')) {
                    errorMessage = 'كلمة المرور يجب أن تكون أقوى (6 أحرف على الأقل)';
                } else if (error.message.includes('Invalid email')) {
                    errorMessage = 'البريد الإلكتروني غير صحيح';
                }
                throw new Error(errorMessage);
            }

            console.log('تم إنشاء المستخدم في Auth:', data.user ? 'نعم' : 'لا');

            // إنشاء رمز إحالة للمستخدم الجديد وتسجيل الإحالة إذا وجدت
            if (data.user) {
                console.log('بدء إنشاء الملف الشخصي...');
                const profileCreated = await ReferralSystem.createUserProfile(data.user, referredBy);
                
                if (profileCreated) {
                    console.log('تم إنشاء الملف الشخصي بنجاح');
                    
                    // زيادة عداد الإحالة للمستخدم الذي أحال
                    if (referredBy) {
                        console.log('زيادة عداد الإحالة للمستخدم:', referredBy);
                        await ReferralSystem.incrementReferralCount(referredBy);
                        console.log('تم زيادة العداد');
                    }

                    // منح نقاط ترحيبية للمستخدم الجديد
                    console.log('منح نقاط ترحيبية...');
                    await PointsSystem.addPoints(data.user.id, 10, "نقاط ترحيبية للتسجيل");
                    console.log('تم منح النقاط');
                } else {
                    console.error('فشل في إنشاء الملف الشخصي');
                    throw new Error('فشل في إنشاء الملف الشخصي');
                }
            } else {
                console.error('لم يتم إنشاء data.user - قد تكون هناك مشكلة في Supabase Auth');
                throw new Error('فشل في إنشاء المستخدم');
            }

            // إعادة تعيين النموذج بعد النجاح
            const form = document.getElementById('register-form');
            if (form) form.reset();

            Utils.showStatus('تم إنشاء الحساب بنجاح! يرجى تسجيل الدخول', 'success', 'register-status');
            
            setTimeout(() => {
                Navigation.showPage('login');
            }, 2000);

            return true;
        } catch (error) {
            console.error('خطأ كامل في التسجيل:', error);
            
            // عرض رسالة خطأ أكثر وضوحاً
            let errorMessage = error.message;
            if (error.message.includes('referral')) {
                errorMessage = 'رمز الإحالة غير صحيح. يرجى التحقق وإعادة المحاولة.';
            }
            
            Utils.showStatus(`فشل في إنشاء الحساب: ${errorMessage}`, 'error', 'register-status');
            throw error;
        }
    }

    static async logout() {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            
            currentUser = null;
            currentUserProfile = null;
            this.onAuthStateChange();
            Navigation.showPage('home');
        } catch (error) {
            console.error('Error signing out:', error.message);
            alert(`خطأ في تسجيل الخروج: ${error.message}`);
        }
    }

    static async checkAuth() {
        try {
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error) throw error;
            
            if (session?.user) {
                currentUser = session.user;
                await this.loadUserProfile();
                this.onAuthStateChange();
            }
        } catch (error) {
            console.error('Error checking auth:', error.message);
        }
    }

    static async loadUserProfile() {
        try {
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_id', currentUser.id)
                .single();

            if (error) throw error;
            
            currentUserProfile = profile;
            return profile;
        } catch (error) {
            console.error('Error loading user profile:', error);
            return null;
        }
    }

    static onAuthStateChange() {
        Navigation.updateNavigation();
        
        if (currentUser) {
            Utils.showStatus('تم تسجيل الدخول بنجاح', 'success', 'connection-status');
        }
    }

    static initAuthListener() {
        supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('Auth state changed:', event);
            
            if (event === 'SIGNED_IN' && session?.user) {
                currentUser = session.user;
                await this.loadUserProfile();
                this.onAuthStateChange();
            } else if (event === 'SIGNED_OUT') {
                currentUser = null;
                currentUserProfile = null;
                this.onAuthStateChange();
            }
        });
    }
    }
