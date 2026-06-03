// ============================================================
//  CẤU HÌNH
// ============================================================
const DEFAULT_HEADERS = { 'Content-Type': 'application/json' };
let cachedCategories = [];
let cachedBanners = [];
let cachedPromotions = [];
let cachedIngredients = [];
let cachedReviews = [];
let cachedOrders = [];
let cachedProducts = [];
let cachedAccounts = [];
let cachedAccountsComplete = false;
// ============================================================
//  GỌI API CHUNG
// ============================================================

function findInCache(arr, id, key = 'id') {
    return arr.find(item => item[key] == id);
}
async function apiRequest(url, options = {}) {
  try {
    const response = await fetch(API_BASE + url, {
      credentials: 'include',
      headers: { ...DEFAULT_HEADERS, ...options.headers },
      ...options,
    });
    if (response.status === 401) {
      toast('Phiên đăng nhập hết hạn, vui lòng đăng nhập lại', 'error');
      throw new Error('Unauthorized');
    }
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Lỗi ${response.status}`);
    }
    if (response.status === 204) return null;
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    toast(error.message || 'Không thể kết nối tới server', 'error');
    throw error;
  }
}

// ============================================================
//  TOAST
// ============================================================
function toast(msg, type = 'info') {
  const icons = { success: 'ti-circle-check', error: 'ti-alert-circle', info: 'ti-info-circle' };
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.innerHTML = `<i class="ti ${icons[type] || icons.info}"></i>${msg}`;
  document.getElementById('toasts').appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateX(60px)';
    setTimeout(() => t.remove(), 300);
  }, 3000);
}

// ============================================================
//  SECTION TITLES
// ============================================================
const sectionTitles = {
  dashboard: 'Dashboard', users: 'Người dùng', products: 'Sản phẩm',
  categories: 'Danh mục', orders: 'Đơn hàng', banners: 'Banner',
  promotions: 'Mã giảm giá', reviews: 'Đánh giá',
  notifications: 'Thông báo', ingredients: 'Nguyên liệu', logs: 'Audit Log'
};

let currentRevenueRange = 'day';
let currentReviewFilter = 'all';
let currentReviewStarFilter = 'all';
let cachedReviewRows = [];
let dailyReportWatcher = null;
let dailyReportLastRunKey = null;

// ============================================================
//  NAVIGATION
// ============================================================
function goSection(id, el) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById('section-' + id).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (el) el.classList.add('active');
  document.getElementById('page-title').textContent = sectionTitles[id] || id;
  closeNotifPanel();
  renderSection(id);
}

function renderSection(id) {
  const map = {
    dashboard: renderDashboard,
    users: () => renderUsers(currentUserFilter),
    products: renderProducts,
    categories: renderCategories,
    orders: () => renderOrders(currentOrderFilter),
    banners: renderBanners,
    promotions: renderPromotions,
    reviews: () => renderReviews(currentReviewFilter),
    notifications: renderNotifHistory,
    ingredients: renderIngredients,
    logs: renderLogs
  };
  if (map[id]) map[id]();
}

// ============================================================
//  HELPERS
// ============================================================
function stars(n) {
  return '<span style="color:#f59e0b">' + '★'.repeat(n) + '</span><span style="color:#cbd5e1">' + '★'.repeat(5-n) + '</span>';
}
function statusPill(s) {
  const key = String(s || '').toLowerCase();
  const m = {
    pending:   ['amber','Chờ xử lý'],
    confirmed: ['blue','Đã xác nhận'],
    delivered: ['green','Hoàn thành'],
    completed: ['green','Hoàn thành'],
    waiting_payment: ['amber','Chờ thanh toán'],
    cancelled: ['red','Đã hủy'],
    active:    ['green','Hoạt động'],
    inactive:  ['red','Bị khóa']
  };
  const [c, t] = m[key] || ['blue', s || 'N/A'];
  return `<span class="status-pill pill-${c}">${t}</span>`;
}
function fmt(n) { return n.toLocaleString('vi-VN'); }
function now() { return new Date().toLocaleString('vi-VN'); }
function nowTime() { return new Date().toLocaleTimeString('vi-VN'); }

function getAdminProfile() {
  try {
    return typeof getCurrentUser === 'function' ? (getCurrentUser() || {}) : {};
  } catch (e) {
    return {};
  }
}

function getAdminEmailFallback() {
  const profile = getAdminProfile();
  return (profile.email || localStorage.getItem('email') || '').trim();
}

function getDailyReportKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function tryEndpoints(urls, options) {
  return urls.reduce((chain, url) => {
    return chain.then(async (lastResult) => {
      if (lastResult) return lastResult;
      try {
        const res = await fetch(API_BASE + url, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
          ...options
        });
        if (!res.ok) return null;
        return await res.json().catch(() => ({}));
      } catch (e) {
        return null;
      }
    });
  }, Promise.resolve(null));
}

function setReportStatus(label, type = 'blue') {
  const el = document.getElementById('report-status');
  if (!el) return;
  el.className = `status-pill pill-${type}`;
  el.textContent = label;
}

// ============================================================
//  MODAL & EDIT STATE
// ============================================================
let editingProductId = null;
let editingUserId = null;
let editingCatId = null;
let editingBannerId = null;
let editingPromoId = null;
let editingIngredientId = null;

function openModal(id) {
  document.getElementById(id).classList.add('open');
  // Reset form khi mở modal thêm mới (nếu không phải đang edit)
  if (id === 'modal-product' && editingProductId === null) resetProductForm();
  if (id === 'modal-user' && editingUserId === null) resetUserForm();
  if (id === 'modal-cat' && editingCatId === null) resetCatForm();
  if (id === 'modal-banner' && editingBannerId === null) resetBannerForm();
  if (id === 'modal-promo' && editingPromoId === null) resetPromoForm();
  if (id === 'modal-promo') syncPromoScopeUI();
  if (id === 'modal-ingr' && editingIngredientId === null) resetIngredientForm();
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

// Đóng modal khi click nền hoặc Escape
document.querySelectorAll('.modal-overlay').forEach(m => {
  m.addEventListener('click', e => { if (e.target === m) m.classList.remove('open'); });
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
});

// ============================================================
//  DASHBOARD
// ============================================================
async function renderDashboard(range = currentRevenueRange) {
  currentRevenueRange = range;
  try {
    const stats = await apiRequest('api/stats');
    if (stats) {
      document.getElementById('stats-row').innerHTML = `
        <div class="stat-card"><div class="stat-icon" style="background:linear-gradient(135deg,#38bdf8,#0ea5e9)"><i class="ti ti-users"></i></div><div><div class="stat-val">${stats.users||0}</div><div class="stat-lbl">Người dùng</div></div></div>
        <div class="stat-card"><div class="stat-icon" style="background:linear-gradient(135deg,#34d399,#059669)"><i class="ti ti-shopping-cart"></i></div><div><div class="stat-val">${stats.orders||0}</div><div class="stat-lbl">Đơn hàng</div></div></div>
        <div class="stat-card"><div class="stat-icon" style="background:linear-gradient(135deg,#fb923c,#ea580c)"><i class="ti ti-package"></i></div><div><div class="stat-val">${stats.products||0}</div><div class="stat-lbl">Sản phẩm</div></div></div>
        <div class="stat-card"><div class="stat-icon" style="background:linear-gradient(135deg,#a78bfa,#7c3aed)"><i class="ti ti-ticket"></i></div><div><div class="stat-val">${stats.promos||0}</div><div class="stat-lbl">Mã giảm giá</div></div></div>`;
    }
    const rev = await tryEndpoints([
      `api/stats/revenue-report?period=${encodeURIComponent(range)}`,
      `api/stats/revenue?range=${encodeURIComponent(range)}`,
      'api/stats/revenue'
    ], { method: 'GET' });
    const labelsByRange = {
      day: Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`),
      week: ['T2','T3','T4','T5','T6','T7','CN'],
      month: Array.from({ length: 31 }, (_, i) => `${i + 1}`)
    };
    const fallbackVals = {
      day: [1.8, 2.2, 3.1, 2.9, 4.0, 3.6, 3.4, 2.8, 2.2, 1.9, 2.5, 3.0, 4.2, 5.1, 4.8, 5.9, 6.2, 5.4, 4.3, 3.8, 3.1, 2.7, 2.4, 2.0],
      week: [3.2, 5.1, 4.8, 7.2, 6.5, 9.1, 8.3],
      month: [8.2, 12.3, 9.7, 15.1, 18.4, 14.8, 22.3, 24.1, 19.8, 17.2, 13.9, 20.4, 16.1, 18.3, 21.5, 19.4, 15.3, 13.7, 12.9, 14.8, 16.2, 17.9, 20.1, 23.4, 18.8, 15.7, 14.6, 13.2, 12.5, 11.8, 10.9]
    };
    const report = rev && !Array.isArray(rev) ? rev : null;
    const labels = report?.labels?.length ? report.labels : labelsByRange[range] || labelsByRange.week;
    const vals = report?.values?.length ? report.values : (Array.isArray(rev) && rev.length ? rev : fallbackVals[range] || fallbackVals.week);
    const chartLabels = vals.length === labels.length ? labels : labels.slice(0, vals.length);
    const mx = Math.max(...vals, 1);
    document.getElementById('rev-chart').innerHTML = vals.map(v => `<div class="bar" style="height:${Math.max(8, Math.round((v/mx)*90))}px" title="${Number(v).toLocaleString('vi-VN')}đ"></div>`).join('');
    document.getElementById('rev-labels').innerHTML = chartLabels.map(d => `<div class="bar-label" style="flex:1">${d}</div>`).join('');
    const orders = await apiRequest('api/orders?limit=5');
    document.getElementById('dash-orders').innerHTML = orders && orders.length ? orders.map(o => `<tr><td><b>#${o.id}</b></td><td>${o.account||'N/A'}</td><td style="font-weight:700">${fmt(o.amount||0)}đ</td><td>${statusPill(o.status)}</td></tr>`).join('') : '<tr><td colspan="4">Chưa có đơn hàng</td></tr>';
    await renderRevenueByProduct(range);
    await refreshAdminReportConfig();
  } catch (e) {}
}

