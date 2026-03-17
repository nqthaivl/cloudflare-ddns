/**
 * ═══════════════════════════════════════════════════════════════
 * i18n - Multi-language Support (Vietnamese / English)
 * ═══════════════════════════════════════════════════════════════
 */

const LANGS = {
    vi: {
        // Sidebar
        "nav.overview": "Tổng quan",
        "nav.dashboard": "Dashboard",
        "nav.management": "Quản lý",
        "nav.domains": "Domains",
        "nav.dns_records": "DNS Records",
        "nav.tunnels": "Tunnels",
        "nav.ddns_section": "DDNS",
        "nav.dynamic_dns": "Dynamic DNS",
        "nav.logs": "Nhật ký",
        "nav.settings_section": "Cài đặt",
        "nav.settings": "Cấu hình",
        "nav.donate": "Mời tôi cafe",
        "sidebar.current_ip": "IP hiện tại",
        "sidebar.loading": "Đang tải...",

        // Header
        "header.refresh": "🔄 Làm mới",

        // Page titles
        "page.dashboard": "Dashboard",
        "page.domains": "Quản lý Domains",
        "page.records": "DNS Records",
        "page.tunnels": "Cloudflare Tunnels",
        "page.ddns": "Dynamic DNS",
        "page.logs": "Nhật ký",
        "page.settings": "Cấu hình",

        // Setup
        "setup.welcome": "Chào mừng đến CF DDNS Manager",
        "setup.desc": "Để bắt đầu, vui lòng nhập Cloudflare API Token của bạn.",
        "setup.permissions": "Token cần có quyền <strong>Zone:Read</strong>, <strong>Zone:Edit</strong>, <strong>DNS:Read</strong>, <strong>DNS:Edit</strong>.",
        "setup.token_label": "API Token",
        "setup.token_placeholder": "Dán Cloudflare API Token tại đây...",
        "setup.token_hint": "Tạo token tại: dash.cloudflare.com → My Profile → API Tokens",
        "setup.connect": "🚀 Kết nối Cloudflare",

        // Dashboard
        "dash.domains": "Domains",
        "dash.domains_sub": "Tên miền đang quản lý",
        "dash.records": "DNS Records",
        "dash.records_sub": "Tổng số bản ghi",
        "dash.ddns": "DDNS",
        "dash.ddns_sub": "records đang theo dõi",
        "dash.last_update": "Cập nhật cuối",
        "dash.every": "Mỗi",
        "dash.minutes": "phút",
        "dash.recent": "📝 Hoạt động gần đây",
        "dash.no_activity": "Chưa có hoạt động",
        "dash.no_activity_desc": "Các bản cập nhật DDNS sẽ hiển thị tại đây",
        "dash.on": "Bật",
        "dash.off": "Tắt",

        // Domains
        "domains.desc": "Quản lý các tên miền trên Cloudflare",
        "domains.add": "➕ Thêm Domain",
        "domains.no_domains": "Chưa có domain nào",
        "domains.no_domains_desc": "Nhấn \"Thêm Domain\" để bắt đầu",
        "domains.btn_ns": "🔧 NS",
        "domains.btn_records": "📋 Records",
        "domains.loading": "Đang tải domains...",
        "domains.error": "Lỗi tải domains",

        // Records
        "records.select_domain": "-- Chọn Domain --",
        "records.add": "➕ Thêm Record",
        "records.type": "Loại",
        "records.name": "Tên",
        "records.content": "Nội dung",
        "records.ttl": "TTL",
        "records.proxy": "Proxy",
        "records.ddns": "DDNS",
        "records.actions": "Hành động",
        "records.select_first": "Chọn một domain",
        "records.select_first_desc": "Chọn domain từ danh sách bên trên để xem DNS records",
        "records.no_records": "Không có record nào",
        "records.no_records_desc": "Nhấn \"Thêm Record\" để tạo bản ghi DNS mới",
        "records.loading": "Đang tải records...",

        // DDNS
        "ddns.status_loading": "Đang tải...",
        "ddns.running": "Đang chạy",
        "ddns.stopped": "Đã dừng",
        "ddns.start": "▶️ Bắt đầu",
        "ddns.stop": "⏹️ Dừng",
        "ddns.force_update": "⚡ Cập nhật ngay",
        "ddns.monitored": "📡 Records DDNS đang theo dõi",
        "ddns.domain_col": "Domain",
        "ddns.record_col": "Record",
        "ddns.type_col": "Loại",
        "ddns.action_col": "Hành động",
        "ddns.no_records": "Chưa có record DDNS",
        "ddns.no_records_desc": "Vào DNS Records → bật DDNS cho record bạn muốn tự động cập nhật IP",
        "ddns.config": "⏱️ Cấu hình cập nhật",
        "ddns.interval": "Khoảng thời gian cập nhật",
        "ddns.interval_hint": "Khoảng thời gian kiểm tra và cập nhật IP nếu có thay đổi",
        "ddns.1min": "1 phút",
        "ddns.2min": "2 phút",
        "ddns.5min": "5 phút",
        "ddns.10min": "10 phút",
        "ddns.15min": "15 phút",
        "ddns.30min": "30 phút",
        "ddns.1hour": "1 giờ",

        // Logs
        "logs.title": "📝 Nhật ký cập nhật",
        "logs.refresh": "🔄 Làm mới",
        "logs.no_logs": "Chưa có nhật ký",
        "logs.no_logs_desc": "Các hoạt động cập nhật sẽ được ghi nhận tại đây",

        // Settings
        "settings.token_title": "🔑 API Token",
        "settings.token_label": "Cloudflare API Token",
        "settings.token_placeholder": "Nhập API Token mới...",
        "settings.token_save": "Lưu",
        "settings.token_current": "Token hiện tại:",
        "settings.token_none": "Chưa cấu hình",
        "settings.token_verify": "✅ Kiểm tra Token",

        "settings.guide_title": "📖 Hướng dẫn lấy API Token",
        "settings.guide_1": "Truy cập Cloudflare Dashboard",
        "settings.guide_2": "Tạo Token mới",
        "settings.guide_3": "Cấp quyền (Permissions)",
        "settings.guide_4": "Zone Resources",
        "settings.guide_4_desc": "Chọn <span class='badge badge-orange'>All Zones</span> hoặc chọn zone cụ thể",
        "settings.guide_5": "Tạo và Copy Token",
        "settings.guide_5_desc": "Nhấn <span class='badge badge-success'>Create Token</span> → Copy token và dán vào ô ở trên",

        "settings.theme_title": "🎨 Giao diện",
        "settings.theme_label": "Chế độ hiển thị",
        "settings.theme_dark": "Dark Mode",
        "settings.theme_light": "Light Mode",
        "settings.theme_auto": "Theo hệ thống",

        "settings.lang_title": "🌐 Ngôn ngữ",
        "settings.lang_label": "Chọn ngôn ngữ",
        "settings.lang_vi": "Tiếng Việt",
        "settings.lang_en": "English",

        "settings.author_title": "👨‍💻 Thông tin Tác giả",
        "settings.app_title": "ℹ️ Thông tin ứng dụng",
        "settings.app_name_label": "Ứng dụng",
        "settings.app_version_label": "Phiên bản",
        "settings.app_platform_label": "Nền tảng",
        "settings.app_api_label": "API",
        "settings.app_backend_label": "Backend",

        // Modals
        "modal.add_domain": "🌐 Thêm Domain",
        "modal.domain_label": "Tên miền",
        "modal.domain_placeholder": "example.com",
        "modal.domain_hint": "Nhập tên miền gốc (không có www)",
        "modal.cancel": "Hủy",
        "modal.add_domain_btn": "➕ Thêm Domain",

        "modal.ns_title": "🔧 Nameservers Cloudflare",
        "modal.ns_for": "📌 Nameservers cho",
        "modal.ns_guide": "<strong>Hướng dẫn:</strong><br>1. Đăng nhập vào nhà cung cấp tên miền của bạn.<br>2. Tìm phần quản lý DNS / Nameserver.<br>3. Thay thế nameserver hiện tại bằng các nameserver Cloudflare ở trên.<br>4. Lưu thay đổi và đợi DNS propagation (có thể mất 24-48 giờ).",
        "modal.ns_ok": "Đã hiểu",

        "modal.add_record": "📋 Thêm DNS Record",
        "modal.edit_record": "✏️ Sửa DNS Record",
        "modal.record_type": "Loại Record",
        "modal.record_name": "Tên",
        "modal.record_name_placeholder": "@ hoặc subdomain",
        "modal.record_name_hint": "Sử dụng @ cho root domain hoặc nhập subdomain",
        "modal.record_content_a": "Địa chỉ IPv4",
        "modal.record_ttl": "TTL",
        "modal.record_ttl_auto": "Tự động",
        "modal.record_proxy": "Proxy qua Cloudflare",
        "modal.record_save": "💾 Lưu Record",
        "modal.record_update": "💾 Cập nhật Record",

        "modal.confirm_title": "⚠️ Xác nhận xóa",
        "modal.confirm_msg": "Bạn có chắc chắn muốn xóa?",
        "modal.confirm_delete": "🗑️ Xóa",

        // Toasts
        "toast.token_empty": "Vui lòng nhập API Token",
        "toast.connecting": "Đang kiểm tra...",
        "toast.connected": "Kết nối Cloudflare thành công! 🎉",
        "toast.token_invalid": "Token không hợp lệ",
        "toast.token_updated": "Đã cập nhật token thành công!",
        "toast.token_ok": "Token đang hoạt động bình thường ✅",
        "toast.token_expired": "Token không hợp lệ hoặc đã hết hạn",
        "toast.need_token": "Vui lòng cấu hình API Token trước",
        "toast.enter_domain": "Vui lòng nhập tên miền",
        "toast.domain_added": "Đã thêm domain thành công! 🎉",
        "toast.domain_deleted": "Đã xóa domain",
        "toast.fill_all": "Vui lòng nhập đầy đủ thông tin",
        "toast.record_saved": "Thành công!",
        "toast.record_deleted": "Đã xóa record",
        "toast.ddns_on": "Đã bật DDNS cho",
        "toast.ddns_off": "Đã tắt DDNS cho",
        "toast.ddns_started": "Đã bắt đầu",
        "toast.ddns_stopped": "Đã dừng",
        "toast.updating_ip": "Đang cập nhật IP...",
        "toast.interval_set": "Đã đặt cập nhật mỗi",
        "toast.copied": "Đã sao chép!",
        "toast.theme_dark": "Đã chuyển sang Dark Mode",
        "toast.theme_light": "Đã chuyển sang Light Mode",
        "toast.theme_auto": "Đã chuyển sang Theo hệ thống",
        "toast.lang_vi": "Đã chuyển sang Tiếng Việt",
        "toast.lang_en": "Switched to English",
        "toast.enter_new_token": "Vui lòng nhập token mới",
        "toast.ddns_removed": "Đã xóa record khỏi DDNS",
        "toast.login_ok": "Đăng nhập thành công! 🎉",
        "toast.logged_out": "Đã đăng xuất",
        "toast.tunnel_created": "Đã tạo tunnel thành công! 🎉",
        "toast.tunnel_deleted": "Đã xóa tunnel",
        "toast.tunnel_config_saved": "Đã cập nhật cấu hình tunnel ✅",
        "toast.tunnel_dns_created": "Đã tạo DNS record cho tunnel",

        // Login
        "login.subtitle": "Đăng nhập bằng tài khoản Synology DSM",
        "login.username": "Tên đăng nhập",
        "login.password": "Mật khẩu",
        "login.button": "🔐 Đăng nhập",
        "login.error": "Sai tên đăng nhập hoặc mật khẩu",
        "login.hint": "Sử dụng tài khoản Synology DSM của bạn",
        "login.welcome": "Chào mừng",
        "login.logout": "🚪",
    },

    en: {
        // Sidebar
        "nav.overview": "Overview",
        "nav.dashboard": "Dashboard",
        "nav.management": "Management",
        "nav.domains": "Domains",
        "nav.dns_records": "DNS Records",
        "nav.tunnels": "Tunnels",
        "nav.ddns_section": "DDNS",
        "nav.dynamic_dns": "Dynamic DNS",
        "nav.logs": "Logs",
        "nav.settings_section": "Settings",
        "nav.settings": "Settings",
        "nav.donate": "Buy me a coffee",
        "sidebar.current_ip": "Current IP",
        "sidebar.loading": "Loading...",

        // Header
        "header.refresh": "🔄 Refresh",

        // Page titles
        "page.dashboard": "Dashboard",
        "page.domains": "Domain Management",
        "page.records": "DNS Records",
        "page.tunnels": "Cloudflare Tunnels",
        "page.ddns": "Dynamic DNS",
        "page.logs": "Logs",
        "page.settings": "Settings",

        // Setup
        "setup.welcome": "Welcome to CF DDNS Manager",
        "setup.desc": "To get started, please enter your Cloudflare API Token.",
        "setup.permissions": "Token requires <strong>Zone:Read</strong>, <strong>Zone:Edit</strong>, <strong>DNS:Read</strong>, <strong>DNS:Edit</strong> permissions.",
        "setup.token_label": "API Token",
        "setup.token_placeholder": "Paste your Cloudflare API Token here...",
        "setup.token_hint": "Create token at: dash.cloudflare.com → My Profile → API Tokens",
        "setup.connect": "🚀 Connect Cloudflare",

        // Dashboard
        "dash.domains": "Domains",
        "dash.domains_sub": "Managed domains",
        "dash.records": "DNS Records",
        "dash.records_sub": "Total records",
        "dash.ddns": "DDNS",
        "dash.ddns_sub": "records monitored",
        "dash.last_update": "Last Update",
        "dash.every": "Every",
        "dash.minutes": "minutes",
        "dash.recent": "📝 Recent Activity",
        "dash.no_activity": "No activity yet",
        "dash.no_activity_desc": "DDNS updates will appear here",
        "dash.on": "On",
        "dash.off": "Off",

        // Domains
        "domains.desc": "Manage your Cloudflare domains",
        "domains.add": "➕ Add Domain",
        "domains.no_domains": "No domains yet",
        "domains.no_domains_desc": "Click \"Add Domain\" to get started",
        "domains.btn_ns": "🔧 NS",
        "domains.btn_records": "📋 Records",
        "domains.loading": "Loading domains...",
        "domains.error": "Failed to load domains",

        // Records
        "records.select_domain": "-- Select Domain --",
        "records.add": "➕ Add Record",
        "records.type": "Type",
        "records.name": "Name",
        "records.content": "Content",
        "records.ttl": "TTL",
        "records.proxy": "Proxy",
        "records.ddns": "DDNS",
        "records.actions": "Actions",
        "records.select_first": "Select a domain",
        "records.select_first_desc": "Choose a domain from the list above to view DNS records",
        "records.no_records": "No records",
        "records.no_records_desc": "Click \"Add Record\" to create a new DNS record",
        "records.loading": "Loading records...",

        // DDNS
        "ddns.status_loading": "Loading...",
        "ddns.running": "Running",
        "ddns.stopped": "Stopped",
        "ddns.start": "▶️ Start",
        "ddns.stop": "⏹️ Stop",
        "ddns.force_update": "⚡ Update Now",
        "ddns.monitored": "📡 Monitored DDNS Records",
        "ddns.domain_col": "Domain",
        "ddns.record_col": "Record",
        "ddns.type_col": "Type",
        "ddns.action_col": "Actions",
        "ddns.no_records": "No DDNS records",
        "ddns.no_records_desc": "Go to DNS Records → enable DDNS for records you want to auto-update",
        "ddns.config": "⏱️ Update Settings",
        "ddns.interval": "Update interval",
        "ddns.interval_hint": "How often to check and update IP if changed",
        "ddns.1min": "1 minute",
        "ddns.2min": "2 minutes",
        "ddns.5min": "5 minutes",
        "ddns.10min": "10 minutes",
        "ddns.15min": "15 minutes",
        "ddns.30min": "30 minutes",
        "ddns.1hour": "1 hour",

        // Logs
        "logs.title": "📝 Update Logs",
        "logs.refresh": "🔄 Refresh",
        "logs.no_logs": "No logs yet",
        "logs.no_logs_desc": "Update activities will be recorded here",

        // Settings
        "settings.token_title": "🔑 API Token",
        "settings.token_label": "Cloudflare API Token",
        "settings.token_placeholder": "Enter new API Token...",
        "settings.token_save": "Save",
        "settings.token_current": "Current token:",
        "settings.token_none": "Not configured",
        "settings.token_verify": "✅ Verify Token",

        "settings.guide_title": "📖 How to get API Token",
        "settings.guide_1": "Go to Cloudflare Dashboard",
        "settings.guide_2": "Create new Token",
        "settings.guide_3": "Set Permissions",
        "settings.guide_4": "Zone Resources",
        "settings.guide_4_desc": "Select <span class='badge badge-orange'>All Zones</span> or specific zone",
        "settings.guide_5": "Create and Copy Token",
        "settings.guide_5_desc": "Click <span class='badge badge-success'>Create Token</span> → Copy and paste above",

        "settings.theme_title": "🎨 Appearance",
        "settings.theme_label": "Display mode",
        "settings.theme_dark": "Dark Mode",
        "settings.theme_light": "Light Mode",
        "settings.theme_auto": "System",

        "settings.lang_title": "🌐 Language",
        "settings.lang_label": "Select language",
        "settings.lang_vi": "Tiếng Việt",
        "settings.lang_en": "English",

        "settings.author_title": "👨‍💻 Author",
        "settings.app_title": "ℹ️ App Information",
        "settings.app_name_label": "Application",
        "settings.app_version_label": "Version",
        "settings.app_platform_label": "Platform",
        "settings.app_api_label": "API",
        "settings.app_backend_label": "Backend",

        // Modals
        "modal.add_domain": "🌐 Add Domain",
        "modal.domain_label": "Domain name",
        "modal.domain_placeholder": "example.com",
        "modal.domain_hint": "Enter root domain (without www)",
        "modal.cancel": "Cancel",
        "modal.add_domain_btn": "➕ Add Domain",

        "modal.ns_title": "🔧 Cloudflare Nameservers",
        "modal.ns_for": "📌 Nameservers for",
        "modal.ns_guide": "<strong>Instructions:</strong><br>1. Log in to your domain registrar.<br>2. Find DNS / Nameserver management.<br>3. Replace current nameservers with Cloudflare nameservers above.<br>4. Save and wait for DNS propagation (up to 24-48 hours).",
        "modal.ns_ok": "Got it",

        "modal.add_record": "📋 Add DNS Record",
        "modal.edit_record": "✏️ Edit DNS Record",
        "modal.record_type": "Record Type",
        "modal.record_name": "Name",
        "modal.record_name_placeholder": "@ or subdomain",
        "modal.record_name_hint": "Use @ for root domain or enter subdomain",
        "modal.record_content_a": "IPv4 Address",
        "modal.record_ttl": "TTL",
        "modal.record_ttl_auto": "Auto",
        "modal.record_proxy": "Proxy through Cloudflare",
        "modal.record_save": "💾 Save Record",
        "modal.record_update": "💾 Update Record",

        "modal.confirm_title": "⚠️ Confirm Delete",
        "modal.confirm_msg": "Are you sure you want to delete?",
        "modal.confirm_delete": "🗑️ Delete",

        // Toasts
        "toast.token_empty": "Please enter API Token",
        "toast.connecting": "Checking...",
        "toast.connected": "Connected to Cloudflare! 🎉",
        "toast.token_invalid": "Invalid token",
        "toast.token_updated": "Token updated successfully!",
        "toast.token_ok": "Token is working ✅",
        "toast.token_expired": "Token is invalid or expired",
        "toast.need_token": "Please configure API Token first",
        "toast.enter_domain": "Please enter a domain name",
        "toast.domain_added": "Domain added successfully! 🎉",
        "toast.domain_deleted": "Domain deleted",
        "toast.fill_all": "Please fill in all fields",
        "toast.record_saved": "Success!",
        "toast.record_deleted": "Record deleted",
        "toast.ddns_on": "DDNS enabled for",
        "toast.ddns_off": "DDNS disabled for",
        "toast.ddns_started": "Started",
        "toast.ddns_stopped": "Stopped",
        "toast.updating_ip": "Updating IP...",
        "toast.interval_set": "Update interval set to every",
        "toast.copied": "Copied!",
        "toast.theme_dark": "Switched to Dark Mode",
        "toast.theme_light": "Switched to Light Mode",
        "toast.theme_auto": "Switched to System theme",
        "toast.lang_vi": "Đã chuyển sang Tiếng Việt",
        "toast.lang_en": "Switched to English",
        "toast.enter_new_token": "Please enter new token",
        "toast.ddns_removed": "Record removed from DDNS",
        "toast.login_ok": "Login successful! 🎉",
        "toast.logged_out": "Logged out",
        "toast.tunnel_created": "Tunnel created successfully! 🎉",
        "toast.tunnel_deleted": "Tunnel deleted",
        "toast.tunnel_config_saved": "Tunnel configuration updated ✅",
        "toast.tunnel_dns_created": "DNS record created for tunnel",

        // Login
        "login.subtitle": "Sign in with your Synology DSM account",
        "login.username": "Username",
        "login.password": "Password",
        "login.button": "🔐 Sign In",
        "login.error": "Invalid username or password",
        "login.hint": "Use your Synology DSM account",
        "login.welcome": "Welcome",
        "login.logout": "🚪",
    }
};

