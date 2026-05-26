const msgEl = document.getElementById('msg');
const stepEmail = document.getElementById('step-email');
const stepReset = document.getElementById('step-reset');
let userEmail = '';

function showMsg(text, type) {
  msgEl.textContent = text;
  msgEl.className = 'msg ' + (type || '');
}

function goResetStep() {
  stepEmail.classList.remove('active');
  stepReset.classList.add('active');
}

async function sendCode() {
  const email = document.getElementById('email').value.trim();
  if (!email) {
    showMsg('Vui lòng nhập email', 'error');
    return;
  }
  userEmail = email;
  showMsg('Đang gửi mã...', '');
  try {
    const res = await fetch(API_BASE + 'api/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      showMsg(data.message || 'Không gửi được mã', 'error');
      return;
    }
    showMsg(data.message || 'Đã gửi mã tới email', 'ok');
    goResetStep();
  } catch {
    showMsg('Không kết nối được server', 'error');
  }
}

async function resetPassword() {
  const code = document.getElementById('code').value.trim();
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (!code || !newPassword) {
    showMsg('Vui lòng nhập đầy đủ thông tin', 'error');
    return;
  }
  if (newPassword.length < 6) {
    showMsg('Mật khẩu mới phải có ít nhất 6 ký tự', 'error');
    return;
  }
  if (newPassword !== confirmPassword) {
    showMsg('Mật khẩu nhập lại không khớp', 'error');
    return;
  }

  showMsg('Đang xác nhận...', '');
  try {
    const verifyRes = await fetch(API_BASE + 'api/verify-reset-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail, code })
    });
    if (!verifyRes.ok) {
      const v = await verifyRes.json().catch(() => ({}));
      showMsg(v.message || 'Mã không đúng hoặc hết hạn', 'error');
      return;
    }

    const res = await fetch(API_BASE + 'api/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail, code, newPassword })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      showMsg(data.message || 'Đặt lại mật khẩu thất bại', 'error');
      return;
    }
    showMsg('Đặt lại mật khẩu thành công! Đang chuyển...', 'ok');
    setTimeout(() => { window.location.href = 'login.html'; }, 1500);
  } catch {
    showMsg('Không kết nối được server', 'error');
  }
}

document.getElementById('btn-send-code').addEventListener('click', sendCode);
document.getElementById('btn-resend').addEventListener('click', sendCode);
document.getElementById('btn-reset').addEventListener('click', resetPassword);
