// Supabase 연결 설정
const SUPABASE_URL = 'https://vaamifqzjsrflmprihgv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhYW1pZnF6anNyZmxtcHJpaGd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzODc2NzksImV4cCI6MjA5MTk2MzY3OX0.qUUs3aoWQMEVjTQkYTZtA8CMjMF_MrgBFa4UfiiEWzI';
const _db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 테이블 메타데이터 정의 (group 속성을 통해 성격별 지능형 중앙 제어 시스템 구축)
const DIET_TABLES = [
    { schema: 'diet', id: 'ai_rulebook', name: '1. AI 룰셋', dateCol: false, group: 'master' },
    { schema: 'diet', id: 'user_goals', name: '2. 사용자 정보', dateCol: false, group: 'master' },
    { schema: 'diet', id: 'project_goals', name: '3. 프로젝트 목표', dateCol: false, group: 'master' },
    { schema: 'diet', id: 'strategies', name: '4. 다이어트 전략', dateCol: false, group: 'master' },
    { schema: 'diet', id: 'project_schedules', name: '5. 프로젝트 스케줄', dateCol: 'plan_date', allowAdd: true, group: 'master' },
    { schema: 'diet', id: 'snacks', name: '6. 간식 라이브러리', dateCol: false, group: 'master' },
    { schema: 'diet', id: 'supplements', name: '7. 섭취 영양제 리스트', dateCol: false, group: 'master' },
    { schema: 'diet', id: 'dinner_menus', name: '8. 식단 저녁 메뉴', dateCol: false, group: 'master' },
    { schema: 'diet', id: 'weekday_routine_master', name: '9. 평일 루틴 마스터', dateCol: false, group: 'master' },
    { schema: 'diet', id: 'inbody_logs', name: '10. 인바디 기록', dateCol: 'test_date', group: 'daily' },
    { schema: 'diet', id: 'meal_logs', name: '11. 식단 로그', dateCol: 'log_date', group: 'daily' },
    { schema: 'diet', id: 'condition_logs', name: '12. 생활/컨디션', dateCol: 'log_date', group: 'daily' },
    { schema: 'diet', id: 'sleep_logs', name: '13. 수면 로그', dateCol: 'log_date', group: 'daily' },
    { schema: 'workout', id: 'session_logs', name: 'W1. 운동 세션 로그', dateCol: 'workout_date', group: 'workout' },
    { schema: 'workout', id: 'logs', name: 'W2. 운동 상세 로그', dateCol: 'workout_date', group: 'workout' },
    { schema: 'workout', id: 'active_workout', name: 'W3. 오늘의 운동', dateCol: 'created_at', group: 'workout' }
];

// 전역 업데이트 대기 데이터 객체
let PENDING_UPDATES = {};