function filterRevenueRange(range, el) {
  document.querySelectorAll('#revenue-tabs .tab-pill').forEach(p => p.classList.remove('active'));
  if (el) el.classList.add('active');
  currentRevenueRange = range;
  renderDashboard(range);
}

async function renderRevenueByProduct(range = currentRevenueRange) {
  const tbody = document.getElementById('revenue-products-table');
  if (!tbody) return;

  const data = await tryEndpoints([
    `api/stats/revenue/products?range=${encodeURIComponent(range)}`,
    `api/stats/revenue-by-product?range=${encodeURIComponent(range)}`,
    `api/stats/products/revenue?range=${encodeURIComponent(range)}`
  ], { method: 'GET' });

  const rows = Array.isArray(data) ? data : [];
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-light);padding:24px">Chưa có dữ liệu doanh thu theo sản phẩm</td></tr>';
    return;
  }

  const totalRevenue = rows.reduce((sum, row) => sum + Number(row.revenue || row.amount || 0), 0) || 1;
  tbody.innerHTML = rows.map((row, index) => {
    const revenue = Number(row.revenue || row.amount || 0);
    const orders = Number(row.orders || row.count || row.quantity || 0);
    const share = Math.round((revenue / totalRevenue) * 100);
    return `<tr>
      <td><b>${row.productName || row.name || `Sản phẩm #${index + 1}`}</b></td>
      <td>${orders}</td>
      <td style="font-weight:700">${fmt(revenue)}đ</td>
      <td><span class="status-pill pill-blue">${share}%</span></td>
    </tr>`;
  }).join('');
}

function reloadRevenueByProduct() {
  renderRevenueByProduct(currentRevenueRange);
}

async function downloadRevenueReport(format) {
  const endpoint = format === 'excel'
    ? `api/stats/revenue/export/excel?period=${encodeURIComponent(currentRevenueRange)}`
    : `api/stats/revenue/export/pdf?period=${encodeURIComponent(currentRevenueRange)}`;
  try {
    const res = await fetch(API_BASE + endpoint, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error(`Lỗi ${res.status}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = format === 'excel'
      ? `bingchun-revenue-${currentRevenueRange}.xlsx`
      : `bingchun-revenue-${currentRevenueRange}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast(`Đã tải báo cáo ${format.toUpperCase()}`, 'success');
  } catch (e) {
    toast(`Không xuất được ${format.toUpperCase()}`, 'error');
  }
}

async function refreshAdminReportConfig() {
  const emailEl = document.getElementById('report-email');
  const lastRunEl = document.getElementById('report-last-run');
  const profile = getAdminProfile();
  let email = (profile.email || localStorage.getItem('email') || '').trim();
  if (!email) {
    const serverProfile = await tryEndpoints(['api/accounts/me', 'api/users/me'], { method: 'GET' });
    email = (serverProfile?.email || '').trim();
  }
  if (emailEl) emailEl.textContent = email || 'admin@example.com';

  const lastKey = localStorage.getItem('bingchun_last_daily_report_key');
  if (lastRunEl) lastRunEl.textContent = lastKey ? `Đã gửi ngày ${lastKey}` : 'Chưa có lịch gửi';
  if (email) setReportStatus('Sẵn sàng', 'green');
  else setReportStatus('Thiếu email', 'amber');
}

async function sendDailyRevenueReport(manual = false) {
  const profile = getAdminProfile();
  let email = (profile.email || localStorage.getItem('email') || '').trim();
  if (!email) {
    const serverProfile = await tryEndpoints(['api/accounts/me', 'api/users/me'], { method: 'GET' });
    email = (serverProfile?.email || '').trim();
  }
  if (!email) {
    toast('Không tìm thấy email admin để gửi báo cáo', 'error');
    setReportStatus('Thiếu email', 'red');
    return;
  }

  const reportDate = manual ? new Date() : new Date(Date.now() - 24 * 60 * 60 * 1000);
  const dateKey = getDailyReportKey(reportDate);
  if (!manual && dailyReportLastRunKey === dateKey) return;

  setReportStatus(manual ? 'Đang gửi...' : 'Tự động gửi...', 'amber');

  const result = await tryEndpoints([
    'api/admin/reports/daily-email',
    'api/admin/reports/send-daily',
    'api/reports/daily-email'
  ], {
    method: 'POST',
    body: JSON.stringify({ email, date: dateKey, range: manual ? currentRevenueRange : 'day', manual })
  });

  if (result) {
    dailyReportLastRunKey = dateKey;
    localStorage.setItem('bingchun_last_daily_report_key', dateKey);
    const lastRunEl = document.getElementById('report-last-run');
    if (lastRunEl) lastRunEl.textContent = `Đã gửi ngày ${dateKey}`;
    setReportStatus(manual ? 'Đã gửi' : 'Tự động gửi', 'green');
    toast('Đã gửi báo cáo doanh thu', 'success');
    return;
  }

  setReportStatus('Chưa có backend', 'red');
  if (manual) toast('Chưa kết nối được endpoint báo cáo', 'error');
}

function startDailyReportWatcher() {
  if (dailyReportWatcher) return;
  const tick = async () => {
    const now = new Date();
    const todayKey = getDailyReportKey(now);
    if (dailyReportLastRunKey === todayKey) return;
    if (now.getHours() === 0 && now.getMinutes() < 5) setReportStatus('Đang chờ backend gửi', 'amber');
  };
  tick();
  dailyReportWatcher = setInterval(tick, 60 * 1000);
}

// ============================================================
//  USERS
// ============================================================
let currentUserFilter = 'all';
async function renderUsers(filter) {
  currentUserFilter = filter;
  try {
    let url = 'api/accounts';
    if (filter === 'active') url += '?active=true';
    else if (filter === 'inactive') url += '?active=false';
    const users = await apiRequest(url);
    if (!users) return;
    cachedAccounts = Array.isArray(users) ? users : [];
    cachedAccountsComplete = filter === 'all';
    document.getElementById('users-table').innerHTML = users.map(u => `<tr>
      <td>#${u.id}</td><td><b>${u.username}</b></td><td>${u.email||''}</td>
      <td><span class="status-pill pill-blue">${u.role||'Khách hàng'}</span></td><td>⭐ ${u.point||0}</td>
      <td>${statusPill(u.active?'active':'inactive')}</td>
      <td><div class="flex">
        <button class="btn btn-glass btn-sm btn-icon" onclick="editUser(${u.id})"><i class="ti ti-edit"></i></button>
        <button class="btn btn-sm btn-icon" style="background:rgba(14,165,233,0.1);color:var(--lb5)" onclick="toggleUser(${u.id})"><i class="ti ti-${u.active?'lock':'lock-open'}"></i></button>
        <button class="btn btn-danger btn-sm btn-icon" onclick="deleteUser(${u.id})"><i class="ti ti-trash"></i></button>
      </div></td>
    </tr>`).join('');
  } catch (e) {}
}

function filterUsers(f, el) {
  document.querySelectorAll('#section-users .tab-pill').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  renderUsers(f);
}

async function editUser(id) {
  editingUserId = id;
  try {
    const u = await apiRequest(`api/accounts/${id}`);
    document.getElementById('u-username').value = u.username || '';
    document.getElementById('u-email').value = u.email || '';
    document.getElementById('u-pass').value = ''; // không hiển thị mật khẩu
    document.getElementById('u-role').value = u.role || 'Khách hàng';
    openModal('modal-user');
  } catch (e) {}
}

async function saveUser() {
  const username = document.getElementById('u-username').value.trim();
  const email = document.getElementById('u-email').value.trim();
  const password = document.getElementById('u-pass').value;
  const role = document.getElementById('u-role').value;
  if (!username || !email) { toast('Vui lòng điền đầy đủ thông tin', 'error'); return; }
  try {
    if (editingUserId) {
      const body = { email, role };
      if (password) body.password = password; // chỉ gửi nếu có nhập mới
      await apiRequest(`api/accounts/${editingUserId}`, { method: 'PATCH', body: JSON.stringify(body) });
      toast('Đã cập nhật người dùng', 'success');
    } else {
      if (!password) { toast('Vui lòng nhập mật khẩu', 'error'); return; }
      await apiRequest('api/accounts', { method: 'POST', body: JSON.stringify({ username, email, password, role }) });
      toast('Đã thêm người dùng', 'success');
    }
    closeModal('modal-user');
    editingUserId = null;
    resetUserForm();
    renderUsers(currentUserFilter);
  } catch (e) {}
}

async function toggleUser(id) {
  try {
    const u = await apiRequest(`api/accounts/${id}`);
    await apiRequest(`api/accounts/${id}`, { method: 'PATCH', body: JSON.stringify({ active: !u.active }) });
    renderUsers(currentUserFilter);
    toast(u.active ? 'Đã khóa tài khoản' : 'Đã mở khóa', 'success');
  } catch (e) {}
}

async function deleteUser(id) {
  if (!confirm('Xác nhận xóa người dùng này?')) return;
  try {
    await apiRequest(`api/accounts/${id}`, { method: 'DELETE' });
    renderUsers(currentUserFilter);
    toast('Đã xóa người dùng', 'error');
  } catch (e) {}
}

function resetUserForm() {
  document.getElementById('u-username').value = '';
  document.getElementById('u-email').value = '';
  document.getElementById('u-pass').value = '';
  document.getElementById('u-role').value = 'Khách hàng';
}

async function ensureAccountsCache() {
  if (cachedAccountsComplete && Array.isArray(cachedAccounts) && cachedAccounts.length) return cachedAccounts;
  const accounts = await apiRequest('api/accounts');
  cachedAccounts = Array.isArray(accounts) ? accounts : [];
  cachedAccountsComplete = true;
  return cachedAccounts;
}

function syncPromoScopeUI() {
  const scope = document.getElementById('promo-scope');
  const wrap = document.getElementById('promo-target-wrap');
  if (!scope || !wrap) return;
  wrap.style.display = scope.value === 'selected' ? 'block' : 'none';
}

function getPromoTargetUserIds() {
  return Array.from(document.querySelectorAll('#promo-target-users input[type="checkbox"]:checked'))
    .map(cb => Number(cb.value))
    .filter(Number.isFinite);
}

async function renderPromoTargetUsers(selectedIds = []) {
  const box = document.getElementById('promo-target-users');
  if (!box) return;

  const accounts = await ensureAccountsCache();
  if (!accounts.length) {
    box.innerHTML = '<div class="empty" style="padding:18px 10px"><i class="ti ti-users"></i>Không có người dùng để chọn</div>';
    return;
  }

  const selected = new Set((selectedIds || []).map(id => Number(id)));
  box.innerHTML = accounts.map(u => `
    <label class="promo-target-item">
      <input type="checkbox" value="${u.id}" ${selected.has(Number(u.id)) ? 'checked' : ''} style="margin-top:3px;accent-color:var(--lb5)">
      <div>
        <strong>${u.username || 'N/A'}</strong>
        <span>${u.email || ''}</span>
      </div>
    </label>
  `).join('');
}

// ============================================================
//  PRODUCTS
// ============================================================
async function renderProducts() {
  try {
    const products = await apiRequest('api/products');
    if (!products) return;
    document.getElementById('products-table').innerHTML = products.map(p => `<tr>
      <td>#${p.id}</td><td><b>${p.name}</b></td><td><span class="status-pill pill-blue">${p.categoryName||''}</span></td>
      <td style="font-weight:700">${fmt(p.price)}đ</td><td><b>${Number(p.quantity ?? p.stockQuantity ?? 100)}</b></td><td>${stars(p.rating||0)}</td>
      <td>${statusPill(p.active?'active':'inactive')}</td>
      <td><div class="flex">
        <button class="btn btn-glass btn-sm btn-icon" onclick="editProduct(${p.id})"><i class="ti ti-edit"></i></button>
        <button class="btn btn-sm btn-icon" style="background:rgba(14,165,233,0.1);color:var(--lb5)" onclick="toggleProd(${p.id})"><i class="ti ti-${p.active?'eye-off':'eye'}"></i></button>
        <button class="btn btn-danger btn-sm btn-icon" onclick="deleteProd(${p.id})"><i class="ti ti-trash"></i></button>
      </div></td>
    </tr>`).join('');
  } catch (e) {}
}
async function editCat(id) {
    editingCatId = id;
    // Lấy từ cache
    let cat = findInCache(cachedCategories, id);
    if (!cat) {
        try { cat = await apiRequest(`api/categories/${id}`,{
            credentials:"include"}
        ); } catch (e) {
            toast('Không thể lấy thông tin danh mục', 'error');
            return;
        }
    }
    document.getElementById('c-name').value = cat.name || '';
    document.getElementById('c-desc').value = cat.desc || '';
    openModal('modal-cat');
}
async function editProduct(id) {
    editingProductId = id;
    // Thử lấy từ cache trước
    let p = findInCache(cachedProducts, id);
    if (!p) {
        try { p = await apiRequest(`api/products/${id}`); } catch (e) {}
    }
    if (p) {
        document.getElementById('p-name').value = p.name || '';
        document.getElementById('p-price').value = p.price || '';
        document.getElementById('p-cat').value = p.categoryId || p.cat || '';
        document.getElementById('p-qty').value = p.quantity ?? p.stockQuantity ?? 100;
        document.getElementById('p-desc').value = p.description || '';
    }
    openModal('modal-product');
}
async function saveProduct() {
  const name = document.getElementById('p-name').value.trim();
  const price = parseInt(document.getElementById('p-price').value);
  const catId = document.getElementById('p-cat').value;
  const quantity = parseInt(document.getElementById('p-qty').value);
  const desc = document.getElementById('p-desc').value;
  if (!name || !price) { toast('Vui lòng điền đầy đủ thông tin', 'error'); return; }
  try {
    if (editingProductId) {
      await apiRequest(`api/products/${editingProductId}`, {
        method: 'PATCH',
        body: JSON.stringify({ name, price, categoryId: catId, quantity: Number.isFinite(quantity) ? quantity : 100, description: desc })
      });
      toast('Đã cập nhật sản phẩm', 'success');
    } else {
      await apiRequest('api/products', {
        method: 'POST',
        body: JSON.stringify({ name, price, categoryId: catId, quantity: Number.isFinite(quantity) ? quantity : 100, description: desc })
      });
      toast('Đã thêm sản phẩm mới', 'success');
    }
    closeModal('modal-product');
    editingProductId = null;
    resetProductForm();
    renderProducts();
  } catch (e) {}
}

async function toggleProd(id) {
  try {
    const p = await apiRequest(`api/products/${id}`);
    await apiRequest(`api/products/${id}`, { method: 'PATCH', body: JSON.stringify({ active: !p.active }) });
    renderProducts();
    toast(p.active ? 'Sản phẩm đã ẩn' : 'Sản phẩm đã hiển thị', 'success');
  } catch (e) {}
}

async function deleteProd(id) {
  if (!confirm('Xác nhận xóa sản phẩm?')) return;
  try {
    await apiRequest(`api/products/${id}`, { method: 'DELETE' });
    renderProducts();
    toast('Đã xóa sản phẩm', 'error');
  } catch (e) {}
}

function resetProductForm() {
  document.getElementById('p-name').value = '';
  document.getElementById('p-price').value = '';
  document.getElementById('p-qty').value = '100';
  document.getElementById('p-desc').value = '';
}

// ============================================================
//  CATEGORIES
// ============================================================
async function renderCategories() {
  try {
    const cats = await apiRequest('api/categories');
    if (!cats) return;
    document.getElementById('cat-grid').innerHTML = cats.map(c => `
      <div class="glass-card" style="margin:0;padding:16px">
        <div class="flex" style="margin-bottom:8px">
          <span style="font-weight:700;font-size:14px;color:var(--text-dark);flex:1">${c.name}</span>
          <label class="toggle"><input type="checkbox" ${c.active?'checked':''} onchange="toggleCat(${c.id},this)"><span class="slider-sw"></span></label>
        </div>
        <div style="font-size:12px;color:var(--text-light);margin-bottom:10px">${c.desc||''}</div>
        <div class="flex">
          <button class="btn btn-glass btn-sm" style="flex:1" onclick="editCat(${c.id})"><i class="ti ti-edit"></i> Sửa</button>
          <button class="btn btn-danger btn-sm btn-icon" onclick="deleteCat(${c.id})"><i class="ti ti-trash"></i></button>
        </div>
      </div>`).join('');
  } catch (e) {}
}

async function editCat(id) {
  editingCatId = id;
  try {
    const cat = await apiRequest(`api/categories/${id}`);
    document.getElementById('c-name').value = cat.name || '';
    document.getElementById('c-desc').value = cat.desc || '';
    openModal('modal-cat');
  } catch (e) {}
}

async function saveCat() {
  const name = document.getElementById('c-name').value.trim();
  const desc = document.getElementById('c-desc').value.trim();
  if (!name) { toast('Vui lòng nhập tên danh mục', 'error'); return; }
  try {
    if (editingCatId) {
      await apiRequest(`api/categories/${editingCatId}`, { method: 'PATCH', body: JSON.stringify({ name, desc }) });
      toast('Đã cập nhật danh mục', 'success');
    } else {
      await apiRequest('api/categories', { method: 'POST', body: JSON.stringify({ name, description: desc }) });
      toast('Đã thêm danh mục mới', 'success');
    }
    closeModal('modal-cat');
    editingCatId = null;
    resetCatForm();
    renderCategories();
  } catch (e) {}
}

async function toggleCat(id, el) {
  try {
    const cat = await apiRequest(`api/categories/${id}`);
    await apiRequest(`api/categories/${id}`, { method: 'PATCH', body: JSON.stringify({ active: el.checked }) });
    wsLog(`Danh mục "${cat.name}" đã ${el.checked?'bật':'tắt'}`);
    toast(`Danh mục "${cat.name}" ${el.checked?'đã bật':'đã tắt'}`, el.checked?'success':'info');
  } catch (e) {}
}

async function deleteCat(id) {
  if (!confirm('Xác nhận xóa danh mục?')) return;
  try {
    await apiRequest(`api/categories/${id}`, { method: 'DELETE' });
    renderCategories();
    toast('Đã xóa danh mục', 'error');
  } catch (e) {}
}

function resetCatForm() {
  document.getElementById('c-name').value = '';
  document.getElementById('c-desc').value = '';
}

// ============================================================
//  ORDERS
// ============================================================
let currentOrderFilter = 'all';
async function renderOrders(filter) {
  currentOrderFilter = filter;
  try {
    let url = 'api/orders';
    if (filter !== 'all') url += `?status=${filter}`;
    const orders = await apiRequest(url);
    if (!orders) return;
    document.getElementById('orders-table').innerHTML = orders.map(o => `<tr>
      <td><b>#${o.id}</b></td><td>${o.account||'N/A'}</td><td>${o.orderDate||''}</td>
      <td><span class="status-pill pill-blue">${o.method==='delivery'?'🚴 Giao hàng':'🏃 Mang đi'}</span></td>
      <td style="font-weight:700">${fmt(o.amount||0)}đ</td><td>${statusPill(o.status)}</td>
      <td><div class="flex">
        <button class="btn btn-glass btn-sm btn-icon" onclick="toast('Chi tiết đơn #${o.id}','info')"><i class="ti ti-eye"></i></button>
        <select class="status-select" onchange="changeOrderStatus(${o.id},this)">
          <option value="">Cập nhật</option>
          <option value="pending">Chờ xử lý</option><option value="confirmed">Xác nhận</option>
          <option value="delivered">Hoàn thành</option><option value="cancelled">Hủy</option>
        </select>
      </div></td>
    </tr>`).join('');
  } catch (e) {}
}

async function changeOrderStatus(id, sel) {
  const val = sel.value;
  if (!val) return;
  try {
    await apiRequest(`api/orders/${id}`, { method: 'PATCH', body: JSON.stringify({ status: val }) });
    if (typeof requestOrderEmailSync === 'function') {
      requestOrderEmailSync(id, val, { status: val, source: 'admin-panel' });
    }
    renderOrders(currentOrderFilter);
    wsLog(`Đơn hàng #${id} chuyển trạng thái → ${val}`);
    toast('Đã cập nhật trạng thái', 'success');
  } catch (e) {}
}

