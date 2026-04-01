const imageUser=document.getElementById("imagePreview");
let imageUser1=localStorage.getItem("imageUser");
            imageUser.setAttribute("src","https://straticulate-obtusely-ernesto.ngrok-free.dev/"+imageUser1);
document.getElementById("imageUpload").addEventListener("change", function() {
    const file = this.files[0];
    if (file) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            // Hiển thị ảnh vừa chọn lên giao diện
            document.getElementById("imagePreview").setAttribute("src", e.target.result);
        }
        
        reader.readAsDataURL(file);
        
        // Gợi ý: Tại đây bạn có thể gọi API để upload file lên Server (MultipartFile)
        // uploadFileToServer(file);
    }
});
function showGoogleOverlay() {
    document.getElementById("googleOverlay").classList.add("active");
}
window.onload=function(){
    let loginWithGoogle=localStorage.getItem("loginWithGoogle");
    if(loginWithGoogle==true)
    {
        showGoogleOverlay;
    }
    el
}

function hideGoogleOverlay() {
    document.getElementById("googleOverlay").classList.remove("active");
}