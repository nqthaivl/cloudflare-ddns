/**
 * ═══════════════════════════════════════════════════════════════
 * Cloudflare DDNS Manager - Frontend Application
 * ═══════════════════════════════════════════════════════════════
 */

// ─── Global State ────────────────────────────────────────────────
let zones = [];
let currentZoneId = null;
let currentZoneRecords = [];
let ddnsRecords = [];
let hasToken = false;
let tunnelAccountId = null;

// ─── Initialization ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    // Init language
    initLang();

    // Check if already authenticated
    await checkAuth();

    // Proxy toggle label
    document.getElementById('recordProxied').addEventListener('change', (e) => {
        document.getElementById('proxiedLabel').textContent =
            e.target.checked ? 'Proxied (Cloudflare)' : 'DNS only';
    });

    // Start IP refresh interval
    setInterval(refreshIp, 60000);
});

// ─── Authentication ─────────────────────────────────────────────
async function checkAuth() {
    try {
        const resp = await fetch('/api/auth/status');
        const data = await resp.json();
        if (data.authenticated) {
            showApp(data.username, data.first_login);
        } else {
            showLogin();
        }
    } catch {
        showLogin();
    }
}

function showLogin() {
    document.getElementById('loginOverlay').style.display = 'flex';
    document.getElementById('appLayout').style.display = 'none';
    document.getElementById('loginPassword').focus();
}

function showApp(username, firstLogin) {
    document.getElementById('loginOverlay').style.display = 'none';
    document.getElementById('appLayout').style.display = '';
    if (username) {
        document.getElementById('loggedInUser').textContent = username;
    }
    // Load app data
    checkToken();

    // If first login, prompt to change password
    if (firstLogin) {
        setTimeout(() => {
            switchPage('settings');
            const warning = document.getElementById('firstLoginWarning');
            if (warning) warning.style.display = '';
            showToast('⚠️ Hãy đổi mật khẩu mặc định để bảo mật!', 'warning');
        }, 500);
    }
}

async function doLogin() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');
    const btn = document.getElementById('loginBtn');

    if (!username || !password) {
        errorEl.classList.remove('hidden');
        return;
    }

    btn.disabled = true;
    btn.textContent = '⏳...';
    errorEl.classList.add('hidden');

    try {
        const resp = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await resp.json();

        if (data.success) {
            showToast(`Chào mừng ${data.username}! 🎉`, 'success');
            showApp(data.username, data.first_login);
            await loadDashboard();
        } else {
            errorEl.classList.remove('hidden');
        }
    } catch (err) {
        errorEl.classList.remove('hidden');
    }

    btn.disabled = false;
    btn.textContent = '🔐 Đăng nhập';
}

async function doLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    showToast('Đã đăng xuất', 'info');
    document.getElementById('loginPassword').value = '';
    showLogin();
}

