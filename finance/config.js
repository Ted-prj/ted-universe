// Blackpink Money - Global Configuration & Supabase Connection (Schema Locked to finance)
const SUPABASE_URL = 'https://vaamifqzjsrflmprihgv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhYW1pZnF6anNyZmxtcHJpaGd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzODc2NzksImV4cCI6MjA5MTk2MzY3OX0.qUUs3aoWQMEVjTQkYTZtA8CMjMF_MrgBFa4UfiiEWzI';

// Initialize Supabase Client with Default Schema set to 'finance'
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    db: { schema: 'finance' }
});

// Tab and Page Navigation Management Config (현재 자산 앱 내부 로컬 메뉴)
const TAB_CONFIG = [
    { id: 'OUT', label: 'OUT', url: 'out.html' },
    { id: 'IN', label: 'IN', url: 'in.html' },
    { id: 'TR', label: 'MOVE', url: 'move.html' },
    { id: 'ASSETS', label: 'ASSETS', url: 'assets.html' },
    { id: 'STATS', label: 'STATS', url: 'stats.html' }
];

/* ==========================================================================
   📱 FINANCE 어드민 전역 모바일 하단 고정 탭바 & 드롭업 멀티 허브 엔진 (레이아웃 분리형)
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
    const navContainer = document.getElementById('global-nav');
    if (!navContainer) return;

    const HUB_PROJECTS = [
        { name: '🥗 DIET HUB', url: '../diet/index.html' },
        { name: '🏋️‍♂️ WORKOUT HUB', url: '../workout/index.html' },
        { name: '📚 BOOKCLUB HUB', url: '../bookclub/index.html' }
    ];

    const activeId = navContainer.getAttribute('data-active');

    const inlineStyle = document.createElement('style');
    inlineStyle.innerHTML = `
        .bottom-nav-container {
            display: flex !important; align-items: center !important; justify-content: space-between !important; gap: 8px !important;
        }
        .nav-scroll-box { flex: 1 !important; overflow-x: auto !important; width: 100% !important; }
        .nav-scroll-box::-webkit-scrollbar { display: none !important; }
        .nav-scroll-box .nav-pills { flex-wrap: nowrap !important; display: flex !important; padding: 0 !important; margin: 0 !important; list-style: none !important; }
        .nav-scroll-box .nav-item { flex: 1 0 auto !important; min-width: 85px !important; text-align: center !important; }
        
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
        .dropup-item:hover, .dropup-item:active { background: rgba(232, 142, 163, 0.15) !important; color: #e88ea3 !important; }
        .dropup-item:not(:last-child) { border-bottom: 1px solid #222 !important; }
    `;
    document.head.appendChild(inlineStyle);

    const navHtml = `
        <div class="bottom-nav-container">
            <div class="nav-scroll-box">
                <ul class="nav nav-pills">
                    ${TAB_CONFIG.map(menu => `
                        <li class="nav-item">
                            <button class="nav-link ${menu.id === activeId ? 'active' : ''}" 
                                    onclick="window.location.href='${menu.url}'">
                                ${menu.label}
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