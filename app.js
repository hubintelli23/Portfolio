/* Portfolio app.js v1.4 (2026-11-16) : 업데이트 로그(data/updates.json) + 바로가기 NEW·마지막 업데이트 표시
   v1.3 : 작업물 카드 썸네일 맞춤(thumbnailFit) 지원, 데이터 캐시 갱신
   v1.2 : 로고 배경(logoBg) 지원, 바로가기 데이터 캐시 갱신
   v1.1 : 프로젝트 바로가기 렌더링 추가, 썸네일 대체 이미지 수정 */
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
            const response = await fetch('data/projects.json?v=1.4');
            if (!response.ok) throw new Error('데이터 로드 실패');
            projectsData = await response.json();
            applyFilters();
        } catch (error) {
            console.error(error);
            gridEl.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #ef4444;">데이터를 불러오지 못했습니다.</p>`;
        }
    }

    // 공통: HTML 이스케이프
    const esc = (v) => String(v ?? '').replace(/[&<>"']/g, ch => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));

    // 공통: 상대 시간 표시 (오늘 / 어제 / n일 전 / n주 전 / 날짜)
    function relativeDay(dateLike) {
        const d = new Date(dateLike);
        if (isNaN(d)) return '';
        const startOf = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
        const days = Math.round((startOf(new Date()) - startOf(d)) / 86400000);
        if (days <= 0) return '오늘';
        if (days === 1) return '어제';
        if (days < 7) return `${days}일 전`;
        if (days < 35) return `${Math.floor(days / 7)}주 전`;
        return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
    }

    // =========================================================
    // 프로젝트 바로가기 (data/links.json)
    // logo 값이 비어 있으면 코드명(code) 아이콘을 대신 보여줌
    // =========================================================
    const linkGrid = document.getElementById('link-grid');
    let linksData = [];

    async function fetchLinks() {
        if (!linkGrid) return;
        try {
            const response = await fetch('data/links.json?v=1.4');
            if (!response.ok) throw new Error('링크 데이터 로드 실패');
            linksData = await response.json();
            renderLinks(linksData);
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
               data-id="${esc(link.id)}"
               aria-label="${link.title} ${link.subtitle || ''} 새 창으로 열기">
                <div class="link-icon ${link.logo ? 'has-logo' : ''} ${link.logo && link.logoBg ? 'logo-bg-' + link.logoBg : ''}">
                    <span class="link-code">${link.code}</span>
                    ${link.logo ? `<img src="${link.logo}" alt="${link.title} 로고" loading="lazy"
                        onerror="this.parentElement.classList.remove('has-logo'); this.remove();">` : ''}
                    <span class="link-new" hidden>NEW</span>
                </div>
                <div class="link-text">
                    <span class="link-badge">${link.code}</span>
                    <strong class="link-title">${link.title}</strong>
                    ${subLine ? `<small class="link-sub">${subLine}</small>` : ''}
                    <small class="link-updated" hidden></small>
                </div>
            </a>`;
        }).join('');
    }

    // =========================================================
    // 업데이트 로그 (data/updates.json)
    // - project 값은 links.json의 id (ATS-0, Y, OO ...) 또는 PORTFOLIO
    // - 최신 날짜가 위로 오도록 자동 정렬
    // =========================================================
    const NEW_DAYS = 7;          // 이 기간 안의 기록이 있으면 바로가기에 NEW 표시
    const LOG_PAGE_SIZE = 5;     // 처음에 보여줄 기록 수
    const updateList = document.getElementById('update-list');
    const updateFilter = document.getElementById('update-filter');
    const updateMore = document.getElementById('update-more');
    let updatesData = [];
    let updateProject = 'all';
    let updateShown = LOG_PAGE_SIZE;

    async function fetchUpdates() {
        if (!updateList) return;
        try {
            const response = await fetch('data/updates.json?v=1.4');
            if (!response.ok) throw new Error('업데이트 로그 로드 실패');
            updatesData = (await response.json())
                .filter(u => u && u.date)
                .sort((a, b) => b.date.localeCompare(a.date));
            renderUpdateFilter();
            renderUpdates();
        } catch (error) {
            console.error(error);
            updateList.innerHTML = `<p class="link-error">업데이트 로그를 불러오지 못했습니다.</p>`;
        }
    }

    function projectInfo(id) {
        if (id === 'PORTFOLIO') return { code: 'PF', name: '포트폴리오', url: '' };
        const link = linksData.find(l => l.id === id);
        if (!link) return { code: id, name: id, url: '' };
        return {
            code: link.code,
            name: link.title + (link.subtitle ? ` ${link.subtitle}` : ''),
            url: link.url
        };
    }

    function renderUpdateFilter() {
        if (!updateFilter) return;
        const ids = [...new Set(updatesData.map(u => u.project))];
        updateFilter.innerHTML =
            `<button type="button" class="filter-btn ${updateProject === 'all' ? 'active' : ''}" data-project="all">전체</button>` +
            ids.map(id => {
                const info = projectInfo(id);
                return `<button type="button" class="filter-btn ${updateProject === id ? 'active' : ''}" data-project="${esc(id)}" title="${esc(info.name)}">${esc(id === 'PORTFOLIO' ? '포트폴리오' : id)}</button>`;
            }).join('');
    }

    function renderUpdates() {
        const list = updatesData.filter(u => updateProject === 'all' || u.project === updateProject);
        if (list.length === 0) {
            updateList.innerHTML = `<p class="update-empty">아직 기록된 업데이트가 없습니다.</p>`;
            updateMore.hidden = true;
            return;
        }
        updateList.innerHTML = list.slice(0, updateShown).map(u => {
            const info = projectInfo(u.project);
            const name = info.url
                ? `<a href="${info.url}" target="_blank" rel="noopener noreferrer">${esc(info.name)}</a>`
                : esc(info.name);
            return `
            <li class="update-item">
                <div class="update-date">
                    <strong>${esc(u.date.replace(/-/g, '.'))}</strong>
                    <small>${relativeDay(u.date)}</small>
                </div>
                <div class="update-body">
                    <div class="update-meta">
                        <span class="link-badge">${esc(info.code)}</span>
                        <span class="update-project">${name}</span>
                        ${u.version ? `<span class="update-version">${esc(u.version)}</span>` : ''}
                        ${u.type ? `<span class="update-type type-${esc(u.type)}">${esc(u.type)}</span>` : ''}
                    </div>
                    ${u.title ? `<h3 class="update-title">${esc(u.title)}</h3>` : ''}
                    ${(u.items || []).length ? `<ul class="update-points">${u.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>` : ''}
                </div>
            </li>`;
        }).join('');
        updateMore.hidden = list.length <= updateShown;
        updateMore.textContent = `더 보기 (${list.length - updateShown}개 남음)`;
    }

    if (updateFilter) {
        updateFilter.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-project]');
            if (!btn) return;
            updateProject = btn.getAttribute('data-project');
            updateShown = LOG_PAGE_SIZE;
            renderUpdateFilter();
            renderUpdates();
        });
    }
    if (updateMore) {
        updateMore.addEventListener('click', () => {
            updateShown += LOG_PAGE_SIZE;
            renderUpdates();
        });
    }

    // =========================================================
    // GitHub 저장소 마지막 업데이트 시각 (자동)
    // - links.json의 url(https://아이디.github.io/저장소/)에서 저장소 이름을 읽음
    // - GitHub 요청 제한(시간당 60회)을 넘지 않도록 1시간 동안 브라우저에 저장해 둠
    // =========================================================
    const GH_CACHE_KEY = 'portfolio-gh-pushed';
    const GH_CACHE_MS = 60 * 60 * 1000;

    function repoOf(url) {
        try {
            const u = new URL(url);
            const owner = u.hostname.split('.')[0];
            const repo = u.pathname.split('/').filter(Boolean)[0];
            return owner && repo ? `${owner}/${repo}` : '';
        } catch { return ''; }
    }

    async function fetchPushedTimes(links) {
        let cache = null;
        try { cache = JSON.parse(localStorage.getItem(GH_CACHE_KEY) || 'null'); } catch { cache = null; }
        if (cache && Date.now() - cache.time < GH_CACHE_MS) return cache.data;

        const data = {};
        const repos = [...new Set(links.map(l => repoOf(l.url)).filter(Boolean))];
        const results = await Promise.allSettled(repos.map(async repo => {
            const res = await fetch(`https://api.github.com/repos/${repo}`, { headers: { Accept: 'application/vnd.github+json' } });
            if (!res.ok) throw new Error(`${repo}: ${res.status}`);
            const json = await res.json();
            data[repo] = json.pushed_at;
        }));
        const failed = results.filter(r => r.status === 'rejected');
        if (failed.length) console.warn('GitHub 업데이트 시각 일부 실패', failed.map(f => f.reason?.message));
        if (Object.keys(data).length) {
            try { localStorage.setItem(GH_CACHE_KEY, JSON.stringify({ time: Date.now(), data })); } catch { /* 저장 불가 시 무시 */ }
        }
        return data;
    }

    // 바로가기 아이콘에 NEW / 마지막 업데이트 표시
    async function decorateLinkTiles() {
        if (!linkGrid || !linksData.length) return;
        const latestLog = {};
        updatesData.forEach(u => {
            if (!latestLog[u.project] || u.date > latestLog[u.project]) latestLog[u.project] = u.date;
        });
        const pushed = await fetchPushedTimes(linksData).catch(() => ({}));

        linksData.forEach(link => {
            const tile = linkGrid.querySelector(`.link-tile[data-id="${CSS.escape(link.id || '')}"]`);
            if (!tile) return;
            const logDate = latestLog[link.id];
            const pushedAt = pushed[repoOf(link.url)];

            const newBadge = tile.querySelector('.link-new');
            if (logDate) {
                const days = (Date.now() - new Date(logDate).getTime()) / 86400000;
                newBadge.hidden = days > NEW_DAYS;
            }

            // GitHub 업로드 시각과 로그 날짜 중 더 최근 것을 표시
            const when = [pushedAt, logDate].filter(Boolean)
                .sort((a, b) => new Date(b) - new Date(a))[0];
            const updatedEl = tile.querySelector('.link-updated');
            if (when) {
                updatedEl.textContent = `업데이트 ${relativeDay(when)}`;
                updatedEl.hidden = false;
            }
        });
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
                <div class="card-thumbnail-wrap ${project.thumbnailFit === 'contain' ? 'logo-wrap' : ''}">
                    <img src="${project.thumbnail}" alt="${project.title}" class="card-thumbnail ${project.thumbnailFit === 'contain' ? 'is-logo' : ''}" onerror="this.onerror=null; this.src='https://placehold.co/600x350?text=No+Image'">
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
    fetchProjects();
    // 바로가기 → 업데이트 로그 순서로 불러온 뒤 아이콘에 업데이트 표시
    fetchLinks()
        .then(fetchUpdates)
        .then(decorateLinkTiles)
        .catch(console.error);
});