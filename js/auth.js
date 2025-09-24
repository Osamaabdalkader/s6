// auth.js - نظام المصادقة مع الإحالة
class Auth {
    static async تسجيلالدخول(بريدإلكتروني, كلمةالمرور) {
        try {
            const { data, error } = await supabase.auth.trySignInWithPassword({
                بريدإلكتروني: بريدإلكتروني.trim(),
                كلمةالمرور: كلمةالمرور.trim()
            });

            if (error) {
                let رسالةخطأ = 'فشل تسجيل الدخول';
                if (error.message.includes('Invalid login credentials')) {
                    رسالةخطأ = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
                } else if (error.message.includes('Email not confirmed')) {
                    رسالةخطأ = 'يرجى تأكيد البريد الإلكتروني أولاً';
                }
                throw new Error(رسالةخطأ);
            }

            مستخدمحالي = data.user;
            this.عندتغييرحالةالمصادقة();
            
            Utils.عرضالحالة('تم تسجيل الدخول بنجاح!', 'نجاح', 'حالة-تسجيل-الدخول');
            
            setTimeout(() => {
                Navigation.عرضالصفحة('الرئيسية');
            }, 1000);

            return true;
        } catch (error) {
            console.error('خطأ في تسجيل الدخول:', error);
            throw error;
        }
    }

    static async إنشاءحساب(بياناتالمستخدم) {
        try {
            console.log('بدء عملية التسجيل...', {
                بريدإلكتروني: بياناتالمستخدم.بريدإلكتروني,
                اسم: بياناتالمستخدم.اسم,
                لديهرمزإحالة: !!بياناتالمستخدم.رمزإحالة
            });

            // التحقق من رمز الإحالة إذا تم تقديمه
            let تمتالإحالةبواسطة = null;
            if (بياناتالمستخدم.رمزإحالة && بياناتالمستخدم.رمزإحالة.trim() !== '') {
                console.log('التحقق من رمز الإحالة:', بياناتالمستخدم.رمزإحالة);
                تمتالإحالةبواسطة = await نظامالإحالة.التحققمنصحةرمزالإحالة(بياناتالمستخدم.رمزإحالة.trim());
                console.log('نتيجة التحقق:', تمتالإحالةبواسطة);
                if (!تمتالإحالةبواسطة) {
                    throw new Error('رمز الإحالة غير صحيح');
                }
            }

            console.log('إنشاء حساب في Supabase Auth...');
            const { data, error } = await supabase.auth.signUp({
                email: بياناتالمستخدم.بريدإلكتروني.trim(),
                password: بياناتالمستخدم.كلمةالمرور.trim(),
                options: {
                    data: {
                        full_name: بياناتالمستخدم.اسم.trim(),
                        phone: بياناتالمستخدم.هاتف.trim(),
                        address: بياناتالمستمخدم.عنوان.trim()
                    }
                }
            });

            if (error) {
                console.error('خطأ في التسجيل:', error);
                let رسالةخطأ = 'فشل في إنشاء الحساب';
                if (error.message.includes('User already registered')) {
                    رسالةخطأ = 'هذا البريد الإلكتروني مسجل مسبقاً';
                } else if (error.message.includes('Password should be at least')) {
                    رساءةخطأ = 'كلمة المرور يجب أن تكون أقوى (6 أحرف على الأقل)';
                } else if (error.message.includes('Invalid email')) {
                    رساءةخطأ = 'البريد الإلكتروني غير صحيح';
                }
                throw new Error(رساءةخطأ);
            }

            console.log('تم إنشاء المستخدم في Auth:', data.user ? 'نعم' : 'لا');

            // إنشاء رمز إحالة للمستخدم الجديد وتسجيل الإحالة إذا وجدت
            if (data.user) {
                console.log('بدء إنشاء الملف الشخصي...');
                const تمإنشاءالملف = await نظامالإحالة.إنشاءملفالمستخدم(data.user, تمتالإحالةبواسطة);
                
                if (تمإنشاءالملف) {
                    console.log('تم إنشاء الملف الشخصي بنجاح');
                    
                    // زيادة عداد الإحالة للمستخدم الذي أحال
                    if (تمتالإحالةبواسطة) {
                        console.log('زيادة عداد الإحالة للمستخدم:', تمتالإحالةبواسطة);
                        await نظامالإحالة.زيادةعدادالإحالة(تمتالإحالةبواسطة);
                        console.log('تم زيادة العداد');
                    }

                    // منح نقاط ترحيبية للمستخدم الجديد
                    console.log('منح نقاط ترحيبية...');
                    await نظامالنقاط.إضافةنقاط(data.user.id, 10, "نقاط ترحيبية للتسجيل");
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
            const نموذج = document.getElementById('نموذج-التسجيل');
            if (نموذج) نموذج.reset();

            Utils.عرضالحالة('تم إنشاء الحساب بنجاح! يرجى تسجيل الدخول', 'نجاح', 'حالة-التسجيل');
            
            setTimeout(() => {
                Navigation.عرضالصفحة('تسجيل-الدخول');
            }, 2000);

            return true;
        } catch (error) {
            console.error('خطأ كامل في التسجيل:', error);
            
            // عرض رسالة خطأ أكثر وضوحاً
            let رسالةخطأ = error.message;
            if (error.message.includes('referral')) {
                رساءةخطأ = 'رمز الإحالة غير صحيح. يرجى التحقق وإعادة المحاولة.';
            }
            
            Utils.عرضالحالة(`فشل في إنشاء الحساب: ${رساءةخطأ}`, 'خطأ', 'حالة-التسجيل');
            throw error;
        }
    }

    static async تسجيلالخروج() {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            
            مستخدمحالي = null;
            ملفالمستخدمالحالي = null;
            this.عندتغييرحالةالمصادقة();
            Navigation.عرضالصفحة('الرئيسية');
        } catch (error) {
            console.error('خطأ في تسجيل الخروج:', error.message);
            alert(`خطأ في تسجيل الخروج: ${error.message}`);
        }
    }

    static async التحققمنالمصادقة() {
        try {
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error) throw error;
            
            if (session?.user) {
                مستخدمحالي = session.user;
                await this.تحميلملفالمستخدم();
                this.عندتغييرحالةالمصادقة();
            }
        } catch (error) {
            console.error('خطأ في التحقق من المصادقة:', error.message);
        }
    }

    static async تحميلملفالمستخدم() {
        try {
            const { data: ملف, error } = await supabase
                .from('الملفاتالشخصية')
                .select('*')
                .eq('معرف_المستخدم', مستخدمحالي.id)
                .single();

            if (error) throw error;
            
            ملفالمستخدمالحالي = ملف;
            return ملف;
        } catch (error) {
            console.error('خطأ في تحميل ملف المستخدم:', error);
            return null;
        }
    }

    static عندتغييرحالةالمصادقة() {
        Navigation.تحديثالتنقل();
        
        if (مستخدمحالي) {
            Utils.عرضالحالة('تم تسجيل الدخول بنجاح', 'نجاح', 'حالة-الاتصال');
        }
    }

    static تهيئةمستمعالمصادقة() {
        supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('تغيرت حالة المصادقة:', event);
            
            if (event === 'SIGNED_IN' && session?.user) {
                مستخدمحالي = session.user;
                await this.تحميلملفالمستخدم();
                this.عندتغييرحالةالمصادقة();
            } else if (event === 'SIGNED_OUT') {
                مستخدمحالي = null;
                ملفالمستخدمالحالي = null;
                this.عندتغييرحالةالمصادقة();
            }
        });
    }
                    }
