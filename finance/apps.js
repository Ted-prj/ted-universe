let dropdownCache = { accounts: [], accounts_raw: [], categories: [], categories_raw: [], trTypes: [], trTypes_raw: [], fixedList: [] };
let touchStartX = 0; let touchStartY = 0; window.tempOriginalRowHtml = "";

window.onload = () => { const pwInput = document.getElementById('access-pw-input'); if(pwInput) pwInput.focus(); };
function handleAutoVerify(input) { if (input.value.length === 4) verifyAccess(); }

async function verifyAccess() {
    const pwInput = document.getElementById('access-pw-input'); const inputPw = pwInput.value; const msg = document.getElementById('auth-msg');
    msg.innerText = "VERIFYING...";
    try {
        const { data, error } = await _supabase.from('settings').select('value').eq('code', 'ACCESS_PW').single();
        if (error) throw error;
        if (data.value === inputPw) { sessionStorage.setItem('is_auth', 'true'); location.href = 'out.html'; }
        else { msg.innerText = "WRONG PASSWORD"; pwInput.value = ""; pwInput.focus(); }
    } catch (e) { msg.innerText = "CONNECTION ERROR"; }
}

document.addEventListener('DOMContentLoaded', async () => {
    const currentPage = document.body.dataset.page;
    if (currentPage === 'LOGIN') {
        if (sessionStorage.getItem('is_auth') === 'true') location.href = 'out.html';
        return;
    }
    if (sessionStorage.getItem('is_auth') !== 'true') {
        location.href = 'index.html';
        return;
    }
    await initApp();
});

async function initApp() {
    const now = new Date(); const monthStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0'); const dateStr = monthStr + '-' + String(now.getDate()).padStart(2, '0');
    document.querySelectorAll('input[type="date"]').forEach(ipt => ipt.value = dateStr); if(document.getElementById('stats-month')) document.getElementById('stats-month').value = monthStr;
    const [accRes, catRes, setRes, fixRes] = await Promise.all([
        _supabase.from('accounts').select('code, name').order('id'), _supabase.from('categories').select('code, name, is_stats').order('id'),
        _supabase.from('settings').select('code, value').eq('category', 'TR_TYPE'), _supabase.from('fixed_expenses').select('*').eq('is_active', true).order('payment_day')
    ]);
    dropdownCache = { accounts_raw: accRes.data || [], accounts: (accRes.data || []).map(a => a.name), categories_raw: catRes.data || [], categories: (catRes.data || []).map(c => c.name), trTypes_raw: setRes.data || [], trTypes: (setRes.data || []).map(s => s.value), fixedList: (fixRes.data || []).map(f => ({ id: f.fixed_link, name: f.name, amt: f.amount, day: f.payment_day, acc: f.account_code, cat: f.category_code })) };
    
    const page = document.body.dataset.page;
    if(page === 'OUT') loadHistoryTab('OUT');
    else if(page === 'IN') loadHistoryTab('IN');
    else if(page === 'TR') loadHistoryTab('TR');
    else if(page === 'ASSETS') loadAssets();
    else if(page === 'STATS') loadStats();
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
    if (type === 'TR') query = _supabase.from('transfer').select('*, from:accounts!from_account_code(name), to:accounts!to_account_code(name)');
    else query = _supabase.from('v_running_balance').select('*').eq('type_code', type === 'IN' ? 'TX_INCOME' : 'TX_EXPENSE');
    if (start) query = query.gte('date', start); if (end) query = query.lte('date', end);
    const { data } = await query.order('date', { ascending: false }).order('id', { ascending: false }).limit(20);
    
    if(type === 'TR' && data?.length) {
        for(let item of data) {
            const [{data:fb}, {data:tb}] = await Promise.all([
                _supabase.from('v_running_balance').select('running_balance').eq('id', item.id).eq('account_code', item.from_account_code).maybeSingle(),
                _supabase.from('v_running_balance').select('running_balance').eq('id', item.id).eq('account_code', item.to_account_code).maybeSingle()
            ]);
            item.from_bal = fb?.running_balance; item.to_bal = tb?.running_balance;
        }
    }
    if (document.getElementById(pre + '-total-area')) { const total = (data || []).reduce((acc, curr) => acc + Number(curr.amount || 0), 0); document.getElementById(pre + '-total-area').innerText = `TOTAL: ${total.toLocaleString()}원`; }
    container.innerHTML = (data || []).map(i => type === 'TR' ? renderTrCardOriginal(i) : renderTxCardOriginal(i)).join('') || "<p class='text-center py-5 opacity-50'>No data</p>";
}

