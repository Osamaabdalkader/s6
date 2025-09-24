// navigation.js - محدث مع الصفحات الجديدة
class Navigation {
    static async showPage(pageId, params = {}) {
        console.log(`جاري تحميل الصفحة: ${pageId}`, params);
        
        // إظهار رسالة تحميل
        document.getElementById('dynamic-content').innerHTML = `
            <div class="loading-page">
                <div class="loading-spinner"></div>
                <p>جاري تحميل الصفحة...</p>
            </div>
        `;
        
        try {
            await Utils.loadPageContent(pageId);
            await this.initializePage(pageId, params);
            console.log(`تم تحميل الصفحة بنجاح: ${pageId}`);
        } catch (error) {
            console.error(`فشل في تحميل الصفحة: ${pageId}`, error);
            this.showErrorPage(error, pageId);
        }
    }

    static async initializePage(pageId, params = {}) {
        console.log(`جاري تهيئة الصفحة: ${pageId}`, params);
        
        // إعطاء وقت للعناصر لتصبح جاهزة في DOM
        await new Promise(resolve => setTimeout(resolve, 100));
        
        switch (pageId) {
            case 'publish':
                this.handlePublishPage();
                break;
            case 'login':
                this.handleLoginPage();
                break;
            case 'register':
                this.handleRegisterPage();
                break;
            case 'profile':
                this.handleProfilePage();
                break;
            case 'home':
                Posts.loadPosts();
                Posts.initSearchAndFilter();
                break;
            case 'post-details':
                this.handlePostDetailsPage(params);
                break;
            case 'admin':
                await this.handleAdminPage();
                break;
            case 'team':
                await this.handleTeamPage();
                break;
        }
        
        // إعادة ربط الأحداث بعد تهيئة الصفحة
        this.rebindPageEvents(pageId);
    }

    static handlePublishPage() {
        const publishContent = document.getElementById('publish-content');
        const loginRequired = document.getElementById('login-required-publish');
        
        if (publishContent && loginRequired) {
            if (!currentUser) {
                publishContent.style.display = 'none';
                loginRequired.style.display = 'block';
            } else {
                publishContent.style.display = 'block';
                loginRequired.style.display = 'none';
            }
        }
    }

    static handleLoginPage() {
        const statusEl = document.getElementById('login-status');
        if (statusEl) {
            statusEl.style.display = 'none';
        }
    }

    static handleRegisterPage() {
        const statusEl = document.getElementById('register-status');
        if (statusEl) {
            statusEl.style.display = 'none';
        }
        
        this.checkUrlForReferralCode();
    }

    static async handleProfilePage() {
        const profileContent = document.getElementById('profile-content');
        const loginRequired = document.getElementById('login-required-profile');
        
        if (profileContent && loginRequired) {
            if (!currentUser) {
                profileContent.style.display = 'none';
                loginRequired.style.display = 'block';
            } else {
                profileContent.style.display = 'block';
                loginRequired.style.display = 'none';
                await this.loadProfileData();
            }
        }
    }

    static handlePostDetailsPage(params) {
        if (params.postId) {
            PostDetails.loadPostDetails(params.postId);
        } else {
            PostDetails.showError();
        }
    }

    static async handleAdminPage() {
        await AdminSystem.loadAdminData();
    }

    static async handleTeamPage() {
        await TeamSystem.loadTeamData();
    }

    static async loadProfileData() {
        if (currentUser) {
            const setName = (id, value) => {
                const el = document.getElementById(id);
                if (el) el.textContent = value;
            };
            
            setName('profile-name', currentUser.user_metadata.full_name || 'غير محدد');
            setName('profile-email', currentUser.email || 'غير محدد');
            setName('profile-phone', currentUser.user_metadata.phone || 'غير محدد');
            setName('profile-address', currentUser.user_metadata.address || 'غير محدد');
            setName('profile-created', new Date(currentUser.created_at).toLocaleString('ar-SA'));

            // تحميل بيانات الملف الشخصي من جدول profiles
            await this.loadUserProfileData();
        }
    }