function filterOrders(f, el) {
  document.querySelectorAll('#section-orders .tab-pill').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  renderOrders(f);
}

// ============================================================
//  BANNERS
// ============================================================
async function renderBanners() {
  try {
    const banners = await apiRequest('api/banners');
    if (!banners) return;
    document.getElementById('banner-grid').innerHTML = banners.map((b,i) => `
      <div class="glass-card" style="margin:0;padding:16px">
        <div class="banner-preview" style="overflow:hidden;background:#f8fafc">
          ${b.imageUrl ? `<img src="${b.imageUrl.startsWith('http') ? b.imageUrl : `${API_BASE}${b.imageUrl}`}" alt="${b.name || 'banner'}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">` : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#64748b;font-weight:700">${b.name}</div>`}
        </div>
        <div class="flex" style="margin-bottom:6px"><span style="font-weight:700;font-size:13px;color:var(--text-dark);flex:1">${b.name}</span><label class="toggle"><input type="checkbox" ${b.active?'checked':''} onchange="toggleBanner(${b.id},this)"><span class="slider-sw"></span></label></div>
        <div style="font-size:11px;color:var(--text-light);margin-bottom:10px">Trang: <b>${b.site}</b> · Ưu tiên: <b>${b.priority}</b> · ${b.active?'<span style="color:#16a34a">Hiển thị</span>':'<span style="color:#dc2626">Ẩn</span>'}</div>
        <div class="flex"><button class="btn btn-glass btn-sm" style="flex:1" onclick="editBanner(${b.id})"><i class="ti ti-edit"></i> Sửa</button><button class="btn btn-danger btn-sm btn-icon" onclick="deleteBanner(${b.id})"><i class="ti ti-trash"></i></button></div>
      </div>`).join('');
  } catch (e) {}
}

async function editBanner(id) {
  editingBannerId = id;
  try {
    const b = await apiRequest(`api/banners/${id}`);
    document.getElementById('bnr-name').value = b.name || '';
    document.getElementById('bnr-img').value = b.imageUrl || '';
    document.getElementById('bnr-file').value = '';
    const preview = document.getElementById('bnr-preview');
    if (preview && b.imageUrl) {
      preview.src = b.imageUrl.startsWith('http') ? b.imageUrl : `${API_BASE}${b.imageUrl}`;
      preview.style.display = 'block';
    }
    document.getElementById('bnr-site').value = b.site || '';
    document.getElementById('bnr-prio').value = b.priority || 1;
    document.getElementById('bnr-desc').value = b.description || '';
    openModal('modal-banner');
  } catch (e) {}
}

async function uploadBannerFile(file) {
  if (!file) return '';
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(API_BASE + 'api/banners/upload-image', {
    method: 'POST',
    credentials: 'include',
    body: fd
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Lỗi ${res.status}`);
  }
  const data = await res.json();
  return data.url || data.imageUrl || '';
}

