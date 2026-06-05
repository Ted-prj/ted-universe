// TED'S UNIVERSE - Global Gateway Application Configuration
const GATEWAY_APPS = [
    {
        id: 'FINANCE',
        title: 'FINANCE',
        desc: '자산 및 가계부 관리 (by Nami)',
        icon: '🖤',
        color: 'rgb(232, 142, 163)', // 내 고유 핑크
        sessionKey: 'is_auth',
        targetUrl: 'finance/out.html'
    },
    {
        id: 'DIET',
        title: 'DIET',
        desc: '식단 및 체중 관리 (by Sanji)',
        icon: '🥗',
        color: '#20c997', // 상디 민트
        sessionKey: 'diet_auth',
        targetUrl: 'diet/export.html'
    },
    {
        id: 'WORKOUT',
        title: 'WORKOUT',
        desc: '루틴 및 운동 기록 (by Robin)',
        icon: '💪',
        color: '#ff6b6b', // 로빈 네온 오렌지
        sessionKey: 'workout_auth',
        targetUrl: 'workout/workout.html'
    }
    /* 나중에 앱을 추가하고 싶다면? 그냥 아래처럼 한 줄 툭 던져넣으면 끝!
    ,{
        id: 'STUDY',
        title: 'STUDY',
        desc: '공부 시간 및 몰입도 기록',
        icon: '📝',
        color: '#f1c40f',
        sessionKey: 'study_auth',
        targetUrl: 'study/main.html'
    }
    */
];