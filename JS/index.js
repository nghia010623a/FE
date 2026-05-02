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

    if (!renderContainer) return;

    // Hàm tạo item cho Grid
    const createProductCard = (item) => `
        <div class="group relative overflow-hidden rounded-[2.5rem] glass-card p-6 flex flex-col justify-between hover:shadow-2xl transition-all duration-500">
            <div class="relative w-full aspect-square rounded-3xl overflow-hidden mb-6">
                <img src="${item.img}" alt="${item.name}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700">
                ${item.isHot ? '<span class="absolute top-4 left-4 bg-primary text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase">Hot</span>' : ''}
            </div>
            <div>
                <h3 class="text-xl font-bold text-on-surface mb-2">${item.name}</h3>
                <div class="flex items-center justify-between mt-4">
                    <span class="text-2xl font-black text-primary">${item.price}</span>
                    <button class="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center hover:scale-110 active:scale-95 transition-all">
                        <span class="material-symbols-outlined">add_shopping_cart</span>
                    </button>
                </div>
            </div>
        </div>
    `;

    const viewsData = {
        "best-seller": [
            { name: "Kem Tuyết Azure", price: "35.000đ", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCxhn5D3VnVsFxMiKNCVRN6BkGiaYFWPGYCW5AJmfASbU5gt7sLjUOLuZmqwyRV0p3YuqwXKZudSabnYY4-uxP6Bx4XdV9vkE1MES4sIFqcBn8D5JV3dJs0DMGeY2RxfEEUeg9Ttm8qvumwwD0uaHsJtZs_MMCDW7ppmJlOkwkmCPYjisx5F8tlAYNWaCSv24Ydkt2SDvTfwwdSq3M9cIcqtUt092Uukr160UY6ZAxoQchBSK_nO7EN3VmD_zdQuCHzq8h0eiogCrs9", isHot: true },
            { name: "Trà Hoa Quả", price: "45.000đ", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCFp_walG5A05Y1Yvk-MbBN4O5LruH_He3C3ItOvjgXs1o7WSta45YV14nxmLSuxFzSx4kibGpeT1QARXULb3hhsY1OXWjZh8gjjjR6afqexPuzA0AN4CcqluDLSHJQV9oEl6wED-A5jL4H_IILVxLfKkKNBxhM6YKmqbcemKkt3W7C5sWbdycIK-6UXnbeYYq3WOpYUnJZHCgMqLcfjsU1k0ar0Z2RfGMdZbCt6y-3zkEKXdsz1vEShx---6lYDSJ-gI8t-Pqnk59w" },
            { name: "Matcha Sữa Tươi", price: "48.000đ", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuDphMmMrMSyT-XeVhRr_C6xSvhmlJGiyh_TLGeR33svid8VYE0KtTB6Cfa-fwUzIC-Ouu9kyXMd5i6jn11hE66mIiwbgadGSIsY2sjzWpY4-FSSJUQiDy-_uOetfG3ISPHoOCng5bfeb9FjVaRB_XGYaQj0r_pHLiD-3TyaGfB7xhpc6oF2KlWnhb3yI2r5uUrd1Khw68mzzmDOXDu1XOcaivJdkgvArKnCHJIHSxhxLceATnmSXMUL9jysEIDF0a_DLQuvP3sweqNV" },
            // Thêm các món khác...
        ],
        "ice-cream": [
            { name: "Vani Thượng Hạng", price: "25.000đ", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCuIPKgX82KydZdxkXBPPIOn80Adq63dO1wkzdbI4H-wn4UxWeDTe-EKygiZw81nhVb6HwfvNiCT3Bm4CKeSiLjBStiGftCrxzlgS7DRiqB5To1ujk-rxcMYJrPNAxh9fEwkYzZiWLw2C8HMs682TVf2CwhenWi3qFHuX4AViXS7MRk-ggiQA0ncGooUfMHyrTq-D-82Q_FOHuHVlj0SuGZ5doNFUWB5HBaAoFbromnOUl20uNt5WnQ6GLYvCEm_STYHpI4TxhfU0DU", isHot: true },
            { name: "Trà Xanh Zen", price: "28.000đ", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuC_c4jcNg9cjqMSqdGWlGz2QVdzywZSIjrkSYVtB3h8qY3iqnzFlu2zximvOkWKEisjBuEABsib6vhhNiBTB-XhQxyOEO1crkbJwxup6uCruRrK9XCrkbJRt0Htj9vU3Wayj3hhCdK9jv7hM_FfHcIfSkGZN3Kp3Mq3c-7rqWZ6NGV5EMPO-gTQSxZZLyu8Iptlv_kqpT2rNALD6PqfA3VY3J0ZaZ009bkj8zpcOLp-lzjLpCYCFHmM0kr4jqA_dLx6UXawHeAxX5pH" },
            { name: "Socola Đậm Đà", price: "25.000đ", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuC-0VMX44fUwx5lW083i4mFw_v2ca7cfWuVXmzkZmBPIcgOA-jNEiU5iqimSmuvyheXoFjMsiTLbWqztfQbjuUwD0583Rsl1xTooD1oAmkv_qKjYAPpYKmR-cR_mwtLmfWHLgB7Y8_lYaGamRC1XXkVchxao897rg4LkmEFIs47npcUBhsbtuuKAKcOm4QjsScji0mEr_pGPD1LFoBt5IdL_XjaCp8G2JWoZ8qlpIR1nVB5qNLdBvGDzIeor1-ngkP4A0fAJvSLKkRR" },
        ]
    };

    const renderContent = (categoryId) => {
        renderContainer.style.opacity = 0;
        setTimeout(() => {
            const items = viewsData[categoryId] || [];
            if (items.length > 0) {
                renderContainer.innerHTML = items.map(item => createProductCard(item)).join('');
            } else {
                renderContainer.innerHTML = "<p class='col-span-full text-center py-20 text-on-surface-variant'>Đang cập nhật sản phẩm...</p>";
            }
            renderContainer.style.opacity = 1;
        }, 200);
    };

    // Logic nút bấm (giữ nguyên của bạn)
    categoryBtns.forEach(btn => {
        btn.addEventListener("click", (e) => {
            const id = e.currentTarget.getAttribute("data-category");
            renderContent(id);
        });
    });

    renderContent("best-seller"); // Mặc định
}
document.addEventListener('click', (e) => {
    if (e.target.closest('.category-btn')) {
      const btn = e.target.closest('.category-btn');
  
      document.querySelectorAll('.category-btn')
        .forEach(b => b.classList.remove('active'));
  
      btn.classList.add('active');
    }
  });