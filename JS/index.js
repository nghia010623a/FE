// ==========================================
// 1. CẤU HÌNH & BIẾN TOÀN CỤC
// ==========================================
// const API_BASE = "https://straticulate-obtusely-ernesto.ngrok-free.dev/";

// const API_BASE = "https://abstracts-difficulty-ecological-especially.trycloudflare.com/";

// import API_BASE from "./config.js";
let stompClient1 = null;
let userNotifications = [];
let userPointBalance = Number(localStorage.getItem("userPointBalance") || 0);
let usePointsForOrder = false;
let myReviewedProductIds = new Set();

function getCurrentUser() {
    try {
        const raw = localStorage.getItem("currentUser");
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        return null;
    }
}

function parseNotificationPayload(body) {
    try {
        return JSON.parse(body);
    } catch (e) {
        return { title: "Thông báo", content: body, createdAt: new Date().toISOString(), read: false };
    }
}

function ensureNotificationUi() {
    if (!document.getElementById("user-notif-panel")) {
        const panel = document.createElement("div");
        panel.id = "user-notif-panel";
        panel.style.cssText = "display:none;position:fixed;top:82px;right:9%;width:min(360px,calc(100vw - 28px));max-height:460px;overflow:auto;background:rgba(255,255,255,.96);backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,.7);box-shadow:0 20px 50px rgba(15,23,42,.18);border-radius:18px;z-index:100000;padding:14px;";
        document.body.appendChild(panel);
    }
    if (!document.getElementById("user-notif-toast-wrap")) {
        const wrap = document.createElement("div");
        wrap.id = "user-notif-toast-wrap";
        wrap.style.cssText = "position:fixed;right:20px;bottom:20px;z-index:100001;display:flex;flex-direction:column;gap:10px;";
        document.body.appendChild(wrap);
    }
}

function renderUserNotificationBadge() {
    const badge = document.getElementById("user-notif-count");
    if (!badge) return;
    const unread = userNotifications.filter(n => !n.read).length;
    badge.textContent = unread > 99 ? "99+" : String(unread);
    badge.style.display = unread > 0 ? "flex" : "none";
}

function renderUserNotificationPanel() {
    ensureNotificationUi();
    const panel = document.getElementById("user-notif-panel");
    if (!panel) return;
    if (!userNotifications.length) {
        panel.innerHTML = '<div style="padding:22px;text-align:center;color:#64748b;font-size:14px;">Chưa có thông báo</div>';
        return;
    }
    panel.innerHTML = `
        <div style="font-weight:800;font-size:16px;margin:4px 4px 12px;color:#0f172a;">Thông báo</div>
        ${userNotifications.map(n => `
            <div style="padding:12px;border-radius:14px;margin-bottom:8px;background:${n.read ? 'rgba(248,250,252,.86)' : 'rgba(224,242,254,.9)'};border:1px solid rgba(14,165,233,.12);">
                <div style="font-weight:700;color:#0f172a;font-size:14px;margin-bottom:4px;">${n.title || 'Thông báo'}</div>
                <div style="color:#475569;font-size:13px;line-height:1.4;">${n.content || ''}</div>
                <div style="color:#94a3b8;font-size:11px;margin-top:7px;">${n.createdAt ? new Date(n.createdAt).toLocaleString('vi-VN') : ''}</div>
            </div>
        `).join('')}`;
}

function showUserNotificationToast(notification) {
    ensureNotificationUi();
    const wrap = document.getElementById("user-notif-toast-wrap");
    if (!wrap) return;
    const toast = document.createElement("div");
    toast.style.cssText = "width:min(340px,calc(100vw - 40px));background:white;border:1px solid rgba(14,165,233,.18);border-radius:16px;box-shadow:0 16px 36px rgba(15,23,42,.18);padding:13px 15px;color:#0f172a;";
    toast.innerHTML = `<div style="font-weight:800;font-size:14px;margin-bottom:4px;">${notification.title || 'Thông báo'}</div><div style="font-size:13px;color:#475569;line-height:1.4;">${notification.content || ''}</div>`;
    wrap.prepend(toast);
    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(8px)";
        toast.style.transition = ".25s";
        setTimeout(() => toast.remove(), 260);
    }, 4200);
}

function addUserNotification(notification, shouldToast = true) {
    const normalized = {
        id: notification.id ?? `local-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        title: notification.title || "Thông báo",
        content: notification.content || "",
        createdAt: notification.createdAt || new Date().toISOString(),
        read: Boolean(notification.read)
    };
    userNotifications = [normalized, ...userNotifications.filter(n => n.id !== normalized.id)];
    renderUserNotificationBadge();
    renderUserNotificationPanel();
    if (shouldToast) showUserNotificationToast(normalized);
}

async function loadUserNotifications() {
    const currentUser = getCurrentUser();
    if (!currentUser) return;
    try {
        const res = await fetch(`${API_BASE}api/users/notifications`, {
            method: "GET",
            credentials: "include",
            headers: { "Content-Type": "application/json" }
        });
        if (!res.ok) return;
        userNotifications = await res.json();
        renderUserNotificationBadge();
        renderUserNotificationPanel();
    } catch (e) {
        console.error("Không tải được thông báo:", e);
    }
}

async function markVisibleNotificationsRead() {
    const unreadIds = userNotifications.filter(n => !n.read && typeof n.id === "number").map(n => n.id);
    userNotifications = userNotifications.map(n => ({ ...n, read: true }));
    renderUserNotificationBadge();
    renderUserNotificationPanel();
    await Promise.all(unreadIds.map(id => fetch(`${API_BASE}api/users/notifications/${id}/read`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" }
    }).catch(() => null)));
}

window.toggleUserNotifPanel = function() {
    ensureNotificationUi();
    const panel = document.getElementById("user-notif-panel");
    if (!panel) return;
    const willOpen = panel.style.display !== "block";
    panel.style.display = willOpen ? "block" : "none";
    if (willOpen) markVisibleNotificationsRead();
};

function connectNotificationSocket(username) {
    if (!username || !window.SockJS || !window.Stomp || stompClient1?.connected) return;

    const socket = new SockJS(`${API_BASE}nghiaws`);
    stompClient1 = Stomp.over(socket);
    stompClient1.debug = null;

    stompClient1.connect({}, function () {
        console.log("WebSocket connected");
        const handler = function(message) {
            const payload = parseNotificationPayload(message.body);
            addUserNotification(payload, true);
            if (!payload.id) loadUserNotifications();
            if (payload.type === "ORDER_STATUS" && typeof loadOrderHistory === "function") {
                loadOrderHistory();
            }
        };
        stompClient1.subscribe('/noticeonly/user/' + username, handler);
        stompClient1.subscribe('/noticeall/notifications', handler);
    }, function(err) {
        console.error("STOMP error:", err);
    });
}

const currentUser = getCurrentUser();
if (currentUser?.username) {
    connectNotificationSocket(currentUser.username);
    document.addEventListener("DOMContentLoaded", loadUserNotifications);
}
// ==========================================
// 2. CÁC HÀM TIỆN ÍCH (UI, MODAL, AVATAR)
// ==========================================
function showErrorModal(text) {
    const modal = document.getElementById('errorModal');
    const message = document.getElementById("message");
    if (modal && message) {
        modal.style.display = 'flex';
        message.textContent = text;
    }
}

window.closeErrorModal = function() {
    const modal = document.getElementById('errorModal');
    if (modal) modal.style.display = 'none';
};

// Cập nhật ảnh đại diện người dùng trên Navbar/UI
function setupUserImage() {
    const imageUser = document.getElementById("userImage");
    if (!imageUser) return;

    let imagePath = localStorage.getItem("imageUser");

    if (imagePath && imagePath !== "null" && imagePath !== "undefined") {
        imageUser.src = imagePath.startsWith('http') ? imagePath : (API_BASE + imagePath);
    } else {
        imageUser.src = "https://ui-avatars.com/api/?name=User&background=random";
    }
}

// Hiệu ứng cuộn hiện hình (Reveal)
function initReveal() {
    const observerOptions = { threshold: 0.1, rootMargin: "0px 0px -50px 0px" };
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            } else {
                entry.target.classList.remove('active');
            }
        });
    }, observerOptions);

    document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
}

function getCookie(name) {
    let cookies = document.cookie.split(';');
    for (let c of cookies) {
        let [key, value] = c.trim().split('=');
        if (key === name) {
            return value;
        }
    }
    return null;
}

// ==========================================
// 3. API & LOGIC NGƯỜI DÙNG (PROFILE, LOGOUT)
// ==========================================
function initUpdateProfileForm() {
    const form = document.getElementById("updateProfileForm");
    if (!form) return;

    form.onsubmit = async function (e) {
        e.preventDefault();

        let phone = document.getElementById("phone")?.value.trim();
        let email = document.getElementById("email")?.value.trim();
        let address = document.getElementById("address")?.value.trim();
        let name = document.getElementById("name")?.value.trim();

        // VALIDATE
        if (!phone) return showErrorModal("Vui lòng nhập số điện thoại");
        if (!name) return showErrorModal("Vui lòng nhập họ và tên");
        let phoneRegex = /^0\d{9}$/;
        if (!phoneRegex.test(phone)) return showErrorModal("Số điện thoại không hợp lệ");
        if (!email) return showErrorModal("Không có email");


        if (!address) return showErrorModal("Vui lòng nhập địa chỉ");

        try {
            const response = await fetch(API_BASE + "api/accounts/me", {
                method: "PATCH",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ phone: phone, address: address,name:name,isDefault:parseInt("1") })
            });

            if (response.ok) {
                window.location.href = "/index.html#home";
                localStorage.setItem("isUpdateProfile", "true");

                        } else if (response.status === 401) {
                const text = await response.json();
                showErrorModal(text.message);
            } else {
                showErrorModal("Cập nhật thất bại");
            }
        } catch (error) {
            console.error("Lỗi:", error);
            showErrorModal("Không thể kết nối tới server");
        }
    };
}

async function readApiError(response, fallback) {
    const data = await response.json().catch(() => ({}));
    return data.message || fallback;
}

function initAccountDetailForm() {
    const form = document.getElementById("accountDetailForm");
    if (!form || form.dataset.bound === "true") return;
    form.dataset.bound = "true";

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const phone = document.getElementById("phone")?.value.trim();
        const email = document.getElementById("email")?.value.trim();
        const btn = form.querySelector('button[type="submit"]');

        if (!email) return showErrorModal("Vui lòng nhập email");
        if (!phone) return showErrorModal("Vui lòng nhập số điện thoại");
        if (!/^0\d{9}$/.test(phone)) return showErrorModal("Số điện thoại không hợp lệ");

        const oldText = btn ? btn.textContent : "";
        if (btn) {
            btn.disabled = true;
            btn.textContent = "Đang lưu...";
        }

        try {
            const response = await fetch(API_BASE + "api/users/me", {
                method: "PATCH",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, phone })
            });

            if (!response.ok) {
                throw new Error(await readApiError(response, "Cập nhật thất bại"));
            }

            const data = await response.json().catch(() => ({}));
            showToast(data.message || "Đã lưu thay đổi", "success");
            await getDetailAccount();
        } catch (error) {
            showErrorModal(error.message || "Không thể kết nối tới server");
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = oldText;
            }
        }
    });
}

async function getDetailAccount() {
    try {
        const res = await fetch(API_BASE + "api/users/me", {
            method: "GET",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
                // "ngrok-skip-browser-warning": "69420"
            },
        });

        if (!res.ok) throw new Error(`Lỗi HTTP: ${res.status}`);

        const data = await res.json();
        userPointBalance = Number(data.point || 0);
        localStorage.setItem("userPointBalance", String(userPointBalance));

        const fields = {
            "username": data.username,
            "phone": data.phonenum,
            "email": data.email,
            "dob": data.dob,
            "point123": data.point,
            "us1": data.username
        };

        for (let id in fields) {
            const el = document.getElementById(id);
            if (el) {
                if (el.tagName === "INPUT") el.value = fields[id] || "";
                else el.textContent = fields[id] ?? "";
            }
        }

        const imagePreview = document.getElementById("imagePreview");
        if (data.image && imagePreview) {
            imagePreview.src = API_BASE + data.image;
        }

        const welcomeName = document.getElementById("welcomeName");
        if (welcomeName) welcomeName.innerText = data.username || "Bạn";

        const pointValue = document.getElementById("point-value");
        if (pointValue) pointValue.textContent = `${userPointBalance.toLocaleString('vi-VN')}đ`;
        const nextRank = document.getElementById("point-next-rank");
        if (nextRank) {
            const remain = Math.max(0, 1000 - userPointBalance);
            nextRank.textContent = remain > 0 ? `Còn ${remain.toLocaleString('vi-VN')} điểm để lên hạng Kim Cương` : 'Bạn đã đạt hạng Kim Cương';
        }

    } catch (err) {
        console.error("Lỗi trong hàm getDetailAccount:", err);
    }
}

function getLoginPagePath() {
    return window.location.pathname.includes('/HTML/') ? 'login.html' : 'HTML/login.html';
}

async function logoutService() {
    try {
        const response = await fetch(API_BASE + "api/logout", {
            method: "GET",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
                // "ngrok-skip-browser-warning": "69420"
            },
        });

        if (response.ok) {
            localStorage.clear();
            window.location.href = getLoginPagePath();
        } else {
            const data = await response.json();
            showErrorModal(data.message || "Lỗi khi đăng xuất");
        }
    } catch (error) {
        console.error("Lỗi kết nối:", error);
        showErrorModal("Không thể kết nối tới server");
    }
}

async function forceLogoutAfterPasswordChange() {
    try {
        await fetch(API_BASE + "api/logout", {
            method: "GET",
            credentials: "include",
            headers: { "Content-Type": "application/json" }
        });
    } catch (error) {
        console.error("Không gọi được logout sau khi đổi mật khẩu:", error);
    } finally {
        localStorage.clear();
        window.location.href = getLoginPagePath();
    }
}

function initChangePasswordForm() {
    const form = document.getElementById("changePasswordForm");
    if (!form || form.dataset.bound === "true") return;
    form.dataset.bound = "true";

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const currentPassword = document.getElementById("current-password")?.value.trim();
        const newPassword = document.getElementById("new-password")?.value.trim();
        const confirmPassword = document.getElementById("confirm-new-password")?.value.trim();
        const btn = document.getElementById("change-password-btn");

        if (!currentPassword || !newPassword || !confirmPassword) {
            showErrorModal("Vui lòng nhập đầy đủ thông tin mật khẩu");
            return;
        }
        if (newPassword.length < 6) {
            showErrorModal("Mật khẩu mới phải có ít nhất 6 ký tự");
            return;
        }
        if (newPassword !== confirmPassword) {
            showErrorModal("Mật khẩu nhập lại không khớp");
            return;
        }

        const oldText = btn ? btn.textContent : "";
        if (btn) {
            btn.disabled = true;
            btn.textContent = "Đang cập nhật...";
        }

        try {
            const res = await fetch(API_BASE + "api/change-password", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ currentPassword, newPassword })
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data.message || "Đổi mật khẩu thất bại");
            }
            showToast(data.message || "Đổi mật khẩu thành công, vui lòng đăng nhập lại", "success");
            setTimeout(forceLogoutAfterPasswordChange, 700);
        } catch (error) {
            showErrorModal(error.message || "Không thể đổi mật khẩu");
            if (btn) {
                btn.disabled = false;
                btn.textContent = oldText;
            }
        }
    });
}

async function refreshToken() {
    const userData = localStorage.getItem("currentUser");
    if (!userData || userData === "[object Object]") return;

    try {
        const response = await fetch(API_BASE + `api/refresh`, {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
                // "ngrok-skip-browser-warning": "69420"
            },
        });
        if (!response.ok) console.warn("Refresh token expired");
    } catch (error) {
        console.error("Lỗi Refresh Token:", error);
    }
}

// Xử lý Upload Ảnh Mới
function initAvatarUpload() {
    const uploadPairs = [
        { input: "imageUpload", preview: "imagePreview" },
        { input: "imageUpload1", preview: "imagePreview1" }
    ];

    uploadPairs.forEach(pair => {
        const inputEl = document.getElementById(pair.input);
        const previewEl = document.getElementById(pair.preview);
        if (inputEl && previewEl) setupSingleUpload(inputEl, previewEl);
    });
}

function setupSingleUpload(input, preview) {
    let imagePath = localStorage.getItem("imageUser");
    if (imagePath && imagePath !== "null") {
        preview.src = imagePath.startsWith('http') ? imagePath : (API_BASE + imagePath);
    }

    input.onchange = function() {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                preview.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    };
}

// Lấy vị trí địa lý
function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                let lat = position.coords.latitude;
                let lon = position.coords.longitude;

                // Sử dụng URL gốc sạch, không tùy biến header để tránh kích hoạt Preflight CORS của trình duyệt
                const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=vi`;

                fetch(url)
                    .then(res => {
                        if (!res.ok) throw new Error("Mạng có sự cố, không thể lấy địa chỉ.");
                        return res.json();
                    })
                    .then(data => {
                        if (!data || !data.address) {
                            showToast(error.message || 'Không tìm thấy dữ liệu địa chỉ hợp lệ.', 'error');

                            return;
                        }

                        // 1. Điền địa chỉ đầy đủ vào ô input "address"
                        document.getElementById("address").value = data.display_name;

                        // 2. Trích xuất Phường/Xã và Quận/Huyện từ kết quả trả về
                        const addressInfo = data.address;

                        // Nominatim trả về tên xã/phường qua các trường: quarter, suburb, village, town, ward
                        let ward = addressInfo.quarter || addressInfo.suburb || addressInfo.ward || addressInfo.village || addressInfo.town;
                        // Tên quận/huyện qua các trường: suburb, district, borough, county
                        let district = addressInfo.district || addressInfo.suburb || addressInfo.borough || addressInfo.county;

                        // Chuẩn hóa chuỗi (bỏ bớt các chữ dư thừa như "Phường", "Quận" nếu có để khớp với hanoiData)
                        if (ward) ward = ward.replace(/^(Phường|Xã|Thị trấn)\s+/i, "").trim();
                        if (district) district = district.replace(/^(Quận|Huyện|Thị xã)\s+/i, "").trim();

                        // 3. Tự động đồng bộ hóa lên giao diện các thẻ <select>
                        const districtSel = document.getElementById('district');
                        const wardSel = document.getElementById('ward');

                        if (districtSel && wardSel) {
                            // Duyệt qua các option của Quận/Huyện để tìm mục khớp
                            let foundDistrict = false;
                            for (let i = 0; i < districtSel.options.length; i++) {
                                if (districtSel.options[i].value.toLowerCase() === district.toLowerCase()) {
                                    districtSel.selectedIndex = i;
                                    foundDistrict = true;
                                    break;
                                }
                            }

                            // Nếu tìm thấy quận, kích hoạt sự kiện change để nạp danh sách phường tương ứng
                            if (foundDistrict) {
                                // Kích hoạt sự kiện thay đổi quận bằng code để nạp danh sách phường từ hanoiData
                                districtSel.dispatchEvent(new Event('change'));

                                // Duyệt tìm phường/xã khớp trong danh sách mới nạp
                                for (let j = 0; j < wardSel.options.length; j++) {
                                    if (wardSel.options[j].value.toLowerCase() === ward.toLowerCase()) {
                                        wardSel.selectedIndex = j;
                                        break;
                                    }
                                }
                            }
                        }
                    })
                    .catch(err => {
                        console.error("Lỗi Fetch địa chỉ:", err);
                        alert("Không thể kết nối tới máy chủ địa chỉ. Vui lòng tự chọn bằng tay!");
                    });
            },
            (error) => {
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        alert("Bạn đã từ chối cấp quyền truy cập vị trí.");
                        break;
                    case error.POSITION_UNAVAILABLE:
                        alert("Thông tin vị trí không khả dụng.");
                        break;
                    case error.TIMEOUT:
                        alert("Quá thời gian yêu cầu lấy vị trí.");
                        break;
                    default:
                        alert("Lỗi không xác định khi lấy vị trí.");
                }
            }
        );
    } else {
        alert("Trình duyệt của bạn không hỗ trợ định vị Geolocation.");
        
    }
}

