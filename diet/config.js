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
    { schema: 'workout', id: 'session_logs', name: 'W1. 운동 세션 로그', dateCol: 'workout_date' },
    { schema: 'workout', id: 'logs', name: 'W2. 운동 상세 로그', dateCol: 'workout_date' }
];

// 전역 업데이트 대기 데이터 객체
let PENDING_UPDATES = {};