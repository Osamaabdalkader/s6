// points.js - نظام النقاط والمراتب
class PointsSystem {
    // إضافة نقاط للمستخدم
    static async addPoints(userId, points, reason, adminId = null) {
        try {
            // إضافة النقاط في الجدول الرئيسي
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ points: supabase.sql`points + ${points}` })
                .eq('user_id', userId);

            if (updateError) throw updateError;

            // تسجيل العملية في جدول المعاملات
            const { error: transactionError } = await supabase
                .from('point_transactions')
                .insert([{
                    user_id: userId,
                    points: points,
                    reason: reason,
                    admin_id: adminId
                }]);

            if (transactionError) throw transactionError;

            // تحديث المرتبة تلقائياً
            await this.updateUserRank(userId);

            return true;
        } catch (error) {
            console.error('Error adding points:', error);
            throw error;
        }
    }

    // تحديث مرتبة المستخدم
    static async updateUserRank(userId) {
        try {
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('points, rank, referred_by')
                .eq('user_id', userId)
                .single();

            if (error) throw error;

            let newRank = profile.rank;
            const points = profile.points;

            // تحديد المرتبة بناءً على النقاط ومتطلبات الفريق
            if (points >= 100 && newRank < 1) {
                newRank = 1;
            }

            // إذا تغيرت المرتبة، نقوم بالتحديث
            if (newRank !== profile.rank) {
                const { error: updateError } = await supabase
                    .from('profiles')
                    .update({ rank: newRank })
                    .eq('user_id', userId);

                if (updateError) throw updateError;

                // إذا كان لديه مُحيل، نتحقق من ترقية المُحيل
                if (profile.referred_by) {
                    await this.checkReferrerRank(profile.referred_by);
                }
            }

            return newRank;
        } catch (error) {
            console.error('Error updating user rank:', error);
            throw error;
        }
    }

    // التحقق من ترقية المُحيل
    static async checkReferrerRank(referrerId) {
        try {
            const { data: referrer, error } = await supabase
                .from('profiles')
                .select('rank, team_members')
                .eq('user_id', referrerId)
                .single();

            if (error) throw error;

            // الحصول على فريق المُحيل
            const teamMembers = await this.getTeamMembers(referrerId);
            const currentRank = referrer.rank;

            // التحقق من متطلبات المرتبة التالية
            let requiredMembers = 0;
            if (currentRank === 1) requiredMembers = 3; // للترقية لمرتبة 2
            else if (currentRank === 2) requiredMembers = 3; // للترقية لمرتبة 3
            else if (currentRank === 3) requiredMembers = 3; // للترقية لمرتبة 4
            else if (currentRank === 4) requiredMembers = 3; // للترقية لمرتبة 5

            if (requiredMembers > 0) {
                const qualifiedMembers = teamMembers.filter(member => member.rank >= currentRank).length;
                
                if (qualifiedMembers >= requiredMembers && currentRank < 5) {
                    // ترقية المُحيل
                    const { error: updateError } = await supabase
                        .from('profiles')
                        .update({ rank: currentRank + 1 })
                        .eq('user_id', referrerId);

                    if (updateError) throw updateError;

                    // استدعاء متكرر للتحقق من ترقية المُحيل الأعلى
                    const { data: higherReferrer } = await supabase
                        .from('profiles')
                        .select('referred_by')
                        .eq('user_id', referrerId)
                        .single();

                    if (higherReferrer && higherReferrer.referred_by) {
                        await this.checkReferrerRank(higherReferrer.referred_by);
                    }
                }
            }

            return true;
        } catch (error) {
            console.error('Error checking referrer rank:', error);
            throw error;
        }
    }

    // الحصول على أعضاء الفريق
    static async getTeamMembers(userId, depth = 3) {
        try {
            const { data: directMembers, error } = await supabase
                .from('profiles')
                .select('user_id, points, rank')
                .eq('referred_by', userId);

            if (error) throw error;

            let allMembers = [...directMembers];

            // الحصول على الأعضاء بشكل متكرر حتى العمق المطلوب
            if (depth > 0) {
                for (const member of directMembers) {
                    const subMembers = await this.getTeamMembers(member.user_id, depth - 1);
                    allMembers = [...allMembers, ...subMembers];
                }
            }

            return allMembers;
        } catch (error) {
            console.error('Error getting team members:', error);
            return [];
        }
    }

    // الحصول على إحصائيات المستخدم
    static async getUserStats(userId) {
        try {
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('points, rank, referral_count')
                .eq('user_id', userId)
                .single();

            if (error) throw error;

            const teamMembers = await this.getTeamMembers(userId);
            const teamPoints = teamMembers.reduce((sum, member) => sum + member.points, 0);

            return {
                points: profile.points,
                rank: profile.rank,
                referralCount: profile.referral_count,
                teamMembersCount: teamMembers.length,
                teamPoints: teamPoints,
                networkDepth: this.calculateNetworkDepth(teamMembers)
            };
        } catch (error) {
            console.error('Error getting user stats:', error);
            return null;
        }
    }

    // حساب عمق الشبكة
    static calculateNetworkDepth(teamMembers) {
        // هذه دالة مبسطة لحساب العمق
        return Math.min(Math.floor(teamMembers.length / 10) + 1, 5);
    }

    // الحصول على تاريخ النقاط
    static async getPointsHistory(userId, limit = 10) {
        try {
            const { data, error } = await supabase
                .from('point_transactions')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error getting points history:', error);
            return [];
        }
    }

    // تصدير بيانات المستخدمين (للمديرين)
    static async exportUserData() {
        try {
            const { data: users, error } = await supabase
                .from('profiles')
                .select(`
                    user_id,
                    points,
                    rank,
                    referral_count,
                    referred_by,
                    created_at,
                    auth_users:user_id (email)
                `)
                .order('points', { ascending: false });

            if (error) throw error;

            const csvContent = this.convertToCSV(users);
            this.downloadCSV(csvContent, 'users_data.csv');
            
            return true;
        } catch (error) {
            console.error('Error exporting user data:', error);
            throw error;
        }
    }

    static convertToCSV(users) {
        const headers = ['البريد الإلكتروني', 'النقاط', 'المرتبة', 'عدد الإحالات', 'تاريخ التسجيل'];
        const rows = users.map(user => [
            user.auth_users?.email || 'غير متوفر',
            user.points,
            CONFIG.RANK_SETTINGS[user.rank]?.name || 'غير معروف',
            user.referral_count,
            new Date(user.created_at).toLocaleDateString('ar-SA')
        ]);

        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    static downloadCSV(content, filename) {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}