// ==========================================
// 4. SPA ROUTER - ĐIỀU HƯỚNG TRANG & RENDER NAVBAR
// ==========================================
function renderLoggedIn() {
    const nav = document.getElementById("navbarUser");
    if (!nav) return;
    nav.innerHTML = `
    <div class="dropdown-wrapper">
        <div class="profile-trigger">
            <div class="avatar-container">
                <img src="" alt="Profile" class="avatar" id="userImage">
            </div>
            <span class="label font-semibold">Tài khoản</span>
            <span class="material-symbols-outlined text-sm">arrow_drop_down</span>
        </div>
        <ul class="dropdown-menu">
            <li class="active"> <a href="#account-detail" onclick="navigate(event, '#account-detail')">Thông tin tài khoản</a></li>
            <li><a href="#"><span class="material-symbols-outlined text-base">confirmation_number</span> Đơn hàng của tôi</a></li>
            <hr>
            <li><a href="#" class="logout text-red-500" id="logout"><span class="material-symbols-outlined text-base">logout</span> Đăng xuất</a></li>
        </ul>
    </div>`;

    document.getElementById("logout").onclick = function(e) {
        e.preventDefault();
        logoutService();
    };
    setupUserImage();
}

function renderGuest() {
    const nav = document.getElementById("navbarUser");
    if (!nav) return;
    nav.innerHTML = `<a href="HTML/login.html" class="btn-login" style="background-color:rgba(14, 165, 233, 0.8);padding:14px;border-radius:20px;color:white">Đăng nhập</a>`;
}

function maintainNav() {
    if (localStorage.getItem("currentUser")) {
        renderLoggedIn();
    } else {
        renderGuest();
    }
}

async function loadPage(url) {
    // const path = url.replace('#', '').replace(/^\//, '').replace('.html', '');
     // Bỏ dấu # và chuẩn hóa
     const raw = url.replace('#', '').replace(/^\//, '').replace('.html', '');

     // TÁCH path và query string (nếu có)
     const [path, queryString] = raw.split('?');
     // LƯU params vào biến toàn cục để dùng sau
     window.currentQueryParams = new URLSearchParams(queryString || '');


    let page = "HTML/home.html"; // Default
    if (path === "account-detail" || path === "accountDetail") page = "HTML/accountDetail.html";
    else if (path === "update-profile") page = "HTML/updateProfile.html";
    else if (path === "menu") page = "HTML/menu.html";
    else if (path === "icecream") page = "HTML/icecream.html";
    else if (path === "cart") page = "HTML/cart.html";
    else if (path === "notification") page = "HTML/notification.html";
    else if (path === "About") page = "HTML/About.html";

    else if (path === "order-detail") page = "HTML/orderDetail.html";  // <-- THÊM DÒNG NÀY


    try {
        const res = await fetch(page);
        if (!res.ok) throw new Error(`Lỗi fetch: ${res.status}`);

        const contentMain = document.getElementById("contentMain");
        if (contentMain) {
            contentMain.innerHTML = await res.text();
            handlePostLoadLogic(path);
        }
    } catch (error) {
        console.error("Lỗi load trang:", error);
    }
}
const hanoiData = {
    "Ba Đình": ["Phúc Xá","Trúc Bạch","Vĩnh Phúc","Cống Vị","Liễu Giai","Nguyễn Trung Trực","Quán Thánh","Ngọc Hà","Điện Biên","Đội Cấn","Ngọc Khánh","Kim Mã","Giảng Võ","Thành Công"],
    "Hoàn Kiếm": ["Phúc Tân","Đồng Xuân","Hàng Mã","Hàng Buồm","Hàng Đào","Hàng Bồ","Cửa Đông","Lý Thái Tổ","Hàng Bạc","Hàng Gai","Chương Dương","Hàng Trống","Cửa Nam","Hàng Bông","Tràng Tiền","Trần Hưng Đạo","Phan Chu Trinh","Hàng Bài"],
    "Đống Đa": ["Cát Linh","Văn Miếu","Quốc Tử Giám","Láng Thượng","Ô Chợ Dừa","Văn Chương","Hàng Bột","Nam Đồng","Trung Phụng","Khâm Thiên","Thổ Quan","Kim Liên","Phương Liên","Trung Tự","Khương Thượng","Ngã Tư Sở","Thịnh Quang","Láng Hạ","Phương Mai"],
    "Hai Bà Trưng": ["Nguyễn Du","Bùi Thị Xuân","Phạm Đình Hổ","Lê Đại Hành","Đống Mác","Thanh Lương","Thanh Nhàn","Cầu Dền","Bách Khoa","Đồng Tâm","Vĩnh Tuy","Minh Khai","Trương Định","Tương Mai","Đại Kim","Định Công"],
    "Cầu Giấy": ["Nghĩa Đô","Nghĩa Tân","Mai Dịch","Dịch Vọng","Dịch Vọng Hậu","Quan Hoa","Yên Hòa","Trung Hòa"],
    "Thanh Xuân": ["Nhân Chính","Thượng Đình","Khương Trung","Khương Mai","Thanh Xuân Trung","Phương Liệt","Hạ Đình","Khương Đình","Thanh Xuân Bắc","Thanh Xuân Nam","Kim Giang"],
    "Hoàng Mai": ["Thanh Trì","Vĩnh Hưng","Định Công","Đại Kim","Tân Mai","Tương Mai","Giáp Bát","Lĩnh Nam","Trần Phú","Mai Động","Tứ Hiệp","Yên Sở","Hoàng Văn Thụ","Thịnh Liệt"],
    "Long Biên": ["Thạch Bàn","Long Biên","Bồ Đề","Gia Thụy","Giang Biên","Ngọc Thụy","Việt Hưng","Hội Xá","Phúc Lợi","Phúc Đồng","Đức Giang","Sài Đồng","Thượng Thanh","Cự Khối"],
    "Tây Hồ": ["Phú Thượng","Nhật Tân","Tứ Liên","Quản An","Xuân La","Bưởi","Yên Phụ","Thụy Khuê"],
    "Nam Từ Liêm": ["Cầu Diễn","Xuân Phương","Phương Canh","Mỹ Đình 1","Mỹ Đình 2","Tây Mỗ","Đại Mỗ","Trung Văn","Phú Đô","Mễ Trì"],
    "Bắc Từ Liêm": ["Đông Ngạc","Đức Thắng","Thụy Phương","Tây Tựu","Xuân Đỉnh","Xuân Tảo","Minh Khai","Cổ Nhuế 1","Cổ Nhuế 2","Liên Mạc","Phú Diễn","Phúc Diễn"],
    "Hà Đông": ["Nguyễn Trãi","Mộ Lao","Văn Quán","Vạn Phúc","Yết Kiêu","Quang Trung","La Khê","Phú La","Phú Lãm","Phú Lương","Dương Nội","Đồng Mai","Biên Giang","Yên Nghĩa","Hà Cầu","Kiến Hưng","Phúc La"]
};
function initLocationSelector() {
    const districtSel = document.getElementById('district');
    const wardSel = document.getElementById('ward');

    if (!districtSel || !wardSel) {
        console.warn("Không tìm thấy select district hoặc ward trong DOM hiện tại");
        return;
    }

    // Mở khóa cho phép tương tác ổn định
    districtSel.disabled = false;
    districtSel.style.pointerEvents = "auto";

    // Đổ danh sách Quận/Huyện vào select ban đầu
    districtSel.innerHTML = '<option disabled selected value="">Quận / Huyện</option>';
    Object.keys(hanoiData).forEach(function(d) {
        var opt = document.createElement('option');
        opt.value = d;
        opt.textContent = d;
        districtSel.appendChild(opt);
    });

    // Sự kiện lắng nghe khi người dùng đổi Quận/Huyện bằng tay
    districtSel.addEventListener('change', function() {
        var district = districtSel.value;
        wardSel.innerHTML = '<option disabled selected value="">Phường / Xã</option>';
        wardSel.disabled = !district;
        if (!district) return;

        hanoiData[district].forEach(function(w) {
            var opt = document.createElement('option');
            opt.value = w;
            opt.textContent = w;
            wardSel.appendChild(opt);
        });
    });
}
function initAddressAutoFill() {
    const streetInput = document.getElementById('address');
    const districtSelect = document.getElementById('district');
    const wardSelect = document.getElementById('ward');

    let userStreet = ''; // Lưu riêng phần số nhà người dùng nhập

    // Lưu lại số nhà khi người dùng gõ
    streetInput.addEventListener('input', function () {
        userStreet = streetInput.value.trim();
    });

    function updateAddressField() {
        const district = districtSelect.options[districtSelect.selectedIndex]?.text || '';
        const ward = wardSelect.options[wardSelect.selectedIndex]?.text || '';

        const parts = [];
        if (userStreet) parts.push(userStreet);
        if (ward && ward !== 'Phường / Xã') parts.push(ward);
        if (district && district !== 'Quận / Huyện') parts.push(district);
        if (parts.length > 0) parts.push('Hà Nội');

        streetInput.value = parts.join(', ');
    }

    districtSelect.addEventListener('change', function () {
        wardSelect.selectedIndex = 0;
        updateAddressField();
    });

    wardSelect.addEventListener('change', updateAddressField);
}

async function loadHomeBanner() {
    const bannerEl = document.getElementById("banner");
    if (!bannerEl) return;
    try {
        const res = await fetch(`${API_BASE}api/users/banners?site=home`, {
            method: "GET",
            credentials: "include",
            headers: { "Content-Type": "application/json" }
        });
        if (!res.ok) throw new Error("Không tải được banner");
        const banners = await res.json();
        const first = Array.isArray(banners) && banners.length ? banners[0] : null;
        const imageUrl = first?.imageUrl || first?.bannerImage || first?.image || "";
        if (imageUrl) {
            bannerEl.src = imageUrl.startsWith("http") ? imageUrl : `${API_BASE}${imageUrl}`;
        } else {
            bannerEl.src = `${API_BASE}tstc1.png`;
        }
    } catch (e) {
        bannerEl.src = `${API_BASE}tstc1.png`;
    }
}
function handlePostLoadLogic(path) {
    initReveal();
    setupUserImage();

    if (path.includes("update-profile")) {
        let email = localStorage.getItem("email");
        const emailEl = document.getElementById("email");
        if (emailEl && email) emailEl.value = email;
        initUpdateProfileForm();
        initAvatarUpload();
        initLocationSelector();
        initAddressAutoFill(); // Gọi hàm mới ở đây

    }
    if (path === "home")
    {
    loadHomeBanner();
    
    let pm1 = document.getElementById("pm1");
    if (pm1) {
      pm1.src = `${API_BASE}ts1.png`;
      pm1.style.objectFit = "contain";
    }
        let pm2 = document.getElementById("pm2");
    if (pm2) {
      pm2.src = `${API_BASE}ttc6.png`;
      pm2.style.objectFit = "contain";
    }
    let pm3 = document.getElementById("pm3");
    if (pm3) {
      pm3.src = `${API_BASE}tstc2.png`;
      pm3.style.objectFit = "contain";
    }
    let pm4 = document.getElementById("pm4");
    if (pm4) {
      pm4.src = `${API_BASE}k3.png`;
      pm4.style.objectFit = "contain";
    }
    
    }
    if (path === "order-detail") {
        // Lấy orderId từ biến toàn cục đã lưu ở loadPage
        const params = window.currentQueryParams;
        const orderId = params ? params.get('id') : null;
        if (orderId) {
            fetchAndRenderOrderDetail(orderId); // hoặc gọi renderOrderDetailUI(order)
        } else {
            // Nếu không có id, hiển thị thông báo
            const detailPage = document.getElementById('order-detail-page');
            if (detailPage) detailPage.innerHTML = '<p style="text-align:center;padding:40px;">Không tìm thấy mã đơn hàng</p>';
        }
    }
    if (path.includes("account")) {
        getDetailAccount();
        initAvatarUpload();
        initAccountDetailForm();
        initChangePasswordForm();
                            
        const overlay = document.getElementById("googleOverlay");
        if (overlay && localStorage.getItem("loginWithGoogle") === "true") {
            overlay.classList.add("active");
        }
    }

    if (path === "cart") {
        loadCartForCurrentMode();
        renderRecommendedProducts();
    }

    // Nếu load vào trang menu, khởi tạo logic menu động
    const renderContainer = document.getElementById("render-container");
    if (renderContainer) {
        console.log("Tìm thấy container, bắt đầu khởi tạo menu...");
        initDynamicMenu();
    }
}

function navigate(event, url) {
    if (event) event.preventDefault();
    history.pushState({}, "", url);
    loadPage(url);
}

// ==========================================
// 5. KHỞI TẠO HỆ THỐNG KHI LOAD TRANG
// ==========================================
document.addEventListener("DOMContentLoaded", function() {
    let isUpdateProfile = localStorage.getItem("isUpdateProfile");

    if (isUpdateProfile === "false") {
        loadPage("#update-profile");
        window.location.hash = "#update-profile";
    } else {
        const currentHash = window.location.hash || "#home";
        loadPage(currentHash);
    }

    maintainNav();
    refreshToken();
    initAiChatWidget();
    if (document.getElementById("changePasswordForm")) {
        getDetailAccount();
        initAvatarUpload();
        initAccountDetailForm();
        initChangePasswordForm();
    }
});

window.onpopstate = function () {
    const currentPath = window.location.hash || "#home";
    loadPage(currentPath);
};

async function loadProduct() {
    try {
        const response = await fetch(
            API_BASE+'api/users/products',
            {
                method: "GET",
                headers: {// Bỏ qua màn hình cảnh báo
                    // "ngrok-skip-browser-warning": "true",
                    "Content-Type": "application/json"
                }
            }
        );

        const data = await response.json();

        console.log("Dữ liệu đã nhận:", data);

        return data;

    } catch (error) {
        console.error('Lỗi khi lấy dữ liệu:', error);
        return [];
    }
}

let productSearchCache = [];
let pendingMenuCategory = null;
let menuCategoryHideTimer = null;

async function ensureProductSearchCache() {
    if (!productSearchCache.length) {
        productSearchCache = await loadProduct();
    }
    return productSearchCache;
}

async function getProductById(productId) {
    const products = await ensureProductSearchCache();
    return products.find(p => Number(p.productId) === Number(productId)) || null;
}

function buildProductCardHTML(item, options = {}) {
    const compact = Boolean(options.compact);
    const imageUrl = resolveAssetUrl(item.imageUrl, '../binglogo.png');
    const rating = Number(item.rating || 0);
    const categoryText = item.categoryName || item.category || 'BingChun';
    const desc = item.description || item.shortDescription || 'Món được yêu thích từ BingChun.';

    return `
      <article data-product-id="${item.productId}" data-category="${item.category || ''}" class="product-card group relative overflow-hidden rounded-[2rem] bg-white/70 border border-white/60 shadow-[0_16px_40px_rgba(15,23,42,.08)] backdrop-blur-xl cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(15,23,42,.14)]">
        <div class="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-sky-100/40 pointer-events-none"></div>
        <div class="relative p-4">
          <div class="relative aspect-square rounded-[1.5rem] overflow-hidden bg-slate-50 border border-white/70">
            <img src="${imageUrl}" alt="${escapeHtml(item.productName || '')}" class="w-full h-full object-contain p-3 transition-transform duration-500 group-hover:scale-105">
            <div class="absolute top-3 left-3 text-[10px] font-extrabold uppercase tracking-[0.14em] px-2.5 py-1 rounded-full bg-white/90 text-sky-700 shadow">
              ${escapeHtml(categoryText)}
            </div>
          </div>
          <div class="pt-4">
            <div class="text-[11px] text-slate-500 font-semibold mb-1">Mã #${item.productId}</div>
            <h3 class="text-[15px] font-extrabold text-slate-900 leading-snug line-clamp-2 min-h-[40px]">${escapeHtml(item.productName || '')}</h3>
            <div class="flex items-center gap-2 mt-2 cursor-pointer select-none" data-rating="${rating}" onclick="event.stopPropagation(); openProductReviewsModal(${item.productId})" title="Xem và đánh giá">
              <span class="text-amber-500 text-xs">${simpleStarText(rating)}</span>
              <span class="text-[12px] text-slate-500">${rating.toFixed(1)}</span>
            </div>
            <p class="text-[12px] text-slate-500 mt-2 line-clamp-2 min-h-[32px]">${escapeHtml(desc)}</p>
            <div class="flex items-end justify-between gap-3 mt-4">
              <div>
                <div class="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Giá</div>
                <div class="text-[20px] font-black text-primary">${Number(item.price || 0).toLocaleString('vi-VN')}đ</div>
              </div>
              <button class="add-to-cart-btn shrink-0 w-11 h-11 rounded-2xl text-white grid place-items-center shadow-lg transition-transform hover:scale-105 active:scale-95" data-product-id="${item.productId}" style="background:linear-gradient(135deg,#38bdf8,#006977)">
                <span class="material-symbols-outlined">add_shopping_cart</span>
              </button>
            </div>
          </div>
        </div>
      </article>
    `;
}

async function renderRecommendedProducts() {
    const host = document.getElementById('recommendations-grid');
    if (!host) return;
    host.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:24px;color:#64748b;font-size:14px">Đang tải sản phẩm...</div>
    `;
    try {
        const products = await loadProduct();
        const list = Array.isArray(products) ? products : [];
        if (!list.length) {
            host.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:24px;color:#64748b;font-size:14px">Chưa có sản phẩm.</div>';
            return;
        }
        host.innerHTML = list.map(item => buildProductCardHTML(item, { compact: true })).join('');
    } catch (e) {
        host.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:24px;color:#dc2626;font-size:14px">Không tải được danh sách sản phẩm.</div>';
    }
}

window.toggleProductSearch = async function(event) {
    if (event) event.stopPropagation();
    const panel = document.getElementById('productSearchPanel');
    const input = document.getElementById('productSearchInput');
    if (!panel) return;
    panel.classList.toggle('hidden');
    if (!panel.classList.contains('hidden')) {
        await ensureProductSearchCache();
        if (input) {
            input.focus();
            renderProductSearchSuggestions(input.value);
        }
    }
};

window.renderProductSearchSuggestions = async function(query) {
    const box = document.getElementById('productSearchResults');
    if (!box) return;
    const products = await ensureProductSearchCache();
    const keyword = (query || '').trim().toLowerCase();
    if (!keyword) {
        box.innerHTML = '<div style="padding:14px;color:#64748b;font-size:13px">Gõ tên sản phẩm để tìm nhanh.</div>';
        return;
    }

    const results = products
        .filter(p => String(p.productName || '').toLowerCase().includes(keyword))
        .slice(0, 8);
    box.innerHTML = results.length ? results.map(p => `
        <button type="button" onclick="openSearchProduct(${p.productId})"
            style="width:100%;display:flex;align-items:center;gap:10px;border:0;background:transparent;text-align:left;padding:9px;border-radius:12px;cursor:pointer">
            <img src="${resolveAssetUrl(p.imageUrl || '', '../binglogo.png')}" style="width:42px;height:42px;border-radius:10px;object-fit:contain;background:#f8fafc">
            <span style="flex:1;min-width:0">
                <b style="display:block;color:#0f172a;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(p.productName || '')}</b>
                <span style="font-size:12px;color:#0284c7">${Number(p.price || 0).toLocaleString('vi-VN')}đ</span>
            </span>
        </button>
    `).join('') : '<div style="padding:14px;color:#64748b;font-size:13px">Không tìm thấy sản phẩm phù hợp.</div>';
};

window.openSearchProduct = function(productId) {
    document.getElementById('productSearchPanel')?.classList.add('hidden');
    openProductDetailModal(productId);
};

window.showMenuCategoryNav = function() {
    if (menuCategoryHideTimer) {
        clearTimeout(menuCategoryHideTimer);
        menuCategoryHideTimer = null;
    }
    document.getElementById('menu-category-hover')?.classList.remove('hidden');
};

window.hideMenuCategoryNav = function() {
    if (menuCategoryHideTimer) clearTimeout(menuCategoryHideTimer);
    menuCategoryHideTimer = setTimeout(() => {
        document.getElementById('menu-category-hover')?.classList.add('hidden');
    }, 180);
};

window.cancelMenuCategoryHide = function() {
    if (menuCategoryHideTimer) {
        clearTimeout(menuCategoryHideTimer);
        menuCategoryHideTimer = null;
    }
};

window.selectHoverCategory = function(event, categoryId) {
    pendingMenuCategory = categoryId;
    window.cancelMenuCategoryHide();
    document.getElementById('menu-category-hover')?.classList.add('hidden');
    navigate(event, '#menu');
    setTimeout(() => {
        if (typeof window.renderMenuCategory === 'function') {
            window.renderMenuCategory(categoryId);
        }
    }, 250);
};

document.addEventListener('click', (event) => {
    const panel = document.getElementById('productSearchPanel');
    const toggle = document.getElementById('productSearchToggle');
    if (!panel || panel.classList.contains('hidden')) return;
    if (!panel.contains(event.target) && !toggle?.contains(event.target)) {
        panel.classList.add('hidden');
    }
});



// ==========================================
// 6. LOGIC XỬ LÝ MENU ĐỘNG (SẢN PHẨM)
// ==========================================
async function initDynamicMenu() {
    const renderContainer = document.getElementById("render-container");
    const categoryBtns = document.querySelectorAll(".category-btn");

    if (!renderContainer) return;

    // 1. Load dữ liệu từ Server
    const viewsData = await loadProduct();
    if (!Array.isArray(viewsData)) return;
    const featuredCards = document.querySelectorAll('.product-card[data-product-id]');
        
    featuredCards.forEach(card => {
        const pid = card.getAttribute('data-product-id');
        // ĐÃ SỬA: dùng viewsData thay vì data
        const product = viewsData.find(p => String(p.productId) === String(pid));
        
        if (product) {
            // Đổ sao SVG vào container
            const ratingBox = card.querySelector('.featured-rating-container');
            if (ratingBox) {
                ratingBox.innerHTML = `
                    ${renderStars(product.rating)} 
                    <span style="font-size:12px;color:#7a8aaa;font-weight:600">
                        ${Number(product.rating || 0).toFixed(1)}
                    </span>
                `;
            }
            // Cập nhật luôn giá từ DB
            const priceBox = card.querySelector('.featured-price');
            if (priceBox) {
                priceBox.innerText = Number(product.price).toLocaleString('vi-VN') + 'đ';
            }
        }})
    // ── 2. KHÔI PHỤC HÀM VẼ SAO (RENDER STARS) ──
    const renderStars = (rating = 5) => {
        const S = 14, GAP = 3, H = 16;
        const W = 5 * S + 4 * GAP;
        const starPath = (cx, cy, outerR, innerR, pts) => {
            let d = [];
            for (let i = 0; i < pts * 2; i++) {
                const angle = (i * Math.PI / pts) - Math.PI / 2;
                const r = i % 2 === 0 ? outerR : innerR;
                d.push(`${(cx + Math.cos(angle) * r).toFixed(2)},${(cy + Math.sin(angle) * r).toFixed(2)}`);
            }
            return d.join(' ');
        };

        let defs = '', stars = '';
        for (let i = 0; i < 5; i++) {
            const x = i * (S + GAP) + S / 2;
            const fill = Math.min(1, Math.max(0, rating - i));
            const id = `sr_${i}_${Math.random().toString(36).slice(2, 6)}`;
            defs += `
                <linearGradient id="${id}" x1="0" x2="1" y1="0" y2="0">
                    <stop offset="${(fill * 100).toFixed(1)}%" stop-color="#FACC15"/>
                    <stop offset="${(fill * 100).toFixed(1)}%" stop-color="rgba(255,255,255,0.15)"/>
                </linearGradient>`;
            stars += `<polygon
                points="${starPath(x, H / 2, S / 2, S / 4.5, 5)}"
                fill="url(#${id})"
                stroke="rgba(250,204,21,0.45)"
                stroke-width="0.8"/>`;
        }

        return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
                    <defs>${defs}</defs>${stars}
                </svg>`;
    };

    const createProductCard = (item) => buildProductCardHTML(item);

//logic addCart





    // ── 4. LOGIC RENDER (Hỗ trợ "all" và filter) ──
    const renderContent = (categoryId) => {
        pendingMenuCategory = categoryId;
        categoryBtns.forEach(btn => {
            btn.classList.toggle("active", btn.getAttribute("data-category") === String(categoryId));
        });
        renderContainer.style.opacity = 0;
        setTimeout(() => {
            let items = [];
            if (categoryId === "all") {
                items = viewsData;
            } else if (categoryId === "best-seller") {
                items = viewsData.filter(item => Number(item.rating || 0) >= 4);
            } else {
                items = viewsData.filter(item => {
                    return Number(item.category) === Number(categoryId);
                });
            }

            renderContainer.innerHTML = items.length
                ? items.map(item => createProductCard(item)).join('')
                : "<p class='col-span-full text-center py-20 text-on-surface-variant'>Không tìm thấy sản phẩm phù hợp...</p>";

            renderContainer.style.opacity = 1;
        }, 200);
    };

    // Gán sự kiện click cho các nút phân loại
    categoryBtns.forEach(btn => {
        btn.addEventListener("click", (e) => {
            const id = e.currentTarget.getAttribute("data-category");
            renderContent(id);
        });
    });
    window.renderMenuCategory = renderContent;

    // Mặc định load "Tất cả" sản phẩm khi vào trang
    renderContent(pendingMenuCategory || "all");
}

