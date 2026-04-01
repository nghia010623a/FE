document.addEventListener("DOMContentLoaded", () => {
const passwordInput = document.getElementById('password');
const registBt = document.getElementById('regist');
const confirm_password = document.getElementById('confirm-password');
const emailInput = document.getElementById('email');
const signupForm = document.getElementById('signup-form')

  // Regex kiểm tra định dạng email cơ bản
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  emailInput.addEventListener('input', () => {
    const value = emailInput.value.trim();

    if (value === "") {
      // Nếu rỗng: Trả về màu mặc định
      emailInput.style.borderColor = "var(--slate-200)";
      emailInput.style.boxShadow = "none";
    } else if (emailRegex.test(value)) {
      // Nếu hợp lệ: Viền xanh
      emailInput.style.borderColor = "green";
      emailInput.style.boxShadow = "0 0 0 3px rgba(34, 197, 94, 0.2)";
    } else {
      // Nếu không hợp lệ: Viền đỏ
      emailInput.style.borderColor = "var(--error-red)";
      emailInput.style.boxShadow = "0 0 0 3px rgba(228, 58, 46, 0.2)";
    }
  });
// Các phần tử DOM cần thay đổi trạng thái
const requirements = {
  length: document.getElementById('rule-length'),
  lowerNum: document.getElementById('rule-lower-num'),
  special: document.getElementById('rule-special'),
  upper: document.getElementById('rule-upper')
};

passwordInput.addEventListener('input', () => {
  const value = passwordInput.value;

  // 1. Kiểm tra độ dài (8-32 ký tự)
  updateStatus(requirements.length, value.length >= 8 && value.length <= 32);

  // 2. Kiểm tra chữ thường VÀ số
  const hasLower = /[a-z]/.test(value);
  const hasNumber = /[0-9]/.test(value);
  updateStatus(requirements.lowerNum, hasLower && hasNumber);

  // 3. Kiểm tra ký tự đặc biệt
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(value);
  updateStatus(requirements.special, hasSpecial);

  // 4. Kiểm tra chữ in hoa
  const hasUpper = /[A-Z]/.test(value);
  updateStatus(requirements.upper, hasUpper);
});
function validatePasswords() {
  const pass = passwordInput.value;
  const confirm = confirm_password.value;

  // Chỉ kiểm tra màu sắc khi ô xác nhận đã có dữ liệu
  if (confirm.length > 0) {
    if (confirm === pass) {
      confirm_password.style.borderColor = "green";
      confirm_password.style.boxShadow = "0 0 0 3px rgba(40, 167, 69, 0.2)";
    } else {
      confirm_password.style.borderColor = "var(--error-red)";
      confirm_password.style.boxShadow = "0 0 0 3px rgba(228, 58, 46, 0.2)";
    }
  } else {
    confirm_password.style.borderColor = "var(--slate-200)";
    confirm_password.style.boxShadow = "none";
  }
}
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
window.closeErrorModal = closeErrorModal;
confirm_password.addEventListener("input",validatePasswords);
// Hàm bổ trợ để cập nhật giao diện
function updateStatus(element, isValid) {
  const icon = element.querySelector('.status-icon');
  
  if (isValid) {
    element.classList.remove('invalid');
    element.classList.add('valid');
    icon.textContent = '✔';
  } else {
    element.classList.remove('valid');
    element.classList.add('invalid');
    icon.textContent = '✖';
  }
}
async function regist() {

  let username = document.getElementById("username").value.trim();
  const password = passwordInput.value.trim();
  const email = emailInput.value.trim();
  const confirm = confirm_password.value.trim();

  // kiểm tra rỗng
  if (!username || !password || !email || !confirm) {
    showErrorModal("Vui lòng nhập đầy đủ thông tin");
    return;
  }

  // kiểm tra email
  if (!emailRegex.test(email)) {
    showErrorModal("Email không đúng định dạng");
    emailInput.focus();
    return;
  }

  // kiểm tra confirm password
  if (password !== confirm) {
    showErrorModal("Mật khẩu xác nhận không khớp");
    confirm_password.focus();
    return;
  }

  try {

      const response = await fetch("https://straticulate-obtusely-ernesto.ngrok-free.dev/api/regist", {
          method: "POST",
          credentials: "include",
          headers: {
              "Content-Type": "application/json",
              "ngrok-skip-browser-warning": "69420"
          },
          body: JSON.stringify({ username, password, email })
      });

      if (response.ok) {

          const successModal = document.getElementById("successModal");
          successModal.style.display = "flex";

          let timeLeft = 5;

          const countdown = setInterval(() => {

              timeLeft--;

              document.getElementById("redirectText").innerText =
                  "Đang quay lại trang chủ trong " + timeLeft + " giây...";

              if (timeLeft <= 0) {

                  clearInterval(countdown);
                  successModal.style.display = "none";
                  window.location.href = "login.html";

              }

          }, 1000);

      }

      else if (response.status === 409) {

          const text = await response.json();
          console.log(text.message);

          showErrorModal(text.message);

      }

  } catch (error) {

      console.error("Lỗi kết nối:", error);
      showErrorModal("Không thể kết nối tới server");

  }
}
signupForm.addEventListener('submit', async (event) => {
  // DÒNG QUAN TRỌNG NHẤT: Chặn không cho form POST linh tinh gây lỗi 405
  event.preventDefault(); 
  
  // Gọi hàm đăng ký của bạn
  await regist(); 
});
var loginLink = document.getElementById('login-link');
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
});