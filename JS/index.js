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
            'https://straticulate-obtusely-ernesto.ngrok-free.dev/api/users/products',
            {
                method: "GET",
                headers: {
                    "ngrok-skip-browser-warning": "true", // Bỏ qua màn hình cảnh báo
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
        const fullImageUrl = `https://straticulate-obtusely-ernesto.ngrok-free.dev/${item.imageUrl}`;
        
        return `
<div style="cursor:pointer" class="group relative overflow-hidden rounded-[2.5rem] glass-card p-6 flex flex-col justify-between 
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
                        data-product-id="${item.id}"
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
        productId: productId,
        quantity: 1 // Mặc định add 1 món
    };

    try {
        console.log(`Đang gọi API add sản phẩm ${productId} to server...`);
        
        const response =await fetch("https://straticulate-obtusely-ernesto.ngrok-free.dev/api/users/cart", {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
                "ngrok-skip-browser-warning": "69420"
            },
            body: JSON.stringify(bodyData)
        });

        if (!response.ok) {
            // Xử lý lỗi từ server (vd: hết hàng, unauth...)
            const errorData = await response.json();
            throw new Error(errorData.message || 'Lỗi khi thêm vào giỏ hàng server');
        }

        const result = await response.json();
        console.log('API Response thành công:', result);
        
        // --- CẬP NHẬT BADGE GIỎ HÀNG ---
        // Sau khi POST thành công, server thường trả về tổng số lượng mới trong giỏ
        // Bạn dùng nó để cập nhật UI. Giả sử server trả về field result.totalQuantity
        if (result.totalQuantity !== undefined) {
            updateCartBadgeUI(result.totalQuantity);
        } else {
            // Nếu API ko trả về tổng số, bạn có thể phải call 1 API GET khác để lấy count
            // Hoặc tạm thời tăng UI lên 1 (optimistic update)
            console.warn('API không trả về tổng số lượng, không thể cập nhật badge chuẩn.');
        }

        return result;

    } catch (error) {
        console.error('Lỗi API AddToCart:', error);
        alert('Không thể thêm vào giỏ hàng. Vui lòng thử lại.');
        // Bạn có thể xử lý rollback UI nếu dùng optimistic update tại đây
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
// Khi load trang, bạn nên call 1 API GET để lấy tổng số lượng giỏ hàng hiện tại trên server và update badge
async function initCartBadgeOnLoad() {
    try {

        const response = await fetch("https://straticulate-obtusely-ernesto.ngrok-free.dev/api/users/cart", {
            method: "GET",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
                "ngrok-skip-browser-warning": "69420"
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