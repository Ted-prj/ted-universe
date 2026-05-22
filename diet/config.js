// Supabase 연결 설정
const SUPABASE_URL = 'https://vaamifqzjsrflmprihgv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhYW1pZnF6anNyZmxtcHJpaGd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzODc2NzksImV4cCI6MjA5MTk2MzY3OX0.qUUs3aoWQMEVjTQkYTZtA8CMjMF_MrgBFa4UfiiEWzI';
const _db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 테이블 메타데이터 정의
const DIET_TABLES = [
    { schema: 'diet', id: 'ai_rulebook', name: '1. AI 룰셋', dateCol: false },
    { schema: 'diet', id: 'user_goals', name: '2. 사용자 정보', dateCol: false },
    { schema: 'diet', id: 'project_goals', name: '3. 프로젝트 목표', dateCol: false },
    { schema: 'diet', id: 'inbody_logs', name: '4. 인바디 기록', dateCol: 'test_date' },
    { schema: 'diet', id: 'meal_logs', name: '5. 식단 로그', dateCol: 'log_date' },
    { schema: 'diet', id: 'condition_logs', name: '6. 생활/컨디션', dateCol: 'log_date' },
    { schema: 'diet', id: 'strategies', name: '7. 다이어트 전략', dateCol: false },
    { schema: 'diet', id: 'snacks', name: '8. 간식 라이브러리', dateCol: false },
    { schema: 'diet', id: 'project_schedules', name: '9. 프로젝트 스케줄', dateCol: 'plan_date', allowAdd: true },
    { schema: 'diet', id: 'sleep_logs', name: '10. 수면 로그', dateCol: 'log_date' },
    { schema: 'workout', id: 'session_logs', name: 'W1. 운동 세션 로그', dateCol: 'workout_date' },
    { schema: 'workout', id: 'logs', name: 'W2. 운동 상세 로그', dateCol: 'workout_date' },
    { schema: 'workout', id: 'active_workout', name: 'W3. 오늘의 운동', dateCol: 'created_at' }
];

// 전역 업데이트 대기 데이터 객체
let PENDING_UPDATES = {};

/* ==========================================================================
   📱 모바일 최적화 하단 고정 스크롤 탭바 동적 주입 엔진
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
    const navContainer = document.getElementById('global-nav');
    if (!navContainer) return;

    // 탭이 추가되거나 이름이 변경되면 여기 배열만 통제하면 즉시 전체 화면에 동기화됩니다.
    const NAVIGATION_MENUS = [
        { id: 'export', name: 'EXPORT', url: 'export.html' },
        { id: 'view', name: 'VIEW & EDIT', url: 'view.html' },
        { id: 'schedule', name: 'SCHEDULE', url: 'schedule.html' },
        { id: 'import', name: 'IMPORT', url: 'import.html' },
        { id: 'diethub', name: 'WORKOUT', url: 'https://ted-prj.github.io/ted-finance/workout' }
    ];

    const activeId = navContainer.getAttribute('data-active');

    const navHtml = `
        <div class="bottom-nav-container">
            <ul class="nav nav-pills">
                ${NAVIGATION_MENUS.map(menu => `
                    <li class="nav-item">
                        <button class="nav-link ${menu.id === activeId ? 'active' : ''}" 
                                onclick="window.location.href='${menu.url}'">
                            ${menu.name}
                        </button>
                    </li>
                `).join('')}
            </ul>
        </div>
    `;

    navContainer.innerHTML = navHtml;
    
    // 현재 활성화된 활성 탭 메뉴 위치로 자동 가로 스크롤 포커싱 기믹
    const activeBtn = navContainer.querySelector('.nav-link.active');
    if (activeBtn) {
        setTimeout(() => {
            activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }, 150);
    }
});