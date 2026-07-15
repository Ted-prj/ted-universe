/**
 * 🏋️‍♂️ BLACKPINK WORKOUT - Core Data Layer & Transaction Engine (v5.7.5 - Sanji Clean)
 * Prepared by Chef Sanji for Ted's Universe
 * [BUGFIX]: processFinalSave 내의 구조분해 할당 치명적 오타 전면 수정 완료
 */

// 파일 간의 안전한 참조를 위해 전역 window 스펙으로 스페이스 확장
window.EX_MASTER = [];
window.SETTINGS_CODE = { 
    'EXERCISE_TYPE': [], 
    'BODY_PART': [], 
    'EQUIPMENT': [], 
    'WEIGHT_SUB_TYPE': [], 
    'GRIP': [], 
    'LYING': [] 
};
window.SETTINGS_LOOKUP = {};
window.ACTIVE_SETS = [];

// 스마트폰 메모리 가속 버퍼 캐시 보관소
window.STATS_CACHE = {
    bestSe: [],
    logs: []
};

// Supabase 및 기초 코드 메타 로드 엔진 (호출은 HTML 내부 최하단에서 안전하게 진행)
async function init() {
    try {
        const { data: sData } = await _db.schema('workout').from('settings').select('*');
        if (sData) {
            sData.forEach(s => { 
                window.SETTINGS_LOOKUP[s.id] = s.name;
                if (window.SETTINGS_CODE[s.category]) {
                    window.SETTINGS_CODE[s.category].push({ id: s.id, name: s.name });
                }
            });
        }
        const { data: eData } = await _db.schema('workout').from('exercises').select('*').order('name');
        window.EX_MASTER = eData || [];

        document.getElementById('q-type').innerHTML = window.SETTINGS_CODE['EXERCISE_TYPE'].map(t => `<option value="${t.id}">${t.name}</option>`).join('');
        document.getElementById('q-buwi').innerHTML = window.SETTINGS_CODE['BODY_PART'].map(b => `<option value="${b.id}">${b.name}</option>`).join('');
        
        if (window.handleTypeChange) {
            await window.handleTypeChange(document.getElementById('q-type').value);
        }
        if (window.refreshActiveList) {
            await window.refreshActiveList();
        }
    } catch (err) {
        console.error("상디의 주방 마스터 초기화 에러 터짐:", err);
    }
}

// 최종 합산 중량 연산 엔진 (덤벨 2배수 및 올림픽 바 20kg 보정 매퍼)
function calculateFinalWeight(weight, weightTypeId, equipTypeId) {
    let multiplier = 1;
    if ([26, 28, 46].includes(Number(weightTypeId))) {
        multiplier = 2;
    }
    let baseWeight = 0;
    if ([47, 48].includes(Number(equipTypeId))) {
        baseWeight = 20;
    }
    return (Number(weight) * multiplier) + baseWeight;
}