function renderTxCardOriginal(i) {
    const isRefund = i.amount < 0;
    return `<div class="swipe-container">
        <div class="swipe-actions-bg actions-left"><div class="swipe-btn btn-delete" onclick="deleteEntry('TX', '${i.id}')">DEL</div></div>
        <div class="swipe-actions-bg actions-right"><div class="swipe-btn btn-cancel-tx" onclick="generateRefund('${i.id}')">취소</div></div>
        <div class="custom-card swipe-target ${isRefund ? 'card-refund' : ''}" data-id="${i.id}" data-source="TX" onclick="handleMainEdit('${i.id}', 'TX', this, event)" ontouchstart="handleSwipeStart(event)" ontouchmove="handleSwipeMove(event)" ontouchend="handleSwipeEnd(event)">
            <div class="card-grid">
                <div><div class="label-mini">DATE</div><div class="val-text">${i.date}</div></div>
                <div class="text-end"><div class="label-mini">CAT</div><div class="val-text">${i.category_name || '기타'}</div></div>
                <div class="card-full"><div class="label-mini">ACC</div><div class="val-text">${i.account_name}</div></div>
                <div class="card-full text-end"><div class="val-amt">${Math.round(i.amount).toLocaleString()}원</div><div class="card-balance-badge">Bal: ${Math.round(i.running_balance).toLocaleString()}원</div></div>
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

async function loadAssets() {
    const list = document.getElementById('acc-balance-list'); if(!list) return; list.innerHTML = `<div class="loading-inline">...</div>`;
    const { data: assets } = await _supabase.from('v_account_balances').select(`*, loans!loans_account_code_fkey (*, linked_acc:accounts!linked_account_code (name))`).order('account_id');
    const total = (assets || []).reduce((sum, acc) => sum + Number(acc.current_balance || 0), 0);
    list.innerHTML = `<div class="text-end mb-4"><small class="label-mini">TOTAL ASSETS</small><h4 style="font-weight:900; font-size:2.1rem; color:var(--pink-light)">${Math.round(total).toLocaleString()}원</h4></div>` + (assets || []).map(acc => renderAssetCard(acc)).join('');
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

async function loadStats() {
    const targetMonth = document.getElementById('stats-month').value; const { data } = await _supabase.rpc('get_dashboard_data', { target_month: targetMonth }); if (!data) return;
    const summaryArea = document.getElementById('stats-summary-area'); if(!summaryArea) return;
    summaryArea.innerHTML = `<div class="stats-card" onclick="document.getElementById('balance-detail-wrapper').classList.toggle('expanded')"><div class="stats-label">MONTHLY BALANCE</div><div class="stats-val">${Math.round(data.summary.balance).toLocaleString()}원</div><div class="expand-container" id="balance-detail-wrapper"><div class="summary-detail-box mt-3" style="display:grid; grid-template-columns:1fr 1fr; gap:10px; background:#0a0a0a; padding:15px; border-radius:15px; border:1px solid #222;"><div><div class="label-mini">INCOME</div><div style="font-weight:900;">${Math.round(data.summary.income).toLocaleString()}원</div></div><div><div class="label-mini">EXPENSE</div><div style="font-weight:900; color:var(--asset-pink);">${Math.round(data.summary.expense).toLocaleString()}원</div></div></div></div></div><div class="stats-card fixed" onclick="document.getElementById('fixed-list-wrapper').classList.toggle('expanded')"><div class="stats-label">FIXED REMAINING</div><div class="stats-val">${Math.round(data.fixedStats.remainingAmt).toLocaleString()}원</div><div class="expand-container" id="fixed-list-wrapper"><div id="fixed-list-container" class="mt-3">${(data.fixedStats.remainingItems || []).map(i => `<div class="fixed-chip">${i.day}일 | ${i.name}</div>`).join('') || "완료! 🌸"}</div></div></div>`;
    const renderItems = (items, cls, groupType) => (items || []).map(c => `<div class="stat-item-card" onclick="toggleStatsHistory('${c.name}', '${groupType}', this)"><div class="d-flex justify-content-between mb-2"><span style="font-weight:800;">${c.name}</span><span style="color:var(--bp-pink); font-weight:900;">${c.percent}%</span></div><div class="progress mb-2"><div class="progress-bar ${cls}" style="width:${Math.min(c.percent, 100)}%"></div></div><div class="d-flex justify-content-between small opacity-75"><span>${Math.round(c.actual).toLocaleString()}원</span><span>예산 ${Math.round(c.budget).toLocaleString()}</span></div><div class="expand-container"><div class="history-list"></div></div></div>`).join('');
    document.getElementById('section-income').innerHTML = renderItems(data.topExpenses.income, "bar-income", "income"); document.getElementById('section-asset').innerHTML = renderItems(data.topExpenses.asset, "bar-asset", "asset"); document.getElementById('section-expense').innerHTML = renderItems(data.topExpenses.expense, "bar-expense", "expense");
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
    else if(page === 'TR') loadHistoryTab('TR', true); 
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