async function saveBanner() {
  const name = document.getElementById('bnr-name').value.trim();
  const site = document.getElementById('bnr-site').value.trim() || 'trang-chu';
  const priority = parseInt(document.getElementById('bnr-prio').value) || 1;
  const imageUrl = document.getElementById('bnr-img').value;
  const fileInput = document.getElementById('bnr-file');
  const file = fileInput?.files?.[0] || null;
  const description = document.getElementById('bnr-desc').value;
  if (!name) { toast('Vui lòng nhập tên banner', 'error'); return; }
  try {
    let finalImageUrl = imageUrl;
    if (file) {
      finalImageUrl = await uploadBannerFile(file);
      document.getElementById('bnr-img').value = finalImageUrl;
    }
    if (!finalImageUrl && editingBannerId) {
      const existing = await apiRequest(`api/banners/${editingBannerId}`);
      finalImageUrl = existing.imageUrl || '';
    }
    if (!finalImageUrl) {
      toast('Vui lòng chọn ảnh hoặc nhập URL ảnh', 'error');
      return;
    }
    if (editingBannerId) {
      await apiRequest(`api/banners/${editingBannerId}`, { method: 'PATCH', body: JSON.stringify({ bannerName:name, bannerSite:site, priority, bannerImage:finalImageUrl, description }) });
      toast('Đã cập nhật banner', 'success');
    } else {
      await apiRequest('api/banners', { method: 'POST', body: JSON.stringify({ bannerName:name, bannerSite:site, priority, bannerImage:finalImageUrl, description }) });
      toast('Đã thêm banner mới', 'success');
    }
    closeModal('modal-banner');
    editingBannerId = null;
    resetBannerForm();
    renderBanners();
  } catch (e) {}
}

