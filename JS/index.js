// ==========================================
// 1. CẤU HÌNH & BIẾN TOÀN CỤC
// ==========================================
// const API_BASE = "https://straticulate-obtusely-ernesto.ngrok-free.dev/";

// const API_BASE = "https://abstracts-difficulty-ecological-especially.trycloudflare.com/";

// import API_BASE from "./config.js";

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
                body: JSON.stringify({ phone: phone, address: address,name:name })
            });

            if (response.ok) {
                window.location.href = "/index.html#home";
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

    } catch (err) {
        console.error("Lỗi trong hàm getDetailAccount:", err);
    }
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
            window.location.href = "HTML/login.html";
        } else {
            const data = await response.json();
            showErrorModal(data.message || "Lỗi khi đăng xuất");     
        }
    } catch (error) {
        console.error("Lỗi kết nối:", error);
        showErrorModal("Không thể kết nối tới server");
    }
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
                            alert("Không tìm thấy dữ liệu địa chỉ hợp lệ.");
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
    const path = url.replace('#', '').replace(/^\//, '').replace('.html', '');
    
    let page = "HTML/home.html"; // Default
    if (path === "account-detail" || path === "accountDetail") page = "HTML/accountDetail.html";
    else if (path === "update-profile") page = "HTML/updateProfile.html";
    else if (path === "menu") page = "HTML/menu.html";
    else if (path === "icecream") page = "HTML/icecream.html";
    else if (path === "cart") page = "HTML/cart.html";
    else if (path === "notification") page = "HTML/notification.html";

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

    if (path.includes("account")) {
        getDetailAccount(); 
        initAvatarUpload();
        
        const overlay = document.getElementById("googleOverlay");
        if (overlay && localStorage.getItem("loginWithGoogle") === "true") {
            overlay.classList.add("active");
        }
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
    
    // Gắn logic menu ở trang chủ/menu lần đầu
    // initDynamicMenu();
});

window.onpopstate = function () {
    const currentPath = window.location.hash || "#home";
    loadPage(currentPath);
};


//load pd
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

    // ── 3. CARD SẢN PHẨM (Đã sửa link ảnh Ngrok) ──
    const createProductCard = (item) => {
        // Nối link ảnh chuẩn
        const fullImageUrl = API_BASE+`${item.imageUrl}`;
        
        return `
<div style="cursor:pointer;box-shadow:inset 0 8px 32px 0 white" class="group relative overflow-hidden rounded-[2.5rem] glass-card p-6 flex flex-col justify-between 
                border-2 border-transparent hover:border-blue-600 hover:shadow-2xl transition-all duration-500">        
                
                <div class="absolute top-2 left-2 w-16 h-16 z-20 
                    pointer-events-none opacity-0 -translate-x-5 group-hover:opacity-100 group-hover:translate-x-0 group-hover:border-blue-600
                    transition-all duration-500 ease-out">
            <img 
                src="../binglogo.png" 
                alt="Badge" 
                class="w-full h-full object-contain filter drop-shadow-lg"
            >
        </div>
                
                <div class="relative w-full aspect-square rounded-3xl overflow-hidden mb-6 bg-gray-100 flex items-center justify-center">
                <img 
                    src="${fullImageUrl}" 
                    alt="${item.productName}" 
                    class="max-w-full max-h-full object-contain transition-transform duration-700"
                >
                <div class="absolute top-0 left-4 w-12 h-12 z-10 
                        opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 
                        transition-all duration-500 ease-out">
               
            </div>
            </div>

            <div>
                <h3 class="text-xl font-bold text-on-surface mb-1">
                    ${item.productName}
                </h3>

                <div style="cursor:pointer" class="flex items-center gap-2 mb-3">
                    ${renderStars(item.rating)} 
                    <span class="text-xs text-on-surface-variant">
                        ${(item.rating).toFixed(1)}
                    </span>
                </div>

                <div class="flex items-center justify-between mt-2">
                    <span class="text-2xl font-black text-primary">
                    ${Number(item.price).toLocaleString('en-US')}đ
                    </span>

                    <!-- SỬA TẠI ĐÂY: id="addCart" -> class="add-to-cart-btn" và thêm data-product-id -->
                    <button 
                        style="background-color:rgba(111, 172, 216)" 
                        class="add-to-cart-btn w-12 h-12 rounded-2xl text-white flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
                        data-product-id="${item.productId}"
                    >
                        <span class="material-symbols-outlined">add_shopping_cart</span>
                    </button>
                </div>
            </div>
        </div>`;
    };

