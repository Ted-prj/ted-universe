const SUPABASE_URL = 'https://vaamifqzjsrflmprihgv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhYW1pZnF6anNyZmxtcHJpaGd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzODc2NzksImV4cCI6MjA5MTk2MzY3OX0.qUUs3aoWQMEVjTQkYTZtA8CMjMF_MrgBFa4UfiiEWzI';
const _db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 공통 인증 체크 함수
function checkAuth() {
    if (sessionStorage.getItem('workout_auth') !== 'true') {
        window.location.href = 'index.html';
    }
}

// 스마트 데이트 (새벽 6시 기준)
function getSmartDate() {
    const now = new Date();
    if(now.getHours() < 6 && confirm("새벽입니다. 어제 날짜로 기록할까요?")) now.setDate(now.getDate() - 1);
    return {
        full: now.toISOString(),
        justDate: now.toISOString().split('T')[0],
        idStr: now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0')
    };
}

// 부위별 색상 키
function getPartKey(b) {
    if (b && b.includes('가슴')) return 'chest';
    if (b && b.includes('등')) return 'back';
    if (b && b.includes('어깨')) return 'shoulder';
    if (b && b.includes('하체')) return 'leg';
    return 'etc';
}

// 상세 통계 조회 (BEST & Last)
async function getDetailedStats(exId, setNo = null) {
    const { data } = await _db.schema('workout').from('logs').select('*').eq('exercise_id', exId).eq('status', 'FINAL').order('workout_date', {ascending:false});
    if(!data || data.length === 0) return { best: '-', bestLog: {date:'-', note:''}, recentConfigs: [], lastStr: '-', lastNote: '' };
    
    const bestLog = data.reduce((a, b) => {
        const volA = (a.weight * a.reps) || a.workout_time;
        const volB = (b.weight * b.reps) || b.workout_time;
        return volA >= volB ? a : b;
    });
    
    const lastLog = setNo ? data.find(d => d.set_no === setNo) : data[0];
    const format = (l) => l ? (l.weight ? `${l.weight}x${l.reps}` : `${l.workout_time}m`) : '-';
    const configs = [...new Set(data.slice(0,10).map(l => `${l.equipment_type||''}/${l.grip_type||''}`.replace(/\/$/,'')))].slice(0,3);
    
    return { 
        best: format(bestLog), 
        bestLog: { 
            date: bestLog.workout_date.split('T')[0], 
            note: bestLog.note, weight: bestLog.weight, reps: bestLog.reps, 
            time: bestLog.workout_time, equip: bestLog.equipment_type, 
            grip: bestLog.grip_type, lying: bestLog.lying_type 
        }, 
        recentConfigs: configs, 
        lastStr: format(lastLog), 
        lastNote: lastLog?.note || '' 
    };
}

/* ==========================================================================
   📱 WORKOUT 앱 전역 모바일 횡방향 스크롤 내비게이션 동적 주입 엔진 (v5.4.9)
   ========================================================================= */
document.addEventListener('DOMContentLoaded', () => {
    const navContainer = document.getElementById('global-nav');
    if (!navContainer) return;

    // 💡 테드! 이제 여기 배열에 한 줄만 추가하면 모든 탭 화면에 실시간 동기화 완료!
    const NAVIGATION_MENUS = [
        { id: 'workout', name: 'WORKOUT', url: 'workout.html' },
        { id: 'manage', name: 'MANAGE', url: 'manage.html' },
        { id: 'settings', name: 'SETTINGS', url: 'settings.html' },
        { id: 'logs', name: 'LOGS', url: 'logs.html' },
        // 💖 명세 반영: 테드의 DIET HUB 외부 깃허브 주소 파이프라인 연결
        { id: 'diethub', name: 'DIET HUB', url: 'https://ted-prj.github.io/ted-finance/diet' }
    ];

    const activeId = navContainer.getAttribute('data-active');

    const navHtml = `
        <div class="bottom-nav-container">
            <ul class="nav nav-pills">
                ${NAVIGATION_MENUS.map(menu => `
                    <li class="nav-item">
                        <a href="${menu.url}" class="nav-link ${menu.id === activeId ? 'active' : ''}">
                            ${menu.name}
                        </a>
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