document.addEventListener("DOMContentLoaded", function() {
const form = document.getElementById("loginForm");
if (form) {
form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
        const response = await fetch("https://e573-116-96-46-116.ngrok-free.app/test/checkLogin", {
            method: "POST",
            credentials: "include", /* 3 giá trị của credentials
                                    Giá trị	Ý nghĩa
                                    "omit"	❌ Không gửi cookie (mặc định)
                                    "same-origin"	Chỉ gửi cookie nếu cùng origin
                                    "include"	✅ Luôn gửi cookie kể cả cross-origin */
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                username: username,
                password: password
            })
        });
        data=await response.json();

            if(response.status==201)
            {
            window.location.href="successlogin.html";
            localStorage.setItem("accessToken",data.data);
        }
            else
            localStorage.setItem("loginStatus", "fail");
    } catch (err) {
        document.getElementById("result").textContent = err;
    }




})}});
