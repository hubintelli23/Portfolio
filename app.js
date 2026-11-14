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

    // 0. 다크/라이트 모드 초기화 및 토글 제어
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

    // 1. JSON 데이터 로딩
    async function fetchProjects() {
        try {
            const response = await fetch('data/projects.json');
            if (!response.ok) throw new Error('데이터를 불러오지 못했습니다.');
            projectsData = await response.json();
            applyFilters();
        } catch (error) {
            console.error('Error:', error);
            gridEl.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #ef4444;">프로젝트 데이터를 로드하는 중 오류가 발생했습니다.</p>`;
        }
    }

    // 2. 카테고리 + 실시간 검색어 통합 필터링
    function applyFilters() {
        const query = searchQuery.trim().toLowerCase();

        const filtered = projectsData.filter(project => {
            const matchesCategory = currentCategory === 'all' || project.category === currentCategory;
            const matchesSearch = !query || 
                project.title.toLowerCase().includes(query) ||
                project.summary.toLowerCase().includes(query) ||
                project.description.toLowerCase().includes(query);

            return matchesCategory && matchesSearch;
        });

        renderProjects(filtered);
    }

    // 3. 프로젝트 카드 렌더링
    function renderProjects(items) {
        if (items.length === 0) {
            gridEl.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 3rem 0;">검색 조건에 일치하는 프로젝트가 없습니다.</p>`;
            return;
        }

        gridEl.innerHTML = items.map(project => `
            <div class="project-card" data-id="${project.id}">
                <img src="${project.thumbnail}" alt="${project.title}" class="card-thumbnail" onerror="this.src='https://via.placeholder.com/400x180?text=No+Image'">
                <div class="card-body">
                    <span class="card-category">${project.category}</span>
                    <h3 class="card-title">${project.title}</h3>
                    <p class="card-desc">${project.summary}</p>
                </div>
            </div>
        `).join('');
    }

    // 4. 실시간 검색 이벤트
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        searchClear.classList.toggle('visible', searchQuery.length > 0);
        applyFilters();
    });

    searchClear.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        searchClear.classList.remove('visible');
        searchInput.focus();
        applyFilters();
    });

    // 5. 카테고리 필터 클릭 이벤트
    filterNav.addEventListener('click', (e) => {
        if (!e.target.classList.contains('filter-btn')) return;

        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');

        currentCategory = e.target.getAttribute('data-filter');
        applyFilters();
    });

    // 6. 모달 상세 팝업 열기
    gridEl.addEventListener('click', (e) => {
        const card = e.target.closest('.project-card');
        if (!card) return;

        const projectId = Number(card.getAttribute('data-id'));
        const project = projectsData.find(p => p.id === projectId);

        if (project) {
            modalBody.innerHTML = `
                <span class="modal-meta">${project.category} &bull; ${project.date || ''}</span>
                <h2>${project.title}</h2>
                <p><strong>개요:</strong> ${project.summary}</p>
                <hr style="border: 0; border-top: 1px solid var(--border-color); margin: 1rem 0;">
                <p>${project.description.replace(/\n/g, '<br>')}</p>
                ${project.link ? `<a href="${project.link}" target="_blank" style="display: inline-block; margin-top: 1rem; color: var(--accent-color); text-decoration: none; font-weight: 600;">프로젝트 링크 바로가기 &rarr;</a>` : ''}
            `;
            modalBackdrop.classList.add('active');
        }
    });

    // 7. 모달 닫기
    function closeModal() {
        modalBackdrop.classList.remove('active');
    }

    modalClose.addEventListener('click', closeModal);
    modalBackdrop.addEventListener('click', (e) => {
        if (e.target === modalBackdrop) closeModal();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });

    // 초기 실행
    initTheme();
    fetchProjects();
});