async function toggleBanner(id, el) {
  try {
    const b = await apiRequest(`api/banners/${id}`);
    await apiRequest(`api/banners/${id}`, { method: 'PATCH', body: JSON.stringify({ active: el.checked }) });
    toast(`Banner "${b.name}" ${el.checked?'đã hiển thị':'đã ẩn'}`, el.checked?'success':'info');
  } catch (e) {}
}

async function deleteBanner(id) {
  if (!confirm('Xác nhận xóa banner?')) return;
  try {
    await apiRequest(`api/banners/${id}`, { method: 'DELETE' });
    renderBanners();
    toast('Đã xóa banner', 'error');
  } catch (e) {}
}

function resetBannerForm() {
  ['bnr-name','bnr-img','bnr-site','bnr-prio','bnr-desc'].forEach(id => { document.getElementById(id).value = ''; });
  const file = document.getElementById('bnr-file');
  if (file) file.value = '';
  const preview = document.getElementById('bnr-preview');
  if (preview) {
    preview.src = '';
    preview.style.display = 'none';
  }
}

// ============================================================
//  PROMOTIONS
// ============================================================
async function renderPromotions() {
  try {
    const promos = await apiRequest('api/promotions');
    if (!promos) return;
    document.getElementById('promo-grid').innerHTML = promos.map(p => `
      <div class="glass-card" style="margin:0;padding:16px">
        <div class="flex" style="margin-bottom:8px"><span class="promo-code">${p.code}</span><label class="toggle" style="margin-left:auto"><input type="checkbox" ${p.active?'checked':''} onchange="togglePromo(${p.id},this)"><span class="slider-sw"></span></label></div>
        <div class="flex" style="margin-bottom:6px"><span class="promo-disc">-${p.discountPercent||p.pct}%</span><span style="font-size:11px;color:var(--text-light)">· Còn ${p.quantity||p.qty} lượt</span></div>
        <div style="font-size:11px;color:var(--text-light);margin-bottom:6px">Đơn tối thiểu: <b>${fmt(Number(p.minOrderAmount || p.minAmount || 0))}đ</b></div>
        <div style="font-size:11px;color:var(--text-light);margin-bottom:10px">
          Phạm vi: <b>${(p.applyToAll || p.scope === 'all') ? 'Tất cả người dùng' : `Chỉ ${Number(p.targetUserCount || (p.targetUsers || []).length || 0)} người dùng`}</b>
          · Hết hạn: ${p.endDate||p.end}
          · ${p.active?'<span style="color:#16a34a">Đang hoạt động</span>':'<span style="color:#dc2626">Tắt</span>'}
        </div>
        <div class="flex"><button class="btn btn-glass btn-sm" style="flex:1" onclick="editPromo(${p.id})"><i class="ti ti-edit"></i> Sửa</button><button class="btn btn-danger btn-sm btn-icon" onclick="deletePromo(${p.id})"><i class="ti ti-trash"></i></button></div>
      </div>`).join('');
  } catch (e) {}
}