//logic addCart





    // ── 4. LOGIC RENDER (Hỗ trợ "all" và filter) ──
    const renderContent = (categoryId) => {
        renderContainer.style.opacity = 0;
        setTimeout(() => {
            let items = [];
            if (categoryId === "all") {
                items = viewsData;
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

    // Mặc định load "Tất cả" sản phẩm khi vào trang
    renderContent("all");
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

// 2. Hàm CALL API POST để lưu vào giỏ hàng trên Server
// Viết dạng async để xử lý bất đồng bộ
async function addToCartApi(productId) {
    // --- CẤU HÌNH API CỦA BẠN TẠI ĐÂY ---
    
    // Nếu API cần Token đăng nhập, lấy nó từ localStorage hoặc biến global
    const token = localStorage.getItem('userToken'); 

    // Dữ liệu body gửi lên, thường API cần productId và quantity
    const bodyData = {
        productId: Number(productId),
        quantity: 1 
    };

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
    
        // Tăng badge lên 1 vì server chỉ trả "OK", không trả số lượng
        const badge = document.getElementById('cart-count');
        if (badge) {
            const current = parseInt(badge.innerText) || 0;
            updateCartBadgeUI(current + 1);
        }
    
        return text;
    
    } catch (error) {
        console.error('Lỗi API AddToCart:', error);
        alert('Không thể thêm vào giỏ hàng. Vui lòng thử lại.');
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

// 4. Gắn sự kiện Click toàn cục (Event Delegation)
document.addEventListener('click', async (e) => {
    // Tìm xem cú click có nằm trong hoặc là nút add-to-cart không
    const btn = e.target.closest('.add-to-cart-btn'); 
    
    if (btn) {
        e.preventDefault(); // Ngăn chặn hành vi mặc định nếu là thẻ a

        // Lấy ID sản phẩm từ data attribute
        const productId = btn.getAttribute('data-product-id');
        if (!productId) return;

        // Tìm ảnh sản phẩm trong cùng card để làm hiệu ứng bay
        const productCard = btn.closest('.glass-card');
        const productImg = productCard.querySelector('img'); // Lấy ảnh chính đầu tiên
        
        // Tìm icon giỏ hàng trên header làm đích đến (đảm bảo ID này đúng)
        const cartIcon = document.getElementById('cart-icon');

        // CHẠY HIỆU ỨNG BAY TRƯỚC (Cho cảm giác mượt mà, ko đợi API)
        animateFlyToCart(productImg, cartIcon);

        // GỌI API POST ĐỂ LƯU TRÊN SERVER
        await addToCartApi(productId);
    }
});

// --- KHỞI TẠO KHI LOAD TRANG ---
async function initCartBadgeOnLoad() {
    try {

        const response = await fetch(API_BASE+"api/users/cart", {
            method: "GET",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
            }
        });
        console.log(response.status);
        const data = await response.json();
        let dataM=data.quantity;
        console.log(dataM);

        updateCartBadgeUI(dataM);

    } catch (e) {

        console.log(e);

        updateCartBadgeUI(dataM);
    }
}

initCartBadgeOnLoad();
let cartData = [];

document.getElementById("cart-icon").addEventListener("click", async () => {
    await loadCartFromServer();
});

async function loadCartFromServer() {
    try {
        const response = await fetch(API_BASE + "api/users/cart/getDataCart", {
            method: "GET",
            credentials: "include"
        });
        if (!response.ok) throw new Error("Network response was not ok");
        
        const data = await response.json();
        
        // Cực kỳ quan trọng: Thêm thuộc tính isSelected mặc định là true cho mỗi sản phẩm
        cartData = data.map(item => ({ ...item, isSelected: true }));
        
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
    container.innerHTML = "";

    products.forEach(product => {
        // Chú ý: Đã đưa item-checkbox-container VÀO TRONG cart-item
        const productHTML = `
            <div class="cart-item glass-deep" data-id="${product.productId}">
                <div class="item-checkbox-container">
                    <input type="checkbox" class="custom-checkbox" 
                           ${product.isSelected ? 'checked' : ''} 
                           onchange="toggleCheck(${product.productId})" />
                </div>
                
                <img     style="width: 120px; height: 120px; object-fit: contain;" class="item-img" src="${API_BASE}${product.imageUrl}"/>
                <div class="item-details">
                    <h3 class="item-title">${product.productName}</h3>
                    <div class="item-actions">
                        <span class="item-price">${product.price.toLocaleString('vi-VN')}đ</span>
                        <div class="qty-control">
                            <button class="qty-btn" onclick="updateQty(${product.productId}, -1)">
                                <span class="material-symbols-outlined">remove</span>
                            </button>
                            <span class="qty-num">${product.totalQuantity}</span>
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
let vouchers = [], tempVoucher = null, appliedVoucher = null;
let selectedPickup = null, tempPickup = null;

// ==========================================
// 2. RENDER TÓM TẮT ĐƠN HÀNG
// ==========================================
function renderOrderSummary(products) {
    const summaryContainer = document.querySelector('.order-summary');
    if (!summaryContainer) return;

    const selectedItems = products.filter(p => p.isSelected);
    const subtotal = selectedItems.reduce((sum, p) => sum + (p.price * (p.totalQuantity || 0)), 0);
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

    // Tính total SAU khi đã có discount
    const total = subtotal + shippingFee - discount;

    let addrLabel = '<span style="color:#aaa">Chọn địa chỉ giao hàng</span>';
    if (selectedAddr) {
        const short = selectedAddr.address.length > 38
            ? selectedAddr.address.slice(0, 38) + '…' : selectedAddr.address;
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
                🏪 Lấy tại cửa hàng
            </button>
            <button onclick="setDelivery('ship')" style="flex:1;padding:9px;font-size:13px;font-weight:500;border:none;border-left:1.5px solid var(--primary);cursor:pointer;
                background:${deliveryMode==='ship'?'var(--primary)':'white'};
                color:${deliveryMode==='ship'?'white':'var(--primary)'}">
                🚚 Giao hàng
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

        <div class="summary-row"><span>Tạm tính</span><strong>${subtotal.toLocaleString('vi-VN')}đ</strong></div>
        ${deliveryMode === 'ship' ? `
        <div class="summary-row"><span>Phí vận chuyển</span><strong>${shippingFee.toLocaleString('vi-VN')}đ</strong></div>` : ''}
        <div class="summary-row" style="color:red"><span>Giảm giá</span><strong>-${discount.toLocaleString('vi-VN')}đ</strong></div>
        <div class="summary-row total"><span>Tổng cộng</span><span class="total-price">${total.toLocaleString('vi-VN')}đ</span></div>
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
                    Thêm địa chỉ mới
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
                    <button id="save-addr-btn" onclick="saveNewAddress()"
                        style="width:100%;padding:11px;background:var(--primary);color:white;border:none;
                               border-radius:8px;font-size:14px;font-weight:500;cursor:pointer;margin-bottom:10px">
                        Lưu địa chỉ
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
        </style>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
    await fetchAddresses();
    renderAddrList();
};

window.toggleAddForm = () => {
    const form = document.getElementById('add-addr-form');
    const confirmBtn = document.getElementById('addr-confirm-btn');
    const isHidden = form.style.display === 'none';
    form.style.display = isHidden ? 'block' : 'none';
    confirmBtn.style.display = isHidden ? 'none' : 'block';
};

async function fetchAddresses() {
    document.getElementById('addr-list').innerHTML =
        '<div style="text-align:center;padding:24px;color:#aaa;font-size:14px">Đang tải...</div>';
    try {
        // ===== ĐỔI URL NÀY =====
        const res = await fetch(`${API_BASE}api/users/addresses`, {
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
        });
        addresses = await res.json();
        if (!selectedAddr) tempAddr = addresses.find(a => a.isDefault) || addresses[0] || null;
        else tempAddr = selectedAddr;
    } catch (e) {
        document.getElementById('addr-list').innerHTML =
            '<div style="text-align:center;padding:24px;color:#e00;font-size:14px">Không tải được địa chỉ.</div>';
    }
}

function renderAddrList() {
    const el = document.getElementById('addr-list');
    if (!el) return;
    el.innerHTML = addresses.map(a => `
        <div class="addr-item" onclick="selectTempAddr(${a.id})">
            <div class="addr-radio ${tempAddr?.id === a.id ? 'sel' : ''}"></div>
            <div style="flex:1">
                <div style="font-size:14px;font-weight:500">
                    ${a.name}${a.isDefault ? '<span class="badge-def">Mặc định</span>' : ''}
                </div>
                <div style="font-size:12px;color:#888;margin:2px 0">${a.phone}</div>
                <div style="font-size:12px;color:#888">${a.address}</div>
            </div>
        </div>`).join('');
}

window.selectTempAddr = (id) => { tempAddr = addresses.find(a => a.id === id); renderAddrList(); };

window.saveNewAddress = async () => {
    const name  = document.getElementById('f-name').value.trim();
    const phone = document.getElementById('f-phone').value.trim();
    const addr  = document.getElementById('f-addr').value.trim();
    if (!name || !phone || !addr) { alert('Vui lòng điền đầy đủ thông tin!'); return; }

    const btn = document.getElementById('save-addr-btn');
    btn.textContent = 'Đang lưu...'; btn.disabled = true;
    try {
        // ===== ĐỔI URL NÀY =====
        const res = await fetch(`${API_BASE}api/users/addresses`, {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, phone, address: addr })
        });
        const newAddr = await res.json(); // server trả về object địa chỉ vừa tạo có id
        addresses.push(newAddr);
        tempAddr = newAddr;
        document.getElementById('f-name').value = '';
        document.getElementById('f-phone').value = '';
        document.getElementById('f-addr').value = '';
        toggleAddForm();
        renderAddrList();
    } catch (e) {
        alert('Lỗi lưu địa chỉ, vui lòng thử lại!');
    } finally {
        btn.textContent = 'Lưu địa chỉ'; btn.disabled = false;
    }
};

window.confirmAddress = () => {
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
            // Tính value dựa trên subtotal hiện tại
            value:       Math.round(getCurrentSubtotal() * row.discountPercent / 100),
            description: `Giảm ${row.discountPercent}% cho đơn hàng`,
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
    return selectedItems.reduce((sum, p) => sum + (p.price * (p.totalQuantity || 0)), 0);
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
                   display:flex;justify-content:space-between;align-items:center;transition:border-color .15s">
            <div>
                <div style="font-size:14px;font-weight:500;color:var(--primary)">
                    Giảm ${v.percent}%
                </div>
                <div style="font-size:12px;color:#888;margin-top:2px">
                    Mã: <strong>${v.code}</strong> 
                    &nbsp;·&nbsp; 
                    Tiết kiệm ${v.value.toLocaleString('vi-VN')}đ
                </div>
            </div>
            <div style="width:20px;height:20px;border-radius:50%;flex-shrink:0;
                        border:2px solid ${tempVoucher?.code===v.code ? 'var(--primary)' : '#ddd'};
                        background:${tempVoucher?.code===v.code ? 'var(--primary)' : 'white'};
                        box-shadow:${tempVoucher?.code===v.code ? 'inset 0 0 0 3px white' : 'none'}">
            </div>
        </div>`).join('');
}

window.selectTempVoucher = (code) => {
    tempVoucher = vouchers.find(v => v.code === code) || null;
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
    if (item) { item.isSelected = !item.isSelected; renderAll(); }
};

window.updateQty = async (productId, change) => {
    const item = cartData.find(p => p.productId === productId);
    if (!item) return;
    let newQty = Math.max(1, item.totalQuantity + change);
    if (item.totalQuantity === newQty) return;
    item.totalQuantity = newQty;
    renderAll();
    try {
        const res = await fetch(`${API_BASE}api/users/cart`, {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId, quantity: newQty })
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
    try {
        await fetch(`${API_BASE}api/users/cart/deleteInCart?productId=${productId}`, {
            method: 'DELETE', credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e) { console.error('Lỗi xoá:', e); }
};

window.closeModal = () => { const m = document.getElementById('custom-modal'); if (m) m.remove(); };