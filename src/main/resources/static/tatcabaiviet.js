const API_URL = "/api/diendan/bai-dang";

let allPosts = [];
let filteredPosts = [];

let currentPage = 1;

const itemsPerPage = 9;


document.addEventListener("DOMContentLoaded", function () {
    setupMobileMenu();
    setupSearchBar();
    loadPosts();
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


function setupSearchBar() {
    const form = document.getElementById("pageSearchForm");
    const input = document.getElementById("searchInput");
    const clearBtn = document.getElementById("clearSearchBtn");

    if (!input) {
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const initialKeyword = (params.get("noidung") || params.get("q") || "").trim();
    input.value = initialKeyword;

    if (clearBtn) {
        clearBtn.hidden = input.value.trim().length === 0;
        clearBtn.addEventListener("click", function () {
            input.value = "";
            clearBtn.hidden = true;
            syncSearchUrl("");
            filterPosts("");
            input.focus();
        });
    }

    input.addEventListener("input", function () {
        const val = input.value;
        if (clearBtn) {
            clearBtn.hidden = val.trim().length === 0;
        }
        syncSearchUrl(val.trim());
        filterPosts(val);
    });

    if (form) {
        form.addEventListener("submit", function (event) {
            event.preventDefault();
            const keyword = input.value.trim();
            syncSearchUrl(keyword);
            filterPosts(keyword);
        });
    }
}


function syncSearchUrl(keyword) {
    const url = new URL(window.location.href);
    url.searchParams.delete("q");
    if (keyword) {
        url.searchParams.set("noidung", keyword);
    } else {
        url.searchParams.delete("noidung");
    }
    window.history.replaceState({}, "", url.pathname + url.search);
}


async function loadPosts() {

    try {

        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error("HTTP " + response.status);
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
            throw new Error("API không trả về Array");
        }

        allPosts = data
            .filter(function (post) {
                return String(post.trangThai || "").trim().toUpperCase() === "APPROVED";
            })
            .sort(function (a, b) {
                return new Date(b.ngayDang) - new Date(a.ngayDang);
            });

        const params = new URLSearchParams(window.location.search);
        const keyword = params.get("noidung") || params.get("q") || "";

        const input = document.getElementById("searchInput");
        const clearBtn = document.getElementById("clearSearchBtn");
        if (input && input.value.trim() !== keyword.trim()) {
            input.value = keyword.trim();
            if (clearBtn) {
                clearBtn.hidden = input.value.length === 0;
            }
        }

        filterPosts(keyword);

    } catch (error) {

        console.error("Lỗi tải bài viết:", error);

        const grid = document.getElementById("baivietGrid");

        if (grid) {
            grid.innerHTML = `
                <div class="baiviet-empty">
                    <h3>Không thể tải bài viết</h3>
                    <p>Vui lòng thử tải lại trang sau ít phút.</p>
                </div>
            `;
        }

    }

}


function normalizeText(text) {

    return String(text || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();

}


function getMatchScore(post, searchText, tokens) {
    const title = normalizeText(post.tieuDe);
    const content = normalizeText(post.noiDung);
    const category = normalizeText(post.theLoai);
    const author = normalizeText(
        post.user
            ? [post.user.fullName, post.user.name, post.user.username].filter(Boolean).join(" ")
            : ""
    );

    const combined = [title, category, content, author].filter(Boolean).join(" ");

    const exactPhraseMatch =
        title.includes(searchText) ||
        category.includes(searchText) ||
        content.includes(searchText) ||
        author.includes(searchText);

    const allTokensMatch =
        tokens.length > 0 &&
        tokens.every(function (token) {
            return combined.includes(token);
        });

    if (!exactPhraseMatch && !allTokensMatch) {
        return 0;
    }

    if (title.includes(searchText)) return 4;
    if (category.includes(searchText)) return 3;
    if (content.includes(searchText) || author.includes(searchText)) return 2;
    return 1;
}


function filterPosts(keyword) {

    const rawKeyword = String(keyword || "").trim();
    const searchText = normalizeText(rawKeyword);
    const tokens = searchText ? searchText.split(" ").filter(Boolean) : [];

    if (searchText === "") {
        filteredPosts = [...allPosts];
    } else {
        filteredPosts = allPosts
            .map(function (post) {
                return {
                    post: post,
                    score: getMatchScore(post, searchText, tokens)
                };
            })
            .filter(function (entry) {
                return entry.score > 0;
            })
            .sort(function (a, b) {
                if (b.score !== a.score) {
                    return b.score - a.score;
                }
                return new Date(b.post.ngayDang || 0) - new Date(a.post.ngayDang || 0);
            })
            .map(function (entry) {
                return entry.post;
            });
    }

    currentPage = 1;

    updateHeading(rawKeyword, filteredPosts.length);

    renderPosts();

    renderPagination();

}


function updateHeading(keyword, count) {

    const title = document.getElementById("pageTitle");
    const description = document.getElementById("pageDescription");

    if (!title) {
        return;
    }

    if (!keyword.trim()) {
        title.textContent = "TẤT CẢ BÀI VIẾT";

        if (description) {
            description.textContent =
                "Tổng hợp tất cả bài viết từ cộng đồng USTH Aviation Society.";
        }
    } else {
        title.textContent = "KẾT QUẢ TÌM KIẾM";

        if (description) {
            description.textContent =
                'Từ khóa "' + keyword + '" - tìm thấy ' + count + " bài viết.";
        }
    }

}


function renderPosts() {

    const grid = document.getElementById("baivietGrid");

    if (!grid) {
        console.error("Không tìm thấy #baivietGrid");
        return;
    }

    grid.innerHTML = "";

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const posts = filteredPosts.slice(start, end);

    if (posts.length === 0) {
        grid.innerHTML = `
            <div class="baiviet-empty">
                <h3>Không tìm thấy bài viết</h3>
                <p>Không có bài viết nào có tiêu đề hoặc nội dung phù hợp với từ khóa tìm kiếm.</p>
            </div>
        `;
        return;
    }

    posts.forEach(function (post) {

        const box = document.createElement("article");
        box.className = "baiviet-box";

        box.addEventListener("click", function () {
            window.location.href = "chitietbaidang.html?id=" + post.id;
        });

        let imageUrl = "images/diendan.png";

        if (post.anh) {
            imageUrl = String(post.anh).trim();

            if (
                !imageUrl.startsWith("http://") &&
                !imageUrl.startsWith("https://") &&
                !imageUrl.startsWith("/")
            ) {
                imageUrl = "/" + imageUrl.replace(/^\/+/, "");
            }
        }

        let dateText = "";

        if (post.ngayDang) {
            const date = new Date(post.ngayDang);

            if (!isNaN(date.getTime())) {
                dateText = date.toLocaleDateString("vi-VN", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric"
                });
            }
        }

        const title = escapeHtml(post.tieuDe || "Không có tiêu đề");
        const content = escapeHtml(post.noiDung || "Chưa có nội dung.");
        const category = escapeHtml(post.theLoai || "Diễn đàn");
        const authorName = escapeHtml(
            (post.user && (post.user.fullName || post.user.username)) || "Thành viên UAS"
        );

        box.innerHTML = `
            <div class="baiviet-image">
                <img
                    src="${imageUrl}"
                    alt="${title}"
                    onerror="this.onerror=null;this.src='images/diendan.png';"
                >
            </div>

            <div class="baiviet-info">
                <div class="baiviet-category">
                    ${category}
                </div>

                <h3>
                    ${title}
                </h3>

                <p>
                    ${content}
                </p>

                <div class="baiviet-meta-footer">
                    <span class="baiviet-user">
                        <i class="bi bi-person-circle"></i>
                        ${authorName}
                    </span>
                    <span class="baiviet-date">
                        <i class="bi bi-calendar3"></i>
                        ${escapeHtml(dateText)}
                    </span>
                </div>
            </div>
        `;

        grid.appendChild(box);

    });

}


function renderPagination() {

    const pagination = document.getElementById("pagination");

    if (!pagination) {
        return;
    }

    pagination.innerHTML = "";

    const totalPages = Math.ceil(filteredPosts.length / itemsPerPage);

    if (totalPages <= 1) {
        return;
    }

    const previous = document.createElement("button");
    previous.className = "pagination-btn";
    previous.type = "button";
    previous.innerHTML = "&laquo;";
    previous.disabled = currentPage === 1;

    previous.addEventListener("click", function () {
        if (currentPage > 1) {
            currentPage--;
            renderPosts();
            renderPagination();
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    });

    pagination.appendChild(previous);

    for (let page = 1; page <= totalPages; page++) {
        const button = document.createElement("button");
        button.className = "pagination-btn";
        button.type = "button";

        if (page === currentPage) {
            button.classList.add("active");
        }

        button.textContent = String(page);

        button.addEventListener("click", function () {
            currentPage = page;
            renderPosts();
            renderPagination();
            window.scrollTo({ top: 0, behavior: "smooth" });
        });

        pagination.appendChild(button);
    }

    const next = document.createElement("button");
    next.className = "pagination-btn";
    next.type = "button";
    next.innerHTML = "&raquo;";
    next.disabled = currentPage === totalPages;

    next.addEventListener("click", function () {
        if (currentPage < totalPages) {
            currentPage++;
            renderPosts();
            renderPagination();
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    });

    pagination.appendChild(next);

}


function escapeHtml(text) {

    return String(text || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}