async function doChangePassword() {
    const currentPwd = document.getElementById('currentPassword').value;
    const newPwd = document.getElementById('newPassword').value;
    const confirmPwd = document.getElementById('confirmPassword').value;
    const btn = document.getElementById('changePasswordBtn');

    if (!currentPwd) {
        showToast('Vui lòng nhập mật khẩu hiện tại', 'error');
        return;
    }
    if (!newPwd || newPwd.length < 4) {
        showToast('Mật khẩu mới phải có ít nhất 4 ký tự', 'error');
        return;
    }
    if (newPwd !== confirmPwd) {
        showToast('Mật khẩu xác nhận không khớp', 'error');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" style="width:14px;height:14px;"></span> Đang xử lý...';

    try {
        const resp = await fetch('/api/auth/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ current_password: currentPwd, new_password: newPwd })
        });
        const data = await resp.json();

        if (data.success) {
            showToast('Đổi mật khẩu thành công! 🔐', 'success');
            document.getElementById('currentPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';
            const warning = document.getElementById('firstLoginWarning');
            if (warning) warning.style.display = 'none';
        } else {
            showToast(data.message || 'Lỗi đổi mật khẩu', 'error');
        }
    } catch (err) {
        showToast('Lỗi kết nối', 'error');
    }

    btn.disabled = false;
    btn.innerHTML = '🔑 Đổi mật khẩu';
}

// ─── API Helper ──────────────────────────────────────────────────
async function api(url, method = 'GET', body = null) {
    const opts = {
        method,
        headers: { 'Content-Type': 'application/json' }
    };
    if (body) opts.body = JSON.stringify(body);
    try {
        const resp = await fetch(url, opts);
        return await resp.json();
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ─── Token Management ───────────────────────────────────────────
async function checkToken() {
    const data = await api('/api/token');
    hasToken = data.has_token;

    if (hasToken) {
        document.getElementById('currentTokenDisplay').textContent = data.token;
        showMainApp();
        await loadDashboard();
    } else {
        showSetup();
    }
}

async function saveToken() {
    const token = document.getElementById('setupToken').value.trim();
    if (!token) {
        showToast('Vui lòng nhập API Token', 'warning');
        return;
    }

    const btn = document.getElementById('setupBtn');
    btn.innerHTML = '<span class="spinner"></span> Đang kiểm tra...';
    btn.disabled = true;

    const data = await api('/api/token', 'POST', { token });
    if (data.success) {
        showToast('Kết nối Cloudflare thành công! 🎉', 'success');
        hasToken = true;
        showMainApp();
        await loadDashboard();
    } else {
        showToast(data.error || 'Token không hợp lệ', 'error');
    }

    btn.innerHTML = '🚀 Kết nối Cloudflare';
    btn.disabled = false;
}

async function updateToken() {
    const token = document.getElementById('settingsToken').value.trim();
    if (!token) {
        showToast('Vui lòng nhập token mới', 'warning');
        return;
    }

    const data = await api('/api/token', 'POST', { token });
    if (data.success) {
        showToast('Đã cập nhật token thành công!', 'success');
        document.getElementById('settingsToken').value = '';
        await checkToken();
    } else {
        showToast(data.error || 'Token không hợp lệ', 'error');
    }
}

async function verifyToken() {
    const data = await api('/api/token/verify');
    if (data.success) {
        showToast('Token đang hoạt động bình thường ✅', 'success');
    } else {
        showToast('Token không hợp lệ hoặc đã hết hạn', 'error');
    }
}

function showSetup() {
    document.querySelectorAll('.page-section').forEach(p => p.classList.remove('active'));
    document.getElementById('page-setup').classList.add('active');
}

function showMainApp() {
    document.querySelectorAll('.page-section').forEach(p => p.classList.remove('active'));
    document.getElementById('page-dashboard').classList.add('active');
}

// ─── Navigation ─────────────────────────────────────────────────
const pageConfig = {
    dashboard: { icon: '📊', titleKey: 'page.dashboard' },
    domains: { icon: '🌐', titleKey: 'page.domains' },
    records: { icon: '📋', titleKey: 'page.records' },
    tunnels: { icon: '🚇', titleKey: 'page.tunnels' },
    ddns: { icon: '🔄', titleKey: 'page.ddns' },
    logs: { icon: '📝', titleKey: 'page.logs' },
    settings: { icon: '⚙️', titleKey: 'page.settings' }
};

function switchPage(page) {
    if (!hasToken && page !== 'settings') {
        showToast('Vui lòng cấu hình API Token trước', 'warning');
        return;
    }

    // Update nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.page === page);
    });

    // Update header
    const config = pageConfig[page];
    document.getElementById('pageIcon').textContent = config.icon;
    document.getElementById('pageTitle').textContent = t(config.titleKey);

    // Show page
    document.querySelectorAll('.page-section').forEach(p => p.classList.remove('active'));
    document.getElementById(`page-${page}`).classList.add('active');

    // Load page data
    switch (page) {
        case 'dashboard': loadDashboard(); break;
        case 'domains': loadZones(); break;
        case 'records': loadZonesForSelect(); break;
        case 'tunnels': loadTunnels(); break;
        case 'ddns': loadDdnsPage(); break;
        case 'logs': loadLogs(); break;
        case 'settings': loadSettings(); break;
    }

    // Close sidebar on mobile
    document.getElementById('sidebar').classList.remove('open');
}

function refreshCurrentPage() {
    const activePage = document.querySelector('.nav-item.active');
    if (activePage) {
        switchPage(activePage.dataset.page);
    }
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

// ─── Dashboard ──────────────────────────────────────────────────
async function loadDashboard() {
    // Load zones count
    const zonesData = await api('/api/zones');
    if (zonesData.success) {
        zones = zonesData.zones;
        document.getElementById('statDomains').textContent = zones.length;
        document.getElementById('domainCount').textContent = zones.length;

        // Count total records
        let totalRecords = 0;
        for (const zone of zones) {
            const recordsData = await api(`/api/zones/${zone.id}/records`);
            if (recordsData.success) {
                totalRecords += recordsData.records.length;
            }
        }
        document.getElementById('statRecords').textContent = totalRecords;
    }

    // Load DDNS status
    const ddnsData = await api('/api/ddns/status');
    if (ddnsData.success !== undefined) {
        document.getElementById('statDdns').textContent = ddnsData.running ? 'Bật' : 'Tắt';
        document.getElementById('statDdnsRecords').textContent =
            `${ddnsData.monitored_records} records đang theo dõi`;
        document.getElementById('statLastUpdate').textContent =
            ddnsData.last_update && ddnsData.last_update !== 'Chưa cập nhật'
                ? formatDate(ddnsData.last_update) : 'N/A';
        document.getElementById('statInterval').textContent =
            `Mỗi ${Math.round(ddnsData.interval / 60)} phút`;
    }

    // Load Tunnels count
    const tunnelsData = await api('/api/tunnels');
    if (tunnelsData.success) {
        document.getElementById('statTunnels').textContent = tunnelsData.tunnels.length;
        document.getElementById('tunnelCount').textContent = tunnelsData.tunnels.length;
    }

    // Load IP
    await refreshIp();

    // Load recent logs
    await loadDashboardLogs();
}

async function loadDashboardLogs() {
    const data = await api('/api/ddns/logs?limit=10');
    const container = document.getElementById('dashboardLogs');
    if (data.success && data.logs.length > 0) {
        container.innerHTML = data.logs.map(log => `
            <div class="log-item">
                <div class="log-dot ${log.level}"></div>
                <div class="log-time">${log.time}</div>
                <div class="log-message">${log.message}</div>
            </div>
        `).join('');
    } else {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📭</div>
                <h4>Chưa có hoạt động</h4>
                <p>Các bản cập nhật DDNS sẽ hiển thị tại đây</p>
            </div>`;
    }
}

async function refreshIp() {
    const data = await api('/api/ip');
    if (data.success) {
        document.getElementById('currentIp').textContent = data.ip;
    }
}

// ─── Zones (Domains) ───────────────────────────────────────────
async function loadZones() {
    const container = document.getElementById('zoneGrid');
    container.innerHTML = '<div class="text-center text-muted" style="padding:40px;"><span class="spinner"></span> Đang tải domains...</div>';

    const data = await api('/api/zones');
    if (data.success) {
        zones = data.zones;
        document.getElementById('domainCount').textContent = zones.length;

        if (zones.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1;">
                    <div class="empty-state-icon">🌐</div>
                    <h4>Chưa có domain nào</h4>
                    <p>Nhấn "Thêm Domain" để bắt đầu</p>
                </div>`;
            return;
        }

        container.innerHTML = zones.map(zone => {
            const statusBadge = zone.status === 'active'
                ? '<span class="badge badge-success">● Active</span>'
                : zone.status === 'pending'
                    ? '<span class="badge badge-warning">◔ Pending</span>'
                    : `<span class="badge badge-muted">${zone.status}</span>`;

            const nsHtml = zone.name_servers
                ? zone.name_servers.map(ns => `<span>${ns}</span>`).join('')
                : '';

            return `
                <div class="zone-card" onclick="viewZoneRecords('${zone.id}')">
                    <div class="zone-card-header">
                        <div class="zone-card-name">
                            🌐 ${zone.name}
                        </div>
                        <span class="badge badge-muted">${zone.plan}</span>
                    </div>
                    <div class="zone-card-status">${statusBadge}</div>
                    ${nsHtml ? `<div class="zone-card-ns">Nameservers:<br>${nsHtml}</div>` : ''}
                    <div class="zone-card-actions" onclick="event.stopPropagation();">
                        <button class="btn btn-secondary btn-sm" onclick="showNameservers('${zone.id}', '${zone.name}')">
                            🔧 NS
                        </button>
                        <button class="btn btn-secondary btn-sm" onclick="viewZoneRecords('${zone.id}')">
                            📋 Records
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="confirmDeleteZone('${zone.id}', '${zone.name}')">
                            🗑️
                        </button>
                    </div>
                </div>`;
        }).join('');
    } else {
        container.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><h4>Lỗi tải domains</h4><p>${data.error}</p></div>`;
    }
}

function openAddDomainModal() {
    document.getElementById('newDomainName').value = '';
    openModal('addDomainModal');
}

async function addDomain() {
    const domain = document.getElementById('newDomainName').value.trim();
    if (!domain) {
        showToast('Vui lòng nhập tên miền', 'warning');
        return;
    }

    const btn = document.getElementById('addDomainBtn');
    btn.innerHTML = '<span class="spinner"></span> Đang thêm...';
    btn.disabled = true;

    const data = await api('/api/zones', 'POST', { domain });

    btn.innerHTML = '➕ Thêm Domain';
    btn.disabled = false;

    if (data.success) {
        showToast(`Đã thêm domain ${domain} thành công! 🎉`, 'success');
        closeModal('addDomainModal');
        await loadZones();

        // Show nameservers modal
        if (data.zone && data.zone.name_servers && data.zone.name_servers.length > 0) {
            showNameserversFromData(data.zone.name, data.zone.name_servers);
        }
    } else {
        showToast(data.error || 'Không thể thêm domain', 'error');
    }
}

function showNameservers(zoneId, zoneName) {
    const zone = zones.find(z => z.id === zoneId);
    if (!zone) return;

    showNameserversFromData(zoneName, zone.name_servers || []);
}

function showNameserversFromData(zoneName, nameservers) {
    document.getElementById('nsDomainName').textContent = zoneName;
    const nsList = document.getElementById('nsList');

    if (nameservers.length > 0) {
        nsList.innerHTML = nameservers.map(ns => `
            <li class="ns-item">
                <span>📌</span>
                <span>${ns}</span>
                <button class="copy-btn" onclick="copyToClipboard('${ns}')" title="Sao chép">📋</button>
            </li>
        `).join('');
    } else {
        nsList.innerHTML = '<li class="ns-item text-muted">Không có nameserver nào</li>';
    }

    openModal('nsModal');
}

function confirmDeleteZone(zoneId, zoneName) {
    document.getElementById('confirmMessage').innerHTML =
        `Bạn có chắc chắn muốn xóa domain <strong>${zoneName}</strong>?<br>
        <span class="text-sm text-muted">Hành động này không thể hoàn tác.</span>`;

    document.getElementById('confirmDeleteBtn').onclick = async () => {
        const data = await api(`/api/zones/${zoneId}`, 'DELETE');
        if (data.success) {
            showToast(`Đã xóa domain ${zoneName}`, 'success');
            closeModal('confirmModal');
            await loadZones();
        } else {
            showToast(data.error || 'Không thể xóa domain', 'error');
        }
    };

    openModal('confirmModal');
}

function viewZoneRecords(zoneId) {
    switchPage('records');
    setTimeout(() => {
        document.getElementById('recordZoneSelect').value = zoneId;
        loadRecords();
    }, 100);
}

// ─── DNS Records ────────────────────────────────────────────────
async function loadZonesForSelect() {
    const select = document.getElementById('recordZoneSelect');
    const currentVal = select.value;

    const data = await api('/api/zones');
    if (data.success) {
        zones = data.zones;
        select.innerHTML = '<option value="">-- Chọn Domain --</option>' +
            zones.map(z => `<option value="${z.id}">${z.name}</option>`).join('');

        if (currentVal) {
            select.value = currentVal;
            loadRecords();
        }
    }
}

async function loadRecords() {
    const zoneId = document.getElementById('recordZoneSelect').value;
    const addBtn = document.getElementById('addRecordBtn');
    const tbody = document.getElementById('recordsTable');

    currentZoneId = zoneId;

    if (!zoneId) {
        addBtn.disabled = true;
        tbody.innerHTML = `<tr><td colspan="7">
            <div class="empty-state">
                <div class="empty-state-icon">📋</div>
                <h4>Chọn một domain</h4>
                <p>Chọn domain từ danh sách bên trên để xem DNS records</p>
            </div></td></tr>`;
        return;
    }

    addBtn.disabled = false;
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding:30px;"><span class="spinner"></span> Đang tải records...</td></tr>`;

    // Load DDNS records to check which ones are monitored
    const ddnsData = await api('/api/ddns/records');
    ddnsRecords = ddnsData.success ? ddnsData.records : [];

    const data = await api(`/api/zones/${zoneId}/records`);
    if (data.success) {
        currentZoneRecords = data.records;

        if (data.records.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7">
                <div class="empty-state">
                    <div class="empty-state-icon">📋</div>
                    <h4>Không có record nào</h4>
                    <p>Nhấn "Thêm Record" để tạo bản ghi DNS mới</p>
                </div></td></tr>`;
            return;
        }

        const zoneName = zones.find(z => z.id === zoneId)?.name || '';

        tbody.innerHTML = data.records.map(record => {
            const isDdns = ddnsRecords.some(r => r.record_id === record.id);
            const proxyIcon = record.proxied
                ? '<span class="proxied-on" title="Proxied">☁️</span>'
                : '<span class="proxied-off" title="DNS only">☁️</span>';

            const ttlText = record.ttl === 1 ? 'Auto' : formatTtl(record.ttl);
            const canDdns = ['A', 'AAAA'].includes(record.type);

            return `
                <tr>
                    <td><span class="badge-type">${record.type}</span></td>
                    <td style="font-weight:500;">${record.name.replace('.' + zoneName, '')}</td>
                    <td><span class="record-content" title="${record.content}">${record.content.length > 50 ? record.content.substring(0, 50) + '...' : record.content}</span></td>
                    <td class="text-muted text-sm">${ttlText}</td>
                    <td>${proxyIcon}</td>
                    <td>
                        ${canDdns ? `
                            <label class="toggle" title="${isDdns ? 'Bỏ DDNS' : 'Bật DDNS'}">
                                <input type="checkbox" ${isDdns ? 'checked' : ''} 
                                    onchange="toggleDdns(this, '${record.id}', '${record.name}', '${record.type}', '${zoneName}')">
                                <span class="toggle-slider"></span>
                            </label>
                        ` : '<span class="text-muted text-sm">—</span>'}
                    </td>
                    <td>
                        <div class="flex gap-8">
                            <button class="btn btn-secondary btn-sm" onclick='editRecord(${JSON.stringify(record).replace(/'/g, "\\'")})'
                                title="Chỉnh sửa">✏️</button>
                            <button class="btn btn-danger btn-sm" onclick="confirmDeleteRecord('${record.id}', '${record.name}')"
                                title="Xóa">🗑️</button>
                        </div>
                    </td>
                </tr>`;
        }).join('');
    } else {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">Lỗi: ${data.error}</td></tr>`;
    }
}

