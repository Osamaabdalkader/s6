// team.js - إدارة الفريق
class TeamSystem {
    // تحميل بيانات الفريق
    static async loadTeamData() {
        if (!currentUser) {
            Navigation.showPage('login');
            return;
        }

        await this.loadTeamStats();
        await this.loadTeamMembers();
        await this.loadRankRequirements();
        this.setupEventListeners();
    }

    // تحميل إحصائيات الفريق
    static async loadTeamStats() {
        try {
            const stats = await PointsSystem.getUserStats(currentUser.id);
            if (!stats) return;

            document.getElementById('team-members-count').textContent = stats.teamMembersCount;
            document.getElementById('current-rank').textContent = CONFIG.RANK_SETTINGS[stats.rank]?.name || 'غير معروف';
            document.getElementById('team-points').textContent = stats.teamPoints;
            document.getElementById('network-depth').textContent = stats.networkDepth;

            // تحديث شريط التقدم
            this.updateProgressBar(stats);

        } catch (error) {
            console.error('Error loading team stats:', error);
        }
    }

    // تحديث شريط التقدم
    static updateProgressBar(stats) {
        const currentRank = stats.rank;
        const nextRank = currentRank + 1;
        
        if (nextRank > 5) {
            document.getElementById('rank-progress-fill').style.width = '100%';
            document.getElementById('current-rank-info').textContent = 'أعلى مرتبة محققة';
            document.getElementById('next-rank-info').textContent = 'لا توجد مراتب أعلى';
            return;
        }

        let progress = 0;
        if (nextRank === 1) {
            progress = Math.min((stats.points / 100) * 100, 100);
        } else {
            // للحصول على متطلبات الفريق للمراتب الأعلى
            const requiredMembers = 3;
            const qualifiedMembers = stats.teamMembersCount; // تبسيط - يجب حساب الأعضاء المؤهلين بدقة
            progress = Math.min((qualifiedMembers / requiredMembers) * 100, 100);
        }

        document.getElementById('rank-progress-fill').style.width = `${progress}%`;
        document.getElementById('current-rank-info').textContent = 
            `المرتبة الحالية: ${CONFIG.RANK_SETTINGS[currentRank]?.name || 'غير معروف'}`;
        document.getElementById('next-rank-info').textContent = 
            `المرتبة التالية: ${CONFIG.RANK_SETTINGS[nextRank]?.name || 'غير معروف'} (${CONFIG.RANK_SETTINGS[nextRank]?.required || 'غير معروف'})`;
    }

    // تحميل أعضاء الفريق
    static async loadTeamMembers() {
        try {
            const teamMembers = await PointsSystem.getTeamMembers(currentUser.id);
            this.renderTeamMembers(teamMembers);
        } catch (error) {
            console.error('Error loading team members:', error);
        }
    }

    // عرض أعضاء الفريق
    static renderTeamMembers(members) {
        const container = document.getElementById('team-members-container');
        container.innerHTML = '';

        if (members.length === 0) {
            container.innerHTML = `
                <div class="no-team-members">
                    <i class="fas fa-users-slash"></i>
                    <h3>لا يوجد أعضاء في فريقك بعد</h3>
                    <p>شارك رابط الإحالة الخاص بك لبدء بناء فريقك</p>
                </div>
            `;
            return;
        }

        members.forEach(member => {
            const memberCard = document.createElement('div');
            memberCard.className = 'team-member-card';
            memberCard.innerHTML = `
                <div class="member-header">
                    <div class="member-avatar">
                        <i class="fas fa-user"></i>
                    </div>
                    <div class="member-info">
                        <h4>عضو في الفريق</h4>
                        <span class="member-rank rank-${member.rank}">
                            ${CONFIG.RANK_SETTINGS[member.rank]?.name || 'غير معروف'}
                        </span>
                    </div>
                </div>
                <div class="member-stats">
                    <div class="stat">
                        <i class="fas fa-star"></i>
                        <span>${member.points} نقطة</span>
                    </div>
                    <div class="stat">
                        <i class="fas fa-calendar"></i>
                        <span>منذ ${this.formatJoinDate(member.created_at)}</span>
                    </div>
                </div>
            `;
            container.appendChild(memberCard);
        });
    }

    // تحميل متطلبات المراتب
    static async loadRankRequirements() {
        try {
            const stats = await PointsSystem.getUserStats(currentUser.id);
            if (!stats) return;

            // تحديث حالة كل مرتبة
            for (let rank = 0; rank <= 5; rank++) {
                this.updateRankStatus(rank, stats);
            }

        } catch (error) {
            console.error('Error loading rank requirements:', error);
        }
    }

    // تحديث حالة المرتبة
    static updateRankStatus(rank, stats) {
        const statusElement = document.getElementById(`rank-${rank}-status`);
        const progressElement = document.getElementById(`rank-${rank}-progress`);
        const progressText = document.getElementById(`rank-${rank}-progress-text`);

        if (!statusElement) return;

        if (rank <= stats.rank) {
            statusElement.textContent = 'محقق';
            statusElement.className = 'requirement-status achieved';
            if (progressElement) progressElement.style.width = '100%';
            if (progressText) progressText.textContent = 'محقق';
        } else {
            statusElement.textContent = 'غير محقق';
            statusElement.className = 'requirement-status';
            
            if (rank === 1) {
                const progress = Math.min((stats.points / 100) * 100, 100);
                if (progressElement) progressElement.style.width = `${progress}%`;
                if (progressText) progressText.textContent = `${stats.points}/100`;
            } else if (rank >= 2) {
                // للحصول على متطلبات الفريق للمراتب الأعلى
                const requiredMembers = 3;
                const qualifiedMembers = this.calculateQualifiedMembers(stats, rank - 1);
                const progress = Math.min((qualifiedMembers / requiredMembers) * 100, 100);
                
                if (progressElement) progressElement.style.width = `${progress}%`;
                if (progressText) progressText.textContent = `${qualifiedMembers}/${requiredMembers}`;
            }
        }
    }

    // حساب الأعضاء المؤهلين
    static calculateQualifiedMembers(stats, requiredRank) {
        // هذه دالة مبسطة - في الواقع يجب الحصول على البيانات الحقيقية
        return Math.min(stats.teamMembersCount, requiredRank * 2);
    }

    // تنسيق تاريخ الانضمام
    static formatJoinDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) return 'يوم';
        if (diffDays < 30) return `${diffDays} أيام`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)} أشهر`;
        return `${Math.floor(diffDays / 365)} سنوات`;
    }

    // إعداد event listeners
    static setupEventListeners() {
        // البحث في الفريق
        document.getElementById('team-search').addEventListener('input', (e) => {
            this.filterTeamMembers(e.target.value);
        });

        // فلتر المرتبة
        document.getElementById('team-rank-filter').addEventListener('change', (e) => {
            this.filterTeamByRank(e.target.value);
        });
    }

    // تصفية أعضاء الفريق
    static filterTeamMembers(searchTerm) {
        const cards = document.querySelectorAll('.team-member-card');
        cards.forEach(card => {
            const text = card.textContent.toLowerCase();
            card.style.display = text.includes(searchTerm.toLowerCase()) ? 'block' : 'none';
        });
    }

    // تصفية حسب المرتبة
    static filterTeamByRank(rank) {
        const cards = document.querySelectorAll('.team-member-card');
        cards.forEach(card => {
            if (!rank) {
                card.style.display = 'block';
                return;
            }
            
            const memberRank = card.querySelector('.member-rank').className.includes(`rank-${rank}`);
            card.style.display = memberRank ? 'block' : 'none';
        });
    }
}