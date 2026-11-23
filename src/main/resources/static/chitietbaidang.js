const API_URL = "/api/diendan/bai-dang";

const token = localStorage.getItem("token");
const username = localStorage.getItem("username");
const authArea = document.getElementById("authArea");

if (authArea) {
    if (token && username) {
        authArea.innerHTML = `
            <span class="auth-username">
                <i class="bi bi-person-circle"></i>
                ${escapeHtml(username)}
            </span>
            <button
                type="button"
                class="btnlogout"
                onclick="logout()">
                <i class="bi bi-box-arrow-right"></i>
                ĐĂNG XUẤT
            </button>
        `;
    } else {
        authArea.innerHTML = `
            <a href="login.html">
                <button
                    type="button"
                    class="btnlogin">
                    <i class="bi bi-door-open"></i>
                    ĐĂNG NHẬP
                </button>
            </a>
        `;
    }
}

document.addEventListener("DOMContentLoaded", function () {
    setupMobileMenu();
    loadChiTietBaiDang();
});

function setupMobileMenu() {
    const toggle = document.getElementById("menuToggle");
    const nav = document.getElementById("navbarNav");

    if (!toggle || !nav) {
        return;
    }

    toggle.addEventListener("click", function (event) {
        event.stopPropagation();
        const isOpen = nav.classList.toggle("active");
        toggle.setAttribute("aria-expanded", String(isOpen));
    });

    nav.querySelectorAll("a").forEach(function (link) {
        link.addEventListener("click", function () {
            nav.classList.remove("active");
            toggle.setAttribute("aria-expanded", "false");
        });
    });

    document.addEventListener("click", function (event) {
        if (!nav.contains(event.target) && !toggle.contains(event.target)) {
            nav.classList.remove("active");
            toggle.setAttribute("aria-expanded", "false");
        }
    });
}

async function loadChiTietBaiDang() {

    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");

    if (!id) {
        hienThiLoi("Không tìm thấy mã bài đăng.");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/${id}`);

        if (!response.ok) {
            throw new Error("HTTP " + response.status);
        }

        const post = await response.json();
        renderChiTiet(post);

    } catch (error) {
        console.error("Lỗi khi tải bài đăng:", error);
        hienThiLoi("Không thể tải bài đăng. Vui lòng thử lại.");
    }
}

function renderChiTiet(post) {

    const image = document.getElementById("baidangImage");
    const title = document.getElementById("baidangTitle");
    const content = document.getElementById("baidangContent");
    const user = document.getElementById("baidangUser");
    const date = document.getElementById("baidangDate");
    const category = document.getElementById("baidangCategory");

    title.textContent = post.tieuDe || "Không có tiêu đề";
    content.textContent = post.noiDung || "Không có nội dung.";
    category.textContent = post.theLoai || "DIỄN ĐÀN";

    if (post.user) {
        user.textContent =
            post.user.fullName ||
            post.user.username ||
            "Thành viên";
    } else {
        user.textContent = "Thành viên";
    }

    if (post.ngayDang) {
        const ngay = new Date(post.ngayDang);

        if (!isNaN(ngay.getTime())) {
            date.textContent =
                ngay.toLocaleDateString("vi-VN") +
                " " +
                ngay.toLocaleTimeString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit"
                });
        } else {
            date.textContent = "Không xác định";
        }
    } else {
        date.textContent = "Không xác định";
    }

    if (post.anh) {
        let imageUrl = post.anh.toString().trim();

        if (
            !imageUrl.startsWith("http://") &&
            !imageUrl.startsWith("https://") &&
            !imageUrl.startsWith("/")
        ) {
            imageUrl = "/uploads/" + imageUrl.replace(/^\/+/, "");
        }

        image.src = imageUrl;
        image.style.display = "block";

        image.onerror = function () {
            image.onerror = null;
            image.src = "images/diendan.png";
        };
    } else {
        image.src = "images/diendan.png";
        image.style.display = "block";
    }

    image.alt = post.tieuDe || "Ảnh bài đăng";

    document.title =
        (post.tieuDe || "Chi tiết bài đăng") +
        " - UAS Aviation Society";
}

function hienThiLoi(message) {
    document.getElementById("baidangTitle").textContent = message;
    document.getElementById("baidangContent").textContent = "";
    document.getElementById("baidangImage").style.display = "none";
}

function quayLai() {
    if (window.history.length > 1 && document.referrer) {
        window.history.back();
        return;
    }
    window.location.href = "diendanuas.html";
}

function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("userId");
    localStorage.removeItem("role");
    window.location.href = "diendanuas.html";
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}