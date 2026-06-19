let dropdownCache = { accounts: [], accounts_raw: [], categories: [], categories_raw: [], trTypes: [], trTypes_raw: [], fixedList: [] };
let touchStartX = 0; let touchStartY = 0; window.tempOriginalRowHtml = "";

// Chart.js 인스턴스를 추적하기 위한 전역 전술 변수
window.myAssetChart = null;

document.addEventListener('DOMContentLoaded', async () => {
    await initApp();
});

async function initApp() {
    const now = new Date(); const monthStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0'); const dateStr = monthStr + '-' + String(now.getDate()).padStart(2, '0');
    document.querySelectorAll('input[type="date"]').forEach(ipt => ipt.value = dateStr); if(document.getElementById('stats-month')) document.getElementById('stats-month').value = monthStr;
    
    try {
        const [accRes, catRes, setRes, fixRes] = await Promise.all([
            _supabase.from('accounts').select('code, name').order('id'), _supabase.from('categories').select('code, name, is_stats').order('id'),
            _supabase.from('settings').select('code, value').eq('category', 'TR_TYPE'), _supabase.from('fixed_expenses').select('*').eq('is_active', true).order('payment_day')
        ]);
        dropdownCache = { accounts_raw: accRes.data || [], accounts: (accRes.data || []).map(a => a.name), categories_raw: catRes.data || [], categories: (catRes.data || []).map(c => c.name), trTypes_raw: setRes.data || [], trTypes: (setRes.data || []).map(s => s.value), fixedList: (fixRes.data || []).map(f => ({ id: f.fixed_link, name: f.name, amt: f.amount, day: f.payment_day, acc: f.account_code, cat: f.category_code })) };
    } catch (err) {
        console.error("기초 메타데이터 로드 실패:", err);
    }
    
    const page = document.body.dataset.page;
    if(page === 'OUT') loadHistoryTab('OUT');
    else if(page === 'IN') loadHistoryTab('IN');
    else if(page === 'TR') loadHistoryTab('TR');
    else if(page === 'ASSETS') loadAssets();
    else if(page === 'STATS') loadStats();
}

// 🛠️ 개선 1: Chart.js 포트폴리오 차트 연동형 자산 엔진
async function loadAssets() {
    const list = document.getElementById('acc-balance-list'); if(!list) return; 
    list.innerHTML = `<div class="loading-inline">ASSETS LOADING...</div>`;
    
    try {
        const { data: assets, error } = await _supabase.from('v_account_balances').select(`*, loans (*, linked_acc:accounts (name))`).order('account_id');
        let targetAssets = assets || [];
        
        if (error) {
            const { data: fallbackAssets, error: fbErr } = await _supabase.from('v_account_balances').select('*').order('account_id');
            if (fbErr) throw fbErr;
            targetAssets = fallbackAssets || [];
        }
        
        const total = targetAssets.reduce((sum, acc) => sum + Number(acc.current_balance || 0), 0);
        list.innerHTML = `<div class="text-end mb-4"><small class="label-mini">TOTAL ASSETS</small><h4 style="font-weight:900; font-size:2.1rem; color:var(--pink-light)">${Math.round(total).toLocaleString()}원</h4></div>` + targetAssets.map(acc => renderAssetCard(acc)).join('');
        
        // 📊 [치트키 2] 자산 자석 도넛 차트 실시간 집계 및 빌드
        buildAssetAllocationChart(targetAssets);
        
    } catch (err) {
        list.innerHTML = `<div class="text-danger small py-3 text-center">⚠️ 자산 조회 실패: ${err.message}</div>`;
    }
}

function buildAssetAllocationChart(assets) {
    const chartCtx = document.getElementById('assetAllocationChart');
    if (!chartCtx) return;
    
    const summaryData = {};
    assets.forEach(acc => {
        const type = acc.account_type || "기타";
        const bal = Math.max(0, Math.round(acc.current_balance || 0)); // 대출 마이너스는 0 레이어로 세이프 처리
        if(bal > 0) summaryData[type] = (summaryData[type] || 0) + bal;
    });
    
    if(window.myAssetChart) window.myAssetChart.destroy();
    
    // 모바일 전용 초경량 매직 도넛 차트 선언
    window.myAssetChart = new Chart(chartCtx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(summaryData),
            datasets: [{
                data: Object.values(summaryData),
                backgroundColor: ['#e88ea3', '#20c997', '#ff6b6b', '#f1c40f', '#9b59b6', '#3498db'],
                borderWidth: 1,
                borderColor: '#111'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: { color: '#999', font: { weight: '800', size: 10 } }
                }
            }
        }
    });
}