// 고성능 하이브리드 로컬 캐시/실시간 전적 분석기 (2중 자가 복원 자가 수선 필터링 장착)
async function getDetailedStats(exId, setNo = null) {
    if (typeof _getDetailedStats === 'function') {
        return await _getDetailedStats(exId, setNo);
    }
    try {
        const cachedBestSe = window.STATS_CACHE?.bestSe?.find(se => se.exercise_id === exId);
        const cachedLogs = window.STATS_CACHE?.logs?.filter(l => l.exercise_id === exId) || [];

        let best = "볼륨 기록 없음"; 
        let bestLog = { weight: 0, reps: 0, date: '-', note: '', weight_type: null, equipment_type: null, equip: null, grip: null, lying: null };
        let lastStr = "이력 없음"; 
        let lastNote = ""; 
        let lastPauseCount = 0;

        // --- 🏆 1. BEST 볼륨 및 메타 복원 로직 ---
        if (cachedBestSe) {
            const vol = Number(cachedBestSe.total_volume || 0);
            const ex = window.EX_MASTER.find(e => e.id === exId);
            const isCardio = (ex && window.SETTINGS_LOOKUP[ex.exercise_type] === '유산소');

            if (isCardio) {
                best = `${vol.toLocaleString()}분`;
            } else if (vol === 0) {
                const targetLogs = cachedLogs.filter(l => l.session_id === cachedBestSe.session_id);
                const totalReps = targetLogs.reduce((sum, l) => sum + Number(l.reps || 0), 0);
                best = `총 ${totalReps}회 (맨몸, ${targetLogs.length}S)`;
            } else {
                best = `${vol.toLocaleString()}kg`;
            }

            let parsedDate = '-';
            if (cachedBestSe.created_at) {
                parsedDate = cachedBestSe.created_at.split('T')[0];
            } else if (cachedBestSe.session_id) {
                const match = cachedBestSe.session_id.match(/^(\d{4})(\d{2})(\d{2})/);
                if (match) parsedDate = `${match[1]}-${match[2]}-${match[3]}`;
            }

            const targetSetLogs = [...cachedLogs].filter(l => l.session_id === cachedBestSe.session_id)
                .sort((a, b) => b.set_no - a.set_no);

            if (targetSetLogs.length > 0) {
                const lastLog = targetSetLogs[0];
                bestLog = { 
                    weight: lastLog.weight !== null && lastLog.weight !== undefined ? Number(lastLog.weight) : 0, 
                    reps: lastLog.reps !== null && lastLog.reps !== undefined ? Number(lastLog.reps) : 0, 
                    date: parsedDate, note: lastLog.note || '', 
                    weight_type: lastLog.weight_type, equipment_type: lastLog.equipment_type, equip: lastLog.equipment_type,
                    grip: lastLog.grip_type, lying: lastLog.lying_type, set_time: lastLog.set_time, time: lastLog.workout_time,
                    machine_lv: lastLog.level, machine_speed: lastLog.machine_speed, heart_rate: lastLog.heart_rate
                }; 
            } else {
                bestLog.date = parsedDate;
            }
        } else {
            const { data: bestSe } = await _db.schema('workout').from('session_exercises')
                .select('*').eq('exercise_id', exId).eq('is_best_volume', true).limit(1);

            if (bestSe && bestSe.length > 0) {
                const se = bestSe[0];
                const vol = Number(se.total_volume || 0);
                const ex = window.EX_MASTER.find(e => e.id === exId);
                const isCardio = (ex && window.SETTINGS_LOOKUP[ex.exercise_type] === '유산소');

                if (isCardio) {
                    best = `${vol.toLocaleString()}분`;
                } else if (vol === 0) {
                    const { data: sets } = await _db.schema('workout').from('logs').select('reps').eq('session_id', se.session_id).eq('exercise_id', exId);
                    const totalReps = sets ? sets.reduce((sum, l) => sum + Number(l.reps || 0), 0) : 0;
                    best = `총 ${totalReps}회 (맨몸, ${sets?.length || 0}S)`;
                } else {
                    best = `${vol.toLocaleString()}kg`;
                }

                let parsedDate = se.created_at ? se.created_at.split('T')[0] : '-';

                const { data: lastSetLogs } = await _db.schema('workout').from('logs')
                    .select('*').eq('session_id', se.session_id).eq('exercise_id', exId).order('set_no', { ascending: false }).limit(1);

                if (lastSetLogs && lastSetLogs.length > 0) {
                    const lastLog = lastSetLogs[0];
                    bestLog = { 
                        weight: Number(lastLog.weight || 0), reps: Number(lastLog.reps || 0), date: parsedDate, note: lastLog.note || '', 
                        weight_type: lastLog.weight_type, equipment_type: lastLog.equipment_type, equip: lastLog.equipment_type,
                        grip: lastLog.grip_type, lying: lastLog.lying_type, set_time: lastLog.set_time, time: lastLog.workout_time,
                        machine_lv: lastLog.level, machine_speed: lastLog.machine_speed, heart_rate: lastLog.heart_rate
                    }; 
                }
            } else {
                const { data: allLogs } = await _db.schema('workout').from('logs').select('*').eq('exercise_id', exId);
                if (allLogs && allLogs.length > 0) {
                    const groups = {};
                    const ex = window.EX_MASTER.find(e => e.id === exId);
                    const isCardio = (ex && window.SETTINGS_LOOKUP[ex.exercise_type] === '유산소');

                    allLogs.forEach(log => {
                        const dStr = log.workout_date ? log.workout_date.split('T')[0] : '9999-12-31';
                        if (!groups[dStr]) {
                            groups[dStr] = { date: dStr, logs: [], totalVolume: 0, maxSetNo: -1, lastSetLog: null };
                        }
                        groups[dStr].logs.push(log);
                        groups[dStr].totalVolume += isCardio ? Number(log.workout_time || 0) : (Number(log.weight || 0) * Number(log.reps || 0));
                        
                        if (Number(log.set_no || 0) > groups[dStr].maxSetNo) {
                            groups[dStr].maxSetNo = Number(log.set_no || 0);
                            groups[dStr].lastSetLog = log;
                        }
                    });

                    let bestGroup = null;
                    Object.values(groups).forEach(g => {
                        if (!bestGroup || g.totalVolume > bestGroup.totalVolume || (g.totalVolume === bestGroup.totalVolume && g.date > bestGroup.date)) {
                            bestGroup = g;
                        }
                    });

                    if (bestGroup && bestGroup.lastSetLog) {
                        const lastLog = bestGroup.lastSetLog;
                        if (isCardio) {
                            best = `${bestGroup.totalVolume.toLocaleString()}분`;
                        } else if (bestGroup.totalVolume === 0) {
                            const totalReps = bestGroup.logs.reduce((sum, l) => sum + Number(l.reps || 0), 0);
                            best = `총 ${totalReps}회 (맨몸, ${bestGroup.logs.length}S)`;
                        } else {
                            best = `${bestGroup.totalVolume.toLocaleString()}kg`;
                        }

                        bestLog = { 
                            weight: Number(lastLog.weight || 0), reps: Number(lastLog.reps || 0), date: bestGroup.date, note: lastLog.note || '', 
                            weight_type: lastLog.weight_type, equipment_type: lastLog.equipment_type, equip: lastLog.equipment_type,
                            grip: lastLog.grip_type, lying: lastLog.lying_type, set_time: lastLog.set_time, time: lastLog.workout_time,
                            machine_lv: lastLog.level, machine_speed: lastLog.machine_speed, heart_rate: lastLog.heart_rate
                        };
                    }
                }
            }
        }

        // --- ⏮️ 2. 지난 세트별 히스토리 매핑 로직 ---
        if (window.STATS_CACHE?.logs && window.STATS_CACHE.logs.length > 0) {
            const matchedLastLog = setNo ? cachedLogs.find(l => Number(l.set_no) === Number(setNo)) : cachedLogs[0];
            if (matchedLastLog) {
                lastStr = `${matchedLastLog.weight}kg x ${matchedLastLog.reps}회`;
                lastNote = matchedLastLog.note || "";
                lastPauseCount = matchedLastLog.pause_count || 0;
            }
        } else {
            const query = _db.schema('workout').from('logs').select('*').eq('exercise_id', exId); 
            if (setNo) query.eq('set_no', setNo);
            
            const { data: lastLogs } = await query.order('workout_date', { ascending: false }).limit(1);
            if (lastLogs && lastLogs.length > 0) { 
                lastStr = `${lastLogs[0].weight}kg x ${lastLogs[0].reps}회`; 
                lastNote = lastLogs[0].note || ""; 
                lastPauseCount = lastLogs[0].pause_count || 0; 
            }
        }

        return { best, bestLog, recentConfigs: [], lastStr, lastNote, lastPauseCount };
    } catch (e) { 
        console.error("상디의 고성능 워프 스피드 분석기 구동 에러:", e);
        return { best: "볼륨 기록 없음", bestLog: {}, recentConfigs: [], lastStr: "이력 없음", lastNote: "", lastPauseCount: 0 }; 
    }
}