function openAddRecordModal() {
    document.getElementById('recordModalTitle').innerHTML = '📋 Thêm DNS Record';
    document.getElementById('editRecordId').value = '';
    document.getElementById('recordType').value = 'A';
    document.getElementById('recordName').value = '';
    document.getElementById('recordContent').value = '';
    document.getElementById('recordTtl').value = '1';
    document.getElementById('recordProxied').checked = false;
    document.getElementById('proxiedLabel').textContent = 'DNS only';
    document.getElementById('recordPriority').value = '';
    document.getElementById('saveRecordBtn').innerHTML = '💾 Lưu Record';
    onRecordTypeChange();
    openModal('recordModal');
}

function editRecord(record) {
    document.getElementById('recordModalTitle').innerHTML = '✏️ Sửa DNS Record';
    document.getElementById('editRecordId').value = record.id;
    document.getElementById('recordType').value = record.type;
    document.getElementById('recordName').value = record.name;
    document.getElementById('recordContent').value = record.content;
    document.getElementById('recordTtl').value = record.ttl.toString();
    document.getElementById('recordProxied').checked = record.proxied || false;
    document.getElementById('proxiedLabel').textContent = record.proxied ? 'Proxied (Cloudflare)' : 'DNS only';
    document.getElementById('recordPriority').value = record.priority || '';
    document.getElementById('saveRecordBtn').innerHTML = '💾 Cập nhật Record';
    onRecordTypeChange();
    openModal('recordModal');
}