function simpleStarText(rating) {
    const n = Math.max(0, Math.min(5, Number(rating || 0)));
    return '★'.repeat(n) + '☆'.repeat(5 - n);
}

window.__productReviewModalState = null;
async function findReviewableOrderForProduct(productId) {
    try {
        const res = await fetch(`${API_BASE}api/users/orders`, {
            method: 'GET',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
        });
        if (!res.ok) return null;
        const orders = await res.json();
        const normalizedProductId = Number(productId);
        const match = (orders || []).find(order => {
            if (!isCompletedOrderStatus(order.status)) return false;
            return (order.orderDetails || []).some(detail => Number(detail?.product?.productId || detail?.productId) === normalizedProductId);
        });
        return match ? Number(match.orderId) : null;
    } catch (e) {
        return null;
    }
}

window.filterProductReviews = function(filter) {
    if (!window.__productReviewModalState) return;
    window.__productReviewModalState.filter = filter;
    renderProductReviewModal(window.__productReviewModalState);
};

function renderProductReviewModal(state) {
    const content = document.getElementById('product-reviews-content');
    if (!content) return;

    const reviews = (state.reviews || []).filter(r => {
        if (state.filter === 'all') return true;
        return Number(r.rating || 0) === Number(state.filter);
    });

    const counts = {
        all: state.reviews.length,
        5: state.reviews.filter(r => Number(r.rating || 0) === 5).length,
        4: state.reviews.filter(r => Number(r.rating || 0) === 4).length,
        3: state.reviews.filter(r => Number(r.rating || 0) === 3).length,
        2: state.reviews.filter(r => Number(r.rating || 0) === 2).length,
        1: state.reviews.filter(r => Number(r.rating || 0) === 1).length
    };

    const avgRating = state.reviews.length
        ? (state.reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / state.reviews.length).toFixed(1)
        : '0.0';

    content.innerHTML = `
        <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:14px;padding:14px;border-radius:14px;background:#f8fafc;border:1px solid #e2e8f0;">
          <div>
            <div style="font-size:12px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:.08em;">Tổng quan đánh giá</div>
            <div style="font-size:22px;font-weight:900;color:#0f172a;margin-top:4px;">${avgRating} / 5</div>
            <div style="font-size:12px;color:#64748b;margin-top:4px;">${state.reviews.length} đánh giá </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            <div style="font-size:13px;color:#334155;font-weight:700;">Bộ lọc sao</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
          ${[
            ['all', `Tất cả (${counts.all})`],
            ['5', `5 sao (${counts[5]})`],
            ['4', `4 sao (${counts[4]})`],
            ['3', `3 sao (${counts[3]})`],
            ['2', `2 sao (${counts[2]})`],
            ['1', `1 sao (${counts[1]})`]
          ].map(([key, label]) => `
            <button type="button" onclick="filterProductReviews('${key}')"
              style="border:1px solid ${state.filter === key ? '#0ea5e9' : '#e2e8f0'};background:${state.filter === key ? '#e0f2fe' : '#fff'};color:#0f172a;padding:8px 12px;border-radius:999px;font-size:13px;font-weight:700;cursor:pointer;">
              ${label}
            </button>
          `).join('')}
            </div>
          </div>
        </div>
        <div style="margin-bottom:14px;padding:14px;border-radius:14px;background:#fff;border:1px solid #e2e8f0;">
          <div style="font-size:14px;font-weight:800;color:#0f172a;margin-bottom:8px;">Gửi đánh giá của bạn</div>
          ${state.reviewOrderId ? `
            ${reviewFormHtml(state.reviewOrderId, state.productId)}
          ` : `
            <div style="padding:12px;border-radius:10px;background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;font-size:13px;line-height:1.5;">
              Bạn cần có ít nhất một đơn hàng đã hoàn thành chứa sản phẩm này để gửi đánh giá.
            </div>
          `}
        </div>
        ${reviews.length ? reviews.map(r => `
          <div style="padding:14px;border:1px solid #e2e8f0;border-radius:14px;margin-bottom:10px;background:#f8fafc;">
            <div style="display:flex;justify-content:space-between;gap:12px;margin-bottom:6px;">
              <strong style="color:#0f172a;">${r.username || 'Người dùng'}</strong>
              <span style="color:#f59e0b;font-size:13px;">${simpleStarText(r.rating)}</span>
            </div>
            <div style="font-size:14px;color:#334155;line-height:1.45;">${r.content || ''}</div>
            ${(r.replies || []).map(reply => `
              <div style="margin-top:10px;margin-left:16px;padding:10px;border-left:3px solid #0ea5e9;background:white;border-radius:10px;">
                <div style="font-weight:800;color:#0369a1;font-size:13px;">Admin ${reply.username || ''}</div>
                <div style="font-size:13px;color:#334155;margin-top:3px;">${reply.content || ''}</div>
              </div>
            `).join('')}
          </div>
        `).join('') : '<div style="text-align:center;color:#64748b;padding:28px;">Không có đánh giá ở mức sao này.</div>'}
    `;
}

