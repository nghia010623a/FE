// Hàm xử lý hiệu ứng bay
function animateFlyToCart(imgElement, cartElement) {
    const flyImg = imgElement.cloneNode(true); // Tạo bản sao của ảnh
    const imgRect = imgElement.getBoundingClientRect();
    const cartRect = cartElement.getBoundingClientRect();

    // Cấu hình bản sao để bắt đầu bay
    Object.assign(flyImg.style, {
        position: 'fixed',
        left: `${imgRect.left}px`,
        top: `${imgRect.top}px`,
        width: `${imgRect.width}px`,
        height: `${imgRect.height}px`,
        transition: 'all 0.8s cubic-bezier(0.42, 0, 0.58, 1)',
        zIndex: '1000',
        borderRadius: '50%',
        pointerEvents: 'none'
    });

    document.body.appendChild(flyImg);

    // Bắt đầu bay tới giỏ hàng
    requestAnimationFrame(() => {
        Object.assign(flyImg.style, {
            left: `${cartRect.left + 10}px`,
            top: `${cartRect.top + 10}px`,
            width: '20px',
            height: '20px',
            opacity: '0.5'
        });
    });

    // Xóa bản sao khi xong và làm giỏ hàng rung nhẹ
    flyImg.addEventListener('transitionend', () => {
        flyImg.remove();
        cartElement.classList.add('animate-bounce'); // Hiệu ứng rung của Tailwind
        setTimeout(() => cartElement.classList.remove('animate-bounce'), 400);
    });
}

// Hàm lưu vào LocalStorage
function addToCart(product) {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    const index = cart.findIndex(item => item.id === product.id);

    if (index > -1) {
        cart[index].quantity += 1;
    } else {
        cart.push({ ...product, quantity: 1 });
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartBadge();
}

// Cập nhật số lượng hiển thị trên Badge
function updateCartBadge() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const total = cart.reduce((sum, item) => sum + item.quantity, 0);
    const badge = document.getElementById('cart-count');
    if (badge) badge.innerText = total;
}

// Gắn sự kiện (Cập nhật trong hàm renderContent của bạn)
document.addEventListener('click', (e) => {
    const btn = e.target.closest('.add-to-cart-btn'); // Thêm class này vào nút Add
    if (btn) {
        // Lấy dữ liệu sản phẩm từ thuộc tính data (bạn cần truyền lúc render)
        const productData = JSON.parse(btn.getAttribute('data-product'));
        const productImg = btn.closest('.glass-card').querySelector('img');
        const cartIcon = document.getElementById('cart-icon');

        animateFlyToCart(productImg, cartIcon);
        addToCart(productData);
    }
});

// Chạy cập nhật Badge khi load trang
updateCartBadge();