// 🛠️ 개선 2: 예산 경보 및 고정 지출 D-Day 카운터가 통합된 통계 엔진
async function loadStats() {
    const summaryArea = document.getElementById('stats-summary-area'); if(!summaryArea) return;
    const targetMonth = document.getElementById('stats-month').value; 
    summaryArea.innerHTML = `<div class="loading-inline">STATS LOADING...</div>`;
    
    try {
        const { data, error } = await _supabase.rpc('get_dashboard_data', { target_month: targetMonth }); 
        if (error) throw error;
        if (!data) { summaryArea.innerHTML = "<div class='text-center opacity-50 py-3'>No data</div>"; return; }
        
        const summary = data.summary || {};
        const fixedStats = data.fixedStats || data.fixed_stats || {};
        const topExpenses = data.topExpenses || data.top_expenses || {};
        
        const balance = summary.balance !== undefined ? summary.balance : (summary.balance || 0);
        const incomeTotal = summary.income !== undefined ? summary.income : (summary.income || 0);
        const expenseTotal = summary.expense !== undefined ? summary.expense : (summary.expense || 0);
        
        const remainingAmt = fixedStats.remainingAmt !== undefined ? fixedStats.remainingAmt : (fixedStats.remaining_amt || 0);
        const remainingItems = fixedStats.remainingItems || fixedStats.remaining_items || [];
        
        // 📅 [치트키 3] 오늘 날짜 기준 고정 지출 디데이 실시간 연산 가동
        const currentDay = new Date().getDate();
        
        summaryArea.innerHTML = `
            <div class="stats-card" onclick="document.getElementById('balance-detail-wrapper').classList.toggle('expanded')">
                <div class="stats-label">MONTHLY BALANCE</div>
                <div class="stats-val">${Math.round(balance).toLocaleString()}원</div>
                <div class="expand-container" id="balance-detail-wrapper">
                    <div class="summary-detail-box mt-3" style="display:grid; grid-template-columns:1fr 1fr; gap:10px; background:#0a0a0a; padding:15px; border-radius:15px; border:1px solid #222;">
                        <div>
                            <div class="label-mini">INCOME</div>
                            <div style="font-weight:900;">${Math.round(incomeTotal).toLocaleString()}원</div>
                        </div>
                        <div>
                            <div class="label-mini">EXPENSE</div>
                            <div style="font-weight:900; color:var(--asset-pink);">${Math.round(expenseTotal).toLocaleString()}원</div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="stats-card fixed" onclick="document.getElementById('fixed-list-wrapper').classList.toggle('expanded')">
                <div class="stats-label">FIXED REMAINING</div>
                <div class="stats-val">${Math.round(remainingAmt).toLocaleString()}원</div>
                <div class="expand-container" id="fixed-list-wrapper">
                    <div id="fixed-list-container" class="mt-3">
                        ${remainingItems.map(i => {
                            const itemDay = parseInt(i.day || i.payment_day || 0);
                            let dDayBadge = "";
                            if (itemDay > currentDay) dDayBadge = `<span class="badge bg-primary style="font-size:0.55rem">D-${itemDay - currentDay}</span>`;
                            else if (itemDay === currentDay) dDayBadge = `<span class="badge bg-danger">D-Day 🚨</span>`;
                            else dDayBadge = `<span class="badge bg-secondary">이월/완료</span>`;
                            return `<div class="fixed-chip d-flex justify-content-between align-items-center mb-1">${itemDay}일 | ${i.name} ${dDayBadge}</div>`;
                        }).join('') || "완료! 🌸"}
                    </div>
                </div>
            </div>
        `;
        
        // 🚨 [치트키 1] 예산 한도 한눈에 필터링하는 스마트 예산 얼럿 프로그레스 인젝터
        const renderItems = (items, cls, groupType) => (items || []).map(c => {
            const pct = Number(c.percent || 0);
            let alertColor = "background-color: var(--bp-pink) !important;"; // 기본 수입/자산 핑크
            if (groupType === 'expense') {
                if (pct >= 100) alertColor = "background-color: #ff3f7e !important; box-shadow: 0 0 10px #ff3f7e;"; // 100% 돌파 시 네온 핫핑크 경고
                else if (pct >= 80) alertColor = "background-color: #ffc107 !important;"; // 80% 도달 시 경고 옐로우
                else alertColor = "background-color: #20c997 !important;"; // 안전 구역 그린
            } else if (groupType === 'income') {
                alertColor = "background-color: #20c997 !important;"; // 수입 달성은 초록색이 제맛
            }
            
            return `
                <div class="stat-item-card" onclick="toggleStatsHistory('${c.name}', '${groupType}', this)">
                    <div class="d-flex justify-content-between mb-2">
                        <span style="font-weight:800;">${c.name}</span>
                        <span style="color:${pct >= 100 && groupType === 'expense' ? '#ff3f7e' : '#fff'}; font-weight:900;">${pct}%</span>
                    </div>
                    <div class="progress mb-2" style="background:#222; height:6px;">
                        <div class="progress-bar" style="width:${Math.min(pct, 100)}%; ${alertColor}"></div>
                    </div>
                    <div class="d-flex justify-content-between small opacity-75">
                        <span>${Math.round(c.actual || c.amount || 0).toLocaleString()}원</span>
                        <span>예산 ${Math.round(c.budget || 0).toLocaleString()}</span>
                    </div>
                    <div class="expand-container"><div class="history-list"></div></div>
                </div>`;
        }).join('');
        
        document.getElementById('section-income').innerHTML = renderItems(topExpenses.incomeList || topExpenses.income, "bar-income", "income"); 
        document.getElementById('section-asset').innerHTML = renderItems(topExpenses.assetList || topExpenses.asset, "bar-asset", "asset"); 
        document.getElementById('section-expense').innerHTML = renderItems(topExpenses.expenseList || topExpenses.expense, "bar-expense", "expense");
        
        // 🤖 [치트키 4] 쵸파용 스마트 금융 정산 비서 가이드 복사 템플릿 실시간 조립
        buildChopperFinanceGuide();
        
    } catch (err) {
        summaryArea.innerHTML = `<div class="text-danger small py-3 text-center">⚠️ 통계 분석 실패: ${err.message}</div>`;
    }
}

function buildChopperFinanceGuide() {
    const guideTextEl = document.getElementById('chopper-finance-prompt-text');
    if (!guideTextEl) return;
    
    const accNames = dropdownCache.accounts.join(', ');
    const catNames = dropdownCache.categories.join(', ');
    
    guideTextEl.innerText = `쵸파, 아래 결제 내역 문장들을 분석해서 가계부에 바로 입력할 수 있게 CSV 코드로 정제해 줘.\n\n[출금 계좌 후보 리스트]\n${accNames}\n\n[카테고리 후보 리스트]\n${catNames}\n\n[출력 포맷 규격]\n날짜(YYYY-MM-DD),계좌명,카테고리명,금액(숫자만),메모\n\n[결제 내역 텍스트]\n(여기에 카드 문자나 카톡 결제 내역을 붙여넣으세요!)`;
}

function copyChopperFinancePrompt() {
    const rawText = document.getElementById('chopper-finance-prompt-text').innerText;
    const temp = document.createElement('textarea');
    document.body.appendChild(temp);
    temp.value = rawText;
    temp.select();
    document.execCommand('copy');
    document.body.removeChild(temp);
    alert("🤖 쵸파 가계부 비서 프롬프트가 복사되었습니다! 카톡 내역을 붙여서 쵸파에게 던지세요!");
}

async function saveEdit(btn, source, id) {
    const card = btn.closest('.custom-card'); const inputs = card.querySelectorAll('.edit-input'); let formData = {}; inputs.forEach(ipt => formData[ipt.dataset.field] = ipt.value);
    btn.innerHTML = "..."; btn.disabled = true;
    try {
        const amount = parseInt(String(formData.amount).replace(/[^0-9-]/g, "")) || 0; const commonData = { date: formData.date, amount: amount, note: formData.note };
        if (source === 'TR' || source === 'MOVE') {
            const from_code = dropdownCache.accounts_raw.find(a => a.name === formData.fromAcc)?.code; const to_code = dropdownCache.accounts_raw.find(a => a.name === formData.toAcc)?.code; const type_code = dropdownCache.trTypes_raw.find(s => s.value === formData.type)?.code || 'TX_TRANSFER';
            const uniqueTransferCode = `TR_${new Date().getTime()}_${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
            const payload = { ...commonData, from_account_code: from_code, to_account_code: to_code, type_code: type_code, transfer_code: (id === 'NEW') ? uniqueTransferCode : undefined };
            if(id !== 'NEW') delete payload.transfer_code;
            const { error } = (id === 'NEW') ? await _supabase.from('transfer').insert([payload]) : await _supabase.from('transfer').update(payload).eq('id', id);
            if (error) throw error;
        } else {
            const acc_code = dropdownCache.accounts_raw.find(a => a.name === formData.acc)?.code; const cat_code = dropdownCache.categories_raw.find(c => c.name === formData.cat)?.code;
            let typeCode = (source === 'IN' ? 'TX_INCOME' : 'TX_EXPENSE');
            const payload = { ...commonData, account_code: acc_code, category_code: cat_code, type_code: typeCode, fixed_link: formData.fixedLinkId || null };
            const { error } = (id === 'NEW') ? await _supabase.from('transactions').insert([payload]) : await _supabase.from('transactions').update(payload).eq('id', id);
            if (error) throw error;
        }
        if(id === 'NEW') btn.closest('[id$="-new-card-area"]').innerHTML = "";
        refreshView();
    } catch (err) { alert("SAVE ERROR: " + err.message); btn.innerHTML = "SAVE"; btn.disabled = false; }
}