function onRecordTypeChange() {
    const type = document.getElementById('recordType').value;
    const priorityGroup = document.getElementById('priorityGroup');
    const proxiedGroup = document.getElementById('proxiedGroup');
    const contentLabel = document.getElementById('recordContentLabel');

    priorityGroup.style.display = type === 'MX' ? '' : 'none';

    // Show/hide proxy option (only for A, AAAA, CNAME)
    const proxyTypes = ['A', 'AAAA', 'CNAME'];
    proxiedGroup.style.display = proxyTypes.includes(type) ? '' : 'none';

    // Update content label
    const labels = {
        'A': 'Địa chỉ IPv4',
        'AAAA': 'Địa chỉ IPv6',
        'CNAME': 'Target',
        'MX': 'Mail Server',
        'TXT': 'Nội dung TXT',
        'SRV': 'Target',
        'NS': 'Nameserver',
        'CAA': 'Giá trị'
    };
    contentLabel.textContent = labels[type] || 'Nội dung';
}

async function saveRecord() {
    const recordId = document.getElementById('editRecordId').value;
    const type = document.getElementById('recordType').value;
    const name = document.getElementById('recordName').value.trim();
    const content = document.getElementById('recordContent').value.trim();
    const ttl = parseInt(document.getElementById('recordTtl').value);
    const proxied = document.getElementById('recordProxied').checked;
    const priority = document.getElementById('recordPriority').value;

    if (!name || !content) {
        showToast('Vui lòng nhập đầy đủ thông tin', 'warning');
        return;
    }

    const body = { type, name, content, ttl, proxied };
    if (type === 'MX' && priority) {
        body.priority = parseInt(priority);
    }

    const btn = document.getElementById('saveRecordBtn');
    btn.innerHTML = '<span class="spinner"></span> Đang lưu...';
    btn.disabled = true;

    let data;
    if (recordId) {
        // Update
        data = await api(`/api/zones/${currentZoneId}/records/${recordId}`, 'PUT', body);
    } else {
        // Create
        data = await api(`/api/zones/${currentZoneId}/records`, 'POST', body);
    }

    btn.innerHTML = recordId ? '💾 Cập nhật Record' : '💾 Lưu Record';
    btn.disabled = false;

    if (data.success) {
        showToast(data.message || 'Thành công!', 'success');
        closeModal('recordModal');
        await loadRecords();
    } else {
        showToast(data.error || 'Có lỗi xảy ra', 'error');
    }
}

function confirmDeleteRecord(recordId, recordName) {
    document.getElementById('confirmMessage').innerHTML =
        `Bạn có chắc chắn muốn xóa record <strong>${recordName}</strong>?`;

    document.getElementById('confirmDeleteBtn').onclick = async () => {
        const data = await api(`/api/zones/${currentZoneId}/records/${recordId}`, 'DELETE');
        if (data.success) {
            showToast('Đã xóa record', 'success');
            closeModal('confirmModal');
            await loadRecords();
        } else {
            showToast(data.error || 'Không thể xóa record', 'error');
        }
    };

    openModal('confirmModal');
}

// ─── DDNS ───────────────────────────────────────────────────────
async function toggleDdns(checkbox, recordId, recordName, recordType, zoneName) {
    if (checkbox.checked) {
        // Add to DDNS
        const zone = zones.find(z => z.name === zoneName);
        if (!zone) {
            showToast('Không tìm thấy zone', 'error');
            checkbox.checked = false;
            return;
        }
        const data = await api('/api/ddns/records', 'POST', {
            zone_id: zone.id,
            zone_name: zoneName,
            record_id: recordId,
            record_name: recordName,
            record_type: recordType
        });
        if (data.success) {
            showToast(`Đã bật DDNS cho ${recordName}`, 'success');
        } else {
            showToast(data.error || 'Lỗi', 'error');
            checkbox.checked = false;
        }
    } else {
        // Remove from DDNS
        const data = await api(`/api/ddns/records/${recordId}`, 'DELETE');
        if (data.success) {
            showToast(`Đã tắt DDNS cho ${recordName}`, 'info');
        } else {
            showToast(data.error || 'Lỗi', 'error');
            checkbox.checked = true;
        }
    }
}

async function loadDdnsPage() {
    // Load status
    const statusData = await api('/api/ddns/status');
    if (statusData.success !== undefined) {
        const dot = document.getElementById('ddnsStatusDot');
        const text = document.getElementById('ddnsStatusText');
        const ipDisp = document.getElementById('ddnsIpDisplay');

        if (statusData.running) {
            dot.className = 'status-dot running';
            text.textContent = 'Đang chạy';
            text.style.color = 'var(--success)';
        } else {
            dot.className = 'status-dot stopped';
            text.textContent = 'Đã dừng';
            text.style.color = 'var(--error)';
        }

        ipDisp.textContent = `IP: ${statusData.current_ip || '--'}`;

        // Set interval select
        const intervalSel = document.getElementById('ddnsInterval');
        const intervalVal = statusData.interval?.toString();
        if (intervalVal) {
            for (const opt of intervalSel.options) {
                if (opt.value === intervalVal) {
                    opt.selected = true;
                    break;
                }
            }
        }
    }

    // Load DDNS records
    const recordsData = await api('/api/ddns/records');
    const tbody = document.getElementById('ddnsRecordsTable');

    if (recordsData.success && recordsData.records.length > 0) {
        tbody.innerHTML = recordsData.records.map(r => `
            <tr>
                <td style="font-weight:500;">${r.zone_name}</td>
                <td class="font-mono">${r.record_name}</td>
                <td><span class="badge-type">${r.record_type}</span></td>
                <td>
                    <button class="btn btn-danger btn-sm" onclick="removeDdnsRecord('${r.record_id}')">
                        🗑️ Xóa
                    </button>
                </td>
            </tr>
        `).join('');
    } else {
        tbody.innerHTML = `<tr><td colspan="4">
            <div class="empty-state">
                <div class="empty-state-icon">🔄</div>
                <h4>Chưa có record DDNS</h4>
                <p>Vào DNS Records → bật DDNS cho record bạn muốn tự động cập nhật IP</p>
            </div></td></tr>`;
    }
}

async function startDdns() {
    const data = await api('/api/ddns/start', 'POST');
    showToast(data.message || (data.success ? 'Đã bắt đầu' : 'Lỗi'), data.success ? 'success' : 'error');
    await loadDdnsPage();
}

async function stopDdns() {
    const data = await api('/api/ddns/stop', 'POST');
    showToast(data.message || (data.success ? 'Đã dừng' : 'Lỗi'), data.success ? 'info' : 'error');
    await loadDdnsPage();
}

async function forceUpdate() {
    showToast('Đang cập nhật IP...', 'info');
    const data = await api('/api/ddns/update', 'POST', { force: true });
    showToast(data.message || (data.success ? 'Đã cập nhật' : 'Lỗi'), data.success ? 'success' : 'error');
    await refreshIp();
    await loadDdnsPage();
}

async function setDdnsInterval() {
    const interval = parseInt(document.getElementById('ddnsInterval').value);
    const data = await api('/api/ddns/interval', 'POST', { interval });
    if (data.success) {
        showToast(`Đã đặt cập nhật mỗi ${Math.round(interval / 60)} phút`, 'success');
    }
}

async function removeDdnsRecord(recordId) {
    const data = await api(`/api/ddns/records/${recordId}`, 'DELETE');
    if (data.success) {
        showToast('Đã xóa record khỏi DDNS', 'success');
        await loadDdnsPage();
    } else {
        showToast(data.error || 'Lỗi', 'error');
    }
}

// ─── Tunnels ────────────────────────────────────────────────────
let currentTunnels = [];
let wizardStep = 1;
let wizardRoutes = [];
let wizardZones = [];

async function loadTunnels() {
    const container = document.getElementById('tunnelGrid');
    container.innerHTML = '<div class="text-center text-muted" style="padding:40px;"><span class="spinner"></span> Đang tải tunnels...</div>';

    // Load zones for reuse
    const zoneData = await api('/api/zones');
    if (zoneData.success) {
        wizardZones = zoneData.zones;
    }

    const data = await api('/api/tunnels');
    if (data.success) {
        currentTunnels = data.tunnels;
        tunnelAccountId = data.account_id;
        document.getElementById('tunnelCount').textContent = currentTunnels.length;

        if (currentTunnels.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1;">
                    <div class="empty-state-icon">🚇</div>
                    <h4>Chưa có tunnel nào</h4>
                    <p>Nhấn "Tạo Tunnel" để bắt đầu kết nối dịch vụ nội bộ ra internet an toàn</p>
                </div>`;
            return;
        }

        // Load configs for all tunnels (to show routes)
        const configPromises = currentTunnels.map(t =>
            api(`/api/tunnels/${t.id}/config`).then(c => ({ id: t.id, config: c }))
        );
        const configs = await Promise.all(configPromises);
        const configMap = {};
        configs.forEach(c => {
            if (c.config.success && c.config.config?.config?.ingress) {
                configMap[c.id] = c.config.config.config.ingress.filter(r => r.hostname);
            }
        });

        container.innerHTML = currentTunnels.map(tunnel => {
            const isActive = tunnel.status === 'active' || (tunnel.connections && tunnel.connections.length > 0);
            const statusBadge = isActive
                ? '<span class="badge badge-success">● Active</span>'
                : '<span class="badge badge-muted">○ Inactive</span>';

            const routes = configMap[tunnel.id] || [];
            const routesHtml = routes.length > 0
                ? routes.map(r => `
                    <div class="tunnel-route-item" id="route-${tunnel.id}-${btoa(r.hostname).replace(/=/g, '')}">
                        <span class="tunnel-route-host" title="${r.hostname}">${r.hostname}</span>
                        <span class="ingress-arrow">→</span>
                        <span class="tunnel-route-service" title="${r.service}">${r.service}</span>
                        <button class="route-delete-btn"
                            onclick="deleteRoute('${tunnel.id}', '${r.hostname}', this)"
                            title="Xóa route này">✕</button>
                    </div>`).join('')
                : '<div class="text-muted text-sm" style="padding:6px 0;">Chưa có route nào</div>';

            return `
                <div class="tunnel-card ${isActive ? 'tunnel-active' : ''}">
                    <div class="tunnel-card-header">
                        <div class="tunnel-card-name">
                            <span class="tunnel-icon">${isActive ? '🟢' : '⚪'}</span>
                            ${tunnel.name}
                        </div>
                        ${statusBadge}
                    </div>

                    <div class="tunnel-card-body">
                        <!-- Left panel: Connector Status -->
                        <div class="tunnel-panel">
                            <div class="tunnel-panel-title">⚡ Connector</div>
                            <div id="connStatus-${tunnel.id}">
                                <span class="spinner" style="width:12px;height:12px;"></span>
                                <span class="text-muted text-sm"> Kiểm tra...</span>
                            </div>
                        </div>

                        <!-- Right panel: Routes -->
                        <div class="tunnel-panel">
                            <div class="tunnel-panel-title">📡 Routes (${routes.length})</div>
                            <div id="routesList-${tunnel.id}">
                                ${routesHtml}
                            </div>
                        </div>
                    </div>

                    <div class="tunnel-card-actions">
                        <button class="btn btn-primary btn-sm" onclick="openAddRouteModal('${tunnel.id}', '${tunnel.name}')" title="Thêm route">
                            ➕ Route
                        </button>
                        <button class="btn btn-secondary btn-sm" onclick="showTunnelToken('${tunnel.id}')" title="Lệnh cài đặt connector">
                            🔑 Token
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="confirmDeleteTunnel('${tunnel.id}', '${tunnel.name}')" title="Xóa tunnel">
                            🗑️
                        </button>
                    </div>
                </div>`;
        }).join('');

        // Load connector statuses
        loadConnectorStatuses();
    } else {
        container.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><h4>Lỗi tải tunnels</h4><p>${data.error}</p></div>`;
    }
}

async function loadConnectorStatuses() {
    for (const tunnel of currentTunnels) {
        const el = document.getElementById(`connStatus-${tunnel.id}`);
        if (!el) continue;

        const data = await api(`/api/connector/status/${encodeURIComponent(tunnel.name)}`);
        if (data.success) {
            if (!data.docker_available) {
                el.innerHTML = `
                    <div class="connector-bar">
                        <span class="connector-dot connector-dot-warn"></span>
                        <span class="text-sm text-muted">Docker không khả dụng</span>
                    </div>`;
            } else if (data.running) {
                el.innerHTML = `
                    <div class="connector-bar connector-running">
                        <span class="connector-dot connector-dot-ok"></span>
                        <span class="text-sm" style="color:var(--success); font-weight:600;">🐳 Connector đang chạy</span>
                        <div style="margin-left:auto; display:flex; gap:6px;">
                            <button class="btn btn-secondary btn-sm" onclick="restartConnector('${tunnel.id}', '${tunnel.name}')" title="Khởi động lại" style="padding:4px 10px; font-size:0.72rem;">🔄</button>
                            <button class="btn btn-danger btn-sm" onclick="stopConnector('${tunnel.id}', '${tunnel.name}')" title="Dừng" style="padding:4px 10px; font-size:0.72rem;">⏹️ Dừng</button>
                        </div>
                    </div>`;
            } else {
                el.innerHTML = `
                    <div class="connector-bar">
                        <span class="connector-dot connector-dot-off"></span>
                        <span class="text-sm text-muted">Connector chưa chạy</span>
                        <button class="btn btn-success btn-sm" onclick="startConnector('${tunnel.id}', '${tunnel.name}')" style="margin-left:auto; padding:4px 12px; font-size:0.72rem;">▶️ Chạy</button>
                    </div>`;
            }
        } else {
            el.innerHTML = `<span class="text-muted text-sm">Không xác định</span>`;
        }
    }
}

async function startConnector(tunnelId, tunnelName) {
    const el = document.getElementById(`connStatus-${tunnelId}`);
    if (el) el.innerHTML = '<div class="connector-bar"><span class="spinner" style="width:14px;height:14px;"></span><span class="text-sm text-muted">Đang khởi động connector...</span></div>';

    // Get token first
    const tokenData = await api(`/api/tunnels/${tunnelId}/token`);
    if (!tokenData.success) {
        showToast('Không thể lấy token: ' + (tokenData.error || ''), 'error');
        await loadConnectorStatuses();
        return;
    }

    const data = await api('/api/connector/start', 'POST', {
        tunnel_name: tunnelName,
        token: tokenData.token
    });

    if (data.success) {
        showToast(`Connector ${tunnelName} đã chạy! 🐳`, 'success');
    } else {
        showToast(data.error || 'Không thể chạy connector', 'error');
    }
    await loadConnectorStatuses();
}

async function stopConnector(tunnelId, tunnelName) {
    const el = document.getElementById(`connStatus-${tunnelId}`);
    if (el) el.innerHTML = '<div class="connector-bar"><span class="spinner" style="width:14px;height:14px;"></span><span class="text-sm text-muted">Đang dừng...</span></div>';

    const data = await api('/api/connector/stop', 'POST', { tunnel_name: tunnelName });
    if (data.success) {
        showToast(`Đã dừng connector ${tunnelName}`, 'success');
    } else {
        showToast(data.error || 'Không thể dừng connector', 'error');
    }
    await loadConnectorStatuses();
}

async function restartConnector(tunnelId, tunnelName) {
    const el = document.getElementById(`connStatus-${tunnelId}`);
    if (el) el.innerHTML = '<div class="connector-bar"><span class="spinner" style="width:14px;height:14px;"></span><span class="text-sm text-muted">Đang khởi động lại...</span></div>';

    // Get token
    const tokenData = await api(`/api/tunnels/${tunnelId}/token`);
    if (!tokenData.success) {
        showToast('Không thể lấy token', 'error');
        await loadConnectorStatuses();
        return;
    }

    const data = await api('/api/connector/start', 'POST', {
        tunnel_name: tunnelName,
        token: tokenData.token
    });

    if (data.success) {
        showToast(`Đã khởi động lại connector ${tunnelName} 🐳`, 'success');
    } else {
        showToast(data.error || 'Lỗi khởi động lại', 'error');
    }
    await loadConnectorStatuses();
}

async function deleteRoute(tunnelId, hostname, btn) {
    const confirmed = await showConfirm(
        'Xóa Route',
        `Bạn có chắc muốn xóa route này?\n\n<strong style="color:var(--cf-orange)">${hostname}</strong>\n\nRoute và DNS record CNAME sẽ bị xóa vĩnh viễn.`,
        '🗑️ Xóa Route',
        'btn-danger'
    );
    if (!confirmed) return;

    const row = btn.closest('.tunnel-route-item');
    const originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '⏳';
    btn.style.opacity = '1';

    const data = await api(`/api/tunnels/${tunnelId}/routes/${encodeURIComponent(hostname)}`, 'DELETE');

    if (data.success) {
        // Animate row out
        row.style.transition = 'opacity 0.3s, transform 0.3s';
        row.style.opacity = '0';
        row.style.transform = 'translateX(20px)';
        setTimeout(() => {
            row.remove();
            // Update routes count in panel title
            const panel = document.querySelector(`#routesList-${tunnelId}`)?.closest('.tunnel-panel');
            if (panel) {
                const title = panel.querySelector('.tunnel-panel-title');
                const remaining = panel.querySelectorAll('.tunnel-route-item').length;
                if (title) title.textContent = `📡 Routes (${remaining})`;
                if (remaining === 0) {
                    document.getElementById(`routesList-${tunnelId}`).innerHTML =
                        '<div class="text-muted text-sm" style="padding:6px 0;">Chưa có route nào</div>';
                }
            }
        }, 300);
        showToast(`Đã xóa route ${hostname}`, 'success');
    } else {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
        showToast(data.error || 'Lỗi xóa route', 'error');
    }
}

// ─── Wizard Functions ───────────────────────────────────────────

function openCreateTunnelModal() {
    wizardStep = 1;
    wizardRoutes = [{ zone_id: '', hostname: '', subdomain: '', service: '' }];
    document.getElementById('wizTunnelName').value = '';
    updateWizardUI();
    openModal('tunnelWizardModal');
    setTimeout(() => document.getElementById('wizTunnelName').focus(), 200);
}

function updateWizardUI() {
    // Update step indicators
    for (let i = 1; i <= 3; i++) {
        const step = document.getElementById(`wizStep${i}`);
        step.classList.toggle('active', i === wizardStep);
        step.classList.toggle('done', i < wizardStep);
    }

    // Show/hide pages
    for (let i = 1; i <= 3; i++) {
        document.getElementById(`wizPage${i}`).style.display = i === wizardStep ? '' : 'none';
    }

    // Buttons
    document.getElementById('wizBtnBack').style.display = wizardStep > 1 && wizardStep < 3 ? '' : 'none';
    document.getElementById('wizBtnCancel').style.display = wizardStep < 3 ? '' : 'none';

    if (wizardStep === 1) {
        document.getElementById('wizBtnNext').textContent = 'Tiếp theo →';
        document.getElementById('wizBtnNext').style.display = '';
    } else if (wizardStep === 2) {
        document.getElementById('wizBtnNext').textContent = '🚀 Tạo Tunnel';
        document.getElementById('wizBtnNext').style.display = '';
    } else {
        document.getElementById('wizBtnNext').textContent = '✅ Hoàn tất';
        document.getElementById('wizBtnNext').style.display = '';
        document.getElementById('wizBtnNext').onclick = () => {
            closeModal('tunnelWizardModal');
            loadTunnels();
        };
    }

    // Render routes on step 2
    if (wizardStep === 2) {
        renderWizardRoutes();
    }
}

function wizardNext() {
    if (wizardStep === 1) {
        const name = document.getElementById('wizTunnelName').value.trim();
        if (!name) {
            showToast('Vui lòng nhập tên tunnel', 'warning');
            document.getElementById('wizTunnelName').focus();
            return;
        }
        wizardStep = 2;
        updateWizardUI();
    } else if (wizardStep === 2) {
        // Validate at least one route
        const validRoutes = wizardRoutes.filter(r => r.hostname && r.service);
        if (validRoutes.length === 0) {
            showToast('Vui lòng thêm ít nhất 1 route', 'warning');
            return;
        }
        wizardStep = 3;
        updateWizardUI();
        runQuickSetup();
    }
}

function wizardBack() {
    if (wizardStep > 1) {
        wizardStep--;
        updateWizardUI();
    }
}

function renderWizardRoutes() {
    const container = document.getElementById('wizRoutesContainer');
    const zoneOptions = '<option value="">-- Chọn Domain --</option>' +
        wizardZones.map(z => `<option value="${z.id}" data-name="${z.name}">${z.name}</option>`).join('');

    container.innerHTML = wizardRoutes.map((route, idx) => `
        <div class="wizard-route-card">
            <div class="wizard-route-header">
                <span class="text-sm" style="font-weight:600; color:var(--cf-orange);">Route ${idx + 1}</span>
                ${wizardRoutes.length > 1 ? `<button class="copy-btn-mini" onclick="removeWizardRoute(${idx})" title="Xóa route">✕</button>` : ''}
            </div>
            <div class="form-group" style="margin-bottom:10px;">
                <label class="form-label">Domain</label>
                <select class="form-select" onchange="onWizRouteZoneChange(${idx}, this)">
                    ${zoneOptions.replace(`value="${route.zone_id}"`, `value="${route.zone_id}" selected`)}
                </select>
            </div>
            <div class="form-group" style="margin-bottom:10px;">
                <label class="form-label">Subdomain</label>
                <input type="text" class="form-input" value="${route.subdomain}" placeholder="app"
                    oninput="onWizSubdomainChange(${idx}, this.value)">
                <div class="form-hint">Hostname: <strong id="wizPreview${idx}">${route.hostname || '...'}</strong></div>
            </div>
            <div class="form-group" style="margin-bottom:0;">
                <label class="form-label">Dịch vụ nội bộ (URL)</label>
                <input type="text" class="form-input" value="${route.service}" placeholder="http://localhost:8080"
                    onchange="wizardRoutes[${idx}].service = this.value">
                <div class="form-hint">VD: http://192.168.1.100:5000, http://localhost:8096</div>
            </div>
        </div>
    `).join('');
}

function onWizRouteZoneChange(idx, el) {
    const zoneId = el.value;
    const zoneName = el.selectedOptions[0]?.dataset?.name || '';
    wizardRoutes[idx].zone_id = zoneId;
    updateWizRouteHostname(idx, zoneName);
}

function onWizSubdomainChange(idx, val) {
    wizardRoutes[idx].subdomain = val;
    const zoneSelect = document.querySelectorAll('#wizRoutesContainer .form-select')[idx];
    const zoneName = zoneSelect?.selectedOptions[0]?.dataset?.name || '';
    updateWizRouteHostname(idx, zoneName);
}

function updateWizRouteHostname(idx, zoneName) {
    const sub = wizardRoutes[idx].subdomain.trim();
    let hostname = '';
    if (zoneName) {
        hostname = sub ? `${sub}.${zoneName}` : zoneName;
    }
    wizardRoutes[idx].hostname = hostname;
    const preview = document.getElementById(`wizPreview${idx}`);
    if (preview) preview.textContent = hostname || '...';
}

function addWizardRoute() {
    wizardRoutes.push({ zone_id: '', hostname: '', subdomain: '', service: '' });
    renderWizardRoutes();
}

function removeWizardRoute(idx) {
    wizardRoutes.splice(idx, 1);
    renderWizardRoutes();
}

async function runQuickSetup() {
    const name = document.getElementById('wizTunnelName').value.trim();
    const routes = wizardRoutes.filter(r => r.hostname && r.service).map(r => ({
        zone_id: r.zone_id,
        hostname: r.hostname,
        service: r.service
    }));

    document.getElementById('wizSetupProgress').style.display = '';
    document.getElementById('wizSetupResult').style.display = 'none';
    document.getElementById('wizBtnNext').style.display = 'none';

    const data = await api('/api/tunnels/quick-setup', 'POST', { name, routes });

    document.getElementById('wizSetupProgress').style.display = 'none';
    document.getElementById('wizSetupResult').style.display = '';

    if (data.success) {
        // Show step results
        const stepsHtml = (data.steps || []).map(s => {
            const icon = s.status === 'ok' ? '✅' : s.status === 'warning' ? '⚠️' : '❌';
            return `<div class="wizard-result-step ${s.status}">${icon} ${s.message}</div>`;
        }).join('');
        document.getElementById('wizStepResults').innerHTML = stepsHtml;

        // Always show token/commands for manual setup reference
        if (data.token) {
            document.getElementById('wizTokenSection').style.display = '';
            const containerCmd = `tunnel --no-autoupdate run --token ${data.token}`;
            const dockerCmd = `docker run -d --name cloudflared --restart unless-stopped --network host cloudflare/cloudflared:latest ${containerCmd}`;
            document.getElementById('wizContainerCmd').textContent = containerCmd;
            document.getElementById('wizDockerCmd').textContent = dockerCmd;
        } else {
            document.getElementById('wizTokenSection').style.display = 'none';
        }

        // Show finish button
        document.getElementById('wizBtnNext').style.display = '';
        document.getElementById('wizBtnNext').textContent = '✅ Hoàn tất';
        document.getElementById('wizBtnNext').onclick = () => {
            closeModal('tunnelWizardModal');
            loadTunnels();
        };

        showToast(data.message || 'Thiết lập tunnel thành công! 🎉', 'success');
    } else {
        document.getElementById('wizStepResults').innerHTML =
            `<div class="wizard-result-step error">❌ ${data.error || 'Lỗi thiết lập tunnel'}</div>` +
            (data.steps || []).map(s => {
                const icon = s.status === 'ok' ? '✅' : '❌';
                return `<div class="wizard-result-step ${s.status}">${icon} ${s.message}</div>`;
            }).join('');

        document.getElementById('wizBtnNext').style.display = '';
        document.getElementById('wizBtnNext').textContent = '← Quay lại';
        document.getElementById('wizBtnNext').onclick = () => {
            wizardStep = 2;
            updateWizardUI();
            document.getElementById('wizBtnNext').onclick = wizardNext;
        };

        showToast(data.error || 'Lỗi thiết lập tunnel', 'error');
    }
}

// ─── Add Route to Existing Tunnel ───────────────────────────────

async function openAddRouteModal(tunnelId, tunnelName) {
    document.getElementById('addRouteTunnelId').value = tunnelId;
    document.getElementById('addRouteHostname').value = '';
    document.getElementById('addRouteService').value = '';

    // Load zones
    const zoneSelect = document.getElementById('addRouteZone');
    zoneSelect.innerHTML = '<option value="">-- Chọn Domain --</option>' +
        wizardZones.map(z => `<option value="${z.id}" data-name="${z.name}">${z.name}</option>`).join('');

    document.getElementById('addRoutePreview').innerHTML = 'Hostname đầy đủ: <strong>...</strong>';
    openModal('addRouteModal');
}

function onAddRouteZoneChange() {
    updateAddRoutePreview();
}

function updateAddRoutePreview() {
    const zoneSelect = document.getElementById('addRouteZone');
    const zoneName = zoneSelect.selectedOptions[0]?.dataset?.name || '';
    const sub = document.getElementById('addRouteHostname').value.trim();
    let hostname = '...';
    if (zoneName) {
        hostname = sub ? `${sub}.${zoneName}` : zoneName;
    }
    document.getElementById('addRoutePreview').innerHTML = `Hostname đầy đủ: <strong>${hostname}</strong>`;
}

// Attach live preview on hostname input
document.addEventListener('DOMContentLoaded', () => {
    const hostnameInput = document.getElementById('addRouteHostname');
    if (hostnameInput) {
        hostnameInput.addEventListener('input', updateAddRoutePreview);
    }
});

async function submitAddRoute() {
    const tunnelId = document.getElementById('addRouteTunnelId').value;
    const zoneSelect = document.getElementById('addRouteZone');
    const zoneId = zoneSelect.value;
    const zoneName = zoneSelect.selectedOptions[0]?.dataset?.name || '';
    const subdomain = document.getElementById('addRouteHostname').value.trim();
    const service = document.getElementById('addRouteService').value.trim();

    const hostname = subdomain ? `${subdomain}.${zoneName}` : zoneName;

    if (!zoneId || !hostname || !service) {
        showToast('Vui lòng điền đầy đủ thông tin', 'warning');
        return;
    }

    const btn = document.getElementById('addRouteBtn');
    btn.innerHTML = '<span class="spinner"></span> Đang thêm...';
    btn.disabled = true;

    const data = await api(`/api/tunnels/${tunnelId}/add-route`, 'POST', {
        zone_id: zoneId,
        hostname: hostname,
        service: service
    });

    btn.innerHTML = '➕ Thêm Route';
    btn.disabled = false;

    if (data.success) {
        showToast(data.message || `Đã thêm route ${hostname}`, 'success');
        closeModal('addRouteModal');
        await loadTunnels();
    } else {
        showToast(data.error || 'Lỗi thêm route', 'error');
    }
}

// ─── Delete & Token (existing tunnels) ──────────────────────────

async function confirmDeleteTunnel(tunnelId, tunnelName) {
    const confirmed = await showConfirm(
        '⚠️ Xóa Tunnel',
        `Bạn có chắc muốn xóa tunnel <strong>${tunnelName}</strong>?\n\n<span class="text-sm text-muted">Hệ thống sẽ tự động:\n• Dừng connector Docker (nếu có)\n• Xóa DNS records liên quan\n• Xóa tunnel trên Cloudflare</span>`,
        '🗑️ Xóa Tunnel',
        'btn-danger'
    );
    if (!confirmed) return;

    showToast('Đang xóa tunnel...', 'info');
    const data = await api(`/api/tunnels/${tunnelId}`, 'DELETE');

    if (data.success) {
        showToast(data.message || `Đã xóa tunnel ${tunnelName}`, 'success');
        await loadTunnels();
    } else {
        showToast(data.error || 'Không thể xóa tunnel', 'error');
    }
}

async function showTunnelToken(tunnelId) {
    document.getElementById('tokenContainerCmd').textContent = 'Đang tải...';
    document.getElementById('tunnelDockerCmd').textContent = 'Đang tải...';
    openModal('tunnelTokenModal');

    const data = await api(`/api/tunnels/${tunnelId}/token`);
    if (data.success) {
        const token = data.token;
        const containerCmd = `tunnel --no-autoupdate run --token ${token}`;
        const dockerCmd = `docker run -d --name cloudflared --restart unless-stopped --network host cloudflare/cloudflared:latest ${containerCmd}`;
        document.getElementById('tokenContainerCmd').textContent = containerCmd;
        document.getElementById('tunnelDockerCmd').textContent = dockerCmd;
    } else {
        document.getElementById('tokenContainerCmd').textContent = 'Lỗi: ' + (data.error || 'Không thể lấy token');
        document.getElementById('tunnelDockerCmd').textContent = '';
    }
}

// ─── Logs ───────────────────────────────────────────────────────
async function loadLogs() {
    const container = document.getElementById('logsContainer');
    container.innerHTML = '<div class="text-center text-muted" style="padding:30px;"><span class="spinner"></span> Đang tải...</div>';

    const data = await api('/api/ddns/logs?limit=100');
    if (data.success && data.logs.length > 0) {
        container.innerHTML = data.logs.map(log => `
            <div class="log-item">
                <div class="log-dot ${log.level}"></div>
                <div class="log-time">${log.time}</div>
                <div class="log-message">${log.message}</div>
            </div>
        `).join('');
    } else {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📭</div>
                <h4>Chưa có nhật ký</h4>
                <p>Các hoạt động cập nhật sẽ được ghi nhận tại đây</p>
            </div>`;
    }
}

// ─── Settings ───────────────────────────────────────────────────
async function loadSettings() {
    const data = await api('/api/token');
    if (data.success) {
        document.getElementById('currentTokenDisplay').textContent =
            data.has_token ? data.token : 'Chưa cấu hình';
    }
}

// ─── Modal Helpers ──────────────────────────────────────────────
function openModal(id) {
    document.getElementById(id).classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeModal(id) {
    document.getElementById(id).classList.remove('show');
    document.body.style.overflow = '';
}

/**
 * Custom confirm popup - replaces browser confirm()
 * Returns a Promise that resolves true (confirmed) or false (cancelled)
 */
function showConfirm(title, message, btnText = '🗑️ Xóa', btnClass = 'btn-danger') {
    return new Promise((resolve) => {
        const titleEl = document.getElementById('confirmTitle');
        const msgEl = document.getElementById('confirmMessage');
        const btn = document.getElementById('confirmDeleteBtn');

        if (titleEl) titleEl.textContent = title;
        if (msgEl) {
            // Support multi-line with HTML
            msgEl.innerHTML = message.replace(/\n/g, '<br>');
        }
        btn.textContent = btnText;
        btn.className = `btn ${btnClass}`;

        // Remove old listeners
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);

        newBtn.addEventListener('click', () => {
            closeModal('confirmModal');
            resolve(true);
        });

        // Cancel handler
        const cancelBtn = newBtn.previousElementSibling;
        const newCancel = cancelBtn.cloneNode(true);
        cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);
        newCancel.addEventListener('click', () => {
            closeModal('confirmModal');
            resolve(false);
        });

        openModal('confirmModal');
    });
}

// Close modal on overlay click
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay') && e.target.classList.contains('show')) {
        e.target.classList.remove('show');
        document.body.style.overflow = '';
    }
});

// Close modal on Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.show').forEach(m => {
            m.classList.remove('show');
        });
        document.body.style.overflow = '';
    }
});

// ─── Toast Notifications ────────────────────────────────────────
function showToast(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toastContainer');

    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${icons[type]}</span>
        <span>${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ─── Utility Functions ──────────────────────────────────────────
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('Đã sao chép!', 'success', 2000);
    }).catch(() => {
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast('Đã sao chép!', 'success', 2000);
    });
}

function formatDate(isoString) {
    try {
        const d = new Date(isoString);
        return d.toLocaleString('vi-VN', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit'
        });
    } catch {
        return isoString;
    }
}

function formatTtl(seconds) {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
    return `${Math.round(seconds / 86400)}d`;
}

// ─── Theme Management ───────────────────────────────────────────
function initTheme() {
    const saved = localStorage.getItem('cf-ddns-theme') || 'dark';
    applyTheme(saved);
    updateThemeUI(saved);
}

function applyTheme(theme) {
    if (theme === 'auto') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
        document.documentElement.setAttribute('data-theme', theme);
    }
    // Update toggle button icon
    const btn = document.getElementById('themeToggleBtn');
    if (btn) {
        const effective = document.documentElement.getAttribute('data-theme');
        btn.textContent = effective === 'light' ? '☀️' : '🌙';
    }
}

function setTheme(theme) {
    localStorage.setItem('cf-ddns-theme', theme);
    applyTheme(theme);
    updateThemeUI(theme);
    showToast(t(`toast.theme_${theme === 'auto' ? 'auto' : theme}`), 'success', 2000);
}

function toggleTheme() {
    const current = localStorage.getItem('cf-ddns-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    setTheme(next);
}

function updateThemeUI(theme) {
    document.querySelectorAll('.theme-option').forEach(opt => {
        opt.classList.toggle('active', opt.dataset.theme === theme);
    });
}

// Listen for system theme changes when auto
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const saved = localStorage.getItem('cf-ddns-theme');
    if (saved === 'auto') applyTheme('auto');
});

// Initialize theme on load
initTheme();

