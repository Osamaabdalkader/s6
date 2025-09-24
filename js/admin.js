// admin.js - نظام الإدارة
class AdminSystem {
    static currentPage = 1;
    static totalPages = 1;
    static currentFilters = {
        search: '',
        rank: ''
    };

    // تحميل بيانات الإدارة
    static async loadAdminData() {
        if (!currentUserProfile?.is_admin) {
            Utils.showStatus('غير مصرح لك بالوصول لهذه الصفحة', 'error');
            Navigation.showPage('home');
            return;
        }

        await this.loadStats();
        await this.loadUsersTable();
        this.setupEventListeners();
    }

    // تحميل الإحصائيات
    static async loadStats() {
        try {
            const { data: users, error } = await supabase
                .from('profiles')
                .select('points');

            if (error) throw error;

            const totalUsers = users.length;
            const totalPoints = users.reduce((sum, user) => sum + user.points, 0);
            const activeToday = users.length; // تبسيط - في الواقع يجب التحقق من النشاط اليوم

            document.getElementById('total-users').textContent = totalUsers;
            document.getElementById('total-points').textContent = totalPoints;
            document.getElementById('active-today').textContent = activeToday;

        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    // تحميل جدول المستخدمين
    static async loadUsersTable(page = 1) {
        try {
            this.currentPage = page;
            let query = supabase
                .from('profiles')
                .select(`
                    user_id,
                    points,
                    rank,
                    referral_count,
                    created_at,
                    referred_by,
                    auth_users:user_id (email, user_metadata)
                `, { count: 'exact' });

            // تطبيق الفلاتر
            if (this.currentFilters.search) {
                query = query.or(`auth_users.email.ilike.%${this.currentFilters.search}%,auth_users.user_metadata->>full_name.ilike.%${this.currentFilters.search}%`);
            }

            if (this.currentFilters.rank) {
                query = query.eq('rank', parseInt(this.currentFilters.rank));
            }

            const { data: users, error, count } = await query
                .range((page - 1) * CONFIG.ITEMS_PER_PAGE, page * CONFIG.ITEMS_PER_PAGE - 1)
                .order('created_at', { ascending: false });

            if (error) throw error;

            this.totalPages = Math.ceil(count / CONFIG.ITEMS_PER_PAGE);
            this.renderUsersTable(users);
            this.renderPagination();

        } catch (error) {
            console.error('Error loading users:', error);
        }
    }

    // عرض جدول المستخدمين
    static renderUsersTable(users) {
        const tbody = document.getElementById('users-table-body');
        tbody.innerHTML = '';

        users.forEach(user => {
            const row = document.createElement('tr');
            const userName = user.auth_users?.user_metadata?.full_name || 'غير معروف';
            const userEmail = user.auth_users?.email || 'غير معروف';
            const rankName = CONFIG.RANK_SETTINGS[user.rank]?.name || 'غير معروف';

            row.innerHTML = `
                <td><input type="checkbox" class="user-checkbox" value="${user.user_id}"></td>
                <td>${userName}</td>
                <td>${userEmail}</td>
                <td>${user.points}</td>
                <td><span class="rank-badge rank-${user.rank}">${rankName}</span></td>
                <td>${new Date(user.created_at).toLocaleDateString('ar-SA')}</td>
                <td>
                    <button class="btn-small btn-primary add-points-btn" data-user-id="${user.user_id}">
                        <i class="fas fa-plus"></i> نقاط
                    </button>
                    <button class="btn-small btn-secondary view-profile-btn" data-user-id="${user.user_id}">
                        <i class="fas fa-eye"></i> عرض
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });

        // إضافة event listeners للأزرار
        this.addTableEventListeners();
    }

    // إعداد event listeners للجدول
    static addTableEventListeners() {
        document.querySelectorAll('.add-points-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const userId = e.target.closest('.add-points-btn').dataset.userId;
                this.openPointsModal(userId);
            });
        });

        document.querySelectorAll('.user-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', this.updateSelectAll.bind(this));
        });

        document.getElementById('select-all').addEventListener('change', this.toggleSelectAll.bind(this));
    }

    // فتح نافذة إضافة النقاط
    static openPointsModal(userId) {
        const modal = document.getElementById('points-modal');
        modal.style.display = 'block';
        modal.dataset.userId = userId;

        // إعداد event listeners للنافذة
        this.setupModalEvents();
    }

    // إعداد event listeners للنافذة
    static setupModalEvents() {
        const modal = document.getElementById('points-modal');
        const closeBtn = modal.querySelector('.close');
        const closeModalBtn = modal.querySelector('.close-modal');
        const confirmBtn = modal.querySelector('#confirm-add-points');

        closeBtn.addEventListener('click', () => modal.style.display = 'none');
        closeModalBtn.addEventListener('click', () => modal.style.display = 'none');
        
        confirmBtn.addEventListener('click', async () => {
            await this.confirmAddPoints();
        });

        // إغلاق النافذة عند النقر خارجها
        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }

    // تأكيد إضافة النقاط
    static async confirmAddPoints() {
        const modal = document.getElementById('points-modal');
        const userId = modal.dataset.userId;
        const points = parseInt(document.getElementById('points-amount').value);
        const reason = document.getElementById('points-reason').value;
        const customReason = document.getElementById('custom-reason').value;

        const finalReason = customReason ? `${reason}: ${customReason}` : reason;

        try {
            await PointsSystem.addPoints(userId, points, finalReason, currentUser.id);
            Utils.showStatus('تم إضافة النقاط بنجاح', 'success');
            modal.style.display = 'none';
            await this.loadUsersTable(this.currentPage);
            await this.loadStats();
        } catch (error) {
            Utils.showStatus(`خطأ في إضافة النقاط: ${error.message}`, 'error');
        }
    }

    // عرض ترقيم الصفحات
    static renderPagination() {
        const pageNumbers = document.getElementById('page-numbers');
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');
        const currentRange = document.getElementById('current-range');
        const totalCount = document.getElementById('total-users-count');

        // تحديث معلومات الصفحة
        const start = (this.currentPage - 1) * CONFIG.ITEMS_PER_PAGE + 1;
        const end = Math.min(this.currentPage * CONFIG.ITEMS_PER_PAGE, this.totalPages * CONFIG.ITEMS_PER_PAGE);
        currentRange.textContent = `${start}-${end}`;
        totalCount.textContent = this.totalPages * CONFIG.ITEMS_PER_PAGE;

        // تحديث أزرار الصفحة
        prevBtn.disabled = this.currentPage === 1;
        nextBtn.disabled = this.currentPage === this.totalPages;

        // عرض أرقام الصفحات
        pageNumbers.innerHTML = '';
        for (let i = 1; i <= this.totalPages; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = `page-btn ${i === this.currentPage ? 'active' : ''}`;
            pageBtn.textContent = i;
            pageBtn.addEventListener('click', () => this.loadUsersTable(i));
            pageNumbers.appendChild(pageBtn);
        }
    }

    // تحديد/إلغاء تحديد الكل
    static toggleSelectAll(e) {
        const checkboxes = document.querySelectorAll('.user-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = e.target.checked;
        });
    }

    static updateSelectAll() {
        const checkboxes = document.querySelectorAll('.user-checkbox');
        const selectAll = document.getElementById('select-all');
        const allChecked = checkboxes.length > 0 && Array.from(checkboxes).every(cb => cb.checked);
        
        selectAll.checked = allChecked;
        selectAll.indeterminate = !allChecked && Array.from(checkboxes).some(cb => cb.checked);
    }

    // إعداد event listeners للصفحة
    static setupEventListeners() {
        // البحث
        document.getElementById('admin-search').addEventListener('input', (e) => {
            this.currentFilters.search = e.target.value;
            this.loadUsersTable(1);
        });

        // فلتر المرتبة
        document.getElementById('rank-filter').addEventListener('change', (e) => {
            this.currentFilters.rank = e.target.value;
            this.loadUsersTable(1);
        });

        // أزرار الصفحة
        document.getElementById('prev-page').addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.loadUsersTable(this.currentPage - 1);
            }
        });

        document.getElementById('next-page').addEventListener('click', () => {
            if (this.currentPage < this.totalPages) {
                this.loadUsersTable(this.currentPage + 1);
            }
        });
    }
}