let currentLang = localStorage.getItem('cf-ddns-lang') || 'vi';

function t(key) {
    return LANGS[currentLang]?.[key] || LANGS['vi']?.[key] || key;
}

function setLang(lang) {
    currentLang = lang;
    localStorage.setItem('cf-ddns-lang', lang);
    applyLang();
    updateLangUI(lang);
    showToast(t(`toast.lang_${lang}`), 'success', 2000);
}

function toggleLang() {
    setLang(currentLang === 'vi' ? 'en' : 'vi');
}

function applyLang() {
    // Translate all elements with data-i18n
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const val = t(key);
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
            el.placeholder = val;
        } else if (el.hasAttribute('data-i18n-html')) {
            el.innerHTML = val;
        } else {
            el.textContent = val;
        }
    });

    // Update language toggle button
    const btn = document.getElementById('langToggleBtn');
    if (btn) btn.textContent = currentLang === 'vi' ? '🇻🇳' : '🇬🇧';

    // Update html lang attribute
    document.documentElement.lang = currentLang;
}

function updateLangUI(lang) {
    document.querySelectorAll('.lang-option').forEach(opt => {
        opt.classList.toggle('active', opt.dataset.lang === lang);
    });
}

function initLang() {
    applyLang();
    updateLangUI(currentLang);
}