async function editPromo(id) {
  editingPromoId = id;
  try {
    const p = await apiRequest(`api/promotions/${id}`);
    await ensureAccountsCache();
    document.getElementById('promo-code').value = p.code || '';
    document.getElementById('promo-pct').value = p.discountPercent || p.pct || '';
    document.getElementById('promo-qty').value = p.quantity || p.qty || '';
    document.getElementById('promo-min').value = p.minOrderAmount || p.minAmount || 0;
    document.getElementById('promo-scope').value = (p.applyToAll || p.scope === 'all') ? 'all' : 'selected';
    document.getElementById('promo-start').value = p.startDate || p.start || '';
    document.getElementById('promo-end').value = p.endDate || p.end || '';
    syncPromoScopeUI();
    await renderPromoTargetUsers(p.targetUserIds || []);
    openModal('modal-promo');
  } catch (e) {}
}

async function savePromo() {
  const code = document.getElementById('promo-code').value.trim().toUpperCase();
  const pct = parseInt(document.getElementById('promo-pct').value);
  const qty = parseInt(document.getElementById('promo-qty').value);
  const minOrderAmount = parseInt(document.getElementById('promo-min').value || '0');
  const applyToAll = document.getElementById('promo-scope').value === 'all';
  const userIds = applyToAll ? [] : getPromoTargetUserIds();
  const start = document.getElementById('promo-start').value;
  const end = document.getElementById('promo-end').value;
  if (!code || !pct || !qty || !end) { toast('Vui lòng điền đầy đủ', 'error'); return; }
  if (!applyToAll && !userIds.length) {
    toast('Hãy chọn ít nhất một người dùng', 'error');
    return;
  }
  try {
    const body = { code, discountPercent:pct, quantity:qty, minOrderAmount: Number.isFinite(minOrderAmount) ? minOrderAmount : 0, applyToAll, userIds, startDate:start, endDate:end };
    if (editingPromoId) {
      await apiRequest(`api/promotions/${editingPromoId}`, { method: 'PATCH', body: JSON.stringify(body) });
      toast('Đã cập nhật mã', 'success');
    } else {
      await apiRequest('api/promotions', { method: 'POST', body: JSON.stringify(body) });
      toast('Đã tạo mã mới', 'success');
    }
    closeModal('modal-promo');
    editingPromoId = null;
    resetPromoForm();
    renderPromotions();
  } catch (e) {}
}

async function togglePromo(id, el) {
  try {
    const p = await apiRequest(`api/promotions/${id}`);
    await apiRequest(`api/promotions/${id}`, { method: 'PATCH', body: JSON.stringify({ active: el.checked }) });
    toast(`Mã "${p.code}" ${el.checked?'đã kích hoạt':'đã tắt'}`, el.checked?'success':'info');
  } catch (e) {}
}

async function deletePromo(id) {
  if (!confirm('Xác nhận xóa mã?')) return;
  try {
    await apiRequest(`api/promotions/${id}`, { method: 'DELETE' });
    renderPromotions();
    toast('Đã xóa mã', 'error');
  } catch (e) {}
}