async function handleMainEdit(id, source, el, event) {
    if (event.target.closest('.swipe-actions-bg')) return; const container = el.closest('.swipe-container') || el; window.tempOriginalRowHtml = container.outerHTML; container.innerHTML = `<div class="loading-inline">LOADING...</div>`;
    try {
        if (source === 'TX') {
            const { data } = await _supabase.from('transactions').select('*').eq('id', id).single();
            data.acc = dropdownCache.accounts_raw.find(a => a.code === data.account_code)?.name; data.cat = dropdownCache.categories_raw.find(c => c.code === data.category_code)?.name;
            container.outerHTML = renderTxEditCard(data, data.type_code === 'TX_INCOME' ? 'IN' : 'OUT');
        } else {
            const { data } = await _supabase.from('transfer').select('*').eq('id', id).single();
            data.fromAcc = dropdownCache.accounts_raw.find(a => a.code === data.from_account_code)?.name; data.toAcc = dropdownCache.accounts_raw.find(a => a.code === data.to_account_code)?.name;
            data.type = dropdownCache.trTypes_raw.find(s => s.code === (data.transfer_code || data.type_code))?.value || '이체';
            container.outerHTML = renderTrEditCard(data);
        }
    } catch (e) { container.outerHTML = window.tempOriginalRowHtml; }
}

