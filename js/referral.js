// referral.js - نظام الإحالة الكامل
class ReferralSystem {
    // إنشاء رمز إحالة فريد
    static generateReferralCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 8; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    // التحقق من أن رمز الإحالة فريد
    static async isReferralCodeUnique(code) {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('referral_code')
                .eq('referral_code', code)
                .maybeSingle();

            // إذا لم يتم العثور على الرمز، فهو فريد
            return !data;
        } catch (error) {
            console.error('Error checking referral code uniqueness:', error);
            return false;
        }
    }

    // إنشاء رمز إحالة فريد مع محاولات متعددة
    static async createUniqueReferralCode() {
        let code;
        let isUnique = false;
        let attempts = 0;
        const maxAttempts = 5;

        while (!isUnique && attempts < maxAttempts) {
            code = this.generateReferralCode();
            isUnique = await this.isReferralCodeUnique(code);
            attempts++;
            console.log(`محاولة ${attempts}: الرمز ${code} - فريد: ${isUnique}`);
            
            if (!isUnique) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        if (!isUnique) {
            // إذا فشلت جميع المحاولات، إنشاء رمز باستخدام timestamp
            code = 'REF' + Date.now().toString(36).toUpperCase().substring(0, 5);
            console.log(`استخدام الرمز الاحتياطي: ${code}`);
        }

        return code;
    }

    // إنشاء ملف المستخدم مع رمز الإحالة
    static async createUserProfile(user, referredBy = null) {
        try {
            console.log('بدء إنشاء ملف المستخدم:', user.id);
            
            if (!user || !user.id) {
                throw new Error('بيانات المستخدم غير صالحة');
            }

            // التحقق أولاً إذا كان الملف موجوداً بالفعل
            const existingProfile = await this.getUserProfile(user.id);
            if (existingProfile) {
                console.log('الملف موجود بالفعل:', existingProfile);
                return existingProfile;
            }

            // إنشاء رمز إحالة فريد
            const referralCode = await this.createUniqueReferralCode();
            console.log('الرمز المنشأ:', referralCode);

            const profileData = {
                user_id: user.id,
                referral_code: referralCode,
                referred_by: referredBy,
                referral_count: 0,
                points: 0,
                rank: 0,
                is_admin: false
            };

            console.log('بيانات الملف المراد إدراجها:', profileData);

            // محاولة الإدراج
            const { data, error } = await supabase
                .from('profiles')
                .insert([profileData])
                .select();

            if (error) {
                console.error('خطأ من Supabase عند الإدراج:', error);
                
                // إذا كان الخطأ بسبب تكرار user_id (الملف موجود بالفعل)
                if (error.code === '23505') {
                    console.log('الملف موجود بالفعل (تكرار user_id)، جاري البحث...');
                    const existing = await this.getUserProfile(user.id);
                    return existing;
                }
                
                // إذا كان الخطأ بسبب RLS، نحاول بطريقة بديلة
                if (error.message.includes('row-level security') || error.code === '42501') {
                    console.log('خطأ RLS، جرب طريقة بديلة...');
                    return await this.createProfileAlternative(user.id, referralCode, referredBy);
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
            console.error('خطأ في إنشاء ملف المستخدم:', error);
            
            // محاولة إنشاء الملف بطريقة بديلة
            try {
                console.log('محاولة الطريقة البديلة...');
                const fallbackResult = await this.createProfileAlternative(user.id, referredBy);
                return fallbackResult;
            } catch (fallbackError) {
                console.error('فشل الطريقة البديلة:', fallbackError);
                throw new Error(`فشل في إنشاء الملف الشخصي: ${error.message}`);
            }
        }
    }

    // طريقة بديلة لإنشاء الملف
    static async createProfileAlternative(userId, referralCode = null, referredBy = null) {
        try {
            if (!referralCode) {
                referralCode = 'ALT' + Date.now().toString(36).toUpperCase().substring(0, 5);
            }

            // محاولة استخدام upsert
            const { data, error } = await supabase
                .from('profiles')
                .upsert([{
                    user_id: userId,
                    referral_code: referralCode,
                    referred_by: referredBy,
                    referral_count: 0,
                    points: 0,
                    rank: 0,
                    is_admin: false,
                    updated_at: new Date().toISOString()
                }], {
                    onConflict: 'user_id',
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
    static async getUserProfile(userId) {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_id', userId)
                .maybeSingle();
                
            if (error && error.code !== 'PGRST116') {
                console.error('خطأ في البحث عن الملف:', error);
                return null;
            }
            
            return data;
        } catch (error) {
            console.error('خطأ في الحصول على ملف المستخدم:', error);
            return null;
        }
    }

    // التحقق من صحة رمز الإحالة
    static async validateReferralCode(code) {
        try {
            console.log('التحقق من صحة الرمز:', code);
            
            const { data, error } = await supabase
                .from('profiles')
                .select('user_id')
                .eq('referral_code', code.toUpperCase().trim())
                .maybeSingle();

            if (error) {
                console.error('خطأ في التحقق من الرمز:', error);
                return null;
            }

            console.log('نتيجة التحقق:', data ? data.user_id : 'غير صحيح');
            return data ? data.user_id : null;
        } catch (error) {
            console.error('خطأ في التحقق من صحة رمز الإحالة:', error);
            return null;
        }
    }

    // زيادة عداد الإحالات للمستخدم
    static async incrementReferralCount(userId) {
        try {
            console.log('زيادة عداد الإحالات للمستخدم:', userId);
            
            const { error } = await supabase
                .from('profiles')
                .update({ 
                    referral_count: supabase.sql('referral_count + 1'),
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', userId);

            if (error) {
                console.error('خطأ في زيادة العداد:', error);
                throw error;
            }

            console.log('تم زيادة عداد الإحالات');
            return true;
        } catch (error) {
            console.error('خطأ في زيادة عداد الإحالة:', error);
            throw error;
        }
    }

    // الحصول على بيانات الإحالة للمستخدم
    static async getUserReferralData(userId) {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('referral_code, referral_count, referred_by')
                .eq('user_id', userId)
                .single();

            if (error) {
                console.error('خطأ في الحصول على بيانات الإحالة:', error);
                return null;
            }

            return data;
        } catch (error) {
            console.error('خطأ في الحصول على بيانات الإحالة:', error);
            return null;
        }
    }

    // إنشاء رابط الإحالة
    static generateReferralLink(referralCode) {
        const baseUrl = window.location.origin + window.location.pathname;
        return `${baseUrl}?ref=${referralCode}`;
    }

    // الحصول على عدد الإحالات الإجمالي
    static async getTotalReferrals(userId) {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('referral_count')
                .eq('user_id', userId)
                .single();

            if (error) {
                console.error('خطأ في الحصول على عدد الإحالات الإجمالي:', error);
                return 0;
            }

            return data.referral_count || 0;
        } catch (error) {
            console.error('خطأ في الحصول على عدد الإحالات الإجمالي:', error);
            return 0;
        }
    }
            }
