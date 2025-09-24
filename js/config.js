// config.js - إعدادات التطبيق
const CONFIG = {
    SUPABASE_URL: 'https://rrjocpzsyxefcsztazkd.supabase.co',
    SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJyam9jcHpzeXhlZmNzenRhemtkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyOTEzMTgsImV4cCI6MjA3Mzg2NzMxOH0.TvUthkBc_lnDdGlHJdEFUPo4Dl2n2oHyokXZE8_wodw',
    
    PAGE_FILES: {
        'home': 'home.html',
        'publish': 'publish.html',
        'login': 'login.html',
        'register': 'register.html',
        'profile': 'profile.html',
        'post-details': 'post-details.html',
        'admin': 'admin.html',
        'team': 'team.html'
    },
    
    MAX_IMAGE_SIZE: 5 * 1024 * 1024,
    SUCCESS_MESSAGE_DURATION: 3000,
    REFERRAL_CODE_LENGTH: 8,
    DEFAULT_POINTS: 10,
    
    RANK_SETTINGS: {
        0: { name: "مبتدئ", points: 0, required: "التسجيل في المنصة" },
        1: { name: "عضو", points: 100, required: "تجميع 100 نقطة" },
        2: { name: "قائد", points: 0, required: "3 أعضاء من الفريق وصلوا للمرتبة 1" },
        3: { name: "خبير", points: 0, required: "3 أعضاء من الفريق وصلوا للمرتبة 2" },
        4: { name: "محترف", points: 0, required: "3 أعضاء من الفريق وصلوا للمرتبة 3" },
        5: { name: "ماستر", points: 0, required: "3 أعضاء من الفريق وصلوا للمرتبة 4" }
    },
    
    ITEMS_PER_PAGE: 10
};

// تهيئة Supabase
const supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

// المتغيرات العالمية
let currentUser = null;
let debugMode = false;
let currentUserProfile = null;