function renderTxEditCard(i, source) {
    return `<div class="custom-card edit-mode" data-id="${i.id}"><div class="card-grid"><div class="card-full"><div class="label-mini">FIXED LINK</div><select class="form-select form-select-sm edit-input" data-field="fixedLinkId" onchange="onFixedLinkChange(this)"><option value="">-- 없음 --</option>${dropdownCache.fixedList.map(f => `<option value="${f.id}" ${i.fixed_link === f.id ? 'selected' : ''}>${f.day}일 | ${f.name}</option>`).join('')}</select></div><div><div class="label-mini">DATE</div><input type="date" class="form-control form-control-sm edit-input" data-field="date" value="${i.date}"></div><div class="text-end"><div class="label-mini">CAT</div><select class="form-select form-select-sm edit-input" data-field="cat">${dropdownCache.categories.map(c => `<option ${c === i.cat ? 'selected' : ''}>${c}</option>`).join('')}</select></div><div class="card-full"><div class="label-mini">ACC</div><select class="form-select form-select-sm edit-input" data-field="acc" onchange="updateLiveBalance(this)">${dropdownCache.accounts.map(a => `<option ${a === i.acc ? 'selected' : ''}>${a}</option>`).join('')}</select><div class="live-balance-main live-balance-box"></div></div><div class="card-full"><div class="label-mini">AMT</div><input type="text" class="form-control form-control-sm edit-input text-end" data-field="amount" value="${i.amount ? Number(i.amount).toLocaleString() : ''}" inputmode="numeric" oninput="formatAmountInput(this)"></div><div class="card-full"><div class="label-mini">NOTE</div><input type="text" class="form-control form-control-sm edit-input" data-field="note" value="${i.note || ''}" placeholder="메모 입력"></div><div class="card-full edit-btn-group"><button class="btn-edit-cancel" onclick="handleCancel('${i.id}', '${source}', this)">CANCEL</button><button class="btn-edit-save" onclick="saveEdit(this,'${source}','${i.id}')">SAVE</button></div></div></div>`;
}

