// referral.js - نظام الإحالة الجديد
class ReferralSystem {
    // إنشاء رمز إحالة فريد
    static generateReferralCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < CONFIG.REFERRAL_CODE_LENGTH; i++) {
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
                .single();

            // إذا لم يتم العثور على الرمز، فهو فريد
            return error && error.code === 'PGRST116';
        } catch (error) {
            console.error('Error checking referral code uniqueness:', error);
            return false;
        }
    }

    // إنشاء رمز إحالة فريد
    static async createUniqueReferralCode() {
        let code;
        let isUnique = false;
        let attempts = 0;
        const maxAttempts = 10;

        while (!isUnique && attempts < maxAttempts) {
            code = this.generateReferralCode();
            isUnique = await this.isReferralCodeUnique(code);
            attempts++;
        }

        if (!isUnique) {
            throw new Error('فشل في إنشاء رمز إحالة فريد');
        }

        return code;
    }

    // إنشاء ملف المستخدم مع رمز الإحالة
    static async createUserProfile(user, referredBy = null) {
        try {
            const referralCode = await this.createUniqueReferralCode();

            const { error } = await supabase
                .from('profiles')
                .insert([{
                    user_id: user.id,
                    referral_code: referralCode,
                    referred_by: referredBy,
                    referral_count: 0
                }]);

            if (error) {
                console.error('Error creating user profile:', error);
                throw error;
            }

            return true;
        } catch (error) {
            console.error('Error in createUserProfile:', error);
            throw error;
        }
    }

    // التحقق من صحة رمز الإحالة
    static async validateReferralCode(code) {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('user_id')
                .eq('referral_code', code)
                .single();

            if (error) {
                console.error('Error validating referral code:', error);
                return null;
            }

            return data.user_id;
        } catch (error) {
            console.error('Error validating referral code:', error);
            return null;
        }
    }

    // زيادة عداد الإحالات للمستخدم
    static async incrementReferralCount(userId) {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ referral_count: supabase.sql('referral_count + 1') })
                .eq('user_id', userId);

            if (error) {
                console.error('Error incrementing referral count:', error);
                throw error;
            }

            return true;
        } catch (error) {
            console.error('Error in incrementReferralCount:', error);
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
                console.error('Error getting user referral data:', error);
                return null;
            }

            return data;
        } catch (error) {
            console.error('Error in getUserReferralData:', error);
            return null;
        }
    }

    // إنشاء رابط الإحالة
    static generateReferralLink(referralCode) {
        return `${window.location.origin}${window.location.pathname}?ref=${referralCode}`;
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
                console.error('Error getting total referrals:', error);
                return 0;
            }

            return data.referral_count || 0;
        } catch (error) {
            console.error('Error in getTotalReferrals:', error);
            return 0;
        }
    }
}