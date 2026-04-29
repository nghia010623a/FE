// ==========================================
// 1. CẤU HÌNH & BIẾN TOÀN CỤC
// ==========================================
const API_BASE = "https://straticulate-obtusely-ernesto.ngrok-free.dev/";

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
        let dob = document.getElementById("dob")?.value;
        let address = document.getElementById("address")?.value.trim();

        // VALIDATE
        if (!phone) return showErrorModal("Vui lòng nhập số điện thoại");
        let phoneRegex = /^0\d{9}$/;
        if (!phoneRegex.test(phone)) return showErrorModal("Số điện thoại không hợp lệ");
        if (!email) return showErrorModal("Không có email");
        if (!dob) return showErrorModal("Vui lòng chọn ngày sinh");

        let birthDate = new Date(dob);
        let today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        let m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
        if (age < 16) return showErrorModal("Bạn phải đủ 16 tuổi");
        if (!address) return showErrorModal("Vui lòng nhập địa chỉ");

        try {
            const response = await fetch(API_BASE + "api/accounts/me", {
                method: "PATCH",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                    "ngrok-skip-browser-warning": "69420"
                },
                body: JSON.stringify({ phonenum: phone, dob: dob, address: address })
            });

            if (response.ok) {
                window.location.href = "index.html";
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
                "ngrok-skip-browser-warning": "69420"
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
                "ngrok-skip-browser-warning": "69420"
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
                "ngrok-skip-browser-warning": "69420"
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
                fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`)
                    .then(res => res.json())
                    .then(data => {
                        document.getElementById("address").value = data.display_name;
                    });
            }, 
            () => alert("Không lấy được vị trí!")
        );
    } else {
        alert("Trình duyệt không hỗ trợ");
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

function handlePostLoadLogic(path) {
    initReveal();
    setupUserImage();

    if (path.includes("update-profile")) {
        let email = localStorage.getItem("email");
        const emailEl = document.getElementById("email");
        if (emailEl && email) emailEl.value = email;
        initUpdateProfileForm();
        initAvatarUpload();
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
    if (path === "menu" || path === "home" || path === "") {
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
    initDynamicMenu();
});

window.onpopstate = function () {
    const currentPath = window.location.hash || "#home";
    loadPage(currentPath);
};


// ==========================================
// 6. LOGIC XỬ LÝ MENU ĐỘNG (SẢN PHẨM)
// ==========================================
function initDynamicMenu() {
    const renderContainer = document.getElementById("render-container");
    const categoryBtns = document.querySelectorAll(".category-btn");

    if (!renderContainer || categoryBtns.length === 0) return; // Không có trên UI thì bỏ qua

    const viewsData = {
        "best-seller": `
        <div  style="position:absolute;top:120px;background: rgba(255, 255, 255, 0.2);backdrop-filter:blur(10px);border: 1px solid rgba(255, 255, 255, 0.4);padding:70px;border-radius: 40px;">
            <header class="mb-16 text-center md:text-left" style="overflow:hidden">
        <h1 class="text-5xl md:text-7xl font-extrabold font-headline text-on-surface tracking-tighter mb-4">
                        Thưởng Thức <span class="text-primary italic">Sự Thanh Khiết</span>
        </h1>
        <p class="text-on-surface-variant text-lg max-w-2xl leading-relaxed">
                        Từng giọt trà được chiết xuất từ những lá trà thượng hạng, kết hợp cùng lớp kem sữa mượt mà, mang đến trải nghiệm hương vị đầy mê hoặc.
                    </p>
        </header>
    <div class="asymmetric-grid">
        <div class="col-span-12 md:col-span-8 group relative overflow-hidden rounded-3xl glass-card aspect-[16/9] md:aspect-auto md:h-[450px]">
            <img class="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="Kem Tuyết" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCxhn5D3VnVsFxMiKNCVRN6BkGiaYFWPGYCW5AJmfASbU5gt7sLjUOLuZmqwyRV0p3YuqwXKZudSabnYY4-uxP6Bx4XdV9vkE1MES4sIFqcBn8D5JV3dJs0DMGeY2RxfEEUeg9Ttm8qvumwwD0uaHsJtZs_MMCDW7ppmJlOkwkmCPYjisx5F8tlAYNWaCSv24Ydkt2SDvTfwwdSq3M9cIcqtUt092Uukr160UY6ZAxoQchBSK_nO7EN3VmD_zdQuCHzq8h0eiogCrs9"/>
            <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-8 md:p-12">
                <span class="bg-primary/20 backdrop-blur-md text-primary-fixed border border-primary/30 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-4 w-fit">Best Seller</span>
                <h3 class="text-3xl md:text-5xl font-bold text-white mb-2">Kem Tuyết Azure</h3>
                <p class="text-white/80 max-w-md mb-6">Sự kết hợp hoàn hảo giữa sữa tươi nguyên chất và hương vani thượng hạng.</p>
                <div class="flex items-center gap-6">
                    <span class="text-2xl font-bold text-primary-fixed">35.000đ</span>
                    <button class="px-6 py-2 rounded-full bg-white text-on-surface font-bold hover:bg-primary-container transition-colors">Thêm vào giỏ</button>
                </div>
            </div>
        </div>

        <div class="col-span-12 md:col-span-4 group relative overflow-hidden rounded-3xl glass-card min-h-[300px]">
            <img class="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="Trà Hoa Quả" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCFp_walG5A05Y1Yvk-MbBN4O5LruH_He3C3ItOvjgXs1o7WSta45YV14nxmLSuxFzSx4kibGpeT1QARXULb3hhsY1OXWjZh8gjjjR6afqexPuzA0AN4CcqluDLSHJQV9oEl6wED-A5jL4H_IILVxLfKkKNBxhM6YKmqbcemKkt3W7C5sWbdycIK-6UXnbeYYq3WOpYUnJZHCgMqLcfjsU1k0ar0Z2RfGMdZbCt6y-3zkEKXdsz1vEShx---6lYDSJ-gI8t-Pqnk59w"/>
            <div class="absolute inset-0 bg-white/40 group-hover:bg-white/20 transition-colors"></div>
            <div class="absolute bottom-0 left-0 right-0 p-8">
                <h3 class="text-2xl font-bold text-on-surface mb-1">Trà Hoa Quả Nhiệt Đới</h3>
                <p class="text-on-surface-variant font-bold">45.000đ</p>
                <button class="mt-4 w-full py-3 rounded-xl bg-primary text-white font-bold opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-300">Chọn món</button>
            </div>
        </div>

        <div class="col-span-12 md:col-span-4 grid grid-rows-2 gap-6">
            <div class="glass-card rounded-3xl p-6 flex flex-col justify-between hover:bg-white/60 transition-all cursor-pointer">
                <div class="flex justify-between items-start">
                    <div class="w-12 h-12 rounded-2xl bg-cyan-100 flex items-center justify-center text-primary">
                        <span class="material-symbols-outlined">bubble_chart</span>
                    </div>
                    <span class="font-bold text-primary">49.000đ</span>
                </div>
                <div>
                    <h4 class="text-xl font-bold mt-4">Trà Sữa Trân Châu Hoàng Kim</h4>
                    <p class="text-sm text-on-surface-variant line-clamp-2">Hương vị trà sữa truyền thống đậm đà kết hợp trân châu dai giòn.</p>
                </div>
            </div>
            <div class="glass-card rounded-3xl p-6 flex flex-col justify-between hover:bg-white/60 transition-all cursor-pointer">
                <div class="flex justify-between items-start">
                    <div class="w-12 h-12 rounded-2xl bg-cyan-100 flex items-center justify-center text-primary">
                        <span class="material-symbols-outlined">coffee</span>
                    </div>
                    <span class="font-bold text-primary">55.000đ</span>
                </div>
                <div>
                    <h4 class="text-xl font-bold mt-4">Trà Sữa Khoai Môn</h4>
                    <p class="text-sm text-on-surface-variant line-clamp-2">Vị béo bùi đặc trưng từ khoai môn tươi xay nhuyễn cùng sữa.</p>
                </div>
            </div>
        </div>

        <div class="col-span-12 md:col-span-5 relative group overflow-hidden rounded-3xl glass-card h-[400px]">
            <img class="absolute inset-0 w-full h-full object-cover group-hover:rotate-2 group-hover:scale-110 transition-transform duration-700" alt="Kem Cheese" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBRcXBjVLvLU0RiC7quRiU1zsBjuk5iTrj943RRUNeqHKuiYLNzi_NTP5uFD_d53jv0acoEThUwCQJcd_RhE9O-SVLj1SXS82vVKzCvVVSUeLE9hfGmBsxjOGzscUgNxro8umMO16Esye9nvSBl4DLeNWyZwVY4uAPBDD9iK3Qbkw0bQKywJkIS1A9dPaEgWyizokbxrc9LNe0AGiJQzJ2DOu5UoFUOyWlNRIHpGtKHMUShmQ4N6rFpqSzd0e-gHdOtac4S6f-8x8PP"/>
            <div class="absolute inset-0 bg-gradient-to-r from-on-primary-fixed/60 to-transparent p-10 flex flex-col justify-center">
                <h3 class="text-3xl font-bold text-white mb-2">Kem Cheese Cháy</h3>
                <p class="text-white/70 mb-6">Lớp màng kem mặn béo ngậy được khò lửa tạo mùi thơm đặc trưng.</p>
                <span class="text-xl font-bold text-white">52.000đ</span>
            </div>
        </div>

        <div class="col-span-12 md:col-span-3 glass-card rounded-3xl p-8 flex flex-col">
            <h3 class="text-2xl font-bold mb-6 flex items-center gap-2">
                <span class="material-symbols-outlined text-primary">add_circle</span> Toppings
            </h3>
            <ul class="space-y-4 flex-grow">
                <li class="flex justify-between items-center group cursor-pointer">
                    <span class="text-on-surface-variant group-hover:text-primary transition-colors">Trân Châu Đen</span>
                    <span class="text-xs font-bold bg-surface-container-high px-2 py-1 rounded-md">8k</span>
                </li>
                <li class="flex justify-between items-center group cursor-pointer">
                    <span class="text-on-surface-variant group-hover:text-primary transition-colors">Thạch Trái Cây</span>
                    <span class="text-xs font-bold bg-surface-container-high px-2 py-1 rounded-md">10k</span>
                </li>
                <li class="flex justify-between items-center group cursor-pointer">
                    <span class="text-on-surface-variant group-hover:text-primary transition-colors">Kem Cheese</span>
                    <span class="text-xs font-bold bg-surface-container-high px-2 py-1 rounded-md">15k</span>
                </li>
                <li class="flex justify-between items-center group cursor-pointer">
                    <span class="text-on-surface-variant group-hover:text-primary transition-colors">Pudding Trứng</span>
                    <span class="text-xs font-bold bg-surface-container-high px-2 py-1 rounded-md">12k</span>
                </li>
            </ul>
            <div class="mt-6 pt-6 border-t border-outline-variant/20">
                <p class="text-xs text-on-surface-variant italic">Thêm topping để đồ uống của bạn trọn vị hơn!</p>
            </div>
        </div>
    </div>

    <div class="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        <div class="flex flex-col gap-4 group">
            <div class="aspect-square rounded-[2rem] overflow-hidden glass-card relative">
                <img class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="Matcha" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDphMmMrMSyT-XeVhRr_C6xSvhmlJGiyh_TLGeR33svid8VYE0KtTB6Cfa-fwUzIC-Ouu9kyXMd5i6jn11hE66mIiwbgadGSIsY2sjzWpY4-FSSJUQiDy-_uOetfG3ISPHoOCng5bfeb9FjVaRB_XGYaQj0r_pHLiD-3TyaGfB7xhpc6oF2KlWnhb3yI2r5uUrd1Khw68mzzmDOXDu1XOcaivJdkgvArKnCHJIHSxhxLceATnmSXMUL9jysEIDF0a_DLQuvP3sweqNV"/>
                <button class="absolute bottom-4 right-4 w-10 h-10 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center text-primary shadow-lg active:scale-90 transition-transform">
                    <span class="material-symbols-outlined">add</span>
                </button>
            </div>
            <div>
                <h4 class="font-bold text-lg">Matcha Sữa Tươi</h4>
                <p class="text-primary font-bold">48.000đ</p>
            </div>
        </div>
        <div class="flex flex-col gap-4 group">
            <div class="aspect-square rounded-[2rem] overflow-hidden glass-card relative">
                <img class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="Bạc Xỉu" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC4fUybo3dsvjqgOej6FlJNROwybpxs7t-mXQvlCQHHlyT3un5-PeCvZMNAwEOyO0IdJb2fevWAipPFvv1Q2R4oVlDhT4DnIIsOY38agsVkEGL1iy2BcjMgLBtLuDG73YHyokVMD6BSxh2HB3cUzSeObyFA8CSID4TBXWMTh0AAYeMLsA8I9S01JsRUXR4tbhSSdYJQBJup1vL1VtblR1OROhqd384qekA0nlF6pI1qNkWZhxrU7ZNRAyBV0S_lQzRrnZiY_fT_o4Es"/>
                <button class="absolute bottom-4 right-4 w-10 h-10 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center text-primary shadow-lg active:scale-90 transition-transform">
                    <span class="material-symbols-outlined">add</span>
                </button>
            </div>
            <div>
                <h4 class="font-bold text-lg">Bạc Xỉu Kem Muối</h4>
                <p class="text-primary font-bold">39.000đ</p>
            </div>
        </div>
        <div class="flex flex-col gap-4 group">
            <div class="aspect-square rounded-[2rem] overflow-hidden glass-card relative">
                <img class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="Dâu Tây" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBs3hGWtuVdVW-2SNPtOYMmn22J7RMlxhfZeaVjlVjxthFWyby-MAOyWb_P2KL7WICKMA_-Gjps5_hJVvDKFc_HeT3-YVlDxO6wQzVycCJSsGdPqrzAzIo4PrNagNRiCAUFL1dC3GZDcAlqagSXuBlALetvcyBbbujmZ7tQpb1LXpiU-dppRGnCIlhghWOa3KvjRdhzJXI3TsgQx0idHdNReiUwJ6inN_-9Kh8uDn0lY5ipnrIISUuQHEmWt54Xqxy2bXlWrbNA-KUL"/>
                <button class="absolute bottom-4 right-4 w-10 h-10 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center text-primary shadow-lg active:scale-90 transition-transform">
                    <span class="material-symbols-outlined">add</span>
                </button>
            </div>
            <div>
                <h4 class="font-bold text-lg">Dâu Tây Tuyết</h4>
                <p class="text-primary font-bold">55.000đ</p>
            </div>
        </div>
        <div class="flex flex-col gap-4 group">
            <div class="aspect-square rounded-[2rem] overflow-hidden glass-card relative">
                <img class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="Socola" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDZo_S1t7nzzC07E8l--WVYsKNMKICn71IPhW2rYukgRyZrPvzLmcDlmTm3zE3eHgw2jTjPbGzbsjHcKsaabtI5dQFF79SCWfhhywumWXLl-3UjNIVxbQwCvrQKgjBXrX7YfxbfTTnvjUHP0oh22LiApB7IfhITpa3dgfriCLarhsTMgjYkub3xcvZmzZcA2nRl1KHKUFxeu-rmLxzQVPpXPtQvmV4RCaSKgBsh2q6K-Miydzy2koqWXhTdJ9s6QbjmNR89TF5nsZyQ"/>
                <button class="absolute bottom-4 right-4 w-10 h-10 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center text-primary shadow-lg active:scale-90 transition-transform">
                    <span class="material-symbols-outlined">add</span>
                </button>
            </div>
            <div>
                <h4 class="font-bold text-lg">Socola Đá Xay</h4>
                <p class="text-primary font-bold">45.000đ</p>
            </div>
        </div>
    </div>
</div>
</div>
<script src="../JS/index.js"></script>


        `,
        "ice-cream":`
       <!DOCTYPE html>

<style>
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
            display: inline-block;
            line-height: 1;
            vertical-align: middle;
        }
        
        .bubble {
            position: absolute;
            background: linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 100%);
            border: 1px solid rgba(255,255,255,0.2);
            border-radius: 50%;
            z-index: 0;
            pointer-events: none;
        }

        .glass-card {
            background: rgba(255, 255, 255, 0.4);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.3);
            box-shadow: 0 20px 40px rgba(0, 105, 119, 0.06);
        }

        .primary-gradient {
            background: linear-gradient(135deg, #006977 0%, #50e1f9 100%);
        }

        body {
            background-color: #f6fafe;
            overflow-x: hidden;
        }

        .no-scrollbar::-webkit-scrollbar {
            display: none;
        }

        .stagger-load {
            opacity: 0;
            transform: translateY(20px);
        }
    </style>
<body class="font-body text-on-surface">
<!-- Floating Background Bubbles -->
<div class="fixed inset-0 overflow-hidden -z-10 pointer-events-none">
<div class="bubble w-64 h-64 -top-10 -left-10 opacity-40"></div>
<div class="bubble w-32 h-32 top-1/4 right-10 opacity-20"></div>
<div class="bubble w-96 h-96 -bottom-20 left-1/3 opacity-30"></div>
<div class="bubble w-48 h-48 top-1/2 -right-10 opacity-20"></div>
</div>

<main class="pt-32 pb-20 px-6 max-w-7xl mx-auto relative">
<!-- Hero Section -->
<header class="mb-16">
<h1 class="font-headline text-6xl md:text-7xl font-extrabold text-on-surface mb-4 tracking-tight leading-none">
                Thế Giới <br/>
<span class="text-primary italic">Kem Tuyết.</span>
</h1>
<p class="text-on-surface-variant max-w-xl text-lg leading-relaxed">
                Từng lớp kem mịn màng như mây, tan chảy ngay đầu lưỡi. Khám phá bộ sưu tập kem nghệ thuật được infusion từ nguồn nguyên liệu tươi mới nhất.
            </p>
</header>
<!-- Menu Filter (Asymmetric Pill) -->
<div class="flex gap-3 mb-12 overflow-x-auto no-scrollbar pb-4">
<button class="px-8 py-3 rounded-full primary-gradient text-white font-bold shadow-lg shadow-primary/20">Tất cả</button>
<button class="px-8 py-3 rounded-full glass-card text-on-surface hover:bg-white/60 transition-all">Kem Ốc Quế</button>
<button class="px-8 py-3 rounded-full glass-card text-on-surface hover:bg-white/60 transition-all">Kem Ly</button>
<button class="px-8 py-3 rounded-full glass-card text-on-surface hover:bg-white/60 transition-all">Món Đặc Biệt</button>
</div>
<!-- Bento Grid Products -->
<div class="grid grid-cols-1 md:grid-cols-12 gap-6">
<!-- Large Featured Card -->
<div class="md:col-span-8 group">
<div class="glass-card rounded-[2.5rem] overflow-hidden flex flex-col md:flex-row h-full relative">
<div class="md:w-1/2 p-10 flex flex-col justify-between">
<div>
<span class="text-xs font-bold uppercase tracking-widest text-primary mb-2 block">Bán chạy nhất</span>
<h2 class="text-4xl font-headline font-bold mb-4 text-on-surface">Vani Thượng Hạng</h2>
<p class="text-on-surface-variant text-sm mb-6">Chiết xuất từ những quả vani vùng Madagascar, mang hương thơm nồng nàn và hậu vị kem béo ngậy.</p>
</div>
<div class="flex items-center justify-between">
<span class="text-3xl font-bold text-primary">25.000đ</span>
<button class="primary-gradient text-white p-4 rounded-2xl flex items-center gap-2 group-hover:scale-105 transition-transform duration-500">
<span class="material-symbols-outlined" data-icon="add_shopping_cart">add_shopping_cart</span>
<span class="font-bold">Thêm vào giỏ</span>
</button>
</div>
</div>
<div class="md:w-1/2 relative min-h-[300px]">
<img alt="Premium Vanilla Ice Cream" class="absolute inset-0 w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700" data-alt="Close-up of a perfectly scooped vanilla ice cream cone with soft swirls and elegant lighting against a soft pastel blue background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCuIPKgX82KydZdxkXBPPIOn80Adq63dO1wkzdbI4H-wn4UxWeDTe-EKygiZw81nhVb6HwfvNiCT3Bm4CKeSiLjBStiGftCrxzlgS7DRiqB5To1ujk-rxcMYJrPNAxh9fEwkYzZiWLw2C8HMs682TVf2CwhenWi3qFHuX4AViXS7MRk-ggiQA0ncGooUfMHyrTq-D-82Q_FOHuHVlj0SuGZ5doNFUWB5HBaAoFbromnOUl20uNt5WnQ6GLYvCEm_STYHpI4TxhfU0DU"/>
</div>
</div>
</div>
<!-- Small Square Card -->
<div class="md:col-span-4 group">
<div class="glass-card rounded-[2.5rem] p-8 h-full flex flex-col justify-between">
<div class="relative w-full aspect-square rounded-3xl overflow-hidden mb-6">
<img alt="Matcha Ice Cream" class="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700" data-alt="Artisanal matcha green tea ice cream scoop in a ceramic bowl with bamboo whisk in background, soft morning light" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC_c4jcNg9cjqMSqdGWlGz2QVdzywZSIjrkSYVtB3h8qY3iqnzFlu2zximvOkWKEisjBuEABsib6vhhNiBTB-XhQxyOEO1crkbJwxup6uCruRrK9XCrkbJRt0Htj9vU3Wayj3hhCdK9jv7hM_FfHcIfSkGZN3Kp3Mq3c-7rqWZ6NGV5EMPO-gTQSxZZLyu8Iptlv_kqpT2rNALD6PqfA3VY3J0ZaZ009bkj8zpcOLp-lzjLpCYCFHmM0kr4jqA_dLx6UXawHeAxX5pH"/>
</div>
<div>
<h3 class="text-2xl font-headline font-bold mb-2">Trà Xanh Zen</h3>
<div class="flex items-center justify-between">
<span class="text-xl font-bold text-primary-dim">28.000đ</span>
<button class="bg-white/50 p-3 rounded-xl border border-white/40 hover:bg-white transition-colors">
<span class="material-symbols-outlined text-primary" data-icon="add">add</span>
</button>
</div>
</div>
</div>
</div>
<!-- Standard Cards -->
<div class="md:col-span-4 group">
<div class="glass-card rounded-[2.5rem] p-8 h-full flex flex-col justify-between">
<div class="relative w-full aspect-square rounded-3xl overflow-hidden mb-6">
<img alt="Chocolate Ice Cream" class="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700" data-alt="Rich decadent dark chocolate ice cream scoops with chocolate shavings and cocoa powder, moody studio lighting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC-0VMX44fUwx5lW083i4mFw_v2ca7cfWuVXmzkZmBPIcgOA-jNEiU5iqimSmuvyheXoFjMsiTLbWqztfQbjuUwD0583Rsl1xTooD1oAmkv_qKjYAPpYKmR-cR_mwtLmfWHLgB7Y8_lYaGamRC1XXkVchxao897rg4LkmEFIs47npcUBhsbtuuKAKcOm4QjsScji0mEr_pGPD1LFoBt5IdL_XjaCp8G2JWoZ8qlpIR1nVB5qNLdBvGDzIeor1-ngkP4A0fAJvSLKkRR"/>
</div>
<div>
<h3 class="text-2xl font-headline font-bold mb-2">Socola Đậm Đà</h3>
<div class="flex items-center justify-between">
<span class="text-xl font-bold text-primary-dim">25.000đ</span>
<button class="bg-white/50 p-3 rounded-xl border border-white/40 hover:bg-white transition-colors">
<span class="material-symbols-outlined text-primary" data-icon="add">add</span>
</button>
</div>
</div>
</div>
</div>
<div class="md:col-span-4 group">
<div class="glass-card rounded-[2.5rem] p-8 h-full flex flex-col justify-between">
<div class="relative w-full aspect-square rounded-3xl overflow-hidden mb-6">
<img alt="Strawberry Ice Cream" class="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700" data-alt="Bright pink strawberry ice cream cone with fresh strawberries in focus and sunny park bokeh background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB5N9ys_c58F9rVO-iVUFeI_nO7dmG-9RBv28y8Fji6S129d_6WIXqfUgmnFUw8_pCwq92oOQAiig2Rg1NBi4dZHsKg6G6QDbiUCJWzjd7f2MWbU0bsz4i6eGWeDciUdVHWigdA14-_PZ_qd7prnFuXCmJxGb4Rqy8p4wugeM_WiHJgiWaNzC0B46q4zk5ieoww80q_s0Fd2rPNOGdA-Dra5RyYMD8Y3XcmxXxL1pM2PPjc9hmSNc0KYjT2nwM4r1SIlBFrPYYQnP7H"/>
</div>
<div>
<h3 class="text-2xl font-headline font-bold mb-2">Dâu Tây Nhiệt Đới</h3>
<div class="flex items-center justify-between">
<span class="text-xl font-bold text-primary-dim">30.000đ</span>
<button class="bg-white/50 p-3 rounded-xl border border-white/40 hover:bg-white transition-colors">
<span class="material-symbols-outlined text-primary" data-icon="add">add</span>
</button>
</div>
</div>
</div>
</div>
<div class="md:col-span-4 group">
<div class="glass-card rounded-[2.5rem] p-8 h-full flex flex-col justify-between">
<div class="relative w-full aspect-square rounded-3xl overflow-hidden mb-6">
<img alt="Mint Chocolate Ice Cream" class="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700" data-alt="Refreshing mint chocolate chip ice cream in a waffle cone with fresh mint leaves decoration, cool lighting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCb3yUgowrBLsGr_5VVsvy3Avn3spCH73znHeRflRbR-ie6MGCNg0TLyGea3a9SOwETr6o0vWiHv20g3-fj84WL1Ecgs3LjpcBuDJ__w2jvPn-QlgmaUhzcXXwcV5pitZKabRpAifqoKrE_RciwlAgWJl3BhmCumzRmrM-zC6gyB4Q_dPF32SeC39ioblM27IZ9IVTpnh2W2f6FZurNfPn0guy72YuCKOgyoZXc44iQr0Fda4_nAUShB9HxBiHC2GXmdR7zA2IsEXk_"/>
</div>
<div>
<h3 class="text-2xl font-headline font-bold mb-2">Bạc Hà Chip</h3>
<div class="flex items-center justify-between">
<span class="text-xl font-bold text-primary-dim">28.000đ</span>
<button class="bg-white/50 p-3 rounded-xl border border-white/40 hover:bg-white transition-colors">
<span class="material-symbols-outlined text-primary" data-icon="add">add</span>
</button>
</div>
</div>
</div>
</div>
</div>
<!-- Special Promotion Section -->
<section class="mt-20 glass-card rounded-[3rem] p-12 overflow-hidden relative">
<div class="relative z-10 grid md:grid-cols-2 items-center gap-10">
<div>
<h2 class="font-headline text-5xl font-extrabold mb-6">Tự Tạo Hương Vị Riêng</h2>
<p class="text-on-surface-variant mb-8 text-lg">Hơn 20 loại topping từ trái cây tươi, vụn bánh quy đến sốt caramel muối đang chờ bạn kết hợp. Sáng tạo không giới hạn với Bingchun.</p>
<a class="inline-flex items-center gap-3 px-10 py-4 primary-gradient text-white rounded-full font-bold shadow-xl shadow-primary/30 hover:scale-105 transition-transform" href="#">
                        Thử Ngay 
                        <span class="material-symbols-outlined" data-icon="arrow_forward">arrow_forward</span>
</a>
</div>
<div class="grid grid-cols-2 gap-4">
<div class="h-64 rounded-3xl overflow-hidden bg-white/20 backdrop-blur-sm">
<img alt="Toppings" class="w-full h-full object-cover" data-alt="Assorted ice cream toppings including sprinkles, nuts, and chocolate chips in colorful bowls" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAmr-4MvszKPzTCnCOVoW1k1VyqXDX7ZsjDQgFbsXN2_cRFLe8hJmXPhsrlqjRGKn2SaZTkLadu2jpkcIQM7RsKeXA-t5RutoosnBSTxIXGVCz_HYjpRda9XLuUYQsqhQYDODQ0sincHXeiaZ1Z_9bgQWj8nSEXrH2Ekwq0OZ_smc1oiNWzABG3-6dm3vXTlHkBaBIddI8CtBDpO0y54ejSA8igQQUYvzTTHxvS1Dd3hSCo6J0AryzFGatsEtOoIhzPvQrzkwL5aQp6"/>
</div>
<div class="h-64 rounded-3xl overflow-hidden mt-8 bg-white/20 backdrop-blur-sm">
<img alt="Sauce pouring" class="w-full h-full object-cover" data-alt="Luscious caramel sauce being poured over a vanilla ice cream scoop with sea salt crystals" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDeXBgp0XDc6tJOFiwsWcF-DnUfZVn_FHYBYSdwxpLLetr-wb80jE1_8lbOBCTG8c0a3QgEDjeVwMNaA7Jb_s6S9jb14RUqryPoM-LUgJmLUiA9nfdUPe3vKYHz9gNyOnkulkmu02TwAqR_knBsqW7WsM7gRYOi4XRxoVefYNEPpAeNh1rSxOMlS3OaXqrKslNCRufHytXVnq8gDP8sDtZZ1JtikPY8ZSCgyXVODqjUtX4ahrlRjHpBeg63BAlQuRI6Nb_-v7jOxHxN"/>
</div>
</div>
</div>
<!-- Decorative circle -->
<div class="absolute -right-20 -bottom-20 w-80 h-80 bg-primary/10 rounded-full blur-3xl"></div>
</section>
</main>

<!-- Mobile Bottom NavBar (Suppressed on Web) -->
<div class="md:hidden fixed bottom-0 left-0 w-full bg-white/40 backdrop-blur-xl h-16 flex justify-around items-center z-50">
<a class="flex flex-col items-center text-primary" href="#">
<span class="material-symbols-outlined" data-icon="home" style="font-variation-settings: 'FILL' 1;">home</span>
</a>
<a class="flex flex-col items-center text-slate-400" href="#">
<span class="material-symbols-outlined" data-icon="icecream">icecream</span>
</a>
<a class="flex flex-col items-center text-slate-400" href="#">
<span class="material-symbols-outlined" data-icon="shopping_basket">shopping_basket</span>
</a>
<a class="flex flex-col items-center text-slate-400" href="#">
<span class="material-symbols-outlined" data-icon="person">person</span>
</a>
</div>

`,

"fruit-tea":``
    };

    const renderContent = (categoryId) => {
        renderContainer.style.opacity = 0;
        setTimeout(() => {
            renderContainer.innerHTML = viewsData[categoryId] || "<p>Chưa có dữ liệu cho mục này.</p>";
            renderContainer.style.opacity = 1;
        }, 200); 
    };

    const updateActiveButton = (clickedBtn) => {
        categoryBtns.forEach(btn => {
            btn.style.background = "";
            btn.classList.add("glass-card", "text-on-surface");
            btn.classList.remove("text-white");
        });
        clickedBtn.style.background = "linear-gradient(to right,orange,rgb(229, 82, 38))";
        clickedBtn.classList.remove("glass-card", "text-on-surface");
        clickedBtn.classList.add("text-white");
    };

    categoryBtns.forEach(btn => {
        // Tránh gắn sự kiện nhiều lần (nếu chạy lại qua router)
        btn.replaceWith(btn.cloneNode(true));
    });

    const newCategoryBtns = document.querySelectorAll(".category-btn");
    newCategoryBtns.forEach(btn => {
        btn.addEventListener("click", (e) => {
            const categoryId = e.currentTarget.getAttribute("data-category");
            updateActiveButton(e.currentTarget);
            renderContent(categoryId);
        });
    });

    // Render nội dung mặc định
    renderContent("best-seller");
}