function renderTrEditCard(i) {
    return `<div class="custom-card edit-mode" style="border-left-color:#fff" data-id="${i.id}"><div class="card-grid"><div><div class="label-mini">DATE</div><input type="date" class="form-control form-control-sm edit-input" data-field="date" value="${i.date}"></div><div class="text-end"><div class="label-mini">TYPE</div><select class="form-select form-select-sm edit-input" data-field="type">${dropdownCache.trTypes.map(t => `<option ${t === i.type ? 'selected' : ''}>${t}</option>`).join('')}</select></div><div class="card-full tr-row-wrap"><div class="tr-col"><div class="label-mini">FROM</div><select class="form-select form-select-sm edit-input" data-field="fromAcc" onchange="updateLiveBalance(this, 'from')">${dropdownCache.accounts.map(a => `<option ${a === i.fromAcc ? 'selected' : ''}>${a}</option>`).join('')}</select><div class="live-balance-from live-balance-box"></div></div><div class="tr-amt-col"><div class="label-mini">AMT</div><input type="text" class="form-control form-control-sm edit-input text-center" data-field="amount" value="${i.amount ? Number(i.amount).toLocaleString() : ''}" inputmode="numeric" oninput="formatAmountInput(this)"></div><div class="tr-col text-end"><div class="label-mini">TO</div><select class="form-select form-select-sm edit-input" data-field="toAcc" onchange="updateLiveBalance(this, 'to')">${dropdownCache.accounts.map(a => `<option ${a === i.toAcc ? 'selected' : ''}>${a}</option>`).join('')}</select><div class="live-balance-to live-balance-box"></div></div></div><div class="card-full"><div class="label-mini">NOTE</div><input type="text" class="form-control form-control-sm edit-input" data-field="note" value="${i.note || ''}" placeholder="메모 입력"></div><div class="card-full edit-btn-group"><button class="btn-edit-cancel" onclick="handleCancel('${i.id}', 'TR', this)">CANCEL</button><button class="btn-edit-save" onclick="saveEdit(this,'TR','${i.id}')">SAVE</button></div></div></div>`;
}

async function loadHistoryTab(type, isSearch = false) {
    const pre = type.toLowerCase(); const container = document.getElementById(pre + '-history-container'); if(!container) return; container.innerHTML = `<div class="loading-inline">...</div>`;
    const start = isSearch ? document.getElementById(pre + '-start').value : null; const end = isSearch ? document.getElementById(pre + '-end').value : null;
    let query;
    
    // 💡 핵심 변경: 가로채기 루프 제거! 새로 만든 고성능 뷰(v_transfer_history)로 원터치 다이렉트 쿼리
    if (type === 'TR') query = _supabase.from('v_transfer_history').select('*');
    else query = _supabase.from('v_running_balance').select('*').eq('type_code', type === 'IN' ? 'TX_INCOME' : 'TX_EXPENSE');
    
    if (start) query = query.gte('date', start); if (end) query = query.lte('date', end);
    const { data } = await query.order('date', { ascending: false }).order('id', { ascending: false }).limit(20);
    
    // ❌ 무겁게 폰을 뜨겁게 달구던 40번의 비동기 Promise.all 루프 구역 완전 소탕!
    
    if (document.getElementById(pre + '-total-area')) { const total = (data || []).reduce((acc, curr) => acc + Number(curr.amount || 0), 0); document.getElementById(pre + '-total-area').innerText = `TOTAL: ${total.toLocaleString()}원`; }
    container.innerHTML = (data || []).map(i => type === 'TR' ? renderTrCardOriginal(i) : renderTxCardOriginal(i)).join('') || "<p class='text-center py-5 opacity-50'>No data</p>";
}

