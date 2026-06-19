const SUPABASE_URL = 'https://vaamifqzjsrflmprihgv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhYW1pZnF6anNyZmxtcHJpaGd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzODc2NzksImV4cCI6MjA5MTk2MzY3OX0.qUUs3aoWQMEVjTQkYTZtA8CMjMF_MrgBFa4UfiiEWzI';
const _db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

function getSmartDate() {
    const now = new Date();
    if(now.getHours() < 6 && confirm("새벽입니다. 어제 날짜로 기록할까요?")) now.setDate(now.getDate() - 1);
    return {
        full: now.toISOString(),
        justDate: now.toISOString().split('T')[0],
        idStr: now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0')
    };
}

function getPartKey(b) {
    if (b && b.includes('가슴')) return 'chest';
    if (b && b.includes('등')) return 'back';
    if (b && b.includes('어깨')) return 'shoulder';
    if (b && b.includes('하체')) return 'leg';
    return 'etc';
}

async function getDetailedStats(exId, setNo = null) {
    const { data } = await _db.schema('workout').from('logs').select('*').eq('exercise_id', exId).eq('status', 'FINAL').order('workout_date', {ascending:false});
    if(!data || data.length === 0) return { best: '-', bestLog: {date:'-', note:''}, recentConfigs: [], lastStr: '-', lastNote: '' };
    const bestLog = data.reduce((a, b) => { const volA = (a.weight * a.reps) || a.workout_time; const volB = (b.weight * b.reps) || b.workout_time; return volA >= volB ? a : b; });
    const lastLog = setNo ? data.find(d => d.set_no === setNo) : data[0];
    const format = (l) => l ? (l.weight ? `${l.weight}x${l.reps}` : `${l.workout_time}m`) : '-';
    const configs = [...new Set(data.slice(0,10).map(l => `${l.equipment_type||''}/${l.grip_type||''}`.replace(/\/$/,'')))].slice(0,3);
    return { best: format(bestLog), bestLog: { date: bestLog.workout_date.split('T')[0], note: bestLog.note, weight: bestLog.weight, reps: bestLog.reps, time: bestLog.workout_time, equip: bestLog.equipment_type, grip: bestLog.grip_type, lying: bestLog.lying_type }, recentConfigs: configs, lastStr: format(lastLog), lastNote: lastLog?.note || '' };
}