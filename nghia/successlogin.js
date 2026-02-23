let currentPage = 0;
const pageSize = 10;
let foods=[];
let totalck;
var accessToken=localStorage.getItem("accessToken")
localStorage.removeItem("accessToken");
console.log(accessToken);
document.getElementById("showMenu")
    .addEventListener("click", () => {
        loadPage(0);
    });


// ===============================
// LOAD PAGE
// ===============================
async function loadPage(page) {
    try {
        let response = await fetch(
            `https://bae9-116-96-46-116.ngrok-free.app/test/showMenu?pageNum=${page}&pageSize=${pageSize}`,
            {
                method: "GET",
                headers: {
                    "Authorization": "Bearer " + accessToken
                },
                credentials: "include"
            }
        );

        // 👉 Nếu access token hết hạn
        if (response.status === 401) {

            const refreshRes = await fetch(
                `https://bae9-116-96-46-116.ngrok-free.app/test/refreshAccesstoken`,
                {
                    method: "GET",
                    headers: {
                        "accessToken": accessToken
                    },
                    credentials: "include"
                }
            );

            // ❌ refresh token cũng hết hạn
            if (!refreshRes.ok) {
                throw new Error("Phiên đăng nhập đã hết hạn");
            }

            // ✅ lấy access token mới
            accessToken = await refreshRes.text();
            console.log("AccessToken mới:",accessToken);
            if(accessToken === "refreshToken is not valid")
            {
                window.location.href="login.html";
            }
            else
            {
            // 🔁 GỌI LẠI API CHÍNH
            response = await fetch(
                `https://bae9-116-96-46-116.ngrok-free.app/test/showMenu?pageNum=${page}&pageSize=${pageSize}`,
                {
                    method: "GET",
                    headers: {
                        "Authorization": "Bearer " + accessToken
                    },
                    credentials: "include"
                
        });}
        }

        // ✅ Lúc này response CHẮC CHẮN là 200
        const data = await response.json();
        foods=data[0].content;
        renderMenu(data[0].content);
        currentPage = page;

    } catch (error) {
        console.error("Lỗi:", error.message);

        document.getElementById("food-container").innerHTML = `
            <p style="color:red;">${error.message}</p>
        `;
    }
}



// ===============================
// RENDER
// ===============================
function renderMenu(foods) {

    const container = document.getElementById("food-container");
    container.innerHTML = "";

    foods.forEach(food => {

        const card = document.createElement("div");
        card.className = "food-card";

        card.innerHTML = `
            <h3>${food.nameFood}</h3>

            <div class="food-price">
                ${food.price.toLocaleString()} VNĐ
            </div>

            <div class="food-detail">
                ${food.detail}
            </div>

            <button onclick="orderFood(${food.id})">
                🍽️ Đặt món
            </button>
        `;

        container.appendChild(card);
    });
}


// ===============================
// NÚT PHÂN TRANG
// ===============================
function nextPage() {
    loadPage(currentPage + 1);
}

function prevPage() {
    if (currentPage > 0) {
        loadPage(currentPage - 1);
    }
}
document.getElementById("nextPage").addEventListener("click",nextPage);
document.getElementById("prevPage").addEventListener("click",prevPage);
let cart = [];

function orderFood(foodId) {
    // giả lập: tìm món theo id (bạn đang load từ DB)
    const food = foods.find(f => f.id === foodId);

    if (!food) {
        return;
    }

    cart.push(food);
    document.getElementById("cartCount").innerText = cart.length;

}

    function openCart() {
        const items = document.getElementById("cartItems");
        items.innerHTML = "";
        let total = 0;
    
        cart.forEach(item => {
            total += item.price;
            items.innerHTML += `
                <div>
                    ${item.nameFood} - ${item.price.toLocaleString()} VNĐ
                </div>
            `;
        });
        totalck=total;
        document.getElementById("totalPrice").innerText =
        total.toLocaleString();

    document.getElementById("cartModal").style.display = "block";
}

function closeCart() {
    document.getElementById("cartModal").style.display = "none";
}
function openAccount() {
    document.getElementById("detailAccount").style.display = "block";
}

function closeAccount() {
    document.getElementById("detailAccount").style.display = "none";
}
 async function logout()
{
    const response=await fetch(`https://bae9-116-96-46-116.ngrok-free.app/test/logout`,
    {
      method: "GET"
      ,credentials:"include"
    });
    if(response.ok)
        window.location.href="login.html";
    else throw new Error("fail");
}
function payment() {

    // ===== SỐ TIỀN =====
    const amount = totalck;

    // ===== THÔNG TIN TK =====
    const bankCode = "MB";
    const accountNo = "0787011054";
    const accountName = "NGUYEN DUC NGHIA";
    const message = "Thanh toan don hang";

    // ===== LINK VIETQR CHUẨN =====
    const vietqrImg =
        `https://img.vietqr.io/image/${bankCode}-${accountNo}-compact.png`
        + `?amount=${amount}`
        + `&addInfo=${encodeURIComponent(message)}`
        + `&accountName=${encodeURIComponent(accountName)}`;

    // ===== HIỆN QR =====
    const qrBox = document.getElementById("qrBox");
    qrBox.style.display = "block";

    // ===== GÁN ẢNH QR =====
    document.getElementById("qrcode").innerHTML = `
        <img src="${vietqrImg}" width="260" />
    `;
}