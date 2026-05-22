// =========================================================================
// [독한녀들 Book Club - Supabase 핵심 설정 및 전역 인증 인프라]
// 설명: 아이콘 렌더링 누락 에러를 해결하기 위해 100% 호환되는 fa-toolbox로 무기를 교체합니다.
// =========================================================================

const SUPABASE_URL = 'https://vaamifqzjsrflmprihgv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhYW1pZnF6anNyZmxtcHJpaGd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzODc2NzksImV4cCI6MjA5MTk2MzY3OX0.qUUs3aoWQMEVjTQkYTZtA8CMjMF_MrgBFa4UfiiEWzI';

// 기본 public 구역이 아닌, 우리가 제련한 bookclub 스키마 공간을 기본 타겟으로 설정!
const _db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    db: { schema: 'bookclub' }
});

// 공통 인증 체크 유틸
function checkAuth() {
    if (!localStorage.getItem("login_member")) {
        window.location.href = "index.html";
    }
}

// 로그인 세션 멤버 반환 유틸
function getLoggedInMember() {
    return localStorage.getItem("login_member") || "공주님";
}

/* ==========================================================================
   👑 BOOK CLUB 전역 모바일 가로 스크롤 동적 하단 내비게이션 엔진 (Zoro-DIET Hub Architecture)
   ========================================================================= */
document.addEventListener('DOMContentLoaded', () => {
    const navContainer = document.getElementById('global-nav');
    if (!navContainer) return;

    // 💡 시크릿 운영 아이콘을 인식이 가장 확실한 'fa-solid fa-toolbox'(시크릿 공구함)로 전격 교체!
    const NAVIGATION_MENUS = [
        { id: 'feed', name: '소통 피드', url: 'feed.html', icon: 'fa-solid fa-rss' },
        { id: 'write', name: '비밀 기록', url: 'write.html', icon: 'fa-solid fa-pen-to-square' },
        { id: 'manage', name: '시크릿 운영', url: 'manage.html', icon: 'fa-solid fa-toolbox' },
        { id: 'dashboard', name: '핑크 라운지', url: 'dashboard.html', icon: 'fa-solid fa-crown' }
    ];

    const activeId = navContainer.getAttribute('data-active');

    const navHtml = `
        <div class="bottom-nav-container">
            <div class="bottom-nav-scroll-wrapper">
                ${NAVIGATION_MENUS.map(menu => `
                    <a href="${menu.url}" class="bottom-nav-item-link ${menu.id === activeId ? 'active' : ''}">
                        <i class="${menu.icon}"></i>
                        <span>${menu.name}</span>
                    </a>
                `).join('')}
            </div>
        </div>
    `;

    navContainer.innerHTML = navHtml;
    
    // 현재 활성화된 탭 위치로 자동 가로 스크롤 포커싱 최적화 기믹
    const activeBtn = navContainer.querySelector('.bottom-nav-item-link.active');
    if (activeBtn) {
        setTimeout(() => {
            activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }, 150);
    }
});