async function openProductReviewsModal(productId) {
    const old = document.getElementById('product-reviews-modal');
    if (old) old.remove();

    const modal = document.createElement('div');
    modal.id = 'product-reviews-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:100000;display:flex;align-items:flex-start;justify-content:center;padding:48px 16px;';
    modal.innerHTML = `
      <div style="width:min(620px,100%);max-height:82vh;overflow:auto;background:#fff;border-radius:18px;box-shadow:0 24px 70px rgba(15,23,42,.28);">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:16px 18px;border-bottom:1px solid #e2e8f0;">
          <div style="font-weight:800;font-size:18px;color:#0f172a;">Đánh giá sản phẩm</div>
          <button onclick="document.getElementById('product-reviews-modal')?.remove()" style="border:0;background:transparent;font-size:24px;cursor:pointer;color:#64748b;">×</button>
        </div>
        <div id="product-reviews-content" style="padding:16px;">
          <div style="text-align:center;color:#94a3b8;padding:28px;">Đang tải đánh giá...</div>
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

    const content = document.getElementById('product-reviews-content');
    try {
        const res = await fetch(`${API_BASE}api/users/products/${productId}/reviews`, {
            method: 'GET',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
        });
        if (!res.ok) throw new Error('Không tải được đánh giá');
        const reviews = await res.json();
        await loadMyReviewedProductIds();
        const reviewOrderId = await findReviewableOrderForProduct(productId);
        window.__productReviewModalState = { productId, reviews: reviews || [], filter: 'all', reviewOrderId };
        if (!reviews.length) {
            content.innerHTML = '<div style="text-align:center;color:#64748b;padding:28px;">Sản phẩm chưa có đánh giá.</div>';
        }
        renderProductReviewModal(window.__productReviewModalState);
    } catch (error) {
        content.innerHTML = `<div style="text-align:center;color:#dc2626;padding:28px;">${error.message}</div>`;
    }
}

async function openProductDetailModal(productId) {
    const old = document.getElementById('product-detail-modal');
    if (old) old.remove();

    const modal = document.createElement('div');
    modal.id = 'product-detail-modal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:100001;background:rgba(15,23,42,.42);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:20px 14px;overflow:auto;';
    modal.innerHTML = `
      <div style="width:min(920px,100%);max-height:92vh;overflow:auto;border-radius:28px;background:rgba(255,255,255,.22);backdrop-filter:blur(22px);border:1px solid rgba(255,255,255,.45);box-shadow:0 30px 80px rgba(15,23,42,.25);">
        <div id="product-detail-body" style="padding:28px;text-align:center;color:#64748b;">Đang tải sản phẩm...</div>
      </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

    try {
        const res = await fetch(`${API_BASE}api/users/products/${productId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        if (!res.ok) throw new Error('Không tải được chi tiết sản phẩm');
        const p = await res.json();

        const images = (p.images && p.images.length) ? p.images : (p.imageUrl ? [p.imageUrl] : []);
        const mainImg = resolveAssetUrl(images[0], '../binglogo.png');
        const thumbs = images.map(u => resolveAssetUrl(u, '../binglogo.png'));
        const stock = p.quantity != null ? p.quantity : (p.stockQuantity != null ? p.stockQuantity : 100);
        const maxQty = Math.max(1, Math.min(stock, 100));

        document.getElementById('product-detail-body').innerHTML = `
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:start;">
            <div>
              <button onclick="document.getElementById('product-detail-modal')?.remove()" style="position:absolute;right:24px;top:20px;border:0;background:rgba(255,255,255,.5);width:36px;height:36px;border-radius:50%;cursor:pointer;font-size:22px;color:#334155;">×</button>
              <div style="background:rgba(255,255,255,.35);border-radius:22px;padding:18px;border:1px solid rgba(255,255,255,.5);">
                <img id="pd-main-img" src="${mainImg}" alt="${p.productName}" style="width:100%;aspect-ratio:1;object-fit:contain;border-radius:16px;background:rgba(248,250,252,.6);"/>
                <div style="display:flex;gap:10px;margin-top:12px;overflow-x:auto;">
                  ${thumbs.map((src, i) => `
                    <img src="${src}" onclick="document.getElementById('pd-main-img').src='${src}'"
                      style="width:64px;height:64px;object-fit:cover;border-radius:12px;cursor:pointer;border:2px solid ${i===0?'#0ea5e9':'transparent'};background:#fff;"/>
                  `).join('')}
                </div>
              </div>
            </div>
            <div style="text-align:left;color:#0f172a;">
              <div style="font-size:12px;color:#0369a1;font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;">${p.category || 'BingChun'}</div>
              <h2 style="font-size:28px;font-weight:900;line-height:1.2;margin-bottom:8px;">${p.productName}</h2>
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
                <span style="color:#f59e0b;font-size:14px;">${simpleStarText(p.rating)}</span>
                <span style="font-size:13px;color:#64748b;">${Number(p.rating || 0).toFixed(1)}</span>
              </div>
              <div style="font-size:32px;font-weight:900;color:#006977;margin-bottom:14px;">${Number(p.price).toLocaleString('vi-VN')}đ</div>
              <div onclick="openProductReviewsModal(${p.productId})" style="cursor:pointer;display:inline-flex;align-items:center;gap:8px;margin-bottom:16px;padding:8px 12px;border-radius:999px;background:#f8fafc;border:1px solid #e2e8f0;">
                <span style="color:#f59e0b;font-size:14px;">${simpleStarText(p.rating)}</span>
                <span style="font-size:13px;color:#64748b;">${Number(p.rating || 0).toFixed(1)} · Bấm để xem đánh giá</span>
              </div>
              <p style="font-size:14px;color:#475569;line-height:1.6;margin-bottom:16px;">${p.description || 'Món kem trà sữa đặc biệt từ BingChun.'}</p>
              <div style="font-size:13px;color:#334155;margin-bottom:18px;">
                <strong>Còn lại:</strong> <span id="pd-stock">${stock}</span> phần
              </div>
              ${(p.ingredients && p.ingredients.length) ? `
                <div style="margin-bottom:18px;font-size:13px;color:#475569;">
                  <strong>Thành phần:</strong>
                  <ul style="margin-top:6px;padding-left:18px;">
                    ${p.ingredients.map(ing => `<li>${ing.name}${ing.quantity ? ` (${ing.quantity}${ing.unit ? ' ' + ing.unit : ''})` : ''}</li>`).join('')}
                  </ul>
                </div>` : ''}
              <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px;">
                <span style="font-weight:700;font-size:14px;">Số lượng</span>
                <div style="display:flex;align-items:center;background:rgba(255,255,255,.45);border-radius:14px;border:1px solid rgba(255,255,255,.6);overflow:hidden;">
                  <button id="pd-qty-minus" style="width:40px;height:40px;border:0;background:transparent;font-size:20px;cursor:pointer;">−</button>
                  <input id="pd-qty" type="number" min="1" max="${maxQty}" value="1" style="width:48px;text-align:center;border:0;background:transparent;font-weight:700;"/>
                  <button id="pd-qty-plus" style="width:40px;height:40px;border:0;background:transparent;font-size:20px;cursor:pointer;">+</button>
                </div>
              </div>
              <button id="pd-add-cart" style="width:100%;padding:14px 18px;border:0;border-radius:16px;background:linear-gradient(135deg,#38bdf8,#006977);color:#fff;font-weight:800;font-size:16px;cursor:pointer;box-shadow:0 12px 30px rgba(0,105,119,.25);">
                Thêm vào giỏ hàng
              </button>
            </div>
          </div>`;

        const qtyInput = document.getElementById('pd-qty');
        document.getElementById('pd-qty-minus').onclick = () => {
            qtyInput.value = Math.max(1, Number(qtyInput.value) - 1);
        };
        document.getElementById('pd-qty-plus').onclick = () => {
            qtyInput.value = Math.min(maxQty, Number(qtyInput.value) + 1);
        };
        document.getElementById('pd-add-cart').onclick = async () => {
            const qty = Math.min(maxQty, Math.max(1, Number(qtyInput.value) || 1));
            const img = document.getElementById('pd-main-img');
            const cartIcon = document.getElementById('cart-icon');
            animateFlyToCart(img, cartIcon);
            await addToCartApi(productId, qty, p);
            modal.remove();
        };

        if (window.innerWidth < 768) {
            const grid = document.querySelector('#product-detail-body > div');
            if (grid) grid.style.gridTemplateColumns = '1fr';
        }
    } catch (err) {
        document.getElementById('product-detail-body').innerHTML =
            `<div style="padding:40px;color:#dc2626;">${err.message}</div>`;
    }
}

document.addEventListener('click', (e) => {
    const card = e.target.closest('.product-card');
    if (!card) return;
    if (e.target.closest('.add-to-cart-btn') || e.target.closest('[data-no-detail]')) return;
    const productId = card.getAttribute('data-product-id');
    if (productId) openProductDetailModal(productId);
});

function initAiChatWidget() {
    if (document.getElementById('bingchun-ai-widget')) return;

    const widget = document.createElement('div');
    widget.id = 'bingchun-ai-widget';
    widget.innerHTML = `
      <style>
        #bingchun-ai-panel { display:none; position:fixed; right:20px; bottom:88px; width:min(380px,calc(100vw - 32px)); height:min(520px,70vh);
          border-radius:22px; background:rgba(255,255,255,.2); backdrop-filter:blur(20px); border:1px solid rgba(255,255,255,.45);
          box-shadow:0 24px 60px rgba(15,23,42,.22); z-index:99998; flex-direction:column; overflow:hidden; }
        #bingchun-ai-panel.open { display:flex; }
        #bingchun-ai-messages { flex:1; overflow:auto; padding:14px; display:flex; flex-direction:column; gap:10px; }
        .ai-msg { max-width:88%; padding:10px 12px; border-radius:14px; font-size:13px; line-height:1.45; }
        .ai-msg.bot { align-self:flex-start; background:rgba(255,255,255,.55); color:#0f172a; }
        .ai-msg.user { align-self:flex-end; background:linear-gradient(135deg,#38bdf8,#006977); color:#fff; }
        #bingchun-ai-fab { position:fixed; right:20px; bottom:20px; width:58px; height:58px; border-radius:50%; border:0; cursor:pointer;
          background:linear-gradient(135deg,#7dd3fc,#006977); color:#fff; font-size:26px; box-shadow:0 12px 30px rgba(0,105,119,.35); z-index:99999; }
      </style>
      <button id="bingchun-ai-fab" title="Tư vấn AI BingChun">✦</button>
      <div id="bingchun-ai-panel">
        <div style="padding:14px 16px;border-bottom:1px solid rgba(255,255,255,.35);display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div style="font-weight:800;color:#0369a1;">BingChun AI</div>
            <div style="font-size:11px;color:#64748b;">RAG + Ollama — gợi ý món phù hợp</div>
          </div>
          <button id="bingchun-ai-close" style="border:0;background:transparent;font-size:22px;cursor:pointer;color:#64748b;">×</button>
        </div>
        <div id="bingchun-ai-messages">
          <div class="ai-msg bot">Xin chào! Bạn muốn món kem/trà sữa ngọt, béo hay thanh mát? Mình sẽ gợi ý từ menu BingChun nhé.</div>
        </div>
        <div style="padding:10px;border-top:1px solid rgba(255,255,255,.35);display:flex;gap:8px;">
          <input id="bingchun-ai-input" placeholder="VD: món ít ngọt dưới 50k..." style="flex:1;border:1px solid rgba(255,255,255,.5);border-radius:12px;padding:10px 12px;background:rgba(255,255,255,.35);outline:none;"/>
          <button id="bingchun-ai-send" style="border:0;border-radius:12px;padding:0 14px;background:#006977;color:#fff;font-weight:700;cursor:pointer;">Gửi</button>
        </div>
      </div>`;
    document.body.appendChild(widget);

    const panel = document.getElementById('bingchun-ai-panel');
    const messages = document.getElementById('bingchun-ai-messages');
    const input = document.getElementById('bingchun-ai-input');

    const appendMsg = (text, who) => {
        const div = document.createElement('div');
        div.className = 'ai-msg ' + who;
        div.textContent = text;
        messages.appendChild(div);
        messages.scrollTop = messages.scrollHeight;
    };

    const sendAi = async () => {
        const text = input.value.trim();
        if (!text) return;
        input.value = '';
        appendMsg(text, 'user');
        appendMsg('Đang suy nghĩ...', 'bot');
        const loading = messages.lastElementChild;
        try {
            const res = await fetch(API_BASE + 'api/users/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text })
            });
            const data = await res.json();
            loading.remove();
            appendMsg(data.reply || 'Không có phản hồi', 'bot');
            if (data.sources) {
                const hint = document.createElement('div');
                hint.className = 'ai-msg bot';
                hint.style.fontSize = '11px';
                hint.style.opacity = '0.85';
                hint.textContent = 'Gợi ý từ: ' + data.sources;
                messages.appendChild(hint);
            }
        } catch {
            loading.remove();
            appendMsg('Không kết nối được AI. Hãy chạy Ollama (llama3.2) trên server.', 'bot');
        }
    };

    document.getElementById('bingchun-ai-fab').onclick = () => panel.classList.toggle('open');
    document.getElementById('bingchun-ai-close').onclick = () => panel.classList.remove('open');
    document.getElementById('bingchun-ai-send').onclick = sendAi;
    input.addEventListener('keydown', e => { if (e.key === 'Enter') sendAi(); });
}

// ==========================================
// LOGIC GIỎ HÀNG & API
// ==========================================

// 1. Hàm xử lý hiệu ứng bay (Giữ nguyên của bạn, có sửa nhẹ để mượt hơn)
function animateFlyToCart(imgElement, cartElement) {
    if (!imgElement || !cartElement) return;

    const flyImg = imgElement.cloneNode(true); // Tạo bản sao của ảnh
    const imgRect = imgElement.getBoundingClientRect();
    const cartRect = cartElement.getBoundingClientRect();

    // Cấu hình bản sao để bắt đầu bay
    Object.assign(flyImg.style, {
        position: 'fixed',
        left: `${imgRect.left}px`,
        top: `${imgRect.top}px`,
        width: `${imgRect.width}px`,
        height: `${imgRect.height}px`,
        transition: 'all 0.9s cubic-bezier(0.42, 0, 0.58, 1)', // Chậm lại xíu cho đẹp
        zIndex: '1000',
        borderRadius: '50%',
        pointerEvents: 'none',
        opacity: '1'
    });

    document.body.appendChild(flyImg);

    // Bắt đầu bay tới giỏ hàng (dùng setTimeout để trigger transition)
    setTimeout(() => {
        Object.assign(flyImg.style, {
            left: `${cartRect.left + cartRect.width/2 - 10}px`,
            top: `${cartRect.top + cartRect.height/2 - 10}px`,
            width: '20px',
            height: '20px',
            opacity: '0.2'
        });
    }, 0);

    // Xóa bản sao khi xong và làm giỏ hàng rung nhẹ
    flyImg.addEventListener('transitionend', () => {
        flyImg.remove();
        // Hiệu ứng rung của Tailwind (đảm bảo bạn có class này hoặc animate-ping)
        cartElement.classList.add('animate-bounce');
        setTimeout(() => cartElement.classList.remove('animate-bounce'), 400);
    });
}

const GUEST_CART_KEY = 'bingchun_guest_cart';

function isLoggedInUser() {
    return Boolean(getCurrentUser());
}

function getGuestCart() {
    try {
        const raw = localStorage.getItem(GUEST_CART_KEY);
        const cart = raw ? JSON.parse(raw) : [];
        return Array.isArray(cart) ? cart : [];
    } catch (e) {
        return [];
    }
}

function saveGuestCart(cart) {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(Array.isArray(cart) ? cart : []));
}

function normalizeCartItemForGuest(item) {
    const rawToppings = Array.isArray(item.toppings)
        ? item.toppings
        : String(item.toppings || '')
            .split(',')
            .map(v => v.trim())
            .filter(Boolean);
    return {
        productId: Number(item.productId),
        productName: item.productName || item.name || '',
        imageUrl: resolveAssetUrl(item.imageUrl || item.image || ''),
        price: Number(item.price || 0),
        rating: Number(item.rating || 0),
        category: item.category || item.categoryName || '',
        description: item.description || '',
        totalQuantity: Number(item.totalQuantity ?? item.quantity ?? item.qty ?? 1),
        size: (item.size || 'M').toUpperCase() === 'L' ? 'L' : 'M',
        note: item.note || '',
        toppings: rawToppings,
        isSelected: item.isSelected !== false
    };
}

function getCartItemQuantity(item) {
    return Math.max(1, Number(item?.totalQuantity ?? item?.quantity ?? item?.qty ?? 1) || 1);
}

function resolveAssetUrl(url, fallback = '') {
    const value = String(url || '').trim();
    if (!value) return fallback;
    if (/^(https?:|data:|blob:)/i.test(value)) return value;
    return value.startsWith('/') ? `${API_BASE}${value.slice(1)}` : `${API_BASE}${value}`;
}

function getCartBadgeCountForCurrentMode() {
    if (isLoggedInUser()) {
        return fetch(API_BASE + "api/users/cart", {
            method: "GET",
            credentials: "include",
            headers: { "Content-Type": "application/json" }
        })
            .then(res => res.ok ? res.json() : { quantity: 0 })
            .then(data => Number(data?.quantity || 0))
            .catch(() => 0);
    }
    return Promise.resolve(getGuestCart().reduce((sum, item) => sum + Number(item.totalQuantity || 0), 0));
}

function renderCartFromGuestStorage() {
    cartData = getGuestCart().map(item => ({
        ...normalizeCartItemForGuest(item),
        isSelected: item.isSelected !== false
    }));
    renderAll();
}

function loadCartForCurrentMode() {
    if (isLoggedInUser()) {
        return loadCartFromServer();
    }
    renderCartFromGuestStorage();
    return Promise.resolve();
}

// 2. Hàm CALL API POST để lưu vào giỏ hàng trên Server
// Viết dạng async để xử lý bất đồng bộ
async function addToCartApi(productId, quantity = 1, productMeta = null) {
    const bodyData = {
        productId: Number(productId),
        quantity: Math.max(1, Number(quantity) || 1)
    };

    if (!isLoggedInUser()) {
        const qty = Math.max(1, Number(quantity) || 1);
        const resolvedMeta = (productMeta && productMeta.productName && productMeta.imageUrl && Number(productMeta.price || 0) > 0)
            ? productMeta
            : (await getProductById(productId)) || productMeta || {};
        const meta = normalizeCartItemForGuest({
            ...resolvedMeta,
            productId,
            totalQuantity: qty
        });
        const guestCart = getGuestCart();
        const index = guestCart.findIndex(item => Number(item.productId) === Number(productId));
        if (index > -1) {
            guestCart[index].totalQuantity = Number(guestCart[index].totalQuantity || 0) + qty;
            if (productMeta?.size) guestCart[index].size = meta.size;
            if (productMeta?.note != null) guestCart[index].note = meta.note;
        } else {
            guestCart.push({ ...meta, totalQuantity: qty });
        }
        saveGuestCart(guestCart);
        const badge = document.getElementById('cart-count');
        if (badge) badge.innerText = guestCart.reduce((sum, item) => sum + Number(item.totalQuantity || 0), 0);
        return 'guest-cart-ok';
    }

    try {
        console.log(`Đang gọi API add sản phẩm ${productId} to server...`);

        const response = await fetch( API_BASE+"api/users/cart", {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
                // "ngrok-skip-browser-warning": "69420"
            },
            body: JSON.stringify(bodyData)
        });

        // Luôn đọc text trước
        const text = await response.text();

        if (!response.ok) {
            throw new Error(text || `Lỗi server: ${response.status}`);
        }

        console.log('Response từ server:', text); // "OK"

        updateCartBadge();

        return text;

    } catch (error) {
        console.error('Lỗi API AddToCart:', error);
        showToast('Không thể thêm sản phẩm vào giỏ', 'error');
        return null;
    }
}

// 3. Hàm cập nhật số lượng hiển thị trên Badge (Chỉ thuần cập nhật UI)
function updateCartBadgeUI(count) {
    const badge = document.getElementById('cart-count'); // Đảm bảo ID này đúng với badge trên header
    if (badge) {
        badge.innerText = count;
        // Ẩn badge nếu số lượng = 0
        badge.style.display = 'flex';
    }
}

async function updateCartBadge() {
    const count = await getCartBadgeCountForCurrentMode();
    updateCartBadgeUI(count);
}

// 4. Gắn sự kiện Click toàn cục (Event Delegation)
document.addEventListener('click', async (e) => {
    // 1. Tìm nút bấm
    const btn = e.target.closest('.add-to-cart-btn');
    if (!btn) return;

    e.preventDefault();

    // 2. Lấy ID sản phẩm
    const productId = btn.getAttribute('data-product-id');
    if (!productId) return;

    // 3. TÌM THẺ CHA (Sửa lỗi ở đây: tìm cả glass-card hoặc product-card)
    const productCard = btn.closest('.glass-card') || btn.closest('.product-card');
    
    // 4. Lấy ảnh sản phẩm và icon giỏ hàng
    const productImg = productCard ? productCard.querySelector('img') : null;
    const cartIcon = document.getElementById('cart-icon');

    // 5. CHẠY HIỆU ỨNG (Chỉ chạy nếu tìm thấy cả ảnh và đích đến)
    if (productImg && cartIcon && typeof animateFlyToCart === "function") {
        animateFlyToCart(productImg, cartIcon);
    } else {
        console.warn("Không tìm thấy ảnh hoặc icon giỏ hàng để làm hiệu ứng bay!");
    }

    // 6. GỌI API
    const productMeta = productCard ? {
        productId,
        productName: productCard.querySelector('h3')?.textContent?.trim() || productCard.querySelector('.item-title')?.textContent?.trim() || '',
        imageUrl: productImg?.getAttribute('src') || '',
        price: Number(
            (productCard.querySelector('.price-tag')?.textContent || productCard.querySelector('.text-2xl')?.textContent || '0')
                .replace(/[^\d]/g, '')
        ) || 0,
        rating: Number(productCard.querySelector('[data-rating]')?.getAttribute('data-rating') || 0),
        category: productCard.getAttribute('data-category') || ''
    } : null;

    await addToCartApi(productId, 1, productMeta);
});







// --- KHỞI TẠO KHI LOAD TRANG ---
async function initCartBadgeOnLoad() {
    await updateCartBadge();
}

initCartBadgeOnLoad();
let cartData = [];

const cartIconButton = document.getElementById("cart-icon");
if (cartIconButton) {
    cartIconButton.addEventListener("click", async () => {
        await loadCartForCurrentMode();
    });
}

const SIZE_L_SURCHARGE = 10000;
const TOPPING_OPTIONS = [
    { key: 'white_boba', label: 'Trân châu trắng', price: 5000, icon: '' },
    { key: 'black_boba', label: 'Trân châu đen', price: 5000, icon: '' },
    { key: 'aloe_vera', label: 'Nha đam', price: 5000, icon: '' }
];

function getCartItemSize(product) {
    return (product?.size || "M").toUpperCase() === "L" ? "L" : "M";
}

function getCartItemToppings(product) {
    const raw = Array.isArray(product?.toppings)
        ? product.toppings
        : String(product?.toppings || '')
            .split(',')
            .map(v => v.trim())
            .filter(Boolean);
    return raw.filter(key => TOPPING_OPTIONS.some(t => t.key === key));
}

function getCartItemToppingPrice(product) {
    return getCartItemToppings(product).length * 5000;
}

function getCartItemPrice(product) {
    const basePrice = Number(product?.price || 0);
    return basePrice
        + (getCartItemSize(product) === "L" ? SIZE_L_SURCHARGE : 0)
        + getCartItemToppingPrice(product);
}

const cartNoteTimers = new Map();

function syncGuestCartStorage() {
    if (isLoggedInUser()) return;
    saveGuestCart(cartData.map(item => normalizeCartItemForGuest(item)));
    updateCartBadge();
}

async function persistCartItem(productId) {
    const item = cartData.find(p => Number(p.productId) === Number(productId));
    if (!item) return;

    if (!isLoggedInUser()) {
        syncGuestCartStorage();
        return;
    }

    try {
        await fetch(API_BASE + "api/users/cart", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                productId: Number(productId),
                quantity: getCartItemQuantity(item),
                size: getCartItemSize(item),
                note: item.note || "",
                toppings: getCartItemToppings(item)
            })
        });
    } catch (e) {
        console.error("Không đồng bộ được giỏ hàng:", e);
    }
}

window.setCartItemSize = (productId, size) => {
    const item = cartData.find(p => Number(p.productId) === Number(productId));
    if (!item) return;
    item.size = size === "L" ? "L" : "M";
    persistCartItem(productId);
    if (!isLoggedInUser()) syncGuestCartStorage();
    renderAll();
};

window.setCartItemNote = (productId, note) => {
    const item = cartData.find(p => Number(p.productId) === Number(productId));
    if (!item) return;
    item.note = note;
    if (cartNoteTimers.has(productId)) clearTimeout(cartNoteTimers.get(productId));
    cartNoteTimers.set(productId, setTimeout(() => {
        persistCartItem(productId);
        if (!isLoggedInUser()) syncGuestCartStorage();
        cartNoteTimers.delete(productId);
    }, 450));
};

window.toggleCartItemTopping = (productId, toppingKey, checked) => {
    const item = cartData.find(p => Number(p.productId) === Number(productId));
    if (!item) return;
    const current = new Set(getCartItemToppings(item));
    if (checked) current.add(toppingKey);
    else current.delete(toppingKey);
    item.toppings = Array.from(current);
    persistCartItem(productId);
    if (!isLoggedInUser()) syncGuestCartStorage();
    renderAll();
};

async function loadCartFromServer() {
    if (!isLoggedInUser()) {
        renderCartFromGuestStorage();
        return;
    }
    try {
        const response = await fetch(API_BASE + "api/users/cart/getDataCart", {
            method: "GET",
            credentials: "include"
        });
        if (!response.ok) throw new Error("Network response was not ok");

        const data = await response.json();

        // Cực kỳ quan trọng: Thêm thuộc tính isSelected mặc định là true cho mỗi sản phẩm
        cartData = data.map(item => ({
            ...normalizeCartItemForGuest(item),
            isSelected: true
        }));
        await getDetailAccount();

        renderAll();
    } catch (error) {
        console.error("Huhu, không lấy được giỏ hàng:", error);
    }
}

function renderAll() {
    renderCart(cartData);
    renderOrderSummary(cartData);
}

// --- 1. RENDER GIỎ HÀNG (SỬA CHECKBOX VÀO ĐÚNG VỊ TRÍ) ---
function renderCart(products) {
    const container = document.getElementById('cart-container');
    if (!container) return;
    const allSelected = products.length > 0 && products.every(p => p.isSelected);
    const selectedCount = products.filter(p => p.isSelected).length;
    container.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px;padding:10px 12px;border:1px solid #e2e8f0;border-radius:12px;background:rgba(255,255,255,.72)">
            <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:13px;font-weight:700;color:#0f172a;">
                <input type="checkbox" ${allSelected ? 'checked' : ''} onchange="toggleSelectAll(this.checked)" />
                Chọn tất cả
            </label>
            <span style="font-size:12px;color:#64748b">${selectedCount}/${products.length} đã chọn</span>
        </div>`;

    products.forEach(product => {
        const selectedSize = getCartItemSize(product);
        const unitPrice = getCartItemPrice(product);
        const itemQty = getCartItemQuantity(product);
        // Chú ý: Đã đưa item-checkbox-container VÀO TRONG cart-item
        const productHTML = `
            <div class="cart-item glass-deep" data-id="${product.productId}">
                <div class="item-checkbox-container">
                    <input type="checkbox" class="custom-checkbox"
                           ${product.isSelected ? 'checked' : ''}
                           onchange="toggleCheck(${product.productId})" />
                </div>

                <img     style="width: 120px; height: 120px; object-fit: contain;" class="item-img" src="${resolveAssetUrl(product.imageUrl, '../binglogo.png')}"/>
                <div class="item-details">
                    <h3 class="item-title">${product.productName}</h3>
                    <div class="cart-size-picker" style="display:flex;align-items:center;gap:6px;margin:8px 0 4px">
                        <span style="font-size:12px;color:#777">Size</span>
                        <button type="button" onclick="setCartItemSize(${product.productId}, 'M')"
                            style="height:28px;min-width:38px;border-radius:8px;border:1px solid ${selectedSize === 'M' ? 'var(--primary)' : '#ddd'};
                                   background:${selectedSize === 'M' ? 'var(--primary)' : 'white'};
                                   color:${selectedSize === 'M' ? 'white' : '#555'};font-size:12px;font-weight:600;cursor:pointer">
                            M
                        </button>
                        <button type="button" onclick="setCartItemSize(${product.productId}, 'L')"
                            style="height:28px;min-width:70px;border-radius:8px;border:1px solid ${selectedSize === 'L' ? 'var(--primary)' : '#ddd'};
                                   background:${selectedSize === 'L' ? 'var(--primary)' : 'white'};
                                   color:${selectedSize === 'L' ? 'white' : '#555'};font-size:12px;font-weight:600;cursor:pointer">
                            L +10k
                        </button>
                    </div>
                    <textarea oninput="setCartItemNote(${product.productId}, this.value)"
                        placeholder="Ghi chú: ít đá, không đường..."
                        style="width:100%;min-height:42px;border:1px solid #e2e8f0;border-radius:10px;padding:8px 10px;font-size:12px;resize:vertical;outline:none;background:rgba(255,255,255,.7)">${escapeHtml(product.note || '')}</textarea>
                    <div style="margin-top:8px;padding:10px 10px 6px;border:1px dashed #cbd5e1;border-radius:12px;background:rgba(255,255,255,.55)">
                        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px">
                            <span style="font-size:12px;font-weight:700;color:#0f172a">Topping thêm</span>
                            <span style="font-size:11px;color:#64748b">${getCartItemToppings(product).length} đã chọn</span>
                        </div>
                        <div style="display:grid;grid-template-columns:1fr;gap:6px">
                            ${TOPPING_OPTIONS.map(t => `
                                <label style="display:flex;align-items:flex-start;gap:8px;cursor:pointer;font-size:12px;color:#334155">
                                    <input type="checkbox" ${getCartItemToppings(product).includes(t.key) ? 'checked' : ''}
                                           onchange="toggleCartItemTopping(${product.productId}, '${t.key}', this.checked)"
                                           style="margin-top:3px;accent-color:var(--primary)">
                                    <span style="flex:1">
                                        <b>${t.icon} ${t.label}</b>
                                        <span style="display:block;font-size:11px;color:#64748b">+${t.price.toLocaleString('vi-VN')}đ</span>
                                    </span>
                                </label>
                            `).join('')}
                        </div>
                    </div>
                    <div class="item-actions">
                        <span class="item-price">${unitPrice.toLocaleString('vi-VN')}đ</span>
                        <div class="qty-control">
                            <button class="qty-btn" onclick="updateQty(${product.productId}, -1)">
                                <span class="material-symbols-outlined">remove</span>
                            </button>
                            <span class="qty-num">${itemQty}</span>
                            <button class="qty-btn" onclick="updateQty(${product.productId}, 1)">
                                <span class="material-symbols-outlined">add</span>
                            </button>
                        </div>
                    </div>
                </div>
                <button class="delete-btn" onclick="openDeleteModal(${product.productId})">
                    <span class="material-symbols-outlined">delete</span>
                </button>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', productHTML);
    });
}// ==========================================
// STATE
// ==========================================
let deliveryMode = 'ship';
let payMethod = 'cod';              // 'cod' | 'bank'
let addresses = [];
let tempAddr = null, selectedAddr = null;
let editingAddressId = null;
let vouchers = [], tempVoucher = null, appliedVoucher = null;
let selectedPickup = null, tempPickup = null;

// ==========================================
// 2. RENDER TÓM TẮT ĐƠN HÀNG
// ==========================================
function getPointDiscount(subtotal, shippingFee, voucherDiscount) {
    if (!usePointsForOrder) return 0;
    const payable = Math.max(0, subtotal + shippingFee - voucherDiscount);
    return Math.min(userPointBalance, payable);
}

window.togglePointRedeem = function() {
    usePointsForOrder = !usePointsForOrder;
    renderOrderSummary(cartData);
};

function renderOrderSummary(products) {
    const summaryContainer = document.querySelector('.order-summary');
    if (!summaryContainer) return;

    const selectedItems = products.filter(p => p.isSelected);
    const subtotal = selectedItems.reduce((sum, p) => sum + (getCartItemPrice(p) * getCartItemQuantity(p)), 0);
    const shippingFee = (deliveryMode === 'ship' && subtotal > 0) ? 15000 : 0;

    // Tính discount TRƯỚC
    let discount = 0;
    if (appliedVoucher && subtotal > 0) {
        if (appliedVoucher.percent) {
            discount = Math.round(subtotal * appliedVoucher.percent / 100);
        } else if (appliedVoucher.value) {
            discount = appliedVoucher.value;
        }
    }

    const pointDiscount = getPointDiscount(subtotal, shippingFee, discount);

    // Tính total SAU khi đã có discount và điểm đổi
    const total = subtotal + shippingFee - discount - pointDiscount;

    let addrLabel = '<span style="color:#aaa">Chọn địa chỉ giao hàng</span>';
    if (selectedAddr) {
        const addressText = selectedAddr.address || '';
        const short = addressText.length > 38
            ? addressText.slice(0, 38) + '…' : addressText;
        addrLabel = `<strong>${selectedAddr.name}</strong> &nbsp;${short}`;
    }

    let pickupLabel = '<span style="color:#aaa">Chọn khung giờ lấy hàng</span>';
    if (selectedPickup) {
        pickupLabel = `${selectedPickup.dayLabel} lúc ${selectedPickup.time}`;
    }

    let voucherLabel = '<span style="color:#aaa">Chọn hoặc nhập mã giảm giá</span>';
    if (appliedVoucher) {
        voucherLabel = `${appliedVoucher.code} — Giảm ${appliedVoucher.percent}% (${discount.toLocaleString('vi-VN')}đ)`;
    }

    summaryContainer.innerHTML = `
        <h3 class="summary-title">Tóm tắt đơn hàng</h3>

        <p class="sec-label">Hình thức nhận hàng</p>
        <div style="display:flex;border:1.5px solid var(--primary);border-radius:8px;overflow:hidden;margin-bottom:4px">
            <button onclick="setDelivery('takeaway')" style="flex:1;padding:9px;font-size:13px;font-weight:500;border:none;cursor:pointer;
                background:${deliveryMode==='takeaway'?'var(--primary)':'white'};
                color:${deliveryMode==='takeaway'?'white':'var(--primary)'}">
                 Lấy tại cửa hàng
            </button>
            <button onclick="setDelivery('ship')" style="flex:1;padding:9px;font-size:13px;font-weight:500;border:none;border-left:1.5px solid var(--primary);cursor:pointer;
                background:${deliveryMode==='ship'?'var(--primary)':'white'};
                color:${deliveryMode==='ship'?'white':'var(--primary)'}">
                 Giao hàng
            </button>
        </div>

        ${deliveryMode === 'takeaway' ? `
        <div onclick="openPickupTimeModal()" class="selector-dashed">
            <div style="display:flex;align-items:center;gap:8px;flex:1;overflow:hidden">
                <span class="material-symbols-outlined" style="color:var(--primary);flex-shrink:0">schedule</span>
                <span style="font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${pickupLabel}</span>
            </div>
            <span class="material-symbols-outlined" style="color:#aaa">chevron_right</span>
        </div>` : ''}

        ${deliveryMode === 'ship' ? `
        <div onclick="openAddrModal()" class="selector-dashed">
            <div style="display:flex;align-items:center;gap:8px;flex:1;overflow:hidden">
                <span class="material-symbols-outlined" style="color:var(--primary);flex-shrink:0">location_on</span>
                <span style="font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${addrLabel}</span>
            </div>
            <span class="material-symbols-outlined" style="color:#aaa">chevron_right</span>
        </div>` : ''}

        <p class="sec-label">Hình thức thanh toán</p>
        <div onclick="setPayMethod('cod')" class="pay-opt ${payMethod==='cod'?'pay-opt-sel':''}">
            <span class="material-symbols-outlined" style="color:${payMethod==='cod'?'var(--primary)':'#888'}">payments</span>
            <div style="flex:1">
                <div style="font-size:14px;font-weight:500">Thanh toán khi nhận hàng</div>
                <div style="font-size:12px;color:#888">Trả tiền mặt cho nhân viên giao hàng</div>
            </div>
            <div class="pay-radio ${payMethod==='cod'?'pay-radio-sel':''}"></div>
        </div>
        <div onclick="setPayMethod('bank')" class="pay-opt ${payMethod==='bank'?'pay-opt-sel':''}">
            <span class="material-symbols-outlined" style="color:${payMethod==='bank'?'var(--primary)':'#888'}">account_balance</span>
            <div style="flex:1">
                <div style="font-size:14px;font-weight:500">Chuyển khoản ngân hàng</div>
                <div style="font-size:12px;color:#888">QR / chuyển khoản, tự động xác nhận</div>
            </div>
            <div class="pay-radio ${payMethod==='bank'?'pay-radio-sel':''}"></div>
        </div>

        <div onclick="openVoucherModal()" class="selector-dashed">
            <div style="display:flex;align-items:center;gap:8px;flex:1">
                <span class="material-symbols-outlined" style="color:var(--primary)">confirmation_number</span>
                <span style="font-size:13px">${voucherLabel}</span>
            </div>
            <span class="material-symbols-outlined" style="color:#aaa">chevron_right</span>
        </div>

        <div onclick="togglePointRedeem()" class="selector-dashed" style="${userPointBalance <= 0 ? 'opacity:.55;pointer-events:none' : ''}">
            <div style="display:flex;align-items:center;gap:8px;flex:1">
                <span class="material-symbols-outlined" style="color:var(--primary)">stars</span>
                <span style="font-size:13px">
                    Đổi điểm (${userPointBalance.toLocaleString('vi-VN')} điểm)
                    <b style="color:${usePointsForOrder?'var(--primary)':'#888'}">${usePointsForOrder ? `- ${pointDiscount.toLocaleString('vi-VN')}đ` : 'Chưa dùng'}</b>
                </span>
            </div>
            <span class="material-symbols-outlined" style="color:${usePointsForOrder?'var(--primary)':'#aaa'}">${usePointsForOrder?'check_circle':'radio_button_unchecked'}</span>
        </div>

        <div class="summary-row"><span>Tạm tính</span><strong>${subtotal.toLocaleString('vi-VN')}đ</strong></div>
        ${deliveryMode === 'ship' ? `
        <div class="summary-row"><span>Phí vận chuyển</span><strong>${shippingFee.toLocaleString('vi-VN')}đ</strong></div>` : ''}
        <div class="summary-row" style="color:red"><span>Giảm giá</span><strong>-${discount.toLocaleString('vi-VN')}đ</strong></div>
        ${pointDiscount > 0 ? `<div class="summary-row" style="color:#0f766e"><span>Đổi điểm</span><strong>-${pointDiscount.toLocaleString('vi-VN')}đ</strong></div>` : ''}
        <div class="summary-row total"><span>Tổng cộng</span><span class="total-price">${total.toLocaleString('vi-VN')}đ</span></div>
        ${!isLoggedInUser() ? `<div style="margin:10px 0 0;padding:10px 12px;border-radius:12px;background:#fff7ed;color:#9a3412;font-size:12px;line-height:1.5;border:1px solid #fed7aa">Đăng nhập để thanh toán và đồng bộ giỏ hàng vào tài khoản.</div>` : ''}
        <button class="checkout-btn" ${subtotal===0?'disabled':''} style="${subtotal===0?'opacity:.5;cursor:not-allowed;':''}">
            Thanh toán ngay
        </button>
    `;
}

// CSS thêm vào file .css của bạn:
// .selector-dashed { cursor:pointer; display:flex; align-items:center; justify-content:space-between; padding:10px 12px; margin:10px 0; border:1px dashed var(--primary); border-radius:8px; gap:8px; }
// .selector-dashed:hover { background:#fff5f5; }
// .sec-label { font-size:11px; font-weight:500; color:#999; letter-spacing:.6px; text-transform:uppercase; margin:14px 0 6px; }
// .pay-opt { display:flex; align-items:center; gap:12px; padding:12px; border:1.5px solid #eee; border-radius:8px; cursor:pointer; margin-bottom:8px; transition:border-color .15s; }
// .pay-opt-sel { border-color:var(--primary); background:#fff5f5; }
// .pay-radio { width:18px; height:18px; border-radius:50%; border:2px solid #ddd; flex-shrink:0; }
// .pay-radio-sel { border-color:var(--primary); background:var(--primary); box-shadow:inset 0 0 0 3px white; }

// ==========================================
// DELIVERY & PAYMENT
// ==========================================
window.setDelivery = (mode) => { deliveryMode = mode; renderAll(); };
window.setPayMethod = (method) => { payMethod = method; renderAll(); };

// ==========================================
// MODAL ĐỊA CHỈ (slide lên trên)
// ==========================================
window.openAddrModal = async () => {
    const html = `
        <div id="addr-modal" onclick="if(event.target===this)closeAddrModal()"
            style="position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;
                   align-items:flex-start;justify-content:center;padding-top:60px;z-index:9999;">
            <div style="background:white;border-radius:12px;width:92%;max-width:420px;
                        max-height:82vh;overflow-y:auto;padding:16px;
                        animation:slideDown .3s ease">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
                    <span style="font-size:15px;font-weight:500">Địa chỉ giao hàng</span>
                    <span class="material-symbols-outlined" onclick="closeAddrModal()" style="cursor:pointer;color:#aaa">close</span>
                </div>
                <div id="addr-list"><div style="text-align:center;padding:24px;color:#aaa;font-size:14px">Đang tải...</div></div>

                <!-- Nút thêm địa chỉ mới -->
                <div id="add-addr-btn" onclick="toggleAddForm()"
                    style="display:flex;align-items:center;gap:6px;color:var(--primary);font-size:13px;
                           font-weight:500;cursor:pointer;padding:12px 0;border-top:1px solid #f0f0f0;margin-top:4px">
                    <span class="material-symbols-outlined" style="font-size:20px">add_circle</span>
                    <span id="add-addr-label">Thêm địa chỉ mới</span>
                </div>

                <!-- Form thêm địa chỉ (ẩn mặc định) -->
                <div id="add-addr-form" style="display:none;border-top:1px solid #f0f0f0;padding-top:12px">
                    <div style="margin-bottom:10px">
                        <div style="font-size:12px;color:#888;margin-bottom:4px">Họ tên *</div>
                        <input id="f-name" placeholder="Nguyễn Văn A"
                            style="width:100%;padding:9px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;outline:none">
                    </div>
                    <div style="margin-bottom:10px">
                        <div style="font-size:12px;color:#888;margin-bottom:4px">Số điện thoại *</div>
                        <input id="f-phone" placeholder="0901234567" type="tel"
                            style="width:100%;padding:9px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;outline:none">
                    </div>
                    <div style="margin-bottom:12px">
                        <div style="font-size:12px;color:#888;margin-bottom:4px">Địa chỉ chi tiết *</div>
                        <input id="f-addr" placeholder="123 Đường ABC, Phường X, Quận Y, TP.HCM"
                            style="width:100%;padding:9px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;outline:none">
                    </div>
                    <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:#555;margin-bottom:12px;cursor:pointer">
                        <input id="f-default" type="checkbox" style="width:16px;height:16px;accent-color:var(--primary)">
                        Đặt làm địa chỉ mặc định
                    </label>
                    <button id="save-addr-btn" onclick="saveNewAddress()"
                        style="width:100%;padding:11px;background:var(--primary);color:white;border:none;
                               border-radius:8px;font-size:14px;font-weight:500;cursor:pointer;margin-bottom:10px">
                        Lưu địa chỉ
                    </button>
                    <button id="cancel-edit-addr-btn" onclick="cancelEditAddress()" type="button"
                        style="display:none;width:100%;padding:10px;background:white;color:#666;border:1px solid #ddd;
                               border-radius:8px;font-size:14px;font-weight:500;cursor:pointer;margin-bottom:10px">
                        Hủy chỉnh sửa
                    </button>
                </div>

                <button id="addr-confirm-btn" onclick="confirmAddress()"
                    style="width:100%;padding:12px;background:var(--primary);color:white;border:none;
                           border-radius:8px;font-size:14px;font-weight:500;cursor:pointer;margin-top:4px">
                    Xác nhận
                </button>
            </div>
        </div>
        <style>
            @keyframes slideDown { from{transform:translateY(-30px);opacity:0} to{transform:translateY(0);opacity:1} }
            .addr-item{display:flex;gap:12px;padding:12px 4px;border-bottom:1px solid #f0f0f0;cursor:pointer;align-items:flex-start}
            .addr-item:last-child{border-bottom:none}
            .addr-radio{width:20px;height:20px;border-radius:50%;border:2px solid #ddd;flex-shrink:0;margin-top:2px;display:flex;align-items:center;justify-content:center}
            .addr-radio.sel{border-color:var(--primary)}
            .addr-radio.sel::after{content:'';width:10px;height:10px;border-radius:50%;background:var(--primary);display:block}
            .badge-def{font-size:10px;border:1px solid var(--primary);color:var(--primary);border-radius:3px;padding:1px 5px;margin-left:6px;vertical-align:middle}
            .addr-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
            .addr-actions button{border:1px solid #ddd;background:white;border-radius:6px;padding:5px 8px;font-size:11px;color:#555;cursor:pointer}
            .addr-actions button:hover{border-color:var(--primary);color:var(--primary)}
        </style>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
    await fetchAddresses();
    renderAddresses();
};

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));
}

function getAddressId(addr) {
    if (!addr) return null;
    return addr.addressId ?? addr.id ?? `${addr.name || ''}|${addr.phone || ''}|${addr.address || ''}`;
}

function isDefaultAddress(addr) {
    return addr?.isDefault === true || addr?.isDefault === 'true' || Number(addr?.isDefault) === 1;
}

function normalizeAddress(addr) {
    const id = getAddressId(addr);
    return { ...addr, id, addressId: id, isDefault: isDefaultAddress(addr) };
}

function findAddressByKey(key) {
    const id = decodeURIComponent(key);
    return addresses.find(a => String(getAddressId(a)) === String(id));
}

function resetAddressForm(hide = true) {
    editingAddressId = null;
    const form = document.getElementById('add-addr-form');
    const confirmBtn = document.getElementById('addr-confirm-btn');
    const saveBtn = document.getElementById('save-addr-btn');
    const cancelBtn = document.getElementById('cancel-edit-addr-btn');
    const label = document.getElementById('add-addr-label');
    ['f-name', 'f-phone', 'f-addr'].forEach(id => {
        const input = document.getElementById(id);
        if (input) input.value = '';
    });
    const defaultInput = document.getElementById('f-default');
    if (defaultInput) defaultInput.checked = false;
    if (saveBtn) saveBtn.textContent = 'Lưu địa chỉ';
    if (cancelBtn) cancelBtn.style.display = 'none';
    if (label) label.textContent = 'Thêm địa chỉ mới';
    if (hide && form) form.style.display = 'none';
    if (confirmBtn) confirmBtn.style.display = hide ? 'block' : 'none';
}

window.toggleAddForm = () => {
    const form = document.getElementById('add-addr-form');
    const confirmBtn = document.getElementById('addr-confirm-btn');
    if (!form || !confirmBtn) return;
    const isHidden = form.style.display === 'none';
    if (isHidden) {
        resetAddressForm(false);
        form.style.display = 'block';
        confirmBtn.style.display = 'none';
    } else {
        resetAddressForm(true);
    }
};

async function fetchAddresses() {
    const list = document.getElementById('addr-list');
    if (list) {
        list.innerHTML =
            '<div style="text-align:center;padding:24px;color:#aaa;font-size:14px">Đang tải...</div>';
    }
    try {
        const res = await fetch(`${API_BASE}api/users/addresses`, {
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
        });
        if (!res.ok) throw new Error('Không tải được địa chỉ');
        const data = await res.json();
        addresses = Array.isArray(data) ? data.map(normalizeAddress) : [];

        const selectedMatch = selectedAddr ? addresses.find(a =>
            String(getAddressId(a)) === String(getAddressId(selectedAddr)) ||
            (a.name === selectedAddr.name && a.phone === selectedAddr.phone && a.address === selectedAddr.address)
        ) : null;
        selectedAddr = selectedMatch || selectedAddr;
        tempAddr = selectedAddr || addresses.find(isDefaultAddress) || addresses[0] || null;
    } catch (e) {
        if (list) {
            list.innerHTML =
                '<div style="text-align:center;padding:24px;color:#e00;font-size:14px">Không tải được địa chỉ.</div>';
        }
    }
}

function renderAddresses() {
    const addrList = document.getElementById('addr-list');
    if (!addrList) return;
    addrList.innerHTML = '';

    if (!addresses || addresses.length === 0) {
        addrList.innerHTML = '<div style="text-align:center;padding:24px;color:#aaa;font-size:14px">Chưa có địa chỉ nào</div>';
        return;
    }

    const sorted = [...addresses].sort((a, b) => Number(isDefaultAddress(b)) - Number(isDefaultAddress(a)));
    sorted.forEach(addr => addrList.innerHTML += createAddrCard(addr, isDefaultAddress(addr)));
}

function createAddrCard(addr, isDefault) {
    const idKey = encodeURIComponent(String(getAddressId(addr)));
    const isSelected = String(getAddressId(tempAddr)) === String(getAddressId(addr));
    return `
        <div class="addr-item" onclick="selectTempAddr('${idKey}')">
            <div class="addr-radio ${isSelected ? 'sel' : ''}"></div>
            <div style="flex:1">
                <div style="display:flex;align-items:center;font-weight:500;font-size:14px">
                    ${escapeHtml(addr.name)}
                    ${isDefault ? '<span class="badge-def">Mặc định</span>' : ''}
                </div>
                <div style="font-size:13px;color:#666;margin-top:2px">${escapeHtml(addr.phone)}</div>
                <div style="font-size:13px;color:#888;margin-top:2px">${escapeHtml(addr.address)}</div>
                <div class="addr-actions">
                    <button type="button" onclick="event.stopPropagation(); editAddress('${idKey}')">Sửa</button>
                    ${isDefault ? '' : `<button type="button" onclick="event.stopPropagation(); setDefaultAddress('${idKey}')">Mặc định</button>`}
                    <button type="button" onclick="event.stopPropagation(); deleteAddress('${idKey}')">Xóa</button>
                </div>
            </div>
        </div>
    `;
}

window.selectTempAddr = (key) => {
    tempAddr = findAddressByKey(key);
    renderAddresses();
};

window.editAddress = (key) => {
    const addr = findAddressByKey(key);
    if (!addr) return;
    editingAddressId = getAddressId(addr);
    document.getElementById('f-name').value = addr.name || '';
    document.getElementById('f-phone').value = addr.phone || '';
    document.getElementById('f-addr').value = addr.address || '';
    document.getElementById('f-default').checked = isDefaultAddress(addr);
    document.getElementById('add-addr-form').style.display = 'block';
    document.getElementById('addr-confirm-btn').style.display = 'none';
    document.getElementById('save-addr-btn').textContent = 'Cập nhật địa chỉ';
    document.getElementById('cancel-edit-addr-btn').style.display = 'block';
    document.getElementById('add-addr-label').textContent = 'Đang sửa địa chỉ';
};

window.cancelEditAddress = () => {
    resetAddressForm(true);
};

window.setDefaultAddress = async (key) => {
    const addr = findAddressByKey(key);
    if (!addr) return;
    try {
        const res = await fetch(`${API_BASE}api/users/addresses/${getAddressId(addr)}`, {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: addr.name, phone: addr.phone, address: addr.address, isDefault: true })
        });
        if (!res.ok) throw new Error('Không đặt được địa chỉ mặc định');
        await fetchAddresses();
        tempAddr = addresses.find(a => String(getAddressId(a)) === String(getAddressId(addr))) || tempAddr;
        renderAddresses();
    } catch (error) {
        showToast(error.message || 'Không cập nhật được địa chỉ', 'error');
    }
};

window.deleteAddress = async (key) => {
    const addr = findAddressByKey(key);
    if (!addr || !confirm('Xóa địa chỉ này?')) return;
    try {
        const res = await fetch(`${API_BASE}api/users/addresses/${getAddressId(addr)}`, {
            method: 'DELETE',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
        });
        if (!res.ok) throw new Error('Không xóa được địa chỉ');
        if (String(getAddressId(selectedAddr)) === String(getAddressId(addr))) selectedAddr = null;
        if (String(getAddressId(tempAddr)) === String(getAddressId(addr))) tempAddr = null;
        await fetchAddresses();
        renderAddresses();
        renderAll();
    } catch (error) {
        showToast(error.message || 'Không xóa được địa chỉ', 'error');
    }
};

window.saveNewAddress = async () => {
    const name  = document.getElementById('f-name').value.trim();
    const phone = document.getElementById('f-phone').value.trim();
    const addr  = document.getElementById('f-addr').value.trim();
    const isDefault = document.getElementById('f-default').checked;
    if (!name || !phone || !addr) { alert('Vui lòng điền đầy đủ thông tin!'); return; }

    const btn = document.getElementById('save-addr-btn');
    const oldText = btn.textContent;
    btn.textContent = 'Đang lưu...'; btn.disabled = true;
    try {
        const isEditing = editingAddressId !== null;
        const res = await fetch(`${API_BASE}api/users/addresses${isEditing ? `/${editingAddressId}` : ''}`, {
            method: isEditing ? 'PUT' : 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, phone, address: addr, isDefault })
        });
        const saved = await res.json().catch(() => null);
        if (!res.ok) throw new Error(saved?.message || 'Không lưu được địa chỉ');

        await fetchAddresses();
        if (saved) {
            const savedId = getAddressId(saved);
            tempAddr = addresses.find(a => String(getAddressId(a)) === String(savedId))
                || addresses.find(a => a.name === name && a.phone === phone && a.address === addr)
                || tempAddr;
        }
        resetAddressForm(true);
        renderAddresses();
    } catch (e) {
        showToast(e.message || 'Không lưu được địa chỉ', 'error');
    } finally {
        btn.textContent = oldText;
        btn.disabled = false;
    }
};

window.confirmAddress = () => {
    if (!tempAddr) {
        showToast('Vui lòng chọn địa chỉ giao hàng', 'error');
        return;
    }
    selectedAddr = tempAddr;
    closeAddrModal();
    renderAll();
};

window.closeAddrModal = () => {
    const m = document.getElementById('addr-modal'); if (m) m.remove();
};

// ==========================================
// MODAL KHUNG GIỜ LẤY HÀNG
// ==========================================
window.openPickupTimeModal = () => {
    const slots = genPickupSlots();
    const grouped = {};
    slots.forEach(s => { if (!grouped[s.dayLabel]) grouped[s.dayLabel] = []; grouped[s.dayLabel].push(s); });

    const slotsHTML = Object.entries(grouped).map(([label, arr]) => `
        <div style="margin-bottom:16px">
            <div style="font-size:11px;font-weight:500;color:#aaa;text-transform:uppercase;
                        letter-spacing:.5px;margin-bottom:8px">${label}</div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:7px">
                ${arr.map(s => `
                    <button onclick="selectPickupSlot('${s.date}','${s.time}','${s.dayLabel}')"
                        style="padding:9px 4px;border-radius:8px;font-size:13px;font-weight:500;cursor:pointer;
                               border:1.5px solid ${tempPickup?.date===s.date&&tempPickup?.time===s.time?'var(--primary)':'#eee'};
                               background:${tempPickup?.date===s.date&&tempPickup?.time===s.time?'#fff5f5':'white'};
                               color:${tempPickup?.date===s.date&&tempPickup?.time===s.time?'var(--primary)':'#333'}">
                        ${s.time}
                    </button>`).join('')}
            </div>
        </div>`).join('');

    const html = `
        <div id="pickup-modal" onclick="if(event.target===this)closePickupModal()"
            style="position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;
                   align-items:flex-start;justify-content:center;padding-top:60px;z-index:9999;">
            <div style="background:white;border-radius:12px;width:92%;max-width:420px;
                        max-height:82vh;overflow-y:auto;padding:16px;animation:slideDown .3s ease">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
                    <span style="font-size:15px;font-weight:500">Khung giờ lấy hàng</span>
                    <span class="material-symbols-outlined" onclick="closePickupModal()" style="cursor:pointer;color:#aaa">close</span>
                </div>
                <p style="font-size:12px;color:#aaa;margin-bottom:14px">Sớm nhất 1 tiếng kể từ bây giờ</p>
                <div id="pickup-slots">${slotsHTML}</div>
                <button onclick="confirmPickupTime()"
                    style="width:100%;padding:12px;background:var(--primary);color:white;border:none;
                           border-radius:8px;font-size:14px;font-weight:500;cursor:pointer">
                    Xác nhận
                </button>
            </div>
        </div>
        <style>@keyframes slideDown{from{transform:translateY(-30px);opacity:0}to{transform:translateY(0);opacity:1}}</style>
    `;
    const old = document.getElementById('pickup-modal'); if (old) old.remove();
    document.body.insertAdjacentHTML('beforeend', html);
};

function genPickupSlots() {
    const now = new Date();
    const earliest = roundUpTo30(new Date(now.getTime() + 60 * 60 * 1000));
    const result = [];
    for (let day = 0; day <= 1; day++) {
        const base = new Date(now);
        base.setDate(base.getDate() + day);
        base.setHours(0, 0, 0, 0);
        const dateStr = fmtDate(base);
        const dayLabel = day === 0
            ? `Hôm nay, ${base.getDate()}/${base.getMonth() + 1}`
            : `Ngày mai, ${base.getDate()}/${base.getMonth() + 1}`;
        for (let m = 8 * 60; m < 22 * 60; m += 30) {
            const t = new Date(base.getTime() + m * 60 * 1000);
            if (t < earliest) continue;
            result.push({ date: dateStr, time: `${pad(t.getHours())}:${pad(t.getMinutes())}`, dayLabel });
        }
    }
    return result;
}

function roundUpTo30(d) { const i = 30 * 60 * 1000; return new Date(Math.ceil(d.getTime() / i) * i); }
function pad(n) { return String(n).padStart(2, '0'); }
function fmtDate(d) { return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }

window.selectPickupSlot = (date, time, dayLabel) => {
    tempPickup = { date, time, dayLabel };
    // Re-render slot buttons
    const slots = genPickupSlots();
    const grouped = {};
    slots.forEach(s => { if (!grouped[s.dayLabel]) grouped[s.dayLabel] = []; grouped[s.dayLabel].push(s); });
    document.getElementById('pickup-slots').innerHTML = Object.entries(grouped).map(([label, arr]) => `
        <div style="margin-bottom:16px">
            <div style="font-size:11px;font-weight:500;color:#aaa;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">${label}</div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:7px">
                ${arr.map(s => `
                    <button onclick="selectPickupSlot('${s.date}','${s.time}','${s.dayLabel}')"
                        style="padding:9px 4px;border-radius:8px;font-size:13px;font-weight:500;cursor:pointer;
                               border:1.5px solid ${tempPickup?.date===s.date&&tempPickup?.time===s.time?'var(--primary)':'#eee'};
                               background:${tempPickup?.date===s.date&&tempPickup?.time===s.time?'#fff5f5':'white'};
                               color:${tempPickup?.date===s.date&&tempPickup?.time===s.time?'var(--primary)':'#333'}">
                        ${s.time}
                    </button>`).join('')}
            </div>
        </div>`).join('');
};

window.confirmPickupTime = () => {
    if (!tempPickup) { alert('Vui lòng chọn khung giờ!'); return; }
    selectedPickup = tempPickup;
    closePickupModal();
    renderAll();
};

window.closePickupModal = () => { const m = document.getElementById('pickup-modal'); if (m) m.remove(); };

// ==========================================
// MODAL VOUCHER (fetch từ server)
// ==========================================
window.openVoucherModal = async () => {
    const html = `
        <div id="voucher-modal" onclick="if(event.target===this)closeVoucherModal()"
            style="position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;
                   align-items:flex-start;justify-content:center;padding-top:60px;z-index:9999;">
            <div style="background:white;border-radius:12px;width:92%;max-width:420px;
                        max-height:82vh;overflow-y:auto;padding:16px;animation:slideDown .3s ease">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
                    <span style="font-size:15px;font-weight:500">Mã giảm giá</span>
                    <span class="material-symbols-outlined" onclick="closeVoucherModal()" style="cursor:pointer;color:#aaa">close</span>
                </div>
                <div style="display:flex;gap:8px;margin-bottom:14px">
                    <input id="v-manual-input" placeholder="Nhập mã giảm giá"
                        style="flex:1;padding:9px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;outline:none">
                    <button onclick="applyManualVoucher()"
                        style="padding:9px 16px;background:var(--primary);color:white;border:none;
                               border-radius:8px;font-size:13px;cursor:pointer;font-weight:500">
                        Áp dụng
                    </button>
                </div>
                <div id="v-list"><div style="text-align:center;padding:24px;color:#aaa;font-size:14px">Đang tải voucher...</div></div>
                <button onclick="confirmVoucher()"
                    style="width:100%;margin-top:14px;padding:12px;background:var(--primary);color:white;border:none;
                           border-radius:8px;font-size:14px;font-weight:500;cursor:pointer">
                    Xác nhận
                </button>
            </div>
        </div>
        <style>@keyframes slideDown{from{transform:translateY(-30px);opacity:0}to{transform:translateY(0);opacity:1}}</style>
    `;
    document.body.insertAdjacentHTML('beforeend', html);

    if (!vouchers.length) await fetchVouchers();
    else renderVoucherList();
};

async function fetchVouchers() {
    document.getElementById('v-list').innerHTML =
        '<div style="text-align:center;padding:24px;color:#aaa;font-size:14px">Đang tải voucher...</div>';
    try {
        const res = await fetch(`${API_BASE}api/users/vouchers`, {
            method:"GET",
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
        });
        const raw = await res.json();

        // Map từ {code, discountPercent} → format frontend
        vouchers = raw.map(row => ({
            code:        row.code,
            name:        `Giảm ${row.discountPercent}%`,
            percent:     row.discountPercent,
            minOrderAmount: Number(row.minOrderAmount || row.minAmount || 0),
            applyToAll: Boolean(row.applyToAll || row.scope === 'all'),
            // Tính value dựa trên subtotal hiện tại
            value:       Math.round(getCurrentSubtotal() * row.discountPercent / 100),
            description: `Giảm ${row.discountPercent}% cho đơn hàng${Number(row.minOrderAmount || row.minAmount || 0) > 0 ? ` từ ${Number(row.minOrderAmount || row.minAmount || 0).toLocaleString('vi-VN')}đ` : ''}`,
        }));

        tempVoucher = appliedVoucher || null;
        renderVoucherList();
    } catch (e) {
        document.getElementById('v-list').innerHTML =
            '<div style="text-align:center;padding:24px;color:#e00;font-size:14px">Không tải được voucher.</div>';
    }
}
function getCurrentSubtotal() {
    const selectedItems = cartData.filter(p => p.isSelected);
    return selectedItems.reduce((sum, p) => sum + (p.price * getCartItemQuantity(p)), 0);
}
function renderVoucherList() {
    const el = document.getElementById('v-list');
    if (!el) return;

    if (!vouchers.length) {
        el.innerHTML = '<div style="text-align:center;padding:24px;color:#aaa;font-size:14px">Bạn chưa có voucher nào</div>';
        return;
    }

    el.innerHTML = vouchers.map(v => `
        <div onclick="selectTempVoucher('${v.code}')"
            style="border:1.5px solid ${tempVoucher?.code===v.code ? 'var(--primary)' : '#eee'};
                   background:${tempVoucher?.code===v.code ? '#fff5f5' : 'white'};
                   border-radius:8px;padding:12px;margin-bottom:8px;cursor:pointer;
                   display:flex;justify-content:space-between;align-items:center;transition:border-color .15s;opacity:${getCurrentSubtotal() >= (v.minOrderAmount || 0) ? 1 : 0.82}">
            <div>
                <div style="font-size:14px;font-weight:500;color:var(--primary)">
                    Giảm ${v.percent}%
                </div>
                <div style="font-size:12px;color:#888;margin-top:2px">
                    Mã: <strong>${v.code}</strong>
                    &nbsp;·&nbsp;
                    Tiết kiệm ${v.value.toLocaleString('vi-VN')}đ
                </div>
                ${v.minOrderAmount > 0 ? `<div style="font-size:11px;color:#64748b;margin-top:4px">Đơn tối thiểu ${v.minOrderAmount.toLocaleString('vi-VN')}đ</div>` : ''}
                <div style="font-size:11px;color:#64748b;margin-top:2px">${v.applyToAll ? 'Áp dụng cho tất cả người dùng' : 'Áp dụng cho người dùng cụ thể'}</div>
            </div>
            <div style="width:20px;height:20px;border-radius:50%;flex-shrink:0;
                        border:2px solid ${tempVoucher?.code===v.code ? 'var(--primary)' : '#ddd'};
                        background:${tempVoucher?.code===v.code ? 'var(--primary)' : 'white'};
                        box-shadow:${tempVoucher?.code===v.code ? 'inset 0 0 0 3px white' : 'none'}">
            </div>
        </div>`).join('');
}

window.selectTempVoucher = (code) => {
    const found = vouchers.find(v => v.code === code) || null;
    if (found && Number(getCurrentSubtotal()) < Number(found.minOrderAmount || 0)) {
        showToast(`Đơn tối thiểu ${Number(found.minOrderAmount || 0).toLocaleString('vi-VN')}đ mới dùng được mã này`, 'error');
        return;
    }
    tempVoucher = found;
    renderVoucherList();
};

window.applyManualVoucher = async () => {
    const code = document.getElementById('v-manual-input').value.trim().toUpperCase();
    if (!code) return;
    // Tìm trong danh sách đã có
    const found = vouchers.find(v => v.code === code);
    if (found) { selectTempVoucher(code); return; }
    // Hoặc validate từ server
    try {
        // ===== VALIDATE MÃ THỦ CÔNG TỪ SERVER =====
        // const res = await fetch(`${API_BASE}api/vouchers/validate?code=${code}`, { credentials:'include' });
        // const v = await res.json();
        // if (v && v.code) { vouchers.push(v); selectTempVoucher(v.code); }
        // else alert('Mã không hợp lệ hoặc đã hết hạn!');
        alert('Mã không hợp lệ hoặc đã hết hạn!');
    } catch { alert('Lỗi kiểm tra mã!'); }
};

window.confirmVoucher = () => {
    appliedVoucher = tempVoucher || null;
    closeVoucherModal();
    renderAll();
};

window.closeVoucherModal = () => { const m = document.getElementById('voucher-modal'); if (m) m.remove(); };

// ==========================================
// 3. CÁC HÀM XỬ LÝ GIỎ HÀNG
// ==========================================
window.toggleCheck = (productId) => {
    const item = cartData.find(p => p.productId === productId);
    if (item) {
        item.isSelected = !item.isSelected;
        if (!isLoggedInUser()) syncGuestCartStorage();
        renderAll();
    }
};

window.toggleSelectAll = (checked) => {
    cartData = cartData.map(item => ({ ...item, isSelected: checked }));
    if (!isLoggedInUser()) syncGuestCartStorage();
    renderAll();
};

window.updateQty = async (productId, change) => {
    const item = cartData.find(p => p.productId === productId);
    if (!item) return;
    let newQty = Math.max(1, getCartItemQuantity(item) + change);
    if (getCartItemQuantity(item) === newQty) return;
    item.totalQuantity = newQty;
    renderAll();
    if (!isLoggedInUser()) {
        syncGuestCartStorage();
        return;
    }
    try {
        const res = await fetch(`${API_BASE}api/users/cart`, {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                productId,
                quantity: newQty,
                size: getCartItemSize(item),
                note: item.note || ""
            })
        });
        if (!res.ok) console.error('Lỗi cập nhật số lượng');
    } catch (e) { console.error('Lỗi mạng:', e); }
};

// ==========================================
// 4. MODAL XÓA & HÀM TIỆN ÍCH
// ==========================================
window.openDeleteModal = (productId) => {
    document.body.insertAdjacentHTML('beforeend', `
        <div id="custom-modal" style="position:fixed;inset:0;background:rgba(0,0,0,.5);
             display:flex;align-items:center;justify-content:center;z-index:9999;">
            <div class="glass-panel" style="background:white;padding:20px;border-radius:12px;width:300px;text-align:center">
                <span class="material-symbols-outlined" style="font-size:40px;color:red">warning</span>
                <h3 style="margin:10px 0">Xác nhận xoá</h3>
                <p style="color:#666;margin-bottom:20px">Bạn có chắc muốn bỏ món này khỏi giỏ hàng?</p>
                <div style="display:flex;gap:10px;justify-content:center">
                    <button onclick="closeModal()" style="padding:8px 20px;border-radius:8px;border:1px solid #ccc;background:white;cursor:pointer">Không</button>
                    <button onclick="confirmRemoveItem(${productId})" style="padding:8px 20px;border-radius:8px;border:none;background:red;color:white;cursor:pointer">Xoá</button>
                </div>
            </div>
        </div>`);
};

window.confirmRemoveItem = async (productId) => {
    closeModal();
    cartData = cartData.filter(p => p.productId !== productId);
    renderAll();
    if (!isLoggedInUser()) {
        syncGuestCartStorage();
        return;
    }
    try {
        await fetch(`${API_BASE}api/users/cart/deleteInCart?productId=${productId}`, {
            method: 'DELETE', credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e) { console.error('Lỗi xoá:', e); }
};

async function removePurchasedItemsFromCart(productIds) {
    const ids = Array.isArray(productIds) ? productIds.map(id => Number(id)).filter(Boolean) : [];
    if (!ids.length) return;

    if (!isLoggedInUser()) {
        cartData = cartData.filter(item => !ids.includes(Number(item.productId)));
        syncGuestCartStorage();
        renderAll();
        return;
    }

    await Promise.all(ids.map(async (productId) => {
        try {
            await fetch(`${API_BASE}api/users/cart/deleteInCart?productId=${productId}`, {
                method: 'DELETE',
                credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
        });
        } catch (e) {}
    }));

    cartData = cartData.filter(item => !ids.includes(Number(item.productId)));
    renderAll();
}

window.closeModal = () => { const m = document.getElementById('custom-modal'); if (m) m.remove(); };
// ==========================================
// LOGIC NÚT THANH TOÁN NGAY
// ==========================================

// Hàm validate toàn bộ trước khi submit
function validateCheckout() {
    const selectedItems = cartData.filter(p => p.isSelected);

    if (selectedItems.length === 0) {
        return "Vui lòng chọn ít nhất một sản phẩm để thanh toán!";
    }

    if (deliveryMode === 'ship' && !selectedAddr) {
        return "Vui lòng chọn địa chỉ giao hàng!";
    }

    if (deliveryMode === 'takeaway' && !selectedPickup) {
        return "Vui lòng chọn khung giờ lấy hàng!";
    }

    return null; // null = hợp lệ
}

function getCheckoutCustomerInfo() {
    const currentUser = getCurrentUser() || {};
    const fallbackEmail = localStorage.getItem("email") || "";
    const fallbackName = localStorage.getItem("username") || currentUser.name || "";
    return {
        customerName: (currentUser.username || currentUser.name || fallbackName || "Khách hàng").trim(),
        customerEmail: (currentUser.email || fallbackEmail || "").trim(),
        customerPhone: (currentUser.phone || currentUser.phonenum || "").trim()
    };
}

// Hàm tổng hợp payload gửi lên server
function buildOrderPayload() {
    const selectedItems = cartData.filter(p => p.isSelected);
    const subtotal = selectedItems.reduce((sum, p) => sum + (getCartItemPrice(p) * getCartItemQuantity(p)), 0);
    const shippingFee = deliveryMode === 'ship' ? 15000 : 0;

    let discount = 0;
    if (appliedVoucher) {
        if (appliedVoucher.percent) discount = Math.round(subtotal * appliedVoucher.percent / 100);
        else if (appliedVoucher.value) discount = appliedVoucher.value;
    }
    const pointsUsed = getPointDiscount(subtotal, shippingFee, discount);
    const total = subtotal + shippingFee - discount - pointsUsed;
    const customerInfo = getCheckoutCustomerInfo();

    // orderCode phải là số, dùng timestamp giảm bớt cho vừa int Java
    const orderCode = Math.floor(Date.now() / 1000); // Unix timestamp (số nhỏ hơn)

    return {
        orderCode,
        amount: total,
        paymentMethod: payMethod,           // 'cod' | 'bank'
        deliveryMode,                        // 'ship' | 'takeaway'
        customerName: customerInfo.customerName,
        customerEmail: customerInfo.customerEmail,
        customerPhone: customerInfo.customerPhone,
        address: deliveryMode === 'ship' ? selectedAddr : null,
        pickupTime: deliveryMode === 'takeaway' ? selectedPickup : null,
        voucherCode: appliedVoucher?.code || null,
        items: selectedItems.map(p => ({
            productId: p.productId,
            quantity: getCartItemQuantity(p),
            price: getCartItemPrice(p),
            size: getCartItemSize(p),
            note: p.note || null,
            toppings: getCartItemToppings(p)
        })),
        subtotal,
        shippingFee,
        discount,
        pointsUsed,
        total
    };
}

async function requestOrderEmailSync(orderId, action, extra = {}) {
    const endpoints = [
        `api/users/orders/${orderId}/emails/${action}`,
        `api/orders/${orderId}/emails/${action}`,
        `api/orders/${orderId}/notify-email`,
        `api/orders/${orderId}/send-email`
    ];

    for (const endpoint of endpoints) {
        try {
            const res = await fetch(API_BASE + endpoint, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId, action, ...extra })
            });
            if (res.ok) return await res.json().catch(() => null);
        } catch (e) {}
    }
    return null;
}