// 🛠️ DB 데이터 모델에 맞춘 렌더링 카드 규격화
function renderTrCardOriginal(i) {
    // i.from?.name 대신 DB 뷰가 바로 제공하는 i.from_account_name 변수를 매핑하여 바인딩 속도 가속화
    return `<div class="swipe-container">
        <div class="swipe-actions-bg actions-left"><div class="swipe-btn btn-delete" onclick="deleteEntry('MOVE', '${i.id}')">DEL</div></div>
        <div class="custom-card swipe-target" style="border-left-color:#fff" data-id="${i.id}" data-source="MOVE" onclick="handleMainEdit('${i.id}', 'MOVE', this, event)" ontouchstart="handleSwipeStart(event)" ontouchmove="handleSwipeMove(event)" ontouchend="handleSwipeEnd(event)">
            <div class="card-grid">
                <div><div class="label-mini">DATE</div><div class="val-text">${i.date}</div></div>
                <div class="text-end"><div class="label-mini">TYPE</div><div class="val-text">이체</div></div>
                <div class="card-full tr-row-wrap">
                    <div class="tr-col"><div class="label-mini">FROM</div><div class="val-text">${i.from_account_name || i.from_account_code}</div><div class="live-balance-box" style="text-align:left">Bal: ${Math.round(i.from_bal || 0).toLocaleString()}원</div></div>
                    <div class="tr-amt-col"><div class="val-amt">${Math.round(i.amount).toLocaleString()}</div></div>
                    <div class="tr-col text-end"><div class="label-mini">TO</div><div class="val-text">${i.to_account_name || i.to_account_code}</div><div class="live-balance-box">Bal: ${Math.round(i.to_bal || 0).toLocaleString()}원</div></div>
                </div>
                <div class="card-full card-note-area">${i.note || '-'}</div>
            </div>
        </div>
    </div>`;
}

function renderTrCardOriginal(i) {
    return `<div class="swipe-container">
        <div class="swipe-actions-bg actions-left"><div class="swipe-btn btn-delete" onclick="deleteEntry('MOVE', '${i.id}')">DEL</div></div>
        <div class="custom-card swipe-target" style="border-left-color:#fff" data-id="${i.id}" data-source="MOVE" onclick="handleMainEdit('${i.id}', 'MOVE', this, event)" ontouchstart="handleSwipeStart(event)" ontouchmove="handleSwipeMove(event)" ontouchend="handleSwipeEnd(event)">
            <div class="card-grid">
                <div><div class="label-mini">DATE</div><div class="val-text">${i.date}</div></div>
                <div class="text-end"><div class="label-mini">TYPE</div><div class="val-text">이체</div></div>
                <div class="card-full tr-row-wrap">
                    <div class="tr-col"><div class="label-mini">FROM</div><div class="val-text">${i.from?.name || i.from_account_code}</div><div class="live-balance-box" style="text-align:left">Bal: ${Math.round(i.from_bal || 0).toLocaleString()}원</div></div>
                    <div class="tr-amt-col"><div class="val-amt">${Math.round(i.amount).toLocaleString()}</div></div>
                    <div class="tr-col text-end"><div class="label-mini">TO</div><div class="val-text">${i.to?.name || i.to_account_code}</div><div class="live-balance-box">Bal: ${Math.round(i.to_bal || 0).toLocaleString()}원</div></div>
                </div>
                <div class="card-full card-note-area">${i.note || '-'}</div>
            </div>
        </div>
    </div>`;
}

async function generateRefund(id) {
    if (!confirm("이 내역에 대한 취소 전표(- 지출)를 오늘 날짜로 생성할까요?")) return;
    try {
        const { data: origin } = await _supabase.from('transactions').select('*').eq('id', id).single();
        if (!origin) return;
        const today = new Date().toISOString().split('T')[0];
        const refundPayload = { date: today, amount: -origin.amount, account_code: origin.account_code, category_code: origin.category_code, type_code: origin.type_code, note: `[취소] ${origin.note || origin.date + ' 내역'}` };
        const { error } = await _supabase.from('transactions').insert([refundPayload]);
        if (error) throw error;
        alert("취소 전표가 생성되었습니다."); refreshView();
    } catch (e) { alert("전표 생성 실패: " + e.message); }
}

function renderAssetCard(acc) {
    let borderColor = "var(--bp-pink)"; if (acc.account_type === "신용카드" || acc.account_type === "대출계좌") borderColor = "var(--asset-pink)";
    const loan = (acc.loans && acc.loans.length > 0) ? acc.loans[0] : null; let loanHtml = "";
    if (loan) {
        let linkedAccName = "정보없음"; if (loan.linked_acc) linkedAccName = Array.isArray(loan.linked_acc) ? loan.linked_acc[0]?.name : (loan.linked_acc.name || "정보없음");
        loanHtml = `<div class="loan-detail-box"><div class="loan-item"><div class="loan-label">금리</div><div class="loan-val">${loan.interest_rate}%</div></div><div class="loan-item"><div class="loan-label">월이자</div><div class="loan-val">${Math.round(loan.monthly_interest || 0).toLocaleString()}원</div></div><div class="loan-item"><div class="loan-label">납부일</div><div class="loan-val">${loan.payment_day}일</div></div><div class="loan-item"><div class="loan-label">만기일</div><div class="loan-val">${loan.expiry_date}</div></div><div style="grid-column: span 2; border-top: 1px solid rgba(232, 142, 163, 0.1); padding-top: 8px;"><div class="loan-label">연결계좌</div><div class="loan-val" style="color: var(--bp-pink);">${linkedAccName}</div></div></div>`;
    }
    return `<div class="custom-card mb-3" style="border-left-color: ${borderColor}" onclick="toggleAssetHistory('${acc.account_code}', this, event)"><div class="small opacity-50 mb-1">${acc.bank} | ${acc.account_type}</div><div class="acc-header"><div class="acc-main">${acc.account_name}</div><div class="acc-amount">${Math.round(acc.current_balance).toLocaleString()}원</div></div>${loanHtml}<div class="expand-container"><div class="history-list"></div></div></div>`;
}

