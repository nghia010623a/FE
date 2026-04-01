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
async function checkLogin()
{

  let identifier = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
 

  // kiểm tra rỗng
  if (!identifier || !password) {
    showErrorModal("Vui lòng nhập đầy đủ thông tin");
    return;
  }


    try {

        const response = await fetch("https://straticulate-obtusely-ernesto.ngrok-free.dev/api/checkLogin", {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
                "ngrok-skip-browser-warning": "69420"
            },
            body: JSON.stringify({ identifier, password})
        });
  
        if (response.ok) {
  
            const data = await response.json();   
            localStorage.setItem("imageUser", data.imageUser);
            localStorage.setItem("loginWithGoogle", data.loginWithGoogle);
            localStorage.setItem("isUpdateProfile", data.isUpdateProfile);
            localStorage.setItem("email", data.email);

                    window.location.href="loadingscreen.html";



                    
            }
        else if (response.status === 401) {
  
            const text = await response.json();
            console.log(text.message);
  
            showErrorModal(text.message);
  
        }
  
    } catch (error) {
  
        console.error("Lỗi kết nối:", error);
        showErrorModal("Không thể kết nối tới server");
  
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

    document.getElementById("loginForm").addEventListener("submit", function(e) {
  
      e.preventDefault(); // chặn form reload
  
      checkLogin(); // gọi hàm login
  
    });
  
  });