window.requestOrderEmailSync = requestOrderEmailSync;

// Gắn sự kiện cho nút checkout — dùng event delegation vì nút render động
document.addEventListener('click', async (e) => {
    if (!e.target.closest('.checkout-btn')) return;

    if (!isLoggedInUser()) {
        localStorage.setItem('postLoginRedirect', '#cart');
        showToast('Bạn cần đăng nhập trước khi thanh toán', 'error');
        window.location.href = getLoginPagePath();
        return;
    }

    const errorMsg = validateCheckout();
    if (errorMsg) {
        showToast(errorMsg, 'error');
        return;
    }

    const payload = buildOrderPayload();
    const purchasedProductIds = cartData.filter(p => p.isSelected).map(p => Number(p.productId));
    const btn = e.target.closest('.checkout-btn');
    btn.disabled = true;
    btn.textContent = 'Đang xử lý...';

    try {
        // =========================================================
        // BƯỚC 1: LUÔN TẠO ĐƠN HÀNG TRONG DATABASE TRƯỚC (Cho cả COD & BANK)
        // =========================================================
        const resOrder = await fetch(API_BASE + 'api/users/orders', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!resOrder.ok) {
            const err = await resOrder.json().catch(() => ({}));
            throw new Error(err.message || 'Lỗi tạo đơn hàng');
        }

        const order = await resOrder.json();
        const realOrderCode = order.orderCode; // ID thật từ MySQL (Ví dụ: 125)
        if (typeof order.currentPoint === 'number') {
            userPointBalance = order.currentPoint;
            localStorage.setItem("userPointBalance", String(userPointBalance));
        }

        await removePurchasedItemsFromCart(purchasedProductIds);

        console.log(">>> Đã lưu DB, Mã đơn hàng thật là:", realOrderCode);
        requestOrderEmailSync(realOrderCode, 'created', {
            customerEmail: payload.customerEmail,
            customerName: payload.customerName,
            amount: payload.total
        });

        // =========================================================
        // BƯỚC 2: XỬ LÝ THEO PHƯƠNG THỨC THANH TOÁN
        // =========================================================
        if (payMethod === 'cod') {
            // COD: Xong rồi, hiện luôn trang thành công
            showSuccessPage({
                orderCode: realOrderCode,
                method: 'cod'
            });

        } else {
            // BANK: Gọi API PayOS để lấy QR bằng mã đơn hàng thật
            const resPay = await fetch(API_BASE + 'api/payment/createQrCode', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderCode: realOrderCode, // GỬI ID THẬT CỦA MYSQL SANG PAYOS
                    amount: payload.total
                    // Đã bỏ `orderDetail: payload` đi vì đơn hàng đã được lưu trên DB rồi,
                    // API createQrCode ở backend giờ chỉ cần ID và Amount để báo cho PayOS thôi.
                })
            });

            if (!resPay.ok) throw new Error('Lỗi tạo link thanh toán');

            const payosData = await resPay.json();

            showSuccessPage({
                orderCode: realOrderCode, // WebSocket giờ sẽ lắng nghe đúng ID thật
                method: 'bank',
                qrCode: payosData.qrCode,
                checkoutUrl: payosData.checkoutUrl,
                amount: payload.total
            });
        }

    } catch (err) {
        console.error('Lỗi checkout:', err);
        showToast(err.message || 'Đã có lỗi xảy ra, vui lòng thử lại!', 'error');
        btn.disabled = false;
        btn.textContent = 'Thanh toán ngay';
    }
});
// ==========================================
// TRANG CẢM ƠN (render đè lên contentMain)
// ==========================================
// ==========================================
// TRANG CẢM ƠN (Đã sửa lỗi ReferenceError)
// ==========================================
function showSuccessPage({ orderCode, method, qrCode, checkoutUrl, amount, description }) {
    const contentMain = document.getElementById('contentMain');
    if (!contentMain) return;

    // Reset giỏ hàng nếu biến tồn tại
    if (typeof cartData !== 'undefined') cartData = [];

    const isBank = method === 'bank';
    const formattedAmount = amount ? Number(amount).toLocaleString('vi-VN') + 'đ' : '';

    // logic xử lý Nội dung chuyển khoản (Description)
    // Ưu tiên description từ PayOS trả về vì nó chứa mã prefix (ví dụ: CSTW...) để nổ Webhook
    const displayDescription = description || `DH${orderCode}`;

    // XỬ LÝ QR CODE: Chuyển chuỗi EMVCo (000201...) thành hình ảnh
    let qrImageUrl = '';
    if (isBank && qrCode) {
        if (qrCode.startsWith('http')) {
            qrImageUrl = qrCode; // Nếu là link ảnh sẵn thì dùng luôn
        } else {
            // Nếu là chuỗi văn bản, dùng API trung gian để vẽ QR
            qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrCode)}`;
        }
    }

    const qrSection = isBank ? `
        <div style="margin:20px auto;max-width:340px;text-align:center">
            ${qrImageUrl ? `
            <div style="padding:16px;background:#fff;border-radius:16px;border:1px solid #eee;display:inline-block;margin-bottom:12px;box-shadow:0 4px 10px rgba(0,0,0,0.05)">
                <img src="${qrImageUrl}" alt="QR thanh toán PayOS" style="width:250px;height:250px;display:block">
                <p style="font-size:11px;color:#666;margin-top:10px">Mở App Ngân hàng để quét mã VietQR</p>
            </div>` : `
            <div style="padding:20px; color:#ef4444; border:1px dashed #f87171; border-radius:12px; margin-bottom:12px">
                ⚠️ Không thể tạo mã QR tự động.
            </div>`}

            <div style="background:#f9f9f9;border-radius:12px;padding:14px 18px;text-align:left;font-size:13px;line-height:1.8;border:1px dashed #ddd;margin-bottom:14px">
                <div style="display:flex;justify-content:space-between">
                    <span>💳 Mã đơn hàng:</span>
                    <strong>#${orderCode}</strong>
                </div>
                <div style="display:flex;justify-content:space-between">
                    <span>💰 Số tiền:</span>
                    <strong style="color:#e74c3c">${formattedAmount}</strong>
                </div>
                <div style="background:#fff4f2;margin:8px -4px 0;padding:8px;border-radius:8px;border:1px solid #ffedd5">
                    <span style="display:block;font-size:11px;color:#9a3412;margin-bottom:2px">📝 Nội dung chuyển khoản:</span>
                    <strong style="color:#c2410c;font-size:14px;word-break:break-all">${displayDescription}</strong>
                </div>
                <p style="font-size:11px;color:#ef4444;margin-top:6px;line-height:1.4">
                    * Vui lòng giữ nguyên nội dung để hệ thống xác nhận tự động.
                </p>
            </div>

            ${checkoutUrl ? `
            <a href="${checkoutUrl}" target="_blank"
                style="display:inline-block;padding:12px 24px;background:#0ea5e9;color:#fff;border-radius:10px;font-size:14px;font-weight:600;text-decoration:none;transition:all 0.2s;box-shadow:0 4px 6px -1px rgba(14, 165, 233, 0.3)">
                Mở trang thanh toán PayOS ↗
            </a>` : ''}
        </div>
    ` : `
        <div style="background:#f0fdf4;border-radius:12px;padding:14px 18px;max-width:340px;margin:16px auto;font-size:13px;color:#166534;border:1px solid #bbf7d0;line-height:1.5">
            <div style="display:flex;gap:8px;align-items:flex-start">
                <span class="material-symbols-outlined" style="font-size:20px">info</span>
                <span>Nhân viên sẽ liên hệ xác nhận đơn trong 15–30 phút. Vui lòng giữ điện thoại.</span>
            </div>
        </div>
    `;

    contentMain.innerHTML = `
        <div style="min-height:80vh;display:flex;align-items:center;justify-content:center;padding:40px 16px">
            <div style="text-align:center;max-width:480px;width:100%">
                <div style="width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,#22c55e,#16a34a);
                            display:flex;align-items:center;justify-content:center;margin:0 auto 20px;
                            box-shadow:0 8px 24px rgba(34,197,94,.3)">
                    <span class="material-symbols-outlined" style="font-size:36px;color:#fff">check</span>
                </div>
                <h2 style="font-size:25px;font-weight:600;margin:0 0 8px;color:#1a1a1a">Cảm ơn bạn đã đặt hàng! </h2>
                <p style="font-size:17px;color:#666;margin:0 0 4px">Mã đơn hàng: <strong style="color:#0ea5e9">#${orderCode}</strong></p>
                <p style="font-size:16px;color:#999;margin:0 0 20px">
                    ${isBank ? '💳 Hình thức: Chuyển khoản ngân hàng' : ' Hình thức: Thanh toán khi nhận hàng'}
                </p>
                ${qrSection}
                <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:16px">
                    <button onclick="window.location.hash='#home'"
                        style="padding:12px 24px;background:#0ea5e9;color:#fff;border:none;border-radius:12px;font-size:16px;font-weight:500;cursor:pointer">
                         Về trang chủ
                    </button>
<button onclick="openOrderDetailModal('${orderCode}')"
   style="padding:12px 24px;background:#fff;color:#0ea5e9;border:1.5px solid #0ea5e9;border-radius:12px;font-size:16px;font-weight:500;cursor:pointer">
     Xem đơn hàng
</button>
                </div>
            </div>
        </div>
    `;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    connectWebSocket(orderCode);
}
// ==========================================
// TOAST THÔNG BÁO NHẸ (thay alert)
// ==========================================
function showToast(message, type = 'info') {
    const old = document.getElementById('__toast');
    if (old) old.remove();

    const colors = {
        error:   { bg: '#fee2e2', color: '#991b1b', icon: 'error' },
        success: { bg: '#dcfce7', color: '#166534', icon: 'check_circle' },
        info:    { bg: '#e0f2fe', color: '#075985', icon: 'info' }
    };
    const c = colors[type] || colors.info;

    const toast = document.createElement('div');
    toast.id = '__toast';
    toast.innerHTML = `
        <span class="material-symbols-outlined" style="font-size:18px;flex-shrink:0">${c.icon}</span>
        <span style="flex:1;font-size:13px">${message}</span>
        <span class="material-symbols-outlined" onclick="this.parentElement.remove()"
              style="font-size:16px;cursor:pointer;opacity:.6">close</span>
    `;
    Object.assign(toast.style, {
        position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
        background: c.bg, color: c.color,
        padding: '12px 16px', borderRadius: '12px',
        display: 'flex', alignItems: 'center', gap: '10px',
        boxShadow: '0 4px 20px rgba(0,0,0,.15)',
        zIndex: '99999', maxWidth: '90vw', minWidth: '260px',
        animation: 'toastIn .3s ease'
    });

    // Inject keyframes nếu chưa có
    if (!document.getElementById('__toastStyle')) {
        const s = document.createElement('style');
        s.id = '__toastStyle';
        s.textContent = `@keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(12px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`;
        document.head.appendChild(s);
    }

    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}
function connectWebSocket(orderCode) {
    console.log("🚀 Khởi động nạp thư viện WebSocket...");

    const loadScript = (src) => {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) return resolve();
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    };

    Promise.all([
        loadScript("https://cdn.jsdelivr.net/npm/sockjs-client@1/dist/sockjs.min.js"),
        loadScript("https://cdnjs.cloudflare.com/ajax/libs/stomp.js/2.3.3/stomp.min.js")
    ]).then(() => {
        console.log("✅ Đã nạp thư viện thành công. Đang kết nối...");

        try {
            // Dùng đường dẫn link tunnel của ông
            const socket = new SockJS(`${API_BASE}nghiaws`);
            const stompClient = Stomp.over(socket);

            // Tắt debug rác console
            stompClient.debug = null;

            stompClient.connect({}, function (frame) {
                console.log('✅ Đã kết nối STOMP! Đang đợi tín hiệu đơn hàng: ' + orderCode);

                stompClient.subscribe('/noticeonly/payment/' + orderCode, function (message) {
                    console.log("🔥 Nhận tin nhắn từ server:", message.body);
                    if (message.body === "successful") {
                        showPaymentSuccessModal();
                    }
                });
            }, function(err) {
                console.error("❌ Lỗi STOMP:", err);
            });
        } catch (e) {
            console.error("❌ Lỗi khởi tạo WebSocket:", e);
        }
    });
}
// ==============================================
// MODAL CHI TIẾT ĐƠN HÀNG (dạng popup)
// ==============================================
function normalizeOrderStatus(status) {
    return String(status || '').toLowerCase();
}

function isCompletedOrderStatus(status) {
    const key = normalizeOrderStatus(status);
    return key === 'delivered' || key === 'completed';
}

function getOrderStatusMeta(status) {
    const map = {
        pending: { text: 'Chờ xác nhận', icon: '⏳', color: '#f90' },
        waiting_payment: { text: 'Chờ thanh toán', icon: '💳', color: '#f90' },
        confirmed: { text: 'Đã xác nhận', icon: '✅', color: '#0a0' },
        delivered: { text: 'Đã giao hàng', icon: '📦', color: '#0a0' },
        completed: { text: 'Hoàn thành', icon: '✅', color: '#0a0' },
        cancelled: { text: 'Đã hủy', icon: '❌', color: '#d00' }
    };
    return map[normalizeOrderStatus(status)] || map.pending;
}

async function loadMyReviewedProductIds() {
    try {
        const res = await fetch(`${API_BASE}api/users/reviews/mine`, {
            method: 'GET',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
        });
        if (!res.ok) return myReviewedProductIds;
        const ids = await res.json();
        myReviewedProductIds = new Set((ids || []).map(Number));
    } catch (e) {
        console.error('Không tải được trạng thái đánh giá:', e);
    }
    return myReviewedProductIds;
}

function reviewFormHtml(orderId, productId) {
    if (myReviewedProductIds.has(Number(productId))) {
        return `
          <div style="margin-top:10px;background:#ecfdf5;border:1px solid #bbf7d0;border-radius:10px;padding:10px;color:#15803d;font-size:13px;font-weight:700;" onclick="event.stopPropagation()">
            Bạn đã đánh giá sản phẩm này.
          </div>`;
    }
    return `
      <div id="review-box-${orderId}-${productId}" style="margin-top:10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:10px;" onclick="event.stopPropagation()">
        <div style="font-size:13px;font-weight:700;margin-bottom:8px;color:#0f172a;">Đánh giá sản phẩm</div>
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;">
          <select id="review-rating-${orderId}-${productId}" style="border:1px solid #cbd5e1;border-radius:8px;padding:7px;background:white;">
            <option value="5">5 sao</option>
            <option value="4">4 sao</option>
            <option value="3">3 sao</option>
            <option value="2">2 sao</option>
            <option value="1">1 sao</option>
          </select>
          <button onclick="submitProductReview(${orderId}, ${productId})" style="border:0;border-radius:8px;background:#0ea5e9;color:white;font-weight:700;padding:8px 12px;cursor:pointer;">Gửi</button>
        </div>
        <textarea id="review-content-${orderId}-${productId}" placeholder="Chia sẻ cảm nhận của bạn..." style="width:100%;min-height:66px;border:1px solid #cbd5e1;border-radius:8px;padding:8px;resize:vertical;font-size:13px;"></textarea>
      </div>`;
}

async function submitProductReview(orderId, productId) {
    const ratingEl = document.getElementById(`review-rating-${orderId}-${productId}`);
    const contentEl = document.getElementById(`review-content-${orderId}-${productId}`);
    const box = document.getElementById(`review-box-${orderId}-${productId}`);
    const rating = Number(ratingEl?.value || 5);
    const content = contentEl?.value.trim() || '';

    try {
        const res = await fetch(`${API_BASE}api/users/orders/${orderId}/reviews`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId, rating, content })
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || err.error || `Lỗi ${res.status}`);
        }
        if (box) {
            box.innerHTML = '<div style="color:#15803d;font-weight:700;font-size:13px;">Cảm ơn bạn đã đánh giá sản phẩm.</div>';
        }
        myReviewedProductIds.add(Number(productId));
        showUserNotificationToast({ title: 'Đã gửi đánh giá', content: 'Đánh giá của bạn đã được ghi nhận.' });
    } catch (error) {
        if (box) {
            const old = box.querySelector('.review-error');
            if (old) old.remove();
            box.insertAdjacentHTML('beforeend', `<div class="review-error" style="color:#dc2626;font-size:12px;margin-top:6px;">${error.message}</div>`);
        } else {
            alert(error.message);
        }
    }
}

function openOrderDetailModal(orderId) {
    // Xóa modal cũ nếu đang mở
    const old = document.getElementById('order-detail-modal');
    if (old) old.remove();

    // Tạo modal
    const modal = document.createElement('div');
    modal.id = 'order-detail-modal';
    Object.assign(modal.style, {
      position: 'fixed', inset: '0',
      background: 'rgba(0,0,0,0.5)',
      zIndex: '10000',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      paddingTop: '40px'
    });

    // Khung nội dung
    modal.innerHTML = `
      <div style="background:#f5f5f5; width:100%; max-width:600px; max-height:85vh;
                  border-radius:16px; overflow:hidden; display:flex; flex-direction:column;
                  box-shadow:0 20px 40px rgba(0,0,0,0.3);">
        <!-- Header -->
        <div style="background:#fff; padding:16px 20px; border-bottom:1px solid #eee;
                    display:flex; align-items:center; justify-content:space-between; flex-shrink:0;">
          <span style="font-size:18px; font-weight:600;">
            Chi tiết đơn hàng #<span id="modal-order-code">${orderId}</span>
          </span>
          <button onclick="closeOrderDetailModal()"
                  style="background:none; border:none; font-size:24px; cursor:pointer; color:#888;">
            ✕
          </button>
        </div>
        <!-- Nội dung cuộn -->
        <div id="modal-order-content" style="flex:1; overflow-y:auto; padding:16px;">
          <div style="text-align:center; padding:40px; color:#aaa;">Đang tải…</div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Đóng khi click ra ngoài
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeOrderDetailModal();
    });

    // Tải dữ liệu
    fetchOrderDetailForModal(orderId);
  }

  function closeOrderDetailModal() {
    const modal = document.getElementById('order-detail-modal');
    if (modal) modal.remove();
  }

  async function fetchOrderDetailForModal(orderId) {
    const content = document.getElementById('modal-order-content');
    if (!content) return;

    content.innerHTML = '<div style="text-align:center;padding:40px;color:#aaa;">Đang tải…</div>';

    try {
      // Dùng đúng API của bạn: /api/users/orders/{id}
      const res = await fetch(`${API_BASE}api/users/orders/${orderId}`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Lỗi ${res.status}`);
      }

      const order = await res.json();
      await loadMyReviewedProductIds();
      renderOrderDetailInModal(order);
    } catch (error) {
      content.innerHTML = `<div style="text-align:center;padding:40px;color:#e00;">
        ${error.message}
      </div>`;
    }
  }
  function renderOrderDetailInModal(order) {
    const content = document.getElementById('modal-order-content');
    if (!content) return;

    const status = order.status || 'PENDING';
    const s = getOrderStatusMeta(status);
    const canReview = isCompletedOrderStatus(status);

    // ── Địa chỉ ──
    const addr = order.address || {};
    const addrBlock = addr.address
      ? `<div style="background:#fff; border-radius:12px; padding:16px; margin-bottom:12px;">
           <div style="display:flex; gap:10px;">
             <span style="font-size:22px;">📍</span>
             <div style="flex:1;">
               <div style="font-weight:600; font-size:14px;">
                 ${addr.name || 'Khách hàng'} – ${addr.phone || ''}
               </div>
               <div style="color:#555; font-size:13px; margin-top:2px;">
                 ${addr.address}
               </div>
             </div>
           </div>
         </div>`
      : `<div style="background:#fff; border-radius:12px; padding:16px; margin-bottom:12px; color:#888;">
           Chưa có địa chỉ
         </div>`;

    // ── Sản phẩm: lấy từ order.orderDetails ──
    const orderDetails = order.orderDetails || [];
    let itemsHtml = '';
    let subtotal = 0;

    if (orderDetails.length > 0) {
      itemsHtml = orderDetails.map(item => {
        // Lấy thông tin sản phẩm từ item.product
        const product = item.product || {};
        const name = product.productName || 'Sản phẩm';
        const price = item.price || 0;  // item.price là giá trong order_detail
        const qty = item.quantity || 1;
        const note = item.note || '';
        const toppings = item.toppings || '';
        subtotal += price * qty;

        // Ảnh sản phẩm: lấy ảnh chính (isMain=true) hoặc ảnh đầu tiên
        let img = '';
        const images = product.images || [];
        if (images.length > 0) {
          const mainImg = images.find(i => i.isMain === true);
          img = mainImg ? mainImg.imageUrl : images[0].imageUrl;
        }
        if (img && !img.startsWith('http') && !img.startsWith('data:')) {
          img = API_BASE + img;
        }

        return `
          <div style="display:flex; gap:12px; padding:12px 0; border-bottom:1px solid #f0f0f0; align-items:center;">
            <img src="${img || 'https://via.placeholder.com/80'}"
                 alt="${name}" style="width:70px; height:70px; border-radius:8px; object-fit:cover;"
                 onerror="this.src='https://via.placeholder.com/80'">
            <div style="flex:1;">
              <div style="font-size:14px; font-weight:500;">${name}</div>
              <div style="font-size:13px; color:#888;">${price.toLocaleString('vi-VN')}₫</div>
              ${note ? `<div style="font-size:12px;color:#0f766e;margin-top:4px;">Ghi chú: ${escapeHtml(note)}</div>` : ''}
              ${toppings ? `<div style="font-size:12px;color:#0369a1;margin-top:4px;">Topping: ${escapeHtml(toppings)}</div>` : ''}
            </div>
            <div style="font-weight:600; min-width:50px; text-align:right;">x${qty}</div>
          </div>
          ${canReview && product.productId ? reviewFormHtml(order.orderId, product.productId) : ''}`;
      }).join('');
    } else {
      itemsHtml = '<p style="color:#888;">Không có sản phẩm</p>';
    }

    // ── Tổng tiền ──
    const discount = order.discount || 0;
    const total = order.amount || subtotal;

    // Phương thức giao hàng
    const orderMethod = order.orderMethod || '';
    let methodText = 'Không rõ';
    if (orderMethod === 'delivery' || orderMethod === 'DELIVERY') methodText = 'Giao hàng tận nơi';
    else if (orderMethod === 'takeaway' || orderMethod === 'TAKEAWAY') methodText = 'Nhận tại cửa hàng';

    // Phương thức thanh toán
    let paymentMethod = 'Không rõ';
    if (order.payments && order.payments.length > 0) {
      paymentMethod = order.payments[0].paymentMethod || 'Không rõ';
    } else if (order.paymentMethod) {
      paymentMethod = order.paymentMethod;
    }

    content.innerHTML = `
      <!-- Trạng thái -->
      <div style="background:#fff; border-radius:12px; padding:16px; margin-bottom:12px;
                  display:flex; align-items:center; gap:12px;">
        <span style="font-size:28px;">${s.icon}</span>
        <div>
          <div style="font-weight:600; font-size:15px; color:${s.color};">${s.text}</div>
          <div style="font-size:12px; color:#888;">Mã đơn: #${order.orderId}</div>
        </div>
      </div>

      ${addrBlock}

      <!-- Sản phẩm -->
      <div style="background:#fff; border-radius:12px; padding:16px; margin-bottom:12px;">
        <h4 style="margin:0 0 12px; font-size:14px;">Sản phẩm đã đặt</h4>
        ${itemsHtml}
      </div>

      <!-- Tổng tiền -->
      <div style="background:#fff; border-radius:12px; padding:16px; margin-bottom:12px;">
        <div style="display:flex; justify-content:space-between; font-size:13px; color:#555; margin-bottom:6px;">
          <span>Tạm tính</span><span>${subtotal.toLocaleString('vi-VN')}₫</span>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:13px; color:#e74c3c; margin-bottom:6px;">
          <span>Giảm giá</span><span>-${discount.toLocaleString('vi-VN')}₫</span>
        </div>
        <div style="display:flex; justify-content:space-between; font-weight:700; font-size:15px;
                    padding-top:8px; border-top:1px solid #eee;">
          <span>Tổng thanh toán</span><span style="color:#ee4d2d;">${total.toLocaleString('vi-VN')}₫</span>
        </div>
      </div>

      <!-- Phương thức -->
      <div style="background:#fff; border-radius:12px; padding:16px;">
        <div style="display:flex; gap:10px; margin-bottom:8px;">
          <span style="font-size:18px;">💳</span>
          <div>
            <div style="font-weight:600; font-size:13px;">Phương thức thanh toán</div>
            <div style="color:#555; font-size:13px;">${paymentMethod}</div>
          </div>
        </div>
        <div style="display:flex; gap:10px;">
          <span style="font-size:18px;">🚚</span>
          <div>
            <div style="font-weight:600; font-size:13px;">Phương thức giao hàng</div>
            <div style="color:#555; font-size:13px;">${methodText}</div>
          </div>
        </div>
      </div>
    `;
  }// Hàm chuyển đến trang chi tiết đơn hàng
function goToOrderDetail(orderId) {
    window.location.hash = `order-detail?id=${orderId}`;
  }

  // Lắng nghe hash change
  window.addEventListener('hashchange', handleHashChange);
  window.addEventListener('load', handleHashChange);

  function handleHashChange() {
    const hash = window.location.hash.substring(1);
    if (hash.startsWith('order-detail')) {
        // Để loadPage tải file HTML và xử lý logic
        loadPage(window.location.hash);
    } else {
        // Ẩn trang chi tiết nếu đang mở
        const page = document.getElementById('order-detail-page');
        if (page) page.style.display = 'none';
        // Có thể hiển thị lại các section khác nếu cần
    }
}

  async function showOrderDetailPage(orderId) {
    const page = document.getElementById('order-detail-page');
    if (!page) {
      // Nếu chưa có HTML, bạn có thể tạo động hoặc báo lỗi
      console.error('#order-detail-page không tồn tại trong DOM. Hãy thêm HTML modal/section.');
      // Fallback: tạo modal đơn giản
      createOrderDetailModal(orderId);
      return;
    }
    page.style.display = 'block';
    // Ẩn các trang khác (giả sử bạn có các section id là home-page, products-page,...)
    document.querySelectorAll('section[id$="-page"]').forEach(s => {
      if (s.id !== 'order-detail-page') s.style.display = 'none';
    });

    // Hiển thị loading
    document.getElementById('detail-order-code').textContent = `#${orderId}`;
    try {
      const response = await fetch(`/api/orders/${orderId}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Không thể tải đơn hàng');
      const order = await response.json();
      renderOrderDetail(order);
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  }

  function renderOrderDetail(order) {
    const s = getOrderStatusMeta(order.status);
    document.getElementById('order-status-icon').textContent = s.icon;
    document.getElementById('order-status-text').textContent = s.text;
    document.getElementById('order-status-text').style.color = s.color;

    const addr = order.address || {};
    document.getElementById('order-address').textContent = addr.address || '...';
    document.getElementById('order-phone-name').textContent = `${addr.name || ''} - ${addr.phone || ''}`;

    const itemsContainer = document.getElementById('order-items-list');
    let subtotal = 0;
    if (order.details && order.details.length > 0) {
      itemsContainer.innerHTML = order.details.map(item => {
        subtotal += item.price * item.quantity;
        return `
          <div class="order-item" style="display:flex; gap:12px; padding:12px 0; border-bottom:1px solid #f0f0f0;">
            <img src="${item.image || 'https://via.placeholder.com/80'}" alt="${item.productName}" style="width:80px; height:80px; border-radius:8px; object-fit:cover;" onerror="this.src='https://via.placeholder.com/80'">
            <div style="flex:1;">
              <div style="font-size:14px; font-weight:500;">${item.productName}</div>
              <div style="font-size:13px; color:#888;">${item.price?.toLocaleString('vi-VN')}₫</div>
            </div>
            <div style="font-weight:600; min-width:60px; text-align:right;">x${item.quantity}</div>
          </div>`;
      }).join('');
    } else {
      itemsContainer.innerHTML = '<p style="color:#888;">Không có sản phẩm</p>';
    }

    document.getElementById('order-subtotal').textContent = `${subtotal.toLocaleString('vi-VN')}₫`;
    const discount = order.discount || 0;
    document.getElementById('order-discount').textContent = `-${discount.toLocaleString('vi-VN')}₫`;
    document.getElementById('order-total').textContent = `${(order.amount || subtotal - discount).toLocaleString('vi-VN')}₫`;

    document.getElementById('order-payment-method').textContent = order.paymentMethod || 'Không rõ';
    document.getElementById('order-delivery-method').textContent = order.method === 'delivery' ? 'Giao hàng tận nơi' : 'Nhận tại cửa hàng';
  }

  // Fallback nếu không có #order-detail-page
  function createOrderDetailModal(orderId) {
    // Tạo modal đơn giản (bạn có thể dùng code modal trước đó)
    const modal = document.createElement('div');
    modal.id = 'orderDetailModal';
    modal.style.cssText = 'display:flex; position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:1000; align-items:center; justify-content:center;';
    modal.innerHTML = `
      <div style="background:#fff; width:90%; max-width:600px; border-radius:16px; padding:24px; max-height:80vh; overflow-y:auto; position:relative;">
        <button onclick="this.parentElement.parentElement.remove()" style="position:absolute; top:10px; right:10px; background:none; border:none; font-size:24px; cursor:pointer;">✕</button>
        <h3>Chi tiết đơn hàng #${orderId}</h3>
        <div id="modal-order-content">Đang tải...</div>
      </div>`;
    document.body.appendChild(modal);
    // Gọi API và render vào #modal-order-content (tương tự)
    // ...
  }
function showPaymentSuccessModal() {
    // 1. Kiểm tra nếu modal chưa tồn tại thì tự tạo mới bằng JS
    let modal = document.getElementById('successModal');

    if (!modal) {
        console.log("🛠 Modal không có sẵn, đang tự khởi tạo...");
        modal = document.createElement('div');
        modal.id = 'successModal';
        // Style cho Modal (Overlay)
        Object.assign(modal.style, {
            position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
            background: 'rgba(255,255,255,0.98)', 'z-index': '100000',
            display: 'none', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', fontFamily: 'Arial, sans-serif'
        });

        modal.innerHTML = `
            <div style="width: 80px; height: 80px; background: #4CAF50; border-radius: 50%;
                        display: flex; align-items: center; justify-content: center;
                        box-shadow: 0 8px 20px rgba(76,175,80,0.3); animation: scaleIn 0.5s ease">
                <span style="color: white; font-size: 50px;">✓</span>
            </div>
            <h2 style="color: #4CAF50; margin-top: 25px; margin-bottom: 10px;">Thanh toán thành công!</h2>
            <p style="color: #666; margin-bottom: 20px;">Cảm ơn bạn đã ủng hộ shop.</p>
            <p id="redirectText" style="font-weight: bold; color: #333; background: #f0f0f0;
                                        padding: 12px 25px; border-radius: 50px; min-width: 250px; text-align: center;">
                Đang quay lại trang chủ trong 5 giây...
            </p>
            <style>
                @keyframes scaleIn { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
            </style>
        `;
        document.body.appendChild(modal);
    }

    // 2. Hiển thị Modal
    modal.style.display = 'flex';

    // 3. Logic đếm ngược và về trang chủ
    let seconds = 5;
    const textElement = document.getElementById('redirectText');

    const interval = setInterval(() => {
        seconds--;
        if (textElement) {
            textElement.innerText = `Đang quay lại trang chủ trong ${seconds} giây...`;
        }

        if (seconds <= 0) {
            clearInterval(interval);
            // Về thẳng trang chủ
            window.location.href = 'index.html';
        }
    }, 1000);
}
// Hàm chuyển sang tab Đơn hàng

async function fetchAndRenderOrderDetail(orderId) {
    // Cập nhật mã đơn hiển thị
    const codeEl = document.getElementById('detail-order-code');
    if (codeEl) codeEl.textContent = `#${orderId}`;

    try {
        const response = await fetch(`${API_BASE}api/users/orders/${orderId}`, {
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) throw new Error('Không thể tải dữ liệu đơn hàng');
        const order = await response.json();
        renderOrderDetailUI(order);
    } catch (error) {
        alert('Lỗi: ' + error.message);
    }
}
function renderOrderDetailUI(order) {
    const s = getOrderStatusMeta(order.status);
    document.getElementById('order-status-icon').textContent = s.icon;
    const textEl = document.getElementById('order-status-text');
    textEl.textContent = s.text;
    textEl.style.color = s.color;

    // Địa chỉ
    const addr = order.address || {};
    document.getElementById('order-address').textContent = addr.address || 'Chưa có địa chỉ';
    document.getElementById('order-phone-name').textContent = `${addr.name || ''} - ${addr.phone || ''}`;

    // Sản phẩm
    const itemsContainer = document.getElementById('order-items-list');
    let subtotal = 0;
    if (order.details && order.details.length > 0) {
        itemsContainer.innerHTML = order.details.map(item => {
            subtotal += item.price * item.quantity;
            return `
                <div style="display:flex; gap:12px; padding:12px 0; border-bottom:1px solid #f0f0f0;">
                    <img src="${item.image || 'https://via.placeholder.com/80'}" alt="${item.productName}" style="width:80px; height:80px; border-radius:8px; object-fit:cover;" onerror="this.src='https://via.placeholder.com/80'">
                    <div style="flex:1;">
                        <div style="font-size:14px; font-weight:500;">${item.productName}</div>
                        <div style="font-size:13px; color:#888;">${item.price?.toLocaleString('vi-VN')}₫</div>
                    </div>
                    <div style="font-weight:600; min-width:60px; text-align:right;">x${item.quantity}</div>
                </div>`;
        }).join('');
    } else {
        itemsContainer.innerHTML = '<p style="color:#888;">Không có sản phẩm</p>';
    }

    // Tổng tiền
    document.getElementById('order-subtotal').textContent = `${subtotal.toLocaleString('vi-VN')}₫`;
    const discount = order.discount || 0;
    document.getElementById('order-discount').textContent = `-${discount.toLocaleString('vi-VN')}₫`;
    const total = order.amount || (subtotal - discount);
    document.getElementById('order-total').textContent = `${total.toLocaleString('vi-VN')}₫`;

    // Phương thức
    document.getElementById('order-payment-method').textContent = order.paymentMethod || 'Không rõ';
    document.getElementById('order-delivery-method').textContent = order.method === 'delivery' ? 'Giao hàng tận nơi' : 'Nhận tại cửa hàng';
}
//load pd
function activateOrderTab(event) {
    document.getElementById('tab-info').style.display = 'none';
    document.getElementById('tab-orders').style.display = 'flex';

    // Cập nhật class active cho menu
    updateActiveMenu(event);

    // Gọi hàm load dữ liệu
    loadOrderHistory();
}

// Hàm chuyển về tab Thông tin cá nhân
function activateInfoTab(event) {
    document.getElementById('tab-info').style.display = 'flex';
    document.getElementById('tab-orders').style.display = 'none';

    // Cập nhật class active cho menu
    updateActiveMenu(event);
}

// Hàm phụ trợ để không phải viết lặp lại việc xóa/thêm class active
function updateActiveMenu(event) {
    document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
    if(event) event.currentTarget.classList.add('active');
}
// Hàm load dữ liệu từ API
async function loadOrderHistory() {
    const container = document.getElementById('order-history-container');
    if (!container) return;

    container.innerHTML = '<div style="text-align: center; padding: 40px;">Đang tải dữ liệu...</div>';

    try {
        // Đảm bảo biến API_BASE đã được định nghĩa trong JS/config.js
        const response = await fetch(`${API_BASE}api/users/orders`, {
            method: 'GET',
            credentials: 'include'
        });

        const orders = await response.json();

        if (!orders || orders.length === 0) {
            container.innerHTML = `<div style="text-align: center; padding: 40px;">Bạn chưa có đơn hàng nào!</div>`;
            return;
        }

        let htmlContent = '';
        orders.forEach(order => {
            // 1. Logic xác định trạng thái
            const statusKey = normalizeOrderStatus(order.status);
            let isCompleted = isCompletedOrderStatus(order.status) || statusKey === 'cancelled';
            let itemClass = isCompleted ? 'completed-order' : '';

            // Các biến trạng thái cũ
            let statusText = 'ĐANG XỬ LÝ';
            let statusColor = '#36bcda';
            let icon = 'local_shipping';
            let iconClass = '';

            if (statusKey === 'confirmed' || statusKey === 'paid') {
                statusText = 'ĐÃ XÁC NHẬN';
                statusColor = 'var(--on-surface-variant)';
                iconClass = 'completed';
                icon = 'check_circle';
            } else if (isCompletedOrderStatus(order.status)) {
                statusText = 'ĐÃ HOÀN THÀNH';
                statusColor = 'var(--on-surface-variant)';
                iconClass = 'completed';
                icon = 'check_circle';
            } else if (statusKey === 'cancelled') {
                statusText = 'ĐÃ HỦY';
                statusColor = '#ff4d4f';
                iconClass = 'completed';
                icon = 'cancel';
            }

            // 2. Lấy hình ảnh (Dùng API_BASE kết hợp với imageUrl)
            const firstProduct = order.orderDetails?.[0]?.product;
            const imgFilename = firstProduct?.images?.[0]?.imageUrl;
            console.log(imgFilename);
            const imgSrc = imgFilename ? `${API_BASE}${imgFilename}` : '../default-tea.png';

            const productDesc = firstProduct?.productName || "Đơn hàng Bingchun";
            const moreItems = order.orderDetails?.length > 1 ? ` và ${order.orderDetails.length - 1} món khác` : "";

            // 3. Render HTML
            htmlContent += `
                <div style="cursor:pointer" class="order-item ${itemClass}" onclick="openOrderDetailModal(${order.orderId})">
                    <div class="order-left">
                        <div class="order-icon-box ${iconClass}">
                            ${imgFilename
                                ? `<img src="${imgSrc}" style="width:100%; height:100%; object-fit:contain; border-radius:1rem;">`
                                : `<span class="material-symbols-outlined">${icon}</span>`
                            }
                        </div>
                        <div class="order-info">
                            <h4>Đơn hàng #BC-${order.orderId}</h4>
                            <p class="order-desc">${productDesc}${moreItems}</p>
                            <p class="order-status" style="color: ${statusColor};">${statusText}</p>
                        </div>
                    </div>
                    <div class="order-right">
                        <p class="order-price">${new Intl.NumberFormat('vi-VN').format(order.amount)}đ</p>
                        <p class="order-date">${new Date(order.orderDate).toLocaleDateString('vi-VN')}</p>
                    </div>
                </div>
            `;
        });

        container.innerHTML = htmlContent;

    } catch (error) {
        console.error(error);
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: red;">Lỗi kết nối server!</div>';
    }
}