/* ==========================================================================
   📱 모바일 최적화 하단 고정 스크롤 탭바 및 상단 드롭업 멀티 프로젝트 엔진
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
    const navContainer = document.getElementById('global-nav');
    if (!navContainer) return;

    const LOCAL_MENUS = [
        { id: 'export', name: 'EXPORT', url: 'export.html' },
        { id: 'view', name: 'VIEW & EDIT', url: 'view.html' },
        { id: 'schedule', name: 'SCHEDULE', url: 'schedule.html' },
        { id: 'import', name: 'IMPORT', url: 'import.html' }
    ];

    const HUB_PROJECTS = [
        { name: '🏋️‍♂️ WORKOUT HUB', url: '../workout/index.html' },
        { name: '💰 FINANCE HUB', url: '../finance/index.html' },
        { name: '📚 BOOKCLUB HUB', url: '../bookclub/index.html' }
    ];

    const activeId = navContainer.getAttribute('data-active');

    // 💡 세로 잘림 방지 및 가레이아웃 분리용 고성능 인라인 스타일 인젝션
    const inlineStyle = document.createElement('style');
    inlineStyle.innerHTML = `
        .bottom-nav-container {
            display: flex !important; align-items: center !important; justify-content: space-between !important; gap: 8px !important;
        }
        .nav-scroll-box { flex: 1 !important; overflow-x: auto !important; width: 100% !important; }
        .nav-scroll-box::-webkit-scrollbar { display: none !important; }
        .nav-scroll-box .nav-pills { flex-wrap: nowrap !important; display: flex !important; padding: 0 !important; margin: 0 !important; list-style: none !important; }
        .nav-scroll-box .nav-item { flex: 1 0 auto !important; min-width: 90px !important; text-align: center !important; }
        
        .dropup-wrapper { position: relative !important; flex: 0 0 auto !important; z-index: 1060 !important; }
        .hub-toggle-btn {
            color: #ff3f7e !important; border: 1px dashed rgba(255, 63, 126, 0.6) !important;
            background: rgba(255, 63, 126, 0.05) !important; font-weight: 900 !important; border-radius: 12px !important;
            padding: 8px 12px !important; font-size: 0.72rem !important; white-space: nowrap !important; transition: 0.2s !important;
        }
        .hub-toggle-btn:active { background: rgba(255, 63, 126, 0.2) !important; }
        
        .dropup-menu-container {
            position: absolute !important; bottom: calc(100% + 12px) !important; right: 0 !important;
            background: rgba(18, 18, 18, 0.98) !important; backdrop-filter: blur(20px) !important; -webkit-backdrop-filter: blur(20px) !important;
            border: 1px solid #282828 !important; border-radius: 16px !important; min-width: 160px !important;
            padding: 8px 0 !important; opacity: 0 !important; transform: translateY(10px) !important; visibility: hidden !important;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.7) !important; z-index: 1100 !important;
        }
        .dropup-menu-container.show { opacity: 1 !important; transform: translateY(0) !important; visibility: visible !important; }
        .dropup-item {
            display: block !important; width: 100% !important; padding: 12px 16px !important; text-align: left !important;
            color: #ccc !important; font-weight: 700 !important; font-size: 0.75rem !important; border: none !important;
            background: transparent !important; text-decoration: none !important; transition: 0.2s !important;
        }
        .dropup-item:hover, .dropup-item:active { background: rgba(232, 142, 163, 0.15) !important; color: var(--bp-pink) !important; }
        .dropup-item:not(:last-child) { border-bottom: 1px solid #222 !important; }
    `;
    document.head.appendChild(inlineStyle);

    // 🛠️ 핵심 변경: 탭 스크롤 박스와 HUB 팝업 래퍼를 수평 분리 조립
    const navHtml = `
        <div class="bottom-nav-container">
            <div class="nav-scroll-box">
                <ul class="nav nav-pills">
                    ${LOCAL_MENUS.map(menu => `
                        <li class="nav-item">
                            <button class="nav-link ${menu.id === activeId ? 'active' : ''}" 
                                    onclick="window.location.href='${menu.url}'">
                                ${menu.name}
                            </button>
                        </li>
                    `).join('')}
                </ul>
            </div>
            
            <div class="dropup-wrapper">
                <button class="hub-toggle-btn" onclick="window.toggleProjectHub(event)">
                    HUB 🚀
                </button>
                <div id="project-dropup-menu" class="dropup-menu-container">
                    ${HUB_PROJECTS.map(proj => `
                        <a href="${proj.url}" class="dropup-item">${proj.name}</a>
                    `).join('')}
                </div>
            </div>
        </div>
    `;

    navContainer.innerHTML = navHtml;

    window.toggleProjectHub = (e) => {
        e.stopPropagation();
        const menu = document.getElementById('project-dropup-menu');
        if (menu) menu.classList.toggle('show');
    };

    document.addEventListener('click', () => {
        const menu = document.getElementById('project-dropup-menu');
        if (menu && menu.classList.contains('show')) {
            menu.classList.remove('show');
        }
    });

    const activeBtn = navContainer.querySelector('.nav-link.active');
    if (activeBtn) {
        setTimeout(() => {
            activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }, 150);
    }
});