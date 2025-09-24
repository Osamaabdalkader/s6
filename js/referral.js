// referral.js - نظام الإحالة الكامل
class نظامالإحالة {
    // إنشاء رمز إحالة فريد
    static إنشاءرمزإحالة() {
        const أحرف = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let نتيجة = '';
        for (let i = 0; i < 8; i++) {
            نتيجة += أحرف.charAt(Math.floor(Math.random() * أحرف.length));
        }
        return نتيجة;
    }

    // التحقق من أن رمز الإحالة فريد
    static async هلرمزالإحالةفريد(الرمز) {
        try {
            const { data, error } = await supabase
                .from('الملفاتالشخصية')
                .select('رمز_الإحالة')
                .eq('رمز_الإحالة', الرمز)
                .maybeSingle();

            // إذا لم يتم العثور على الرمز، فهو فريد
            return !data;
        } catch (error) {
            console.error('خطأ في التحقق من uniqueness:', error);
            return false;
        }
    }

    // إنشاء رمز إحالة فريد مع محاولات متعددة
    static async إنشاءرمزإحالةفريد() {
        let رمز;
        let هوفريد = false;
        let محاولات = 0;
        const أقصىمحاولات = 5;

        while (!هوفريد && محاولات < أقصىمحاولات) {
            رمز = this.إنشاءرمزإحالة();
            هوفريد = await this.هلرمزالإحالةفريد(الرمز);
            محاولات++;
            console.log(`محاولة ${محاولات}: الرمز ${رمز} - فريد: ${هوفريد}`);
            
            if (!هوفريد) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        if (!هوفريد) {
            // إذا فشلت جميع المحاولات، إنشاء رمز باستخدام timestamp
            رمز = 'REF' + Date.now().toString(36).toUpperCase().substring(0, 5);
            console.log(`استخدام الرمز الاحتياطي: ${رمز}`);
        }

        return رمز;
    }

    // إنشاء ملف المستخدم مع رمز الإحالة
    static async إنشاءملفالمستخدم(مستخدم, تمتالإحالةبواسطة = null) {
        try {
            console.log('بدء إنشاءملفالمستخدم للمستخدم:', مستخدم.id);
            
            if (!مستخدم || !مستخدم.id) {
                throw new Error('بيانات المستخدم غير صالحة');
            }

            // التحقق أولاً إذا كان الملف موجوداً بالفعل
            const الملفالحالي = await this.الحصولعلىملفالمستخدم(مستخدم.id);
            if (الملفالحالي) {
                console.log('الملف موجود بالفعل:', الملفالحالي);
                return الملفالحالي;
            }

            // إنشاء رمز إحالة فريد
            const رمزالإحالة = await this.إنشاءرمزإحالةفريد();
            console.log('الرمز المنشأ:', رمزالإحالة);

            const بياناتالملف = {
                معرف_المستخدم: مستخدم.id,
                رمز_الإحالة: رمزالإحالة,
                تمت_الإحالة_بواسطة: تمتالإحالةبواسطة,
                عدد_الإحالات: 0,
                النقاط: 0,
                المرتبة: 0,
                هو_مدير: false
            };

            console.log('بيانات الملف المراد إدراجها:', بياناتالملف);

            // محاولة الإدراج
            const { data, error } = await supabase
                .from('الملفاتالشخصية')
                .insert([بياناتالملف])
                .select();

            if (error) {
                console.error('خطأ من Supabase عند الإدراج:', error);
                
                // إذا كان الخطأ بسبب تكرار user_id (الملف موجود بالفعل)
                if (error.code === '23505') {
                    console.log('الملف موجود بالفعل (تكرار user_id)، جاري البحث...');
                    const موجود = await this.الحصولعلىملفالمستخدم(مستخدم.id);
                    return موجود;
                }
                
                // إذا كان الخطأ بسبب RLS، نحاول بطريقة بديلة
                if (error.message.includes('row-level security') || error.code === '42501') {
                    console.log('خطأ RLS، جرب طريقة بديلة...');
                    return await this.إنشاءملفبديل(مستخدم.id, رمزالإحالة, تمتالإحالةبواسطة);
                }
                
                throw error;
            }

            if (data && data.length > 0) {
                console.log('تم إنشاء الملف بنجاح:', data[0]);
                return data[0];
            } else {
                throw new Error('لم يتم إرجاع بيانات بعد الإدراج');
            }

        } catch (error) {
            console.error('خطأ في إنشاءملفالمستخدم:', error);
            
            // محاولة إنشاء الملف بطريقة بديلة
            try {
                console.log('محاولة الطريقة البديلة...');
                const نتيجةالبديل = await this.إنشاءملفبديل(مستخدم.id, تمتالإحالةبواسطة);
                return نتيجةالبديل;
            } catch (خطأالبديل) {
                console.error('فشل الطريقة البديلة:', خطأالبديل);
                throw new Error(`فشل في إنشاء الملف الشخصي: ${error.message}`);
            }
        }
    }

    // طريقة بديلة لإنشاء الملف
    static async إنشاءملفبديل(معرفالمستخدم, رمزالإحالة = null, تمتالإحالةبواسطة = null) {
        try {
            if (!رمزالإحالة) {
                رمزالإحالة = 'ALT' + Date.now().toString(36).toUpperCase().substring(0, 5);
            }

            // محاولة استخدام upsert
            const { data, error } = await supabase
                .from('الملفاتالشخصية')
                .upsert([{
                    معرف_المستخدم: معرفالمستخدم,
                    رمز_الإحالة: رمزالإحالة,
                    تمت_الإحالة_بواسطة: تمتالإحالةبواسطة,
                    عدد_الإحالات: 0,
                    النقاط: 0,
                    المرتبة: 0,
                    هو_مدير: false,
                    تم_التحديث_في: new Date().toISOString()
                }], {
                    onConflict: 'معرف_المستخدم',
                    ignoreDuplicates: false
                })
                .select();

            if (error) {
                throw error;
            }

            return data ? data[0] : null;
        } catch (error) {
            console.error('خطأ في الطريقة البديلة:', error);
            throw error;
        }
    }

    // البحث عن ملف مستخدم موجود
    static async الحصولعلىملفالمستخدم(معرفالمستخدم) {
        try {
            const { data, error } = await supabase
                .from('الملفاتالشخصية')
                .select('*')
                .eq('معرف_المستخدم', معرفالمستخدم)
                .maybeSingle();
                
            if (error && error.code !== 'PGRST116') {
                console.error('خطأ في البحث عن الملف:', error);
                return null;
            }
            
            return data;
        } catch (error) {
            console.error('خطأ في الحصولعلىملفالمستخدم:', error);
            return null;
        }
    }

    // التحقق من صحة رمز الإحالة
    static async التحققمنصحةرمزالإحالة(الرمز) {
        try {
            console.log('التحقق من صحة الرمز:', الرمز);
            
            const { data, error } = await supabase
                .from('الملفاتالشخصية')
                .select('معرف_المستخدم')
                .eq('رمز_الإحالة', الرمز.toUpperCase().trim())
                .maybeSingle();

            if (error) {
                console.error('خطأ في التحقق من الرمز:', error);
                return null;
            }

            console.log('نتيجة التحقق:', data ? data.معرف_المستخدم : 'غير صحيح');
            return data ? data.معرف_المستخدم : null;
        } catch (error) {
            console.error('خطأ في التحققمنصحةرمزالإحالة:', error);
            return null;
        }
    }

    // زيادة عداد الإحالات للمستخدم
    static async زيادةعدادالإحالة(معرفالمستخدم) {
        try {
            console.log('زيادة عداد الإحالات للمستخدم:', معرفالمستخدم);
            
            const { error } = await supabase
                .from('الملفاتالشخصية')
                .update({ 
                    عدد_الإحالات: supabase.sql('عدد_الإحالات + 1'),
                    تم_التحديث_في: new Date().toISOString()
                })
                .eq('معرف_المستخدم', معرفالمستخدم);

            if (error) {
                console.error('خطأ في زيادة العداد:', error);
                throw error;
            }

            console.log('تم زيادة عداد الإحالات');
            return true;
        } catch (error) {
            console.error('خطأ في زيادةعدادالإحالة:', error);
            throw error;
        }
    }

    // الحصول على بيانات الإحالة للمستخدم
    static async الحصولعلىبياناتالإحالة(معرفالمستخدم) {
        try {
            const { data, error } = await supabase
                .from('الملفاتالشخصية')
                .select('رمز_الإحالة, عدد_الإحالات, تمت_الإحالة_بواسطة')
                .eq('معرف_المستخدم', معرفالمستخدم)
                .single();

            if (error) {
                console.error('خطأ في الحصولعلىبياناتالإحالة:', error);
                return null;
            }

            return data;
        } catch (error) {
            console.error('خطأ في الحصولعلىبياناتالإحالة:', error);
            return null;
        }
    }

    // إنشاء رابط الإحالة
    static إنشاءرابطالإحالة(رمزالإحالة) {
        const الرابطالأساسي = window.location.origin + window.location.pathname;
        return `${الرابطالأساسي}?ref=${رمزالإحالة}`;
    }

    // الحصول على عدد الإحالات الإجمالي
    static async الحصولعلىعددالإحالاتالإجمالي(معرفالمستخدم) {
        try {
            const { data, error } = await supabase
                .from('الملفاتالشخصية')
                .select('عدد_الإحالات')
                .eq('معرف_المستخدم', معرفالمستخدم)
                .single();

            if (error) {
                console.error('خطأ في الحصولعلىعددالإحالاتالإجمالي:', error);
                return 0;
            }

            return data.عدد_الإحالات || 0;
        } catch (error) {
            console.error('خطأ في الحصولعلىعددالإحالاتالإجمالي:', error);
            return 0;
        }
    }
                }
