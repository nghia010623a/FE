// ==========================================
// 1. CẤU HÌNH & BIẾN TOÀN CỤC
// ==========================================
const API_BASE = "https://straticulate-obtusely-ernesto.ngrok-free.dev/";

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


function initUpdateProfileForm() {
    const form = document.getElementById("updateProfileForm");
    if (!form) {
        console.log("❌ Không tìm thấy form");
        return;
    }

    form.onsubmit = async function (e) {
        e.preventDefault();

        let phone = document.getElementById("phone")?.value.trim();
        let email = document.getElementById("email")?.value.trim();
        let dob = document.getElementById("dob")?.value;
        let address = document.getElementById("address")?.value.trim();
        let gender = document.querySelector('input[name="gender"]:checked')?.value;

        console.log("🔥 Submit chạy nè");

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

        // 🚀 CALL API
        try {
            const response =   await fetch(API_BASE + "api/accounts/me", {
                method: "PATCH",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                    "ngrok-skip-browser-warning": "69420"
                },
                body: JSON.stringify({

                    phonenum: phone,
                    dob: dob,
                    address: address,
                })
            });

            if (response.ok) {
                window.location.href = "loadingscreen.html";
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
// ==========================================
// 2. CÁC HÀM TIỆN ÍCH (UI & AVATAR)
// ==========================================

// Cập nhật ảnh đại diện người dùng
function setupUserImage() {
    const imageUser = document.getElementById("userImage");
    if (!imageUser) return;

    let imagePath = localStorage.getItem("imageUser");
    
    if (imagePath && imagePath !== "null" && imagePath !== "undefined") {
        // Nếu imagePath đã có sẵn proxy/url thì không cộng thêm API_BASE, 
        // nhưng ở đây giả định server chỉ trả về tên file/path cụ thể.
        imageUser.src = API_BASE + imagePath;
    } else {
        // Ảnh mặc định nếu không có dữ liệu
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

// ==========================================
// 3. MODAL & DỊCH VỤ HỆ THỐNG
// ==========================================


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

// ==========================================
// 4. SPA ROUTER - ĐIỀU HƯỚNG TRANG
// ==========================================

async function loadPage(url) {
    const path = url.replace('#', '').replace(/^\//, '').replace('.html', '');
    console.log("Navigating to:", path);

    let page = "";
    if (path === "index" || path === "" || path === "home") {
        page = "HTML/home.html";
    } else if (path === "account-detail" || path === "accountDetail") {
        page = "HTML/accountDetail.html";
    } 
    else if (path === "update-profile" || path === "update-profilel") {
        page = "HTML/updateProfile.html";
    } else {
        console.error("Path không hợp lệ:", url);
        return;
    }
    try {
        const res = await fetch(page);
        if (!res.ok) throw new Error(`Lỗi fetch: ${res.status}`);
        
        const data = await res.text();
        const contentMain = document.getElementById("contentMain");
        
        if (contentMain) {
            contentMain.innerHTML = data;
            
            // SAU KHI NẠP HTML XONG -> CHẠY LOGIC ĐẶC THÙ
            handlePostLoadLogic(path);
            let email = localStorage.getItem("email");
            const emailEl = document.getElementById("email");
            if (emailEl && email) {
                emailEl.value = email;
            }
            initUpdateProfileForm();
        }
    } catch (error) {
        console.error("Lỗi load trang:", error);
        if (document.getElementById("contentMain")) {
            document.getElementById("contentMain").innerHTML = "<h1>404 - Không tìm thấy nội dung</h1>";
        }
    }
}

// Hàm xử lý logic sau khi DOM đã được nạp
function handlePostLoadLogic(path) {
    initReveal();

    // Sửa điều kiện ở đây để bao gồm cả trang update-profile
    if (path.includes("account") || path.includes("update-profile")) {
        console.log("Khởi tạo logic upload cho:", path);
        initAvatarUpload(); // Gọi hàm này để gán sự kiện change cho input file
        
        // Nếu là trang account, xử lý thêm cái overlay
        if (path.includes("account")) {
            const overlay = document.getElementById("googleOverlay");
            const isGoogleLogin = localStorage.getItem("loginWithGoogle") === "true";
            if (overlay && isGoogleLogin) overlay.classList.add("active");
        }
    }

    setupUserImage();
}

function navigate(event, url) {
    if (event) event.preventDefault();
    history.pushState({}, "", url); 
    loadPage(url);
}

// ==========================================
// 5. KHỞI TẠO HỆ THỐNG
// ==========================================

window.onload = function() {
    let isUpdateProfile = localStorage.getItem("isUpdateProfile");

    if (isUpdateProfile === "false") {
        console.log("User chưa update, đang nạp trang Profile...");
        
        // Gọi loadPage với hash tương ứng (Giả sử bạn định nghĩa #update-profile cho trang này)
        loadPage("#update-profile"); 
        
        // Cập nhật lại hash trên thanh địa chỉ để đồng bộ
        window.location.hash = "#update-profile";
    } else {
        // Nếu đã update, load trang theo hash hiện tại hoặc mặc định là home
        const currentHash = window.location.hash || "#home";
        loadPage(currentHash); 
    }
    // 3. Setup các thành phần giao diện khác
    setupUserImage();
   
    // 4. Gắn sự kiện Logout
    const logoutBtn = document.getElementById("logout");
    if (logoutBtn) {
        logoutBtn.onclick = function(e) {
            e.preventDefault();
            if (typeof logoutService === "function") {
                logoutService();
            }
        };
    }
    let cookie = document.cookie;
    console.log("Cookie:", cookie);
    maintainNav();
};

// Lắng nghe sự kiện bấm nút Back/Forward của trình duyệt
window.onpopstate = function () {
    const currentPath = window.location.hash || "#home";
    loadPage(currentPath);
};
function initAvatarUpload() {
    // Xử lý bộ 1 (Ví dụ trang Update Profile)
    const imageUpload = document.getElementById("imageUpload");
    const imagePreview = document.getElementById("imagePreview");
    
    if (imageUpload && imagePreview) {
        setupSingleUpload(imageUpload, imagePreview);
    }

    // Xử lý bộ 2 (Ví dụ trang Account Detail)
    const imageUpload1 = document.getElementById("imageUpload1");
    const imagePreview1 = document.getElementById("imagePreview1");
    
    if (imageUpload1 && imagePreview1) {
        setupSingleUpload(imageUpload1, imagePreview1);
    }
}

// Hàm bổ trợ để dùng chung logic cho đỡ viết lặp lại
function setupSingleUpload(input, preview) {
    // Load ảnh cũ
    let imagePath = localStorage.getItem("imageUser");
    if (imagePath && imagePath !== "null") {
        preview.src = imagePath.startsWith('http') ? imagePath : (API_BASE + imagePath);
    }

    // Gán sự kiện change
    input.onchange = function() {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                preview.src = e.target.result; // Hiển thị preview
                console.log("Preview updated!");
            };
            reader.readAsDataURL(file);
        }
    };
}
function setupSingleUpload(input, preview) {
    // Load ảnh cũ
    let imagePath = localStorage.getItem("imageUser");
    if (imagePath && imagePath !== "null") {
        preview.src = imagePath.startsWith('http') ? imagePath : (API_BASE + imagePath);
    }

    // Gán sự kiện change
    input.onchange = function() {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                preview.src = e.target.result; // Hiển thị preview
                console.log("Preview updated!");
            };
            reader.readAsDataURL(file);
        }
    };
}
function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(showPosition, showError);
    } else {
        alert("Trình duyệt không hỗ trợ");
    }
}

