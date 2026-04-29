const urlBE = "https://straticulate-obtusely-ernesto.ngrok-free.dev/";

// Dùng DOMContentLoaded thay cho window.onload để tránh bị ghi đè
document.addEventListener("DOMContentLoaded", function() {
    console.log("DOM đã sẵn sàng, đang khởi tạo dữ liệu...");

    // 1. Kiểm tra Google Overlay
    const loginWithGoogle = localStorage.getItem("loginWithGoogle");
    if (loginWithGoogle === "true") { // So sánh với chuỗi "true"
        const overlay = document.getElementById("googleOverlay");
        if (overlay) overlay.classList.add("active");
    }

    // 2. Khởi tạo ảnh preview từ LocalStorage (nếu có)
    const imagePreview = document.getElementById("imagePreview");
    const savedImage = localStorage.getItem("imageUser");
    if (imagePreview && savedImage && savedImage !== "null" && savedImage !== "[object Object]") {
        imagePreview.src = urlBE + "images/" + savedImage;
    }
    // 3. Gọi API lấy thông tin
    getDetailAccount();
});

async function getDetailAccount() {
    try {
        console.log("Đang gọi API lấy thông tin tài khoản...");
        const res = await fetch(urlBE + "api/users/me", {
            method: "GET",
            credentials: "include", 
            headers: {
                "Content-Type": "application/json",
                "ngrok-skip-browser-warning": "69420" // Bypass cảnh báo ngrok
            },
        });

        if (!res.ok) {
            throw new Error(`Lỗi HTTP: ${res.status}`);
        }

        const data = await res.json();
        console.log("Dữ liệu Account:", data);

        // Gán dữ liệu vào các input (Kiểm tra ID tồn tại để tránh crash)
        const fields = {
            "username": data.username,
            "phone": data.phonenum,
            "email": data.email,
            "dob": data.dob
        };

        for (let id in fields) {
            const el = document.getElementById(id);
            if (el) el.value = fields[id] || "";
        }

        // Cập nhật Avatar từ API
        const imagePreview = document.getElementById("imagePreview");
        if (data.image && imagePreview) {
            imagePreview.src = urlBE + "images/" + data.image;
        }

        // Welcome text
        const welcomeName = document.getElementById("welcomeName");
        if (welcomeName) {
            welcomeName.innerText = data.username || "Bạn";
        }

    } catch (err) {
        console.error("Lỗi trong hàm getDetailAccount:", err);
    }
}

// Logic cho việc chọn ảnh (Preview trực tiếp)
const imageUpload = document.getElementById("imageUpload");
if (imageUpload) {
    imageUpload.addEventListener("change", function() {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const preview = document.getElementById("imagePreview");
                if (preview) preview.src = e.target.result;
            }
            reader.readAsDataURL(file);
        }
    });
}