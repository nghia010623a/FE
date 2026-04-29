// Hàm lấy giá trị Cookie
function getCookie(name) {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for(let i=0;i < ca.length;i++) {
      let c = ca[i];
      while (c.charAt(0)==' ') c = c.substring(1,c.length);
      if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
  }
  return null;
}
// Hàm xoá Cookie
function deleteCookie(name) {
  document.cookie = name + '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=None; Secure';
}