async function toggleAssetHistory(accCode, element, event) {
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'SELECT' || event.target.closest('.ah-row')) return;
    const expandBox = element.querySelector('.expand-container'); if (expandBox.classList.contains('expanded')) { expandBox.classList.remove('expanded'); return; }
    const historyList = expandBox.querySelector('.history-list'); historyList.innerHTML = `<div class="loading-inline" style="padding:10px;">...</div>`; expandBox.classList.add('expanded');
    try { const { data } = await _supabase.from('v_running_balance').select('*').eq('account_code', accCode).order('date', { ascending: false }).order('id', { ascending: false }).limit(30); renderHistoryRows(data, historyList, 'asset'); } catch (e) { historyList.innerHTML = `<div class="text-danger py-2">Error: ${e.message}</div>`; }
}

async function toggleStatsHistory(catName, groupType, element) {
    const expandBox = element.querySelector('.expand-container'); if (expandBox.classList.contains('expanded')) { expandBox.classList.remove('expanded'); return; }
    const historyList = expandBox.querySelector('.history-list'); historyList.innerHTML = `<div class="loading-inline">...</div>`; expandBox.classList.add('expanded');
    const targetMonth = document.getElementById('stats-month').value; const catCode = dropdownCache.categories_raw.find(c => c.name === catName)?.code;
    try {
        let query = _supabase.from('v_running_balance').select('*');
        if (groupType === 'asset') { let code = catName === '대출원금' ? 'TX_LOAN_REPAY' : (catName === '저축' ? 'TX_SAVINGS' : 'TX_SUBSCRIPTION'); query = query.eq('type_code', code).gt('change_amount', 0); } else query = query.eq('category_code', catCode);
        const { data } = await query.gte('date', `${targetMonth}-01`).lt('date', getNextMonthDate(targetMonth)).order('date', { ascending: false }).order('id', { ascending: false });
        renderHistoryRows(data, historyList, 'stats');
    } catch (e) { historyList.innerHTML = `<div class="text-danger py-2">Error: ${e.message}</div>`; }
}

function renderHistoryRows(data, container, mode) {
    if (!data || data.length === 0) { container.innerHTML = `<div class="text-center opacity-50 py-3">No data</div>`; return; }
    container.innerHTML = data.map(h => {
        const isMove = (h.category_code === 'TRANSFER' || h.type_code.startsWith('TX_LOAN') || h.type_code === 'TX_SAVINGS' || h.type_code === 'TX_SUBSCRIPTION');
        const source = isMove ? 'MOVE' : 'TX'; const amt = (mode === 'asset') ? h.change_amount : h.amount; const color = (amt < 0) ? 'var(--asset-pink)' : 'var(--pink-light)';
        const isRefund = amt < 0 && !isMove;
        return `<div class="ah-row ${isRefund ? 'card-refund' : ''}" onclick="handleMainEdit('${h.id}', '${source}', this, event)"><div class="ah-main"><div class="ah-date">${h.date.slice(5)}</div><div class="ah-note">${h.note || h.category_name || '-'}</div><div class="ah-amt" style="color: ${isRefund ? '#fff' : color}">${Math.round(amt).toLocaleString()}</div></div><div class="ah-balance">${mode === 'stats' ? h.account_name + ' | ' : ''}잔액: ${Math.round(h.running_balance).toLocaleString()}원</div></div>`;
    }).join('');
}

function getNextMonthDate(monthStr) { let [y, m] = monthStr.split('-').map(Number); m++; if(m > 12) { m = 1; y++; } return `${y}-${String(m).padStart(2, '0')}-01`; }
function formatAmountInput(input) { let val = input.value.replace(/[^0-9-]/g, ""); if (val) input.value = Number(val).toLocaleString(); else input.value = ""; }

