/* ==========================================================================
   🌌 TED'S UNIVERSE - 전역 통합 SSO 인증 및 네비게이션 중앙 제어 오케스트레이터
   ========================================================================== */

// 1. 🔒 글로벌 마스터 인증 차단막 엔진 (대문 index.html 페이지는 무한 루프 방지를 위해 예외 처리)
const _currentPath = window.location.pathname;
const _isGatewayHome = _currentPath.endsWith('index.html') || _currentPath === '/' || _currentPath.split('/').pop() === '';

if (!_isGatewayHome) {
    if (sessionStorage.getItem('ted_universe_auth') !== 'true') {
        // 현재 실행 중인 뎁스를 계산하여 루트의 게이트웨이 화면으로 정확히 추방
        const isSubApp = _currentPath.includes('/diet/') || _currentPath.includes('/workout/') || _currentPath.includes('/finance/');
        window.location.href = isSubApp ? '../index.html' : 'index.html';
    }
}

// 2. 📱 동적 하단 탭바 & 드롭업 허브 인젝션 엔진
document.addEventListener('DOMContentLoaded', () => {
    const navContainer = document.getElementById('global-nav');
    if (!navContainer) return;

    // 현재 내가 어떤 프로젝트 도메인 권역에 있는지 실시간 감지
    let currentApp = 'GATEWAY';
    let pathPrefix = './'; // 타 프로젝트로 넘어갈 때 붙일 경로 접두사 디폴트

    if (_currentPath.includes('/diet/')) { currentApp = 'DIET'; pathPrefix = '../'; }
    else if (_currentPath.includes('/workout/')) { currentApp = 'WORKOUT'; pathPrefix = '../'; }
    else if (_currentPath.includes('/finance/')) { currentApp = 'FINANCE'; pathPrefix = '../'; }

    // [A] 앱 환경별 로컬 메뉴 스위칭 사전 정의
    let localMenus = [];
    if (currentApp === 'DIET') {
        localMenus = [
            { id: 'export', name: 'EXPORT', url: 'export.html' },
            { id: 'view', name: 'VIEW & EDIT', url: 'view.html' },
            { id: 'schedule', name: 'SCHEDULE', url: 'schedule.html' },
            { id: 'import', name: 'IMPORT', url: 'import.html' },
            { id: 'prompt', name: 'PROMPT', url: 'prompt.html' }
        ];
    } else if (currentApp === 'WORKOUT') {
        localMenus = [
            { id: 'workout', name: 'WORKOUT', url: 'workout.html' },
            { id: 'manage', name: 'MANAGE', url: 'manage.html' },
            { id: 'settings', name: 'SETTINGS', url: 'settings.html' },
            { id: 'dashboard', name: 'DASHBOARD', url: 'dashboard.html' },
            { id: 'logs', name: 'LOGS', url: 'logs.html' }
        ];
    } else if (currentApp === 'FINANCE') {
        localMenus = [
            { id: 'OUT', name: 'OUT', url: 'out.html' },
            { id: 'IN', name: 'IN', url: 'in.html' },
            { id: 'TR', name: 'MOVE', url: 'move.html' },
            { id: 'ASSETS', name: 'ASSETS', url: 'assets.html' },
            { id: 'STATS', name: 'STATS', url: 'stats.html' }
        ];
    }

    // [B] 드롭업 허브 프로젝트 리스트 (중앙 제어 대상 - 여기에 추가하면 전 우주 동시 생성)
    const HUB_PROJECTS = [
        { name: '🥗 DIET HUB', url: `${pathPrefix}diet/export.html` },
        { name: '🏋️‍♂️ WORKOUT HUB', url: `${pathPrefix}workout/workout.html` },
        { name: '💰 FINANCE HUB', url: `${pathPrefix}finance/out.html` }
        // 🚀 추후 프로젝트 확장 라인 예시
        // ,{ name: '📚 BOOKCLUB HUB', url: `${pathPrefix}bookclub/index.html` }
    ];

    const activeId = navContainer.getAttribute('data-active');

    // [C] 팝업 잘림 및 스크롤 충돌 방지용 가상 스타일 인젝션
    const inlineStyle = document.createElement('style');
    inlineStyle.innerHTML = `
        .bottom-nav-container { display: flex !important; align-items: center !important; justify-content: space-between !important; gap: 8px !important; }
        .nav-scroll-box { flex: 1 !important; overflow-x: auto !important; width: 100% !important; }
        .nav-scroll-box::-webkit-scrollbar { display: none !important; }
        .nav-scroll-box .nav-pills { flex-wrap: nowrap !important; display: flex !important; padding: 0 !important; margin: 0 !important; list-style: none !important; }
        .nav-scroll-box .nav-item { flex: 1 0 auto !important; min-width: 85px !important; text-align: center !important; }
        .dropup-wrapper { position: relative !important; flex: 0 0 auto !important; z-index: 1060 !important; }
        .hub-toggle-btn { color: #ff3f7e !important; border: 1px dashed rgba(255, 63, 126, 0.6) !important; background: rgba(255, 63, 126, 0.05) !important; font-weight: 900 !important; border-radius: 12px !important; padding: 8px 12px !important; font-size: 0.72rem !important; white-space: nowrap !important; transition: 0.2s !important; }
        .hub-toggle-btn:active { background: rgba(255, 63, 126, 0.2) !important; }
        .dropup-menu-container { position: absolute !important; bottom: calc(100% + 12px) !important; right: 0 !important; background: rgba(18, 18, 18, 0.98) !important; backdrop-filter: blur(20px) !important; border: 1px solid #282828 !important; border-radius: 16px !important; min-width: 160px !important; padding: 8px 0 !important; opacity: 0 !important; transform: translateY(10px) !important; visibility: hidden !important; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.7) !important; z-index: 1100 !important; }
        .dropup-menu-container.show { opacity: 1 !important; transform: translateY(0) !important; visibility: visible !important; }
        .dropup-item { display: block !important; width: 100% !important; padding: 12px 16px !important; text-align: left !important; color: #ccc !important; font-weight: 700 !important; font-size: 0.75rem !important; border: none !important; background: transparent !important; text-decoration: none !important; transition: 0.2s !important; }
        .dropup-item:hover, .dropup-item:active { background: rgba(232, 142, 163, 0.15) !important; color: #e88ea3 !important; }
        .dropup-item:not(:last-child) { border-bottom: 1px solid #222 !important; }
    `;
    document.head.appendChild(inlineStyle);

    // [D] 하단 바 HTML 렌더링 조립 (게이트웨이 홈화면인 경우 하단 바를 숨김 처리)
    if (currentApp !== 'GATEWAY') {
        const navHtml = `
            <div class="bottom-nav-container">
                <div class="nav-scroll-box">
                    <ul class="nav nav-pills">
                        ${localMenus.map(menu => `
                            <li class="nav-item">
                                <a href="${menu.url}" class="nav-link ${menu.id === activeId ? 'active' : ''}" style="text-decoration:none;">
                                    ${menu.name}
                                </a>
                            </li>
                        `).join('')}
                    </ul>
                </div>
                <div class="dropup-wrapper">
                    <button class="hub-toggle-btn" onclick="window.toggleProjectHub(event)">HUB 🚀</button>
                    <div id="project-dropup-menu" class="dropup-menu-container">
                        ${HUB_PROJECTS.map(proj => `<a href="${proj.url}" class="dropup-item">${proj.name}</a>`).join('')}
                    </div>
                </div>
            </div>
        `;
        navContainer.innerHTML = navHtml;
    }

    // [E] 클릭 팝업 토글 핸들러 규격 바인딩
    window.toggleProjectHub = (e) => {
        e.stopPropagation();
        const menu = document.getElementById('project-dropup-menu');
        if (menu) menu.classList.toggle('show');
    };

    document.addEventListener('click', () => {
        const menu = document.getElementById('project-dropup-menu');
        if (menu && menu.classList.contains('show')) menu.classList.remove('show');
    });

    const activeBtn = navContainer.querySelector('.nav-link.active');
    if (activeBtn) {
        setTimeout(() => { activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }); }, 150);
    }
});