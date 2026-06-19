// Blackpink Money - Global Configuration & Supabase Connection (Schema Locked to finance)
const SUPABASE_URL = 'https://vaamifqzjsrflmprihgv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhYW1pZnF6anNyZmxtcHJpaGd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzODc2NzksImV4cCI6MjA5MTk2MzY3OX0.qUUs3aoWQMEVjTQkYTZtA8CMjMF_MrgBFa4UfiiEWzI';

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    db: { schema: 'finance' }
});

const TAB_CONFIG = [
    { id: 'OUT', label: 'OUT', url: 'out.html' },
    { id: 'IN', label: 'IN', url: 'in.html' },
    { id: 'TR', label: 'MOVE', url: 'move.html' },
    { id: 'ASSETS', label: 'ASSETS', url: 'assets.html' },
    { id: 'STATS', label: 'STATS', url: 'stats.html' }
];