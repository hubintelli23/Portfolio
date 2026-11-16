/* Portfolio app.js v1.6 (2026-11-16) : 업데이트 시간(시:분) 표시 — GitHub 커밋 시각, 기록의 time 칸
   v1.5 : 다른 프로젝트 업데이트 자동 수집 (프로젝트 updates.json → 없으면 GitHub 커밋)
   v1.4 : 업데이트 로그(data/updates.json) + 바로가기 NEW·마지막 업데이트 표시
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
            const response = await fetch('data/projects.json?v=1.6');
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

    // 한국 시간 HH:MM
    const kstTime = (iso) => new Date(iso).toLocaleTimeString('ko-KR', {
        timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false
    });

    // 기록의 date(+time)를 하나의 시각으로 (time 없으면 null)
    function entryMoment(u) {
        if (u.at) return u.at;                                   // GitHub 커밋 (ISO)
        if (u.time && /^\d{1,2}:\d{2}$/.test(u.time)) {
            const [h, m] = u.time.split(':');
            return `${u.date}T${h.padStart(2, '0')}:${m}:00+09:00`; // 한국 시간 기준
        }
        return null;
    }

    // 바로가기용: 방금 / n분 전 / 오늘 14:30 / 어제 09:10 / n일 전
    function relativeMoment(iso) {
        const d = new Date(iso);
        if (isNaN(d)) return '';
        const mins = Math.floor((Date.now() - d.getTime()) / 60000);
        if (mins < 1) return '방금';
        if (mins < 60) return `${mins}분 전`;
        const day = relativeDay(d);
        return (day === '오늘' || day === '어제') ? `${day} ${kstTime(iso)}` : day;
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
            const response = await fetch('data/links.json?v=1.6');
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
    // 업데이트 로그
    // 1) 포트폴리오 자체 기록 : data/updates.json
    // 2) 각 프로젝트 기록     : 프로젝트 주소/updates.json (있으면 우선 사용)
    // 3) 자동 기록            : GitHub 커밋 (프로젝트에 updates.json이 없을 때)
    // - project 값은 links.json의 id (ATS-0, Y, OO ...) 또는 PORTFOLIO
    // =========================================================
    const NEW_DAYS = 7;            // 이 기간 안의 기록이 있으면 바로가기에 NEW 표시
    const LOG_PAGE_SIZE = 5;       // 처음에 보여줄 기록 수
    const COMMITS_PER_REPO = 15;   // 저장소마다 가져올 최근 커밋 수
    const GH_CACHE_KEY = 'portfolio-gh-commits-v2';
    const GH_CACHE_MS = 60 * 60 * 1000; // GitHub 요청 제한(시간당 60회) 때문에 1시간 저장

    const updateList = document.getElementById('update-list');
    const updateFilter = document.getElementById('update-filter');
    const updateMore = document.getElementById('update-more');
    const updateStatus = document.getElementById('update-status');
    let updatesData = [];
    let lastPushed = {};           // { 프로젝트 id: 마지막 커밋 시각 }
    let updateProject = 'all';
    let updateShown = LOG_PAGE_SIZE;

    // 한국 시간 기준 YYYY-MM-DD
    const kstDate = (iso) => new Date(iso).toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });

    function repoOf(url) {
        try {
            const u = new URL(url);
            const owner = u.hostname.split('.')[0];
            const repo = u.pathname.split('/').filter(Boolean)[0];
            return owner && repo ? `${owner}/${repo}` : '';
        } catch { return ''; }
    }

    // 날짜 → 시간 순으로 최신이 위 (시간이 없는 기록은 그날의 맨 아래)
    const sortKey = (u) => {
        const m = entryMoment(u);
        return m ? new Date(m).toISOString() : `${u.date}T00:00:00.000Z`;
    };
    const sortByDate = (list) => list
        .filter(u => u && u.date)
        .sort((a, b) => b.date.localeCompare(a.date) || sortKey(b).localeCompare(sortKey(a)));

    async function fetchJson(url) {
        const res = await fetch(url, { cache: 'no-cache' });
        if (!res.ok) throw new Error(`${url}: ${res.status}`);
        return res.json();
    }

    // 2) 프로젝트 저장소의 updates.json
    async function fetchProjectLog(link) {
        const base = link.url.endsWith('/') ? link.url : link.url + '/';
        try {
            const list = await fetchJson(base + 'updates.json');
            if (!Array.isArray(list)) return null;
            return list.map(u => ({ ...u, project: u.project || link.id, source: 'project' }));
        } catch {
            return null; // 파일이 없으면 커밋으로 대체
        }
    }

    // 3) GitHub 커밋 (1시간 캐시)
    function readCommitCache() {
        try {
            const c = JSON.parse(localStorage.getItem(GH_CACHE_KEY) || 'null');
            return c && Date.now() - c.time < GH_CACHE_MS ? c.data : null;
        } catch { return null; }
    }

    async function fetchCommits(repos) {
        const cached = readCommitCache();
        if (cached) return cached;
        const data = {};
        const results = await Promise.allSettled(repos.map(async repo => {
            const res = await fetch(`https://api.github.com/repos/${repo}/commits?per_page=${COMMITS_PER_REPO}`,
                { headers: { Accept: 'application/vnd.github+json' } });
            if (!res.ok) throw new Error(`${repo}: ${res.status}`);
            const list = await res.json();
            data[repo] = list.map(c => ({
                date: c.commit?.author?.date || c.commit?.committer?.date,
                message: c.commit?.message || ''
            }));
        }));
        const failed = results.filter(r => r.status === 'rejected');
        if (failed.length) console.warn('GitHub 커밋 일부 실패', failed.map(f => f.reason?.message));
        if (Object.keys(data).length) {
            try { localStorage.setItem(GH_CACHE_KEY, JSON.stringify({ time: Date.now(), data })); } catch { /* 무시 */ }
        }
        return data;
    }

    // 커밋 메시지를 읽기 쉬운 한국어로 정리
    function tidyCommit(message) {
        const line = message.split('\n')[0].trim();
        if (!line || /^Merge (branch|pull request)/i.test(line)) return '';
        if (/^Add files via upload$/i.test(line)) return '파일 업로드';
        let m;
        if ((m = line.match(/^Create (.+)$/i))) return `${m[1]} 추가`;
        if ((m = line.match(/^Update (.+)$/i))) return `${m[1]} 수정`;
        if ((m = line.match(/^Delete (.+)$/i))) return `${m[1]} 삭제`;
        if ((m = line.match(/^Rename (.+)$/i))) return `${m[1]} 이름 변경`;
        return line;
    }

    // 커밋을 하루 단위로 묶어 로그 형식으로 변환
    function commitsToLog(link, repo, commits) {
        const byDay = {};
        commits.forEach(c => {
            if (!c.date) return;
            const text = tidyCommit(c.message);
            if (!text) return;
            const day = kstDate(c.date);
            (byDay[day] ||= []).push({ text, at: c.date });
        });
        return Object.entries(byDay).map(([date, msgs]) => {
            // 최신 커밋이 위로, 같은 메시지는 "×횟수"로 합치고 가장 최근 시각을 표시
            msgs.sort((a, b) => b.at.localeCompare(a.at));
            const merged = [];
            msgs.forEach(m => {
                const found = merged.find(x => x.text === m.text);
                if (found) found.count++;
                else merged.push({ text: m.text, at: m.at, count: 1 });
            });
            const items = merged.map(m => ({
                text: m.count > 1 ? `${m.text} ×${m.count}` : m.text,
                time: kstTime(m.at)
            }));
            return {
                date,
                at: msgs[0].at,            // 그날 마지막 커밋 시각
                project: link.id,
                type: 'GitHub',
                title: `저장소 업데이트 ${msgs.length}건`,
                items: items.length > 6 ? [...items.slice(0, 6), { text: `외 ${items.length - 6}건` }] : items,
                link: `https://github.com/${repo}/commits`,
                source: 'github'
            };
        });
    }

    async function fetchUpdates() {
        if (!updateList) return;

        // 1) 포트폴리오 기록 먼저 표시
        let local = [];
        try {
            local = (await fetchJson('data/updates.json?v=1.6'))
                .map(u => ({ ...u, source: 'portfolio' }));
        } catch (error) {
            console.error(error);
        }
        updatesData = sortByDate(local);
        renderUpdateFilter();
        renderUpdates();
        if (updateStatus) updateStatus.textContent = '프로젝트 업데이트를 불러오는 중…';

        // 2)·3) 각 프로젝트 기록 + GitHub 커밋
        const targets = linksData.filter(l => l.id && l.url);
        const repoMap = Object.fromEntries(targets.map(l => [l.id, repoOf(l.url)]));
        const [projectLogs, commits] = await Promise.all([
            Promise.all(targets.map(fetchProjectLog)),
            fetchCommits([...new Set(Object.values(repoMap).filter(Boolean))]).catch(() => ({}))
        ]);

        const remote = [];
        targets.forEach((link, i) => {
            const repo = repoMap[link.id];
            const repoCommits = commits[repo] || [];
            if (repoCommits[0]?.date) lastPushed[link.id] = repoCommits[0].date;
            if (projectLogs[i]) remote.push(...projectLogs[i]);
            else if (repoCommits.length) remote.push(...commitsToLog(link, repo, repoCommits));
        });

        updatesData = sortByDate([...local, ...remote]);
        renderUpdateFilter();
        renderUpdates();
        if (updateStatus) {
            const gotGithub = Object.keys(commits).length > 0;
            updateStatus.textContent = gotGithub ? '' : 'GitHub 기록을 지금 불러올 수 없어 일부만 표시합니다.';
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
        // 바로가기 순서대로 버튼 정렬, 포트폴리오는 맨 뒤
        const present = new Set(updatesData.map(u => u.project));
        const order = [...linksData.map(l => l.id), 'PORTFOLIO'];
        const ids = [...order.filter(id => present.has(id)), ...[...present].filter(id => !order.includes(id))];
        if (updateProject !== 'all' && !present.has(updateProject)) updateProject = 'all';
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
            const moment = entryMoment(u);
            const name = info.url
                ? `<a href="${info.url}" target="_blank" rel="noopener noreferrer">${esc(info.name)}</a>`
                : esc(info.name);
            const typeTag = u.type
                ? (u.link
                    ? `<a class="update-type type-${esc(u.type)}" href="${esc(u.link)}" target="_blank" rel="noopener noreferrer">${esc(u.type)}</a>`
                    : `<span class="update-type type-${esc(u.type)}">${esc(u.type)}</span>`)
                : '';
            return `
            <li class="update-item ${u.source === 'github' ? 'from-github' : ''}">
                <div class="update-date">
                    <strong>${esc(u.date.replace(/-/g, '.'))}</strong>
                    ${moment ? `<time class="update-time" datetime="${esc(moment)}">${kstTime(moment)}</time>` : ''}
                    <small>${moment ? relativeMoment(moment) : relativeDay(u.date)}</small>
                </div>
                <div class="update-body">
                    <div class="update-meta">
                        <span class="link-badge">${esc(info.code)}</span>
                        <span class="update-project">${name}</span>
                        ${u.version ? `<span class="update-version">${esc(u.version)}</span>` : ''}
                        ${typeTag}
                    </div>
                    ${u.title ? `<h3 class="update-title">${esc(u.title)}</h3>` : ''}
                    ${(u.items || []).length ? `<ul class="update-points">${u.items.map(i => typeof i === 'string'
                        ? `<li>${esc(i)}</li>`
                        : `<li>${esc(i.text)}${i.time ? ` <time class="update-item-time">${esc(i.time)}</time>` : ''}</li>`).join('')}</ul>` : ''}
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

    // 바로가기 아이콘에 NEW / 마지막 업데이트 표시
    function decorateLinkTiles() {
        if (!linkGrid || !linksData.length) return;
        const latestLog = {};    // 프로젝트별 가장 최근 기록 (시각이 있으면 시각, 없으면 날짜)
        updatesData.forEach(u => {
            const when = entryMoment(u) || u.date;
            if (!latestLog[u.project] || new Date(when) > new Date(latestLog[u.project])) latestLog[u.project] = when;
        });

        linksData.forEach(link => {
            const tile = linkGrid.querySelector(`.link-tile[data-id="${CSS.escape(link.id || '')}"]`);
            if (!tile) return;
            const logDate = latestLog[link.id];

            const newBadge = tile.querySelector('.link-new');
            if (logDate) {
                const days = (Date.now() - new Date(logDate).getTime()) / 86400000;
                newBadge.hidden = days > NEW_DAYS;
            }

            // 마지막 커밋 시각과 로그 날짜 중 더 최근 것을 표시
            const when = [lastPushed[link.id], logDate].filter(Boolean)
                .sort((a, b) => new Date(b) - new Date(a))[0];
            const updatedEl = tile.querySelector('.link-updated');
            if (when) {
                const hasTime = String(when).includes('T');
                updatedEl.textContent = `업데이트 ${hasTime ? relativeMoment(when) : relativeDay(when)}`;
                if (hasTime) updatedEl.title = new Date(when).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
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