function showPosition(position) {
    let lat = position.coords.latitude;
    let lon = position.coords.longitude;

    // gọi API lấy địa chỉ (OpenStreetMap)
    fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`)
        .then(res => res.json())
        .then(data => {
            document.getElementById("address").value = data.display_name;
        });
}

function showError(error) {
    alert("Không lấy được vị trí!");
}

function renderLoggedIn() {
    const nav = document.getElementById("navbarUser");

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
            <li class="active"> 
                <a href="#account-detail" onclick="navigate(event, '#account-detail')">
                    Thông tin tài khoản
                </a>
            </li>

            <li>
                <a href="#">
                    <span class="material-symbols-outlined text-base">confirmation_number</span> 
                    Đơn hàng của tôi
                </a>
            </li>

            <hr>

            <li>
                <a href="#" class="logout text-red-500" id="logout">
                    <span class="material-symbols-outlined text-base">logout</span> 
                    Đăng xuất
                </a>
            </li>
        </ul>
    </div>
    `;

    // 🔥 gắn lại event logout
    document.getElementById("logout").onclick = function(e) {
        e.preventDefault();
        logoutService();
    };

    // load avatar lại
    setupUserImage();
}
function renderGuest() {
    const nav = document.getElementById("navbarUser");

    nav.innerHTML = `
        <a href="HTML/login.html" class="btn-login">Đăng nhập</a>
        <a href="HTML/register.html" class="btn-register">Đăng ký</a>
    `;
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

function maintainNav() {
    const status = document.cookie
        .split("; ")
        .find(row => row.startsWith("maintainStatus="))
        ?.split("=")[1];

    if (status === "true") {
        renderLoggedIn();
    } else {
        renderGuest();
    }
}