// 3성급 멀티 세션 동시 트랜잭션 대용량 세이브 파이프라인
async function processFinalSave() {
    if (window.ACTIVE_SETS.some(s => s.status === 'TEMP')) {
        return alert("저장 안 된 세트가 남아있어! (전부 SAVE 버튼을 눌러줘)");
    }
    
    const smartDate = window.getSmartDate(); 
    const { data: existingSessions } = await _db.schema('workout').from('session_logs').select('id').like('id', `${smartDate.idStr}_%`); 
    let sessionCounter = (existingSessions?.length || 0) + 1;
    
    const sessionLogsToInsert = [];
    let weightSessionId = null;
    let cardioSessionId = null;

    const weightDurEl = document.getElementById('s-duration-weight');
    const cardioDurEl = document.getElementById('s-duration-cardio');

    if (weightDurEl) {
        weightSessionId = `${smartDate.idStr}_S${sessionCounter++}`;
        sessionLogsToInsert.push({
            id: weightSessionId,
            workout_date: smartDate.justDate,
            duration_min: Number(weightDurEl.value || 0),
            active_calories: Number(document.getElementById('s-active-cal-weight').value || 0),
            total_calories: Number(document.getElementById('s-total-cal-weight').value || 0),
            avg_heart_rate: Number(document.getElementById('s-avg-hr-weight').value || 0),
            min_heart_rate: Number(document.getElementById('s-min-hr-weight').value || 0),
            max_heart_rate: Number(document.getElementById('s-max-hr-weight').value || 0)
        });
    }

    if (cardioDurEl) {
        cardioSessionId = `${smartDate.idStr}_S${sessionCounter++}`;
        sessionLogsToInsert.push({
            id: cardioSessionId,
            workout_date: smartDate.justDate,
            duration_min: Number(cardioDurEl.value || 0),
            active_calories: Number(document.getElementById('s-active-cal-cardio').value || 0),
            total_calories: Number(document.getElementById('s-total-cal-cardio').value || 0),
            avg_heart_rate: Number(document.getElementById('s-avg-hr-cardio').value || 0),
            min_heart_rate: Number(document.getElementById('s-min-hr-cardio').value || 0),
            max_heart_rate: Number(document.getElementById('s-max-hr-cardio').value || 0)
        });
    }

    if (sessionLogsToInsert.length > 0) {
        const { error: sessError } = await _db.schema('workout').from('session_logs').insert(sessionLogsToInsert);
        if (sessError) return alert("세션 메타데이터 저장 실패: " + sessError.message);
    }

    const uniqueExercises = [...new Set(window.ACTIVE_SETS.map(s => s.exercise_id))];
    const sessionExPayload = uniqueExercises.map(exId => {
        const sets = window.ACTIVE_SETS.filter(s => s.exercise_id === exId);
        const ex = window.EX_MASTER.find(e => e.id === exId);
        const isCardio = (ex && window.SETTINGS_LOOKUP[ex.exercise_type] === '유산소');
        
        const totalVol = isCardio
            ? sets.reduce((sum, s) => sum + Number(s.workout_time || 0), 0)
            : sets.reduce((sum, s) => sum + (Number(s.weight || 0) * Number(s.reps || 0)), 0);

        const targetSessionId = isCardio ? (cardioSessionId || weightSessionId) : (weightSessionId || cardioSessionId);

        return {
            session_id: targetSessionId,
            exercise_id: exId,
            total_volume: totalVol,
            is_best_volume: false,
            is_best_weight: false
        };
    });

    const { data: insertedSessionExs, error: seErr } = await _db.schema('workout').from('session_exercises')
        .insert(sessionExPayload)
        .select();

    if (seErr) return alert("운동 종목 요약 저장 실패: " + seErr.message);

    const exerciseToSessionExIdMap = {};
    insertedSessionExs.forEach(se => {
        exerciseToSessionExIdMap[se.exercise_id] = se.id;
    });
    
    const logsToInsert = window.ACTIVE_SETS.map(s => { 
        // 🌟 [수리완료]: 오타 요인을 깔끔하게 청소하여 logs 테이블에 매핑 처리!
        const { id, ...rest } = s; 
        const ex = window.EX_MASTER.find(e => e.id === s.exercise_id);
        const isCardio = (ex && window.SETTINGS_LOOKUP[ex.exercise_type] === '유산소');
        const targetSessionId = isCardio ? (cardioSessionId || weightSessionId) : (weightSessionId || cardioSessionId);
        const targetSessionExId = exerciseToSessionExIdMap[s.exercise_id];

        return { 
            ...rest, 
            session_id: targetSessionId, 
            session_exercise_id: targetSessionExId, 
            status: 'FINAL', 
            workout_date: smartDate.full 
        }; 
    });
    
    const { error: logError } = await _db.schema('workout').from('logs').insert(logsToInsert); 
    if (logError) return alert("세부 로그 저장 실패: " + logError.message);

    for (const exId of uniqueExercises) {
        const { data: allSe } = await _db.schema('workout').from('session_exercises')
            .select('id, total_volume, created_at')
            .eq('exercise_id', exId);

        if (allSe && allSe.length > 0) {
            let bestSe = allSe[0];
            allSe.forEach(se => {
                if (Number(se.total_volume) > Number(bestSe.total_volume)) {
                    bestSe = se;
                } else if (Number(se.total_volume) === Number(bestSe.total_volume)) {
                    if (se.created_at > bestSe.created_at || (se.created_at === bestSe.created_at && se.id > bestSe.id)) {
                        bestSe = se;
                    }
                }
            });
            await _db.schema('workout').from('session_exercises').update({ is_best_volume: false }).eq('exercise_id', exId);
            await _db.schema('workout').from('session_exercises').update({ is_best_volume: true }).eq('id', bestSe.id);
        }

        const { data: maxWeightLog } = await _db.schema('workout').from('logs')
            .select('session_id, weight, workout_date')
            .eq('exercise_id', exId)
            .order('weight', { ascending: false })
            .order('workout_date', { ascending: false })
            .limit(1);

        if (maxWeightLog && maxWeightLog.length > 0) {
            const bestSessionId = maxWeightLog[0].session_id;
            const { data: targetSe } = await _db.schema('workout').from('session_exercises')
                .select('id')
                .eq('session_id', bestSessionId)
                .eq('exercise_id', exId)
                .limit(1);

            if (targetSe && targetSe.length > 0) {
                await _db.schema('workout').from('session_exercises').update({ is_best_weight: false }).eq('exercise_id', exId);
                await _db.schema('workout').from('session_exercises').update({ is_best_weight: true }).eq('id', targetSe[0].id);
            }
        }
    }

    await _db.schema('workout').from('active_workout').delete().neq('id', -1); 
    location.reload();
}

// window 마스터 스코프 결합
window.init = init;
window.calculateFinalWeight = calculateFinalWeight;
window.getDetailedStats = getDetailedStats;
window.processFinalSave = processFinalSave;