function addNewCard(type) { 
    const area = document.getElementById(type.toLowerCase() + '-new-card-area'); if(!area || area.innerHTML !== "") return; 
    const dummy = { id: 'NEW', date: new Date().toISOString().split('T')[0], amount: 0, note: '', type: (type === 'TR' ? dropdownCache.trTypes[0] : (type==='IN'?'수입':'지출')) }; 
    if (type === 'TR') { dummy.fromAcc = dropdownCache.accounts[0]; dummy.toAcc = dropdownCache.accounts[1]; area.innerHTML = renderTrEditCard(dummy); } 
    else { dummy.cat = dropdownCache.categories[0]; dummy.acc = dropdownCache.accounts[0]; area.innerHTML = renderTxEditCard(dummy, type); } 
}

function handleCancel(id, source, btn) { if (id === 'NEW') btn.closest('[id$="-new-card-area"]').innerHTML = ""; else if (window.tempOriginalRowHtml) { btn.closest('.custom-card').outerHTML = window.tempOriginalRowHtml; window.tempOriginalRowHtml = ""; } else refreshView(); }
async function deleteEntry(source, id) { if (confirm("삭제할까요?")) { await _supabase.from((source === 'MOVE') ? 'transfer' : 'transactions').delete().eq('id', id); refreshView(); } }

function handleSwipeStart(e) { touchStartX = e.touches[0].clientX; touchStartY = e.touches[0].clientY; }
function handleSwipeMove(e) { 
    const diffX = touchStartX - e.touches[0].clientX; const diffY = Math.abs(touchStartY - e.touches[0].clientY); if (diffY > 30) return;
    if (diffX > 5) e.currentTarget.style.transform = `translateX(-${Math.min(diffX, 100)}px)`;
    else if (diffX < -5) e.currentTarget.style.transform = `translateX(${Math.min(Math.abs(diffX), 100)}px)`;
}
function handleSwipeEnd(e) { 
    const diffX = touchStartX - e.changedTouches[0].clientX;
    if (diffX > 60) deleteEntry(e.currentTarget.dataset.source, e.currentTarget.dataset.id);
    else if (diffX < -60) { if (e.currentTarget.dataset.source === 'TX') generateRefund(e.currentTarget.dataset.id); }
    e.currentTarget.style.transform = `translateX(0px)`; 
}

function toggleStatSection(id) { document.getElementById(id).classList.toggle('expanded'); }

function refreshView() { 
    const page = document.body.dataset.page;
    if(page === 'ASSETS') loadAssets(); 
    else if(page === 'STATS') loadStats(); 
    else if(page === 'OUT') loadHistoryTab('OUT', true); 
    else if(page === 'IN') loadHistoryTab('IN', true); 
    else if(page === 'TR', true); 
}

async function updateLiveBalance(selectEl, suffix = '') {
    const accCode = dropdownCache.accounts_raw.find(a => a.name === selectEl.value)?.code; if(!accCode) return;
    const { data } = await _supabase.from('v_account_balances').select('current_balance').eq('account_code', accCode).single();
    const balanceArea = selectEl.closest('.custom-card').querySelector(suffix ? `.live-balance-${suffix}` : '.live-balance-main');
    if (balanceArea) balanceArea.innerText = `Bal: ${Math.round(data?.current_balance || 0).toLocaleString()}원`;
}

function onFixedLinkChange(selectEl) {
    const card = selectEl.closest('.custom-card'); const fixedId = selectEl.value; if (!fixedId) return;
    const item = dropdownCache.fixedList.find(f => f.id === fixedId); if (!item) return;
    card.querySelector('[data-field="amount"]').value = Number(item.amt).toLocaleString();
    const now = new Date(); card.querySelector('[data-field="date"]').value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(item.day).padStart(2, '0')}`;
    const accName = dropdownCache.accounts_raw.find(a => a.code === item.acc)?.name;
    if (accName) { const accSelect = card.querySelector('[data-field="acc"]') || card.querySelector('[data-field="fromAcc"]'); accSelect.value = accName; updateLiveBalance(accSelect, accSelect.dataset.field === 'fromAcc' ? 'from' : ''); }
    const catName = dropdownCache.categories_raw.find(c => c.code === item.cat)?.name;
    if (catName) card.querySelector('[data-field="cat"]').value = catName; card.querySelector('[data-field="note"]').value = item.name;
}