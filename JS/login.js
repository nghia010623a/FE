// const API_BASE = "https://abstracts-difficulty-ecological-especially.trycloudflare.com/";

function showErrorModal(text) {
    const modal = document.getElementById('errorModal');
    modal.style.display = 'flex';
    const message=document.getElementById("message");
    message.textContent=text;
  }
  
  function closeErrorModal() {
    const modal = document.getElementById('errorModal');
    modal.style.display = 'none';
  }
document.getElementById("loginwithgoogle").addEventListener("click", function () {
    // URL này là mặc định của Spring Security
    window.location.href = API_BASE+"oauth2/authorization/google?prompt=select_account";
    });

const GUEST_CART_KEY = 'bingchun_guest_cart';

function getGuestCart() {
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    const cart = raw ? JSON.parse(raw) : [];
    return Array.isArray(cart) ? cart : [];
  } catch (e) {
    return [];
  }
}

function getLoginRedirectUrl(target) {
  if (!target) return null;
  if (target.startsWith('http')) return target;
  if (target.startsWith('#')) return `../index.html${target}`;
  return target;
}

async function mergeGuestCartIntoServer() {
  const guestCart = getGuestCart();
  if (!guestCart.length) return;

  const grouped = new Map();
  for (const rawItem of guestCart) {
    const item = {
      productId: Number(rawItem.productId),
      totalQuantity: Number(rawItem.totalQuantity || rawItem.quantity || 1),
      size: (rawItem.size || 'M').toUpperCase() === 'L' ? 'L' : 'M',
      note: rawItem.note || ''
    };
    const key = `${item.productId}|${item.size}|${item.note}`;
    const current = grouped.get(key) || item;
    current.totalQuantity += grouped.has(key) ? item.totalQuantity : 0;
    grouped.set(key, current);
  }

  for (const item of grouped.values()) {
    await fetch(API_BASE + "api/users/cart", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: item.productId,
        quantity: item.totalQuantity,
        size: item.size,
        note: item.note
      })
    }).catch(() => null);
  }

  localStorage.removeItem(GUEST_CART_KEY);
}

async function loadCaptcha() {
  const img = document.getElementById("captchaImage");
  const idInput = document.getElementById("captchaId");
  const answerInput = document.getElementById("captchaAnswer");
  if (!img || !idInput) return;

  try {
    img.removeAttribute("src");
    img.alt = "Đang tải captcha";
    const response = await fetch(API_BASE + "api/captcha", {
      method: "GET",
      credentials: "include",
      headers: { "Content-Type": "application/json" }
    });
    if (!response.ok) throw new Error("Không tải được captcha");
    const data = await response.json();
    idInput.value = data.captchaId || "";
    img.src = data.image || "";
    img.alt = "Mã captcha";
    if (answerInput) answerInput.value = "";
  } catch (error) {
    console.error("Lỗi captcha:", error);
    idInput.value = "";
    img.alt = "Không tải được captcha";
    showErrorModal("Không tải được mã captcha, vui lòng thử lại");
  }
}

async function checkLogin()
{

  let identifier = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const captchaId = document.getElementById("captchaId")?.value.trim();
  const captchaAnswer = document.getElementById("captchaAnswer")?.value.trim();
 

  // kiểm tra rỗng
  if (!identifier || !password || !captchaAnswer) {
    showErrorModal("Vui lòng nhập đầy đủ thông tin");
    return;
  }
  if (!captchaId) {
    showErrorModal("Mã captcha chưa sẵn sàng, vui lòng tải lại mã");
    await loadCaptcha();
    return;
  }


    try {

        const response = await fetch(API_BASE+"api/checkLogin", {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
                // "ngrok-skip-browser-warning": "69420"
            },
            body: JSON.stringify({ identifier, password, captchaId, captchaAnswer})
        });
  
        if (response.ok) {


        
            const data = await response.json();   


            if(data.role=="ADMIN")
            {
            localStorage.setItem("imageUser", data.imageUser);
            localStorage.setItem("loginWithGoogle", data.loginWithGoogle);
            localStorage.setItem("isUpdateProfile", data.isUpdateProfile);
            localStorage.setItem("email", data.email);
            localStorage.setItem("currentUser", JSON.stringify(data.currentUser));
            await mergeGuestCartIntoServer();
              localStorage.removeItem('postLoginRedirect');
              window.location.href="admin.html";

            }
            else{

            localStorage.setItem("imageUser", data.imageUser);
            localStorage.setItem("loginWithGoogle", data.loginWithGoogle);
            localStorage.setItem("isUpdateProfile", data.isUpdateProfile);
            localStorage.setItem("email", data.email);
            localStorage.setItem("currentUser", JSON.stringify(data.currentUser));
            await mergeGuestCartIntoServer();

                    const redirectTarget = localStorage.getItem('postLoginRedirect');
                    if (redirectTarget) {
                      localStorage.removeItem('postLoginRedirect');
                      window.location.href = getLoginRedirectUrl(redirectTarget);
                    } else {
                      localStorage.removeItem('postLoginRedirect');
                      window.location.href="loadingscreen.html";
                    }



                    
            }}
        else if (response.status === 401) {
  
            const text = await response.json();
            console.log(text.message);
  
            showErrorModal(text.message);
            await loadCaptcha();
  
        }
        else { const text = await response.json();
          console.log(text.message);

          showErrorModal(text.message);
          await loadCaptcha();
        }
  
    } catch (error) {
  
        console.error("Lỗi kết nối:", error);
        showErrorModal("Không thể kết nối tới server");
        await loadCaptcha();
  
    }
  }


var loginLink = document.getElementById('signup-link');
  var mainCard = document.getElementById('main-card');

  // Kiểm tra nếu phần tử tồn tại thì mới gán sự kiện
  if (loginLink && mainCard) {
    loginLink.onclick = function(event) {
      // 1. Ngăn chuyển trang ngay lập tức
      event.preventDefault();
      
      // Lấy link đích
      var destination = this.href;

      // 2. Thêm class hiệu ứng biến mất cho card
      mainCard.className += " fade-out";

      // 3. Đợi 0.5 giây (500ms) rồi mới nhảy trang
      setTimeout(function() {
        window.location.href = destination;
      }, 500);
    };
  }
  document.addEventListener("DOMContentLoaded", function () {
    loadCaptcha();

    const refreshBtn = document.getElementById("refreshCaptchaBtn");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", loadCaptcha);
    }

    document.getElementById("loginForm").addEventListener("submit", function(e) {
  
      e.preventDefault(); // chặn form reload
  
      checkLogin(); // gọi hàm login
  
    });
  
  });