function resetPromoForm() {
  ['promo-code','promo-pct','promo-qty','promo-min','promo-start','promo-end'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  const scope = document.getElementById('promo-scope');
  if (scope) scope.value = 'all';
  syncPromoScopeUI();
  renderPromoTargetUsers([]);
}

// ============================================================
//  REVIEWS
// ============================================================
function renderFilteredReviews() {
  const rows = cachedReviewRows.filter(r => {
    const activeOk = currentReviewFilter === 'all'
      || (currentReviewFilter === 'active' && r.active)
      || (currentReviewFilter === 'hidden' && !r.active);
    const starOk = currentReviewStarFilter === 'all' || Number(r.rating || 0) === Number(currentReviewStarFilter);
    return activeOk && starOk;
  });

  const table = document.getElementById('reviews-table');
  if (!table) return;
  if (!rows.length) {
    table.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-light);padding:24px">Không có đánh giá phù hợp bộ lọc</td></tr>';
    document.getElementById('rv-badge').textContent = '0';
    return;
  }

  table.innerHTML = rows.map(r => `<tr>
      <td>#${r.id}</td><td><b>${r.productName||''}</b></td><td>${r.username||''}</td>
      <td>${stars(r.rating)}</td><td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.content}</td>
      <td>${statusPill(r.active?'active':'inactive')}</td>
      <td><div class="flex">
        <button class="btn btn-glass btn-sm btn-icon" title="Trả lời" onclick="replyReview(${r.id})"><i class="ti ti-message-reply"></i></button>
        <button class="btn btn-sm btn-icon" style="background:rgba(14,165,233,0.1);color:var(--lb5)" onclick="toggleReview(${r.id})"><i class="ti ti-${r.active?'eye-off':'eye'}"></i></button>
        <button class="btn btn-danger btn-sm btn-icon" onclick="deleteReview(${r.id})"><i class="ti ti-trash"></i></button>
      </div></td>
    </tr>`).join('');
  document.getElementById('rv-badge').textContent = rows.length;
}

async function renderReviews(filter) {
  currentReviewFilter = filter;
  try {
    let url = 'api/reviews';
    if (filter === 'active') url += '?active=true';
    else if (filter === 'hidden') url += '?active=false';
    const reviews = await apiRequest(url);
    if (!reviews) return;
    cachedReviewRows = Array.isArray(reviews) ? reviews : [];
    renderFilteredReviews();
  } catch (e) {}
}

function filterReviewStars(star, el) {
  currentReviewStarFilter = star;
  document.querySelectorAll('#review-tabs .tab-pill').forEach(p => p.classList.remove('active'));
  if (el) el.classList.add('active');
  renderFilteredReviews();
}

async function replyReview(id) {
  const content = prompt('Nhập nội dung trả lời đánh giá:');
  if (!content || !content.trim()) return;
  try {
    await apiRequest(`api/reviews/${id}/reply`, {
      method: 'POST',
      body: JSON.stringify({ content: content.trim() })
    });
    toast('Đã trả lời đánh giá', 'success');
    renderReviews(currentReviewFilter);
  } catch (e) {}
}

async function toggleReview(id) {
  try {
    const r = await apiRequest(`api/reviews/${id}`);
    await apiRequest(`api/reviews/${id}`, { method: 'PATCH', body: JSON.stringify({ active: !r.active }) });
    renderReviews(currentReviewFilter);
    toast(r.active?'Đánh giá đã ẩn':'Đánh giá đã hiển thị', 'success');
  } catch (e) {}
}

async function deleteReview(id) {
  if (!confirm('Xác nhận xóa đánh giá?')) return;
  try {
    await apiRequest(`api/reviews/${id}`, { method: 'DELETE' });
    renderReviews(currentReviewFilter);
    toast('Đã xóa đánh giá', 'error');
  } catch (e) {}
}

function filterReviews(f, el) {
  document.querySelectorAll('#section-reviews .tab-pill').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  renderReviews(f);
}

// ============================================================
//  NOTIFICATIONS
// ============================================================
async function sendNotification() {
  const to = document.getElementById('notif-to').value;
  const title = document.getElementById('notif-title').value.trim();
  const content = document.getElementById('notif-content').value.trim();
  if (!title || !content) { toast('Vui lòng điền đầy đủ', 'error'); return; }
  try {
    const result = await apiRequest('api/notifications', { method: 'POST', body: JSON.stringify({ to, title, content }) });
    const target = to === 'all' ? 'tất cả' : to;
    wsLog(`Gửi thông báo "${title}" đến ${target}`);
    addToNotifLog(`[${nowTime()}] Gửi thành công → ${target}${result?.count ? ` (${result.count})` : ''}`);
    renderNotifHistory();
    toast('Đã gửi thông báo', 'success');
    document.getElementById('notif-title').value = '';
    document.getElementById('notif-content').value = '';
  } catch (e) {}
}

function addToNotifLog(msg) {
  const log = document.getElementById('notif-log');
  if (!log) return;
  const d = document.createElement('div');
  d.textContent = msg;
  d.style.color = 'var(--lb5)';
  log.prepend(d);
}

async function renderNotifHistory() {
  try {
    const notifs = await apiRequest('api/notifications');
    const el = document.getElementById('notif-history');
    if (!el) return;
    if (!notifs || notifs.length === 0) {
      el.innerHTML = '<div class="empty"><i class="ti ti-bell-off"></i>Chưa có thông báo</div>';
      return;
    }
    el.innerHTML = notifs.map(n => `
      <div class="glass-card" style="margin-bottom:10px;padding:12px">
        <div style="font-weight:700;font-size:13px">${n.title}</div>
        <div style="font-size:12px;color:var(--text-light);margin:4px 0">${n.content}</div>
        <div style="font-size:11px;color:var(--lb4)">${n.createdAt||''} · Gửi đến: <b>${n.to||'all'}</b></div>
      </div>`).join('');
  } catch (e) {}
}

async function loadNotificationRecipients() {
  const select = document.getElementById('notif-to');
  if (!select) return;
  try {
    const accounts = await apiRequest('api/accounts');
    const users = (accounts || []).filter(a => a.username);
    select.innerHTML = '<option value="all">Tất cả người dùng</option>' + users
      .map(u => `<option value="${u.username}">${u.username}${u.email ? ` - ${u.email}` : ''}</option>`)
      .join('');
  } catch (e) {
    select.innerHTML = '<option value="all">Tất cả người dùng</option>';
  }
}

// ============================================================
//  INGREDIENTS
// ============================================================
async function renderIngredients() {
  try {
    const ingrs = await apiRequest('api/ingredients');
    if (!ingrs) return;
    document.getElementById('ingr-table').innerHTML = ingrs.map(i => `<tr>
      <td>#${i.id}</td><td><b>${i.name}</b></td>
      <td style="font-weight:700;color:${i.stock<500?'#dc2626':'var(--text-dark)'}">${i.stock} ${i.stock<500?'<i class="ti ti-alert-triangle"></i>':''}</td>
      <td>${i.unit}</td><td>${statusPill(i.active?'active':'inactive')}</td>
      <td><div class="flex">
        <button class="btn btn-glass btn-sm btn-icon" onclick="editIngredient(${i.id})"><i class="ti ti-edit"></i></button>
        <button class="btn btn-danger btn-sm btn-icon" onclick="deleteIngr(${i.id})"><i class="ti ti-trash"></i></button>
      </div></td>
    </tr>`).join('');
  } catch (e) {}
}