    static async loadUserProfileData() {
        try {
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('points, rank, referral_code, referral_count, is_admin')
                .eq('user_id', currentUser.id)
                .single();

            if (error) throw error;

            currentUserProfile = profile;

            // تحديث واجهة المستخدم
            document.getElementById('profile-points').textContent = profile.points;
            document.getElementById('profile-rank').innerHTML = 
                `<span class="rank-badge rank-${profile.rank}">${CONFIG.RANK_SETTINGS[profile.rank]?.name || 'غير معروف'}</span>`;
            
            document.getElementById('profile-referral-code').textContent = profile.referral_code;
            document.getElementById('profile-referral-count').textContent = profile.referral_count;
            
            const referralLink = ReferralSystem.generateReferralLink(profile.referral_code);
            document.getElementById('profile-referral-link').value = referralLink;

            // إظهار قسم الإدارة إذا كان المستخدم مديراً
            if (profile.is_admin) {
                document.getElementById('admin-section').style.display = 'block';
            }

            // تحديث شريط التقدم
            this.updateProfileProgress(profile);

            // إعداد أزرار النسخ
            this.setupCopyButtons();

        } catch (error) {
            console.error('Error loading user profile data:', error);
        }
    }

    static updateProfileProgress(profile) {
        const currentRank = profile.rank;
        let progress = 0;

        if (currentRank < 1) {
            progress = Math.min((profile.points / 100) * 100, 100);
        } else {
            progress = 100; // إذا وصل لمرتبة 1 أو أعلى
        }

        document.getElementById('profile-progress-fill').style.width = `${progress}%`;
        document.getElementById('profile-progress-text').textContent = `${Math.round(progress)}%`;
    }

    static setupCopyButtons() {
        // نسخ رمز الإحالة
        document.getElementById('copy-referral-code').addEventListener('click', () => {
            const code = document.getElementById('profile-referral-code').textContent;
            navigator.clipboard.writeText(code).then(() => {
                Utils.showStatus('تم نسخ رمز الإحالة', 'success');
            });
        });
        
        // نسخ رابط الإحالة
        document.getElementById('copy-referral-link').addEventListener('click', () => {
            const link = document.getElementById('profile-referral-link');
            link.select();
            document.execCommand('copy');
            Utils.showStatus('تم نسخ رابط الإحالة', 'success');
        });
    }

    static checkUrlForReferralCode() {
        const urlParams = new URLSearchParams(window.location.search);
        const refCode = urlParams.get('ref');
        
        if (refCode) {
            const refInput = document.getElementById('register-referral-code');
            if (refInput) {
                refInput.value = refCode;
                Utils.showStatus('تم تحميل رمز الإحالة تلقائياً من الرابط', 'success', 'register-status');
            }
        }
    }

    static updateNavigation() {
        const headerElements = {
            'publish-link': currentUser,
            'profile-link': currentUser,
            'logout-link': currentUser,
            'login-link': !currentUser,
            'register-link': !currentUser
        };

        for (const [id, shouldShow] of Object.entries(headerElements)) {
            const element = document.getElementById(id);
            if (element) {
                element.style.display = shouldShow ? 'list-item' : 'none';
            }
        }

        const footerProfile = document.getElementById('footer-profile-link');
        const footerPublish = document.getElementById('footer-publish-link');
        
        if (footerProfile) {
            footerProfile.style.display = currentUser ? 'flex' : 'none';
        }
        if (footerPublish) {
            footerPublish.style.display = currentUser ? 'flex' : 'none';
        }

        // إضافة رابط الفريق للمستخدمين المسجلين
        this.updateTeamLink();
    }

    static updateTeamLink() {
        // إنشاء رابط الفريق إذا لم يكن موجوداً
        let teamLink = document.getElementById('team-link');
        if (!teamLink && currentUser) {
            const navLinks = document.querySelector('.nav-links');
            teamLink = document.createElement('li');
            teamLink.id = 'team-link';
            teamLink.innerHTML = `
                <a href="#" onclick="Navigation.showPage('team')">
                    <i class="fas fa-users"></i> <span class="nav-text">فريقي</span>
                </a>
            `;
            navLinks.insertBefore(teamLink, navLinks.querySelector('#logout-link'));
        }

        if (teamLink) {
            teamLink.style.display = currentUser ? 'list-item' : 'none';
        }
    }

    static showErrorPage(error, pageId) {
        document.getElementById('dynamic-content').innerHTML = `
            <div class="error-page">
                <h1 class="section-title">خطأ في تحميل الصفحة</h1>
                <p>تعذر تحميل الصفحة المطلوبة: ${pageId}</p>
                <p>الخطأ: ${error.message}</p>
                <button onclick="Navigation.showPage('home')">العودة إلى الرئيسية</button>
            </div>
        `;
    }

    static rebindPageEvents(pageId) {
        console.log(`إعادة ربط أحداث الصفحة: ${pageId}`);
    }
}