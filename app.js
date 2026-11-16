/* Portfolio app.js v1.1 (2026-11-16) : 프로젝트 바로가기 렌더링 추가, 썸네일 대체 이미지 수정 */
document.addEventListener('DOMContentLoaded', () => {
    let projectsData = [];
    let currentCategory = 'all';
    let searchQuery = '';

    const gridEl = document.getElementById('project-grid');
    const filterNav = document.getElementById('filter-nav');
    const searchInput = document.getElementById('search-input');
    const searchClear = document.getElementById('search-clear');
    const themeToggle = document.getElementById('theme-toggle');
    const modalBackdrop = document.getElementById('modal-backdrop');
    const modalBody = document.getElementById('modal-body');
    const modalClose = document.getElementById('modal-close');

    // 테마 초기화 및 전환
    function initTheme() {
        const savedTheme = localStorage.getItem('portfolio-theme') || 'dark';
        applyTheme(savedTheme);
    }

    function applyTheme(theme) {
        if (theme === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
            themeToggle.textContent = '🌙 다크 모드';
        } else {
            document.documentElement.removeAttribute('data-theme');
            themeToggle.textContent = '☀️ 라이트 모드';
        }
        localStorage.setItem('portfolio-theme', theme);
    }

    themeToggle.addEventListener('click', () => {
        const isLight = document.documentElement.getAttribute('data-theme') === 'light';
        applyTheme(isLight ? 'dark' : 'light');
    });

    // 데이터 로딩
    async function fetchProjects() {
        try {
            const response = await fetch('data/projects.json');
            if (!response.ok) throw new Error('데이터 로드 실패');
            projectsData = await response.json();
            applyFilters();
        } catch (error) {
            console.error(error);
            gridEl.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #ef4444;">데이터를 불러오지 못했습니다.</p>`;
        }
    }

    // 프로젝트 바로가기 (data/links.json)
    // logo 값이 비어 있으면 코드명(code) 아이콘을 대신 보여줌
    const linkGrid = document.getElementById('link-grid');

    async function fetchLinks() {
        if (!linkGrid) return;
        try {
            const response = await fetch('data/links.json');
            if (!response.ok) throw new Error('링크 데이터 로드 실패');
            renderLinks(await response.json());
        } catch (error) {
            console.error(error);
            linkGrid.innerHTML = `<p class="link-error">바로가기를 불러오지 못했습니다.</p>`;
        }
    }

    function renderLinks(links) {
        linkGrid.innerHTML = links.map(link => {
            const subLine = [link.subtitle, link.subtitleEn].filter(Boolean).join(' · ');
            return `
            <a class="link-tile" href="${link.url}" target="_blank" rel="noopener noreferrer"
               aria-label="${link.title} ${link.subtitle || ''} 새 창으로 열기">
                <div class="link-icon ${link.logo ? 'has-logo' : ''}">
                    <span class="link-code">${link.code}</span>
                    ${link.logo ? `<img src="${link.logo}" alt="${link.title} 로고" loading="lazy"
                        onerror="this.parentElement.classList.remove('has-logo'); this.remove();">` : ''}
                </div>
                <div class="link-text">
                    <span class="link-badge">${link.code}</span>
                    <strong class="link-title">${link.title}</strong>
                    ${subLine ? `<small class="link-sub">${subLine}</small>` : ''}
                </div>
            </a>`;
        }).join('');
    }

    // 통합 필터링
    function applyFilters() {
        const query = searchQuery.trim().toLowerCase();

        const filtered = projectsData.filter(project => {
            const matchesCategory = currentCategory === 'all' || project.category === currentCategory;
            const matchesSearch = !query || 
                project.title.toLowerCase().includes(query) ||
                project.summary.toLowerCase().includes(query) ||
                project.description.toLowerCase().includes(query) ||
                (project.tags && project.tags.some(tag => tag.toLowerCase().includes(query)));

            return matchesCategory && matchesSearch;
        });

        renderProjects(filtered);
    }

    // 카드 그리드 렌더링
    function renderProjects(items) {
        if (items.length === 0) {
            gridEl.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 4rem 0;">일치하는 작업물이 없습니다.</p>`;
            return;
        }

        gridEl.innerHTML = items.map(project => `
            <div class="project-card" data-id="${project.id}">
                <div class="card-thumbnail-wrap">
                    <img src="${project.thumbnail}" alt="${project.title}" class="card-thumbnail" onerror="this.onerror=null; this.src='https://placehold.co/600x350?text=No+Image'">
                </div>
                <div class="card-body">
                    <div class="card-meta-row">
                        <span class="card-category">${project.category}</span>
                        <span class="card-date">${project.date || ''}</span>
                    </div>
                    <h3 class="card-title">${project.title}</h3>
                    <p class="card-desc">${project.summary}</p>
                    <div class="card-tags">
                        ${(project.tags || []).map(tag => `<span class="tag-badge">#${tag}</span>`).join('')}
                    </div>
                </div>
            </div>
        `).join('');
    }

    // 검색 및 필터 이벤트
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        if (searchClear) searchClear.classList.toggle('visible', searchQuery.length > 0);
        applyFilters();
    });

    if (searchClear) {
        searchClear.addEventListener('click', () => {
            searchInput.value = '';
            searchQuery = '';
            searchClear.classList.remove('visible');
            applyFilters();
        });
    }

    filterNav.addEventListener('click', (e) => {
        if (!e.target.classList.contains('filter-btn')) return;
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        currentCategory = e.target.getAttribute('data-filter');
        applyFilters();
    });

    // 상세 모달 열기 (유튜브 + 다중 이미지 갤러리 포함)
    gridEl.addEventListener('click', (e) => {
        const card = e.target.closest('.project-card');
        if (!card) return;

        const project = projectsData.find(p => p.id === Number(card.getAttribute('data-id')));
        if (!project) return;

        // 1. 유튜브 임베드 HTML 생성
        const videoHTML = project.youtubeId ? `
            <div class="video-container">
                <iframe 
                    src="https://www.youtube.com/embed/${project.youtubeId}" 
                    title="${project.title} Video"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowfullscreen>
                </iframe>
            </div>
        ` : '';

        // 2. 이미지 갤러리 HTML 생성
        const hasGallery = Array.isArray(project.gallery) && project.gallery.length > 0;
        const galleryHTML = hasGallery ? `
            <div class="gallery-viewer">
                <div class="gallery-main-wrap">
                    <img src="${project.gallery[0]}" alt="Gallery Preview" class="gallery-main-img" id="gallery-main-img">
                </div>
                ${project.gallery.length > 1 ? `
                    <div class="gallery-thumbs" id="gallery-thumbs">
                        ${project.gallery.map((imgUrl, idx) => `
                            <button type="button" class="gallery-thumb-btn ${idx === 0 ? 'active' : ''}" data-src="${imgUrl}">
                                <img src="${imgUrl}" alt="Thumbnail ${idx + 1}">
                            </button>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        ` : '';

        const mediaSectionHTML = (videoHTML || galleryHTML) ? `
            <div class="modal-media-section">
                ${videoHTML}
                ${galleryHTML}
            </div>
        ` : '';

        modalBody.innerHTML = `
            <span class="modal-meta">${project.category} &bull; ${project.date || ''}</span>
            <h2>${project.title}</h2>
            <p><strong>개요:</strong> ${project.summary}</p>
            ${mediaSectionHTML}
            <hr style="border: 0; border-top: 1px solid var(--border-color); margin: 1.5rem 0;">
            <p>${project.description.replace(/\n/g, '<br>')}</p>
            <div class="card-tags" style="margin-top: 1.5rem;">
                ${(project.tags || []).map(tag => `<span class="tag-badge">#${tag}</span>`).join('')}
            </div>
        `;

        modalBackdrop.classList.add('active');
    });

    // 모달 내 갤러리 썸네일 클릭 이벤트 위임
    modalBody.addEventListener('click', (e) => {
        const thumbBtn = e.target.closest('.gallery-thumb-btn');
        if (!thumbBtn) return;

        const mainImg = document.getElementById('gallery-main-img');
        if (!mainImg) return;

        // 활성 상태 변경 및 메인 이미지 교체
        modalBody.querySelectorAll('.gallery-thumb-btn').forEach(btn => btn.classList.remove('active'));
        thumbBtn.classList.add('active');
        mainImg.src = thumbBtn.getAttribute('data-src');
    });

    // 모달 닫기 및 영상 재생 강제 종료
    function closeModal() {
        modalBackdrop.classList.remove('active');
        setTimeout(() => {
            modalBody.innerHTML = ''; // iframe 제거로 유튜브 소리 즉시 정지
        }, 250);
    }

    modalClose.addEventListener('click', closeModal);
    modalBackdrop.addEventListener('click', (e) => {
        if (e.target === modalBackdrop) closeModal();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });

    initTheme();
    fetchLinks();
    fetchProjects();
});