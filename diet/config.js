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
    { schema: 'workout', id: 'session_exercises', name: 'W2. 운동 종목 로그', dateCol: 'workout_date', group: 'workout' },
    { schema: 'workout', id: 'logs', name: 'W3. 운동 세트 로그', dateCol: 'workout_date', group: 'workout' },
    { schema: 'workout', id: 'active_workout', name: 'W3. 오늘의 운동', dateCol: 'created_at', group: 'workout' }
];

// 전역 업데이트 대기 데이터 객체
let PENDING_UPDATES = {};