async function editIngredient(id) {
  editingIngredientId = id;
  try {
    const i = await apiRequest(`api/ingredients/${id}`);
    document.getElementById('ingr-name').value = i.name || '';
    document.getElementById('ingr-qty').value = i.stock || '';
    document.getElementById('ingr-unit').value = i.unit || '';
    openModal('modal-ingr');
  } catch (e) {}
}

async function saveIngr() {
  const name = document.getElementById('ingr-name').value.trim();
  const qty = parseInt(document.getElementById('ingr-qty').value);
  const unit = document.getElementById('ingr-unit').value.trim();
  if (!name || !qty || !unit) { toast('Vui lòng điền đầy đủ', 'error'); return; }
  try {
    if (editingIngredientId) {
      await apiRequest(`api/ingredients/${editingIngredientId}`, { method: 'PATCH', body: JSON.stringify({ name, stock:qty, unit }) });
      toast('Đã cập nhật nguyên liệu', 'success');
    } else {
      await apiRequest('api/ingredients', { method: 'POST', body: JSON.stringify({ name, stock:qty, unit }) });
      toast('Đã thêm nguyên liệu', 'success');
    }
    closeModal('modal-ingr');
    editingIngredientId = null;
    resetIngredientForm();
    renderIngredients();
  } catch (e) {}
}

async function deleteIngr(id) {
  if (!confirm('Xác nhận xóa nguyên liệu?')) return;
  try {
    await apiRequest(`api/ingredients/${id}`, { method: 'DELETE' });
    renderIngredients();
    toast('Đã xóa nguyên liệu', 'error');
  } catch (e) {}
}

function resetIngredientForm() {
  ['ingr-name','ingr-qty','ingr-unit'].forEach(id => { document.getElementById(id).value = ''; });
}

// ============================================================
//  AUDIT LOGS
// ============================================================
async function renderLogs() {
  const tbody = document.getElementById('log-table');
  if (!tbody) return;
  try {
    const logs = await apiRequest('api/logs');
    if (!logs || !logs.length) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-light);padding:24px">Chưa có nhật ký hoạt động</td></tr>';
      return;
    }
    tbody.innerHTML = logs.map(l => `<tr>
      <td>#${l.id}</td><td><span class="status-pill pill-blue">${l.account||'system'}</span></td>
      <td>${l.action}</td><td style="color:var(--text-light);font-size:12px">${l.time||l.createdAt||''}</td>
    </tr>`).join('');
  } catch (e) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#ef4444;padding:24px">Không tải được nhật ký</td></tr>';
  }
}

// ============================================================
//  WEBSOCKET
// ============================================================
let adminStompClient = null;
function wsLog(msg) {
  const log = document.getElementById('ws-log');
  if (!log) return;
  const d = document.createElement('div');
  d.textContent = `[${nowTime()}] ${msg}`;
  log.prepend(d);
  while (log.children.length > 40) log.removeChild(log.lastChild);
}

function parseSocketPayload(message) {
  try {
    return JSON.parse(message.body);
  } catch (e) {
    return { title: 'WebSocket', content: message.body };
  }
}

function connectAdminSocket() {
  if (!window.SockJS || !window.Stomp || adminStompClient?.connected) return;
  const socket = new SockJS(`${API_BASE}nghiaws`);
  adminStompClient = Stomp.over(socket);
  adminStompClient.debug = null;
  adminStompClient.connect({}, () => {
    wsLog('WebSocket admin đã kết nối');
    adminStompClient.subscribe('/noticeall/notifications', message => {
      const payload = parseSocketPayload(message);
      wsLog(`Broadcast nhận: ${payload.title || ''}`);
      addSystemNotif(payload.title || 'Thông báo', payload.content || '');
    });
    adminStompClient.subscribe('/noticeall/admin/orders', message => {
      const payload = parseSocketPayload(message);
      wsLog(`Đơn mới realtime: ${payload.title || ''}`);
      addSystemNotif(payload.title || 'Có đơn hàng mới', payload.content || '');
      toast(payload.title || 'Có đơn hàng mới', 'success');
      renderDashboard();
      renderOrders(currentOrderFilter);
    });
  }, err => {
    wsLog(`WebSocket lỗi: ${err?.message || err}`);
  });
}

// ============================================================
//  GLOBAL SEARCH
// ============================================================
async function globalSearch(q) {
  if (!q.trim()) return;
  try {
    const products = await apiRequest(`api/products?search=${encodeURIComponent(q)}`);
    if (products && products.length) toast(`Tìm thấy ${products.length} sản phẩm`, 'info');
    else toast(`Không tìm thấy kết quả cho "${q}"`, 'info');
  } catch (e) {}
}

// ============================================================
//  NOTIF PANEL
// ============================================================
const sysMsgs = [];
function addSystemNotif(title, content) {
  sysMsgs.unshift({ title, content, time: nowTime() });
  renderNotifPanel();
  document.getElementById('notif-dot').style.display = 'block';
}
function renderNotifPanel() {
  const list = document.getElementById('notif-list');
  if (!list) return;
  list.innerHTML = sysMsgs.length ? sysMsgs.map(n => `<div class="notif-item"><div class="notif-item-title">${n.title}</div><div class="notif-item-body">${n.content}</div><div class="notif-item-time">${n.time}</div></div>`).join('') : '<div class="empty" style="padding:24px"><i class="ti ti-bell" style="font-size:28px;opacity:0.3;display:block;margin-bottom:6px"></i>Không có thông báo</div>';
}
function toggleNotif() {
  const p = document.getElementById('notif-panel');
  p.classList.toggle('open');
  if (p.classList.contains('open')) {
    document.getElementById('notif-dot').style.display = 'none';
    renderNotifPanel();
  }
}
function closeNotifPanel() { document.getElementById('notif-panel').classList.remove('open'); }
document.addEventListener('click', e => {
  const panel = document.getElementById('notif-panel'), btn = document.getElementById('notif-btn');
  if (!panel.contains(e.target) && !btn.contains(e.target)) closeNotifPanel();
});

// ============================================================
//  LOGOUT
// ============================================================
async function logout() {
  try { await apiRequest('api/auth/logout', { method: 'POST' }); } catch (e) {}
  window.location.href = '/login';
}

// ============================================================
//  INIT
// ============================================================
async function init() {
  try {
    const cats = await apiRequest('api/categories?active=true');
    if (cats) document.getElementById('p-cat').innerHTML = cats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  } catch (e) {}
  ensureAccountsCache().catch(() => {});
  const promoScope = document.getElementById('promo-scope');
  if (promoScope) {
    promoScope.addEventListener('change', syncPromoScopeUI);
    syncPromoScopeUI();
  }
  loadNotificationRecipients();
  renderNotifHistory();
  dailyReportLastRunKey = localStorage.getItem('bingchun_last_daily_report_key') || null;
  await refreshAdminReportConfig();
  renderDashboard(currentRevenueRange);
  connectAdminSocket();
  startDailyReportWatcher();
  setTimeout(() => toast('Chào mừng Admin đến BingChun Panel', 'info'), 1600);
}
document.addEventListener('DOMContentLoaded', init);
