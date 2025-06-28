// API Base URL
const API_BASE = '/api';

// Current section
let currentSection = 'inventory';

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    loadCompanies();
    refreshInventory();
    showSection('inventory');
    
    // Setup form calculations
    setupGoldFormCalculations();
    setupCurrencyConversionCalculations();
    
    // سهم الشركات
    var companiesCollapse = document.getElementById('companies-collapse');
    var companiesArrow = document.getElementById('companies-arrow');
    if (companiesCollapse && companiesArrow) {
        companiesCollapse.addEventListener('show.bs.collapse', function () {
            companiesArrow.classList.remove('companies-collapsed');
        });
        companiesCollapse.addEventListener('hide.bs.collapse', function () {
            companiesArrow.classList.add('companies-collapsed');
        });
    }

    updateAzkar();
    setInterval(updateAzkar, 18000); // كل 18 ثانية (مدة الأنيميشن)

    document.getElementById('amanah-type').addEventListener('change', function() {
        const currencyField = document.getElementById('amanah-currency');
        if (this.value === 'gold') {
            currencyField.value = '';
            currencyField.disabled = true;
            currencyField.placeholder = 'غير مطلوب للذهب';
        } else {
            currencyField.disabled = false;
            currencyField.placeholder = '';
        }
    });

    // Dark mode toggle logic
    const darkBtn = document.getElementById('toggle-dark-mode');
    const body = document.body;
    function setDarkMode(on) {
        if (on) {
            body.classList.add('dark-mode');
            darkBtn.innerHTML = '<i class="fas fa-sun"></i>';
        } else {
            body.classList.remove('dark-mode');
            darkBtn.innerHTML = '<i class="fas fa-moon"></i>';
        }
        localStorage.setItem('darkMode', on ? '1' : '0');
    }
    // Load preference
    setDarkMode(localStorage.getItem('darkMode') === '1');
    darkBtn.onclick = function() {
        setDarkMode(!body.classList.contains('dark-mode'));
    };
});

// Show specific section
function showSection(sectionName, event = null) {
    // إخفاء كل الأقسام
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
        section.style.display = 'none';
    });
    // إظهار القسم المطلوب
    const sectionDiv = document.getElementById(sectionName + '-section');
    if (sectionDiv) {
        sectionDiv.classList.add('active');
        sectionDiv.style.display = '';
    }
    // تحديث التنقل
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    if (event && event.target) {
        event.target.classList.add('active');
    }
    currentSection = sectionName;
    // تحميل بيانات القسم إذا لزم
    switch(sectionName) {
        case 'inventory':
            refreshInventory();
            break;
        case 'gold':
            loadGoldTransactions();
            break;
        case 'cashbox':
            loadCashboxEntries();
            loadCashboxSummary();
            break;
        case 'debts':
            loadDebts();
            break;
        case 'remittances':
            loadRemittances();
            break;
        case 'transfers':
            loadCompanyTransfers();
            loadCurrencyConversions();
            break;
        case 'amanat':
            loadAmanat();
            break;
        case 'shopgold':
            loadShopGold();
            break;
    }
}

// API Helper Functions
async function apiCall(endpoint, method = 'GET', data = null) {
    try {
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            }
        };
        
        if (data) {
            options.body = JSON.stringify(data);
        }
        
        const response = await fetch(API_BASE + endpoint, options);
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'API Error');
        }
        
        return result;
    } catch (error) {
        console.error('API Error:', error);
        alert('خطأ: ' + error.message);
        throw error;
    }
}

// Inventory Functions
let lastInventory = null;

async function refreshInventory() {
    showLoader();
    try {
        const inventory = await apiCall('/inventory');
        lastInventory = inventory;
        
        // Display currencies
        const currenciesList = document.getElementById('currencies-list');
        currenciesList.innerHTML = '';
        
        inventory.currencies.forEach(currency => {
            const div = document.createElement('div');
            div.className = `balance-item ${getBalanceClass(currency.balance)}`;
            div.innerHTML = `<a href="#" onclick="showAccountStatement('${currency.name}')">${currency.name}</a>: ${formatNumber(currency.balance)}`;
            currenciesList.appendChild(div);
        });
        
        // Display gold
        const goldBalance = document.getElementById('gold-balance');
        goldBalance.className = `balance-item ${getBalanceClass(inventory.gold)}`;
        goldBalance.innerHTML = `الذهب: ${formatNumber(inventory.gold)} غرام`;
        
        // Display companies
        const companiesList = document.getElementById('companies-list');
        companiesList.innerHTML = '';
        const companies = inventory.companies || [];
        companies.forEach(companyObj => {
            const li = document.createElement('li');
            li.className = 'company-balance d-flex align-items-center mb-2 p-2 rounded shadow-sm';
            li.setAttribute('data-id', companyObj.id);
            li.setAttribute('draggable', 'true');
            li.innerHTML = `
                <span class="me-2 drag-handle" style="cursor:move"><i class="fas fa-bars"></i></span>
                <strong class="me-2">${companyObj.name}</strong>
                <div class="d-flex flex-wrap align-items-center me-3" style="gap: 0.5rem;">
                    ${Object.entries(companyObj.balances).map(([currency, balance]) => `
                        <span class="badge px-2 py-1 ${getBalanceClass(balance)}" style="font-size:1em;min-width:70px;display:inline-block;">${formatNumber(balance)} <span style='font-size:0.9em'>${currency}</span></span>
                    `).join('')}
                </div>
                <div class="ms-auto d-flex align-items-center" style="gap:0.5rem;">
                    <button class="btn btn-sm btn-outline-primary" onclick="showCompanyMatchModal(${companyObj.id})"><i class='fas fa-copy'></i> مطابقة</button>
                    <button class="btn btn-sm btn-outline-danger" onclick="openCompanyOperationModal('${companyObj.name}', 'withdraw')"><i class="fas fa-minus"></i> سحب</button>
                    <button class="btn btn-sm btn-outline-success" onclick="openCompanyOperationModal('${companyObj.name}', 'deposit')"><i class="fas fa-plus"></i> إيداع</button>
                </div>
            `;
            companiesList.appendChild(li);
        });
        enableCompaniesDragAndDrop();
        
    } catch (error) {
        console.error('Error loading inventory:', error);
        showToast('حدث خطأ أثناء تحميل الجرد');
    } finally {
        hideLoader();
    }
}

function showAccountStatement(currency) {
    // إخفاء كل الأقسام
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
        section.style.display = 'none';
    });
    // إظهار قسم كشف الحساب
    document.getElementById('account-statement-section').classList.add('active');
    document.getElementById('account-statement-section').style.display = '';
    document.getElementById('account-statement-currency').textContent = currency;
    loadAccountStatement(currency);
}

async function loadAccountStatement(currency) {
    showLoader();
    try {
        const data = await apiCall(`/account_statement/${currency}`);
        // تعبئة الجدول
        const table = document.getElementById('account-statement-table');
        table.innerHTML = '';
        data.entries.forEach(entry => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${entry.date}</td>
                <td>${entry.action}</td>
                <td>${formatNumber(entry.amount)}</td>
                <td>${entry.source}</td>
                <td>${entry.notes || ''}</td>
            `;
            table.appendChild(tr);
        });
        document.getElementById('account-statement-total-in').textContent = formatNumber(data.total_in);
        document.getElementById('account-statement-total-out').textContent = formatNumber(data.total_out);
        document.getElementById('account-statement-balance').textContent = formatNumber(data.balance);
    } catch (e) {
        showToast('حدث خطأ أثناء تحميل كشف الحساب');
    } finally {
        hideLoader();
    }
}

// Gold Functions
async function loadGoldTransactions() {
    showLoader();
    try {
        const transactions = await apiCall('/gold/transactions');
        const tbody = document.getElementById('gold-transactions-table');
        tbody.innerHTML = '';
        
        transactions.forEach(transaction => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${transaction.date}</td>
                <td><span class="badge ${transaction.type === 'buy' ? 'bg-success' : 'bg-danger'}">${transaction.type === 'buy' ? 'شراء' : 'بيع'}</span></td>
                <td>${transaction.item_type === 'gram' ? 'غرام' : 'قطعة'}</td>
                <td>${formatNumber(transaction.quantity)}</td>
                <td>${transaction.currency}</td>
                <td>${formatNumber(transaction.amount)}</td>
                <td>${formatNumber(transaction.price_per_unit)}</td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading gold transactions:', error);
    } finally {
        hideLoader();
    }
}

async function submitGoldTransaction() {
    try {
        const form = document.getElementById('goldForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        await apiCall('/gold/transaction', 'POST', data);
        
        // Close modal and refresh data
        bootstrap.Modal.getInstance(document.getElementById('goldModal')).hide();
        form.reset();
        loadGoldTransactions();
        refreshInventory();
        
        alert('تم حفظ معاملة الذهب بنجاح');
    } catch (error) {
        console.error('Error submitting gold transaction:', error);
    }
}

// Cash Box Functions
async function loadCashboxEntries() {
    showLoader();
    try {
        const entries = await apiCall('/cashbox/entries');
        const tbody = document.getElementById('cashbox-entries-table');
        tbody.innerHTML = '';
        
        entries.forEach(entry => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${entry.date}</td>
                <td>${entry.currency}</td>
                <td>${formatNumber(entry.amount)}</td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading cashbox entries:', error);
    } finally {
        hideLoader();
    }
}

async function loadCashboxSummary() {
    showLoader();
    try {
        const summary = await apiCall('/cashbox/summary');
        const summaryDiv = document.getElementById('cashbox-summary');
        summaryDiv.innerHTML = '';
        
        Object.entries(summary).forEach(([currency, total]) => {
            const div = document.createElement('div');
            div.className = `balance-item balance-positive`;
            div.innerHTML = `${currency}: ${formatNumber(total)}`;
            summaryDiv.appendChild(div);
        });
    } catch (error) {
        console.error('Error loading cashbox summary:', error);
    } finally {
        hideLoader();
    }
}

async function submitCashboxEntry() {
    try {
        const form = document.getElementById('cashboxForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        await apiCall('/cashbox/entry', 'POST', data);
        
        // Close modal and refresh data
        bootstrap.Modal.getInstance(document.getElementById('cashboxModal')).hide();
        form.reset();
        loadCashboxEntries();
        loadCashboxSummary();
        refreshInventory();
        
        alert('تم إضافة المبلغ للصندوق بنجاح');
    } catch (error) {
        console.error('Error submitting cashbox entry:', error);
    }
}

async function clearCashbox() {
    if (confirm('هل أنت متأكد من تفريغ الصندوق؟')) {
        try {
            await apiCall('/cashbox/clear', 'POST');
            loadCashboxEntries();
            loadCashboxSummary();
            alert('تم تفريغ الصندوق بنجاح');
        } catch (error) {
            console.error('Error clearing cashbox:', error);
        }
    }
}

// Debts Functions
let allDebts = [];

async function loadDebts() {
    showLoader();
    try {
        const data = await apiCall('/debts');
        const debts = data.debts;
        allDebts = debts;
        const summary = data.summary;
        const summaryDiv = document.getElementById('debts-summary');
        let html = '<div class="mb-3"><strong>صافي الديون لكل عملة:</strong><ul>';
        Object.entries(summary).forEach(([currency, vals]) => {
            html += `<li>${currency}: لي = <span style='color:green'>${formatNumber(vals.li)}</span> | عليّ = <span style='color:red'>${formatNumber(vals.alay)}</span> | الصافي = <b>${formatNumber(vals.net)}</b></li>`;
        });
        html += '</ul></div>';
        summaryDiv.innerHTML = html;
        filterAndRenderDebts();
    } catch (error) {
        console.error('Error loading debts:', error);
    } finally {
        hideLoader();
    }
}

function filterAndRenderDebts() {
    const search = document.getElementById('debt-search').value.trim().toLowerCase();
    const currency = document.getElementById('debt-currency-filter').value;
    const type = document.getElementById('debt-type-filter').value;
    const dateFrom = document.getElementById('debt-date-from').value;
    const dateTo = document.getElementById('debt-date-to').value;

    // تجميع الديون غير المسددة حسب الشخص والعملة والنوع
    let grouped = {};
    allDebts.filter(d => !d.is_settled).forEach(d => {
        const key = d.person_name + '|' + d.currency + '|' + d.type;
        if (!grouped[key]) {
            grouped[key] = { ...d, amount: 0, ids: [] };
        }
        grouped[key].amount += d.amount;
        grouped[key].ids.push(d.id);
    });
    let filtered = Object.values(grouped).filter(d => {
        let match = true;
        if (search) {
            match = match && (
                (d.person_name && d.person_name.toLowerCase().includes(search)) ||
                (d.notes && d.notes.toLowerCase().includes(search))
            );
        }
        if (currency) match = match && d.currency === currency;
        if (type) match = match && d.type === type;
        if (dateFrom) match = match && d.date >= dateFrom;
        if (dateTo) match = match && d.date <= dateTo;
        return match;
    });
    const tbody = document.getElementById('debts-table');
    tbody.innerHTML = '';
    filtered.forEach(debt => {
        const row = document.createElement('tr');
        row.className = 'table-danger';
        row.innerHTML = `
            <td>${debt.date}</td>
            <td>${debt.person_name}</td>
            <td>${debt.type === 'borrowed_from_someone' ? 'اتدينت من شخص' : 'شخص تدين مني'}</td>
            <td>${formatNumber(debt.amount)}</td>
            <td>${debt.currency}</td>
            <td>${debt.notes || '-'}</td>
            <td><span class="badge bg-danger">غير مسدد</span></td>
            <td>
                <button class="btn btn-sm btn-success" onclick="settleAllDebts('${debt.person_name}','${debt.currency}','${debt.type}')">تسديد الكل</button>
                <button class="btn btn-sm btn-warning" onclick="openPartialSettleModal('${debt.person_name}','${debt.currency}','${debt.type}', ${debt.amount})">تسديد جزئي</button>
                <button class="btn btn-sm btn-primary" onclick="openAddDebtModal('${debt.person_name}','${debt.currency}','${debt.type}')">إضافة دين جديد</button>
                <button class="btn btn-sm btn-secondary" onclick="showDebtHistory(${debt.ids[0]})">تفاصيل</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

async function settleAllDebts(person, currency, type) {
    if (!confirm('هل أنت متأكد من تسديد جميع الديون لهذا الشخص؟')) return;
    const ids = allDebts.filter(d => !d.is_settled && d.person_name === person && d.currency === currency && d.type === type).map(d => d.id);
    for (const id of ids) {
        await apiCall(`/debt/${id}/settle`, 'POST');
    }
    loadDebts();
    refreshInventory();
    alert('تم تسديد جميع الديون بنجاح');
}

function openPartialSettleModal(person, currency, type, maxAmount) {
    const modalHtml = `
    <div class="modal fade" id="partialSettleModal" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">تسديد جزئي</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <label>المبلغ المراد تسديده:</label>
            <input type="number" id="partial-settle-amount" class="form-control" min="0.01" max="${maxAmount}" value="${maxAmount}" step="0.01">
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إلغاء</button>
            <button type="button" class="btn btn-warning" onclick="submitPartialSettle('${person}','${currency}','${type}', ${maxAmount})">تسديد</button>
          </div>
        </div>
      </div>
    </div>`;
    // إزالة أي نافذة قديمة
    const oldModal = document.getElementById('partialSettleModal');
    if (oldModal) oldModal.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    var modal = new bootstrap.Modal(document.getElementById('partialSettleModal'));
    modal.show();
}

async function submitPartialSettle(person, currency, type, maxAmount) {
    const amount = parseFloat(document.getElementById('partial-settle-amount').value);
    if (!amount || amount <= 0 || amount > maxAmount) {
        alert('يرجى إدخال مبلغ صحيح');
        return;
    }
    // جلب كل الديون غير المسددة لهذا الشخص/العملة/النوع مرتبة من الأقدم للأحدث
    const debts = allDebts.filter(d => !d.is_settled && d.person_name === person && d.currency === currency && d.type === type)
        .sort((a, b) => new Date(a.date) - new Date(b.date));
    let remaining = amount;
    for (const debt of debts) {
        if (remaining <= 0) break;
        if (remaining >= debt.amount) {
            // سدد الدين كامل
            await apiCall(`/debt/${debt.id}/settle`, 'POST');
            remaining -= debt.amount;
        } else {
            // سدد جزء من الدين
            await apiCall(`/debt/${debt.id}/partial_settle`, 'POST', { amount: remaining });
            remaining = 0;
        }
    }
    bootstrap.Modal.getInstance(document.getElementById('partialSettleModal')).hide();
    loadDebts();
    refreshInventory();
    alert('تمت عملية التسديد الجزئي بنجاح');
}

function openAddDebtModal(person, currency, type) {
    const form = document.getElementById('debtForm');
    form.reset();
    form.debt_id.value = '';
    form.person_name.value = person;
    form.currency.value = currency;
    form.type.value = type;
    const modal = new bootstrap.Modal(document.getElementById('debtModal'));
    modal.show();
}

['debt-search', 'debt-currency-filter', 'debt-type-filter', 'debt-date-from', 'debt-date-to'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener('input', filterAndRenderDebts);
        el.addEventListener('change', filterAndRenderDebts);
    }
});

async function editDebt(debtId) {
    try {
        const data = await apiCall('/debts');
        const debt = data.debts.find(d => d.id === debtId);
        if (!debt) return;
        const form = document.getElementById('debtForm');
        form.debt_id.value = debt.id;
        form.person_name.value = debt.person_name;
        form.type.value = debt.type;
        form.amount.value = debt.amount;
        form.currency.value = debt.currency;
        form.date.value = debt.date;
        form.notes.value = debt.notes || '';
        const modal = new bootstrap.Modal(document.getElementById('debtModal'));
        modal.show();
    } catch (error) {
        alert('خطأ في تحميل بيانات الدين');
    }
}

async function submitDebt() {
    try {
        const form = document.getElementById('debtForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        let endpoint = '/debt';
        let method = 'POST';
        if (data.debt_id) {
            endpoint = `/debt/${data.debt_id}`;
            method = 'PUT';
        }
        await apiCall(endpoint, method, data);
        bootstrap.Modal.getInstance(document.getElementById('debtModal')).hide();
        form.reset();
        loadDebts();
        refreshInventory();
        alert('تم حفظ الدين بنجاح');
    } catch (error) {
        // الخطأ سيظهر تلقائياً من apiCall
    }
}

async function settleDebt(debtId) {
    if (confirm('هل أنت متأكد من تسديد هذا الدين؟')) {
        try {
            await apiCall(`/debt/${debtId}/settle`, 'POST');
            loadDebts();
            refreshInventory();
            alert('تم تسديد الدين بنجاح');
        } catch (error) {
            console.error('Error settling debt:', error);
        }
    }
}

async function deleteDebt(debtId) {
    if (!confirm('هل أنت متأكد من حذف هذا الدين؟')) return;
    try {
        await apiCall(`/debt/${debtId}`, 'DELETE');
        loadDebts();
        refreshInventory();
        alert('تم حذف الدين بنجاح');
    } catch (error) {
        alert('حدث خطأ أثناء حذف الدين');
    }
}

function showDebtHistory(debtId) {
    fetch(`/api/debt/history/${debtId}`)
        .then(res => res.json())
        .then(history => {
            const tbody = document.getElementById('debt-history-table');
            tbody.innerHTML = '';
            history.forEach(h => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${h.date}</td>
                    <td>${h.action === 'add' ? 'إضافة' : h.action === 'edit' ? 'تعديل' : h.action === 'settle' ? 'تسديد' : h.action}</td>
                    <td>${formatNumber(h.amount)}</td>
                    <td>${h.currency}</td>
                    <td>${h.notes || ''}</td>
                    <td>${h.timestamp}</td>
                `;
                tbody.appendChild(tr);
            });
            var modal = new bootstrap.Modal(document.getElementById('debtHistoryModal'));
            modal.show();
        });
}

// Companies and Remittances Functions
async function loadCompanies() {
    try {
        const companies = await apiCall('/companies');
        
        // Populate all company dropdowns
        const selects = [
            'company-filter',
            'remittance-company-select',
            'from-company-select',
            'to-company-select'
        ];
        
        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                // Keep existing options for filter
                if (selectId !== 'company-filter') {
                    select.innerHTML = '';
                }
                
                companies.forEach(company => {
                    const option = document.createElement('option');
                    option.value = company.id;
                    option.textContent = company.name;
                    select.appendChild(option);
                });
            }
        });
    } catch (error) {
        console.error('Error loading companies:', error);
    }
}

let allRemittances = [];

async function loadRemittances() {
    showLoader();
    try {
        const companyId = document.getElementById('company-filter') ? document.getElementById('company-filter').value : '';
        const endpoint = companyId ? `/remittances?company_id=${companyId}` : '/remittances';
        const remittances = await apiCall(endpoint);
        allRemittances = remittances;
        filterAndRenderRemittances();
    } catch (error) {
        console.error('Error loading remittances:', error);
    } finally {
        hideLoader();
    }
}

function filterAndRenderRemittances() {
    const search = document.getElementById('remittance-search').value.trim().toLowerCase();
    const currency = document.getElementById('remittance-currency-filter').value;
    const type = document.getElementById('remittance-type-filter').value;
    const dateFrom = document.getElementById('remittance-date-from').value;
    const dateTo = document.getElementById('remittance-date-to').value;

    let filtered = allRemittances.filter(r => {
        let match = true;
        if (search) {
            match = match && (
                (r.person_name && r.person_name.toLowerCase().includes(search)) ||
                (r.receipt_number && r.receipt_number.toLowerCase().includes(search)) ||
                (r.notes && r.notes.toLowerCase().includes(search))
            );
        }
        if (currency) match = match && r.currency === currency;
        if (type) match = match && r.type === type;
        if (dateFrom) match = match && r.date >= dateFrom;
        if (dateTo) match = match && r.date <= dateTo;
        return match;
    });

    const tbody = document.getElementById('remittances-table');
    tbody.innerHTML = '';
    filtered.forEach(remittance => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${remittance.date}</td>
            <td><span class="badge ${remittance.type === 'send' ? 'bg-warning' : 'bg-success'}">${remittance.type === 'send' ? 'إرسال' : 'استلام'}</span></td>
            <td>${remittance.receipt_number}</td>
            <td>${remittance.person_name}</td>
            <td>${formatNumber(remittance.amount)}</td>
            <td>${remittance.currency}</td>
            <td>${remittance.company_name}</td>
            <td>${remittance.notes || '-'}</td>
            <td>
                <button class='btn btn-sm btn-info' onclick='showRemittanceDetails(${remittance.id})'><i class='fas fa-eye'></i> تفاصيل</button>
                <button class='btn btn-sm btn-warning ms-1' onclick='openEditRemittanceModal(${remittance.id})'><i class='fas fa-edit'></i> تعديل</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

['remittance-search', 'remittance-currency-filter', 'remittance-type-filter', 'remittance-date-from', 'remittance-date-to'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener('input', filterAndRenderRemittances);
        el.addEventListener('change', filterAndRenderRemittances);
    }
});

async function submitRemittance() {
    try {
        const form = document.getElementById('remittanceForm');
        const formData = new FormData(form);
        
        const response = await fetch('/api/remittance', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'خطأ في حفظ الحوالة');
        }
        
        // Close modal and refresh data
        bootstrap.Modal.getInstance(document.getElementById('remittanceModal')).hide();
        form.reset();
        loadRemittances();
        refreshInventory();
        alert('تم حفظ الحوالة بنجاح');
    } catch (error) {
        console.error('Error submitting remittance:', error);
        alert(error.message || 'خطأ في حفظ الحوالة');
    }
}

// Transfers Functions
async function loadCompanyTransfers() {
    showLoader();
    try {
        const transfers = await apiCall('/company-transfers');
        const tbody = document.getElementById('company-transfers-table');
        tbody.innerHTML = '';
        
        transfers.forEach(transfer => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${transfer.date}</td>
                <td>${transfer.from_company_name}</td>
                <td>${transfer.to_company_name}</td>
                <td>${formatNumber(transfer.amount)}</td>
                <td>${transfer.currency}</td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading company transfers:', error);
    } finally {
        hideLoader();
    }
}

async function submitCompanyTransfer() {
    try {
        const form = document.getElementById('companyTransferForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        if (data.from_company_id === data.to_company_id) {
            alert('لا يمكن التحويل من وإلى نفس الشركة');
            return;
        }
        
        await apiCall('/company-transfer', 'POST', data);
        
        // Close modal and refresh data
        bootstrap.Modal.getInstance(document.getElementById('companyTransferModal')).hide();
        form.reset();
        loadCompanyTransfers();
        refreshInventory();
        
        alert('تم حفظ التحويل بنجاح');
    } catch (error) {
        console.error('Error submitting company transfer:', error);
    }
}

// عند فتح نموذج تحويل العملات، حمّل الشركات
function populateCurrencyCompanySelect() {
    const select = document.getElementById('currency-company-select');
    select.innerHTML = '<option value="">بدون شركة</option>';
    if (!lastInventory || !lastInventory.companies) return;
    lastInventory.companies.forEach(company => {
        const option = document.createElement('option');
        option.value = company.id;
        option.textContent = company.name;
        select.appendChild(option);
    });
}

// عند تغيير الشركة أو العملة، اعرض رصيد الشركة بالعملة المختارة
function updateCompanyCurrencyBalance() {
    const select = document.getElementById('currency-company-select');
    const companyId = select.value;
    const fromCurrency = document.querySelector('#currencyConversionForm [name="from_currency"]').value;
    const balanceInput = document.getElementById('company-currency-balance');
    let balance = '';
    if (companyId && lastInventory && lastInventory.companies) {
        const company = lastInventory.companies.find(c => c.id == companyId);
        if (company && company.balances && fromCurrency in company.balances) {
            balance = company.balances[fromCurrency];
        }
    }
    balanceInput.value = balance !== '' ? formatNumber(balance) : '';
}

// اربط الأحداث
function setupCurrencyCompanyEvents() {
    const companySelect = document.getElementById('currency-company-select');
    const fromCurrencySelect = document.querySelector('#currencyConversionForm [name="from_currency"]');
    if (companySelect && fromCurrencySelect) {
        companySelect.addEventListener('change', updateCompanyCurrencyBalance);
        fromCurrencySelect.addEventListener('change', updateCompanyCurrencyBalance);
    }
}

// عند فتح المودال
const currencyConversionModal = document.getElementById('currencyConversionModal');
currencyConversionModal.addEventListener('show.bs.modal', function() {
    populateCurrencyCompanySelect();
    updateCompanyCurrencyBalance();
    setupCurrencyCompanyEvents();
});

// عند إرسال التحويل أرسل company_id
async function submitCurrencyConversion() {
    try {
        const form = document.getElementById('currencyConversionForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        if (data.from_currency === data.to_currency) {
            alert('لا يمكن التحويل من وإلى نفس العملة');
            return;
        }
        // أضف company_id إذا تم اختياره
        data.company_id = form.querySelector('[name="company_id"]').value || undefined;
        await apiCall('/currency-conversion', 'POST', data);
        // Close modal and refresh data
        bootstrap.Modal.getInstance(document.getElementById('currencyConversionModal')).hide();
        form.reset();
        loadCurrencyConversions();
        refreshInventory();
        alert('تم حفظ التحويل بنجاح');
    } catch (error) {
        console.error('Error submitting currency conversion:', error);
    }
}

// Form Calculations
function setupGoldFormCalculations() {
    const form = document.getElementById('goldForm');
    const quantityInput = form.querySelector('[name="quantity"]');
    const priceInput = form.querySelector('[name="price_per_unit"]');
    const amountInput = form.querySelector('[name="amount"]');
    
    function calculateAmount() {
        const quantity = parseFloat(quantityInput.value) || 0;
        const price = parseFloat(priceInput.value) || 0;
        amountInput.value = (quantity * price).toFixed(2);
    }
    
    quantityInput.addEventListener('input', calculateAmount);
    priceInput.addEventListener('input', calculateAmount);
}

function setupCurrencyConversionCalculations() {
    const form = document.getElementById('currencyConversionForm');
    const fromAmountInput = form.querySelector('[name="from_amount"]');
    const exchangeRateInput = form.querySelector('[name="exchange_rate"]');
    const toAmountInput = form.querySelector('[name="to_amount"]');
    
    function calculateToAmount() {
        const fromAmount = parseFloat(fromAmountInput.value) || 0;
        const exchangeRate = parseFloat(exchangeRateInput.value) || 0;
        toAmountInput.value = (fromAmount * exchangeRate).toFixed(2);
    }
    
    fromAmountInput.addEventListener('input', calculateToAmount);
    exchangeRateInput.addEventListener('input', calculateToAmount);
}

// Utility Functions
function getBalanceClass(balance) {
    if (balance > 0) return 'balance-positive';
    if (balance < 0) return 'balance-negative';
    return 'balance-zero';
}

function formatNumber(number) {
    return new Intl.NumberFormat('ar-SA', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(number);
}

async function submitAddCompany() {
    try {
        const form = document.getElementById('addCompanyForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        await apiCall('/companies/add', 'POST', data);
        // إغلاق المودال وتحديث القائمة
        bootstrap.Modal.getInstance(document.getElementById('addCompanyModal')).hide();
        form.reset();
        refreshInventory();
        alert('تمت إضافة الشركة بنجاح');
    } catch (error) {
        // الخطأ سيظهر تلقائياً من apiCall
    }
}

async function resetAll() {
    if (!confirm('هل أنت متأكد أنك تريد حذف جميع الحوالات والديون وإعادة الجرد إلى صفر؟')) return;
    try {
        await apiCall('/reset-all', 'POST');
        refreshInventory();
        loadDebts();
        loadRemittances();
        alert('تمت إعادة ضبط جميع البيانات بنجاح');
    } catch (error) {
        alert('حدث خطأ أثناء إعادة الضبط');
    }
}

function exportDebtsPDF() {
    fetch('/api/debts/pdf')
        .then(response => response.blob())
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'debt_book.pdf';
            document.body.appendChild(a);
            a.click();
            a.remove();
        });
}

function enableCompaniesDragAndDrop() {
    const list = document.getElementById('companies-list');
    let dragged;
    list.querySelectorAll('li').forEach(li => {
        li.addEventListener('dragstart', function(e) {
            dragged = li;
            li.classList.add('dragging');
        });
        li.addEventListener('dragend', function(e) {
            li.classList.remove('dragging');
        });
        li.addEventListener('dragover', function(e) {
            e.preventDefault();
            const dragging = list.querySelector('.dragging');
            if (dragging && dragging !== li) {
                const rect = li.getBoundingClientRect();
                const next = (e.clientY - rect.top) > (rect.height / 2);
                list.insertBefore(dragging, next ? li.nextSibling : li);
            }
        });
    });
    list.addEventListener('drop', function(e) {
        e.preventDefault();
        // بعد الترتيب الجديد، أرسل IDs الشركات كأرقام صحيحة
        const ids = Array.from(list.querySelectorAll('li'))
            .map(li => parseInt(li.getAttribute('data-id'), 10))
            .filter(Boolean);
        fetch('/api/companies/reorder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids })
        }).then(res => res.json()).then(data => {
            if (data.success) {
                refreshInventory();
            }
        });
    });
}

const azkarList = [
    '﴿ رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ ﴾',
    'قال ﷺ: «من قال سبحان الله وبحمده في يوم مائة مرة حُطَّت خطاياه ولو كانت مثل زبد البحر»',
    '﴿ أَلا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ ﴾',
    'اللهم صل وسلم على نبينا محمد',
    'قال ﷺ: «الدعاء هو العبادة»',
    'أستغفر الله العظيم وأتوب إليه',
    'اللهم إني أسألك العفو والعافية في الدنيا والآخرة',
    '﴿ وَقُل رَّبِّ زِدْنِي عِلْمًا ﴾',
    'قال ﷺ: «خيركم من تعلم القرآن وعلمه»',
    '﴿ إِنَّ مَعَ الْعُسْرِ يُسْرًا ﴾',
    'اللهم إني أسألك رضاك والجنة وأعوذ بك من سخطك والنار',
    'قال ﷺ: «من لزم الاستغفار جعل الله له من كل هم فرجًا ومن كل ضيق مخرجًا»',
    '﴿ وَمَا تَوْفِيقِي إِلَّا بِاللَّهِ ﴾',
    'اللهم إني أعوذ بك من الهم والحزن والعجز والكسل',
    'قال ﷺ: «من قرأ آية الكرسي دبر كل صلاة لم يمنعه من دخول الجنة إلا الموت»',
    '﴿ إِنَّ اللَّهَ مَعَ الصَّابِرِينَ ﴾',
    'اللهم إني أسألك حسن الخاتمة',
    'قال ﷺ: «من قال لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير، في يوم مائة مرة كانت له عدل عشر رقاب...»',
    '﴿ وَاصْبِرْ وَمَا صَبْرُكَ إِلَّا بِاللَّهِ ﴾',
    'اللهم اجعل القرآن ربيع قلوبنا ونور صدورنا',
    'قال ﷺ: «من سلك طريقًا يلتمس فيه علمًا سهّل الله له به طريقًا إلى الجنة»',
    '﴿ وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا ﴾',
    'اللهم ارزقنا تلاوة القرآن آناء الليل وأطراف النهار',
    'قال ﷺ: «من يرد الله به خيرًا يفقهه في الدين»',
    '﴿ إِنَّ اللَّهَ يُحِبُّ الْمُتَّقِينَ ﴾',
    'اللهم إني أعوذ بك من زوال نعمتك وتحول عافيتك وفجاءة نقمتك وجميع سخطك',
    'قال ﷺ: «من قال حين يصبح وحين يمسي: حسبي الله لا إله إلا هو عليه توكلت وهو رب العرش العظيم، سبع مرات كفاه الله ما أهمه»',
    '﴿ وَرَحْمَتِي وَسِعَتْ كُلَّ شَيْءٍ ﴾',
    'اللهم إني أسألك علماً نافعاً ورزقاً طيباً وعملاً متقبلاً',
    'قال ﷺ: «من صلى علي صلاة صلى الله عليه بها عشراً»',
    '﴿ إِنَّ اللَّهَ مَعَ الْمُحْسِنِينَ ﴾',
    'اللهم إني أعوذ بك من شر ما عملت ومن شر ما لم أعمل',
    'قال ﷺ: «من توضأ فأحسن الوضوء خرجت خطاياه من جسده حتى تخرج من تحت أظفاره»',
    '﴿ وَمَا تَوْفِيقِي إِلَّا بِاللَّهِ ﴾',
    'اللهم إني أسألك الثبات في الأمر والعزيمة على الرشد',
    'قال ﷺ: «من قرأ سورة الكهف في يوم الجمعة أضاء له من النور ما بين الجمعتين»',
    '﴿ وَقُل رَّبِّ أَعُوذُ بِكَ مِنْ هَمَزَاتِ الشَّيَاطِينِ ﴾',
    'اللهم إني أعوذ بك من جهد البلاء ودرك الشقاء وسوء القضاء وشماتة الأعداء',
    'قال ﷺ: «من قال سبحان الله وبحمده، سبحان الله العظيم، غرست له نخلة في الجنة»',
    '﴿ وَاللَّهُ غَالِبٌ عَلَى أَمْرِهِ ﴾',
    'اللهم إني أسألك من الخير كله عاجله وآجله',
    'قال ﷺ: «من قرأ قل هو الله أحد عشر مرات بنى الله له بيتًا في الجنة»',
    '﴿ وَمَا النَّصْرُ إِلَّا مِنْ عِندِ اللَّهِ ﴾',
    'اللهم إني أسألك العفو والعافية في ديني ودنياي وأهلي ومالي',
    'قال ﷺ: «من قال رضيت بالله رباً وبالإسلام ديناً وبمحمد ﷺ نبياً وجبت له الجنة»',
    '﴿ وَاللَّهُ يُحِبُّ الصَّابِرِينَ ﴾',
    'اللهم إني أسألك الهدى والتقى والعفاف والغنى',
    'قال ﷺ: «من قرأ آيتين من آخر سورة البقرة في ليلة كفتاه»',
    '﴿ وَمَا بِكُم مِّن نِّعْمَةٍ فَمِنَ اللَّهِ ﴾',
    'اللهم إني أعوذ بك من قلب لا يخشع ودعاء لا يسمع ونفس لا تشبع وعلم لا ينفع',
    'قال ﷺ: «من قال سبحان الله وبحمده، سبحان الله العظيم، غرست له نخلة في الجنة»',
    '﴿ وَاللَّهُ خَيْرُ الرَّازِقِينَ ﴾',
    'اللهم إني أسألك حبك وحب من يحبك وحب عمل يقربني إلى حبك'
];
let azkarIndex = 0;
function updateAzkar() {
    const azkarText = document.getElementById('azkar-text');
    azkarText.textContent = azkarList[azkarIndex];
    azkarIndex = (azkarIndex + 1) % azkarList.length;
}

function showLoader() { document.getElementById('loader').style.display = 'block'; }
function hideLoader() { document.getElementById('loader').style.display = 'none'; }
function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function openPopupWindow() {
    window.open(
        window.location.href,
        'popupWindow',
        'width=500,height=700,toolbar=no,menubar=no,location=no,status=no,scrollbars=yes,resizable=yes'
    );
}

function exportInventoryExcel() {
    fetch('/api/export/inventory/excel')
        .then(response => response.blob())
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'الجرد_' + new Date().toISOString().slice(0,10) + '.xlsx';
            document.body.appendChild(a);
            a.click();
            a.remove();
        });
}

function importInventoryExcel(input) {
    if (!input.files.length) return;
    const file = input.files[0];
    const formData = new FormData();
    formData.append('file', file);
    showLoader();
    fetch('/api/import/inventory/excel', {
        method: 'POST',
        body: formData
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showToast('تم استيراد الجرد بنجاح');
            refreshInventory();
        } else {
            showToast(data.error || 'حدث خطأ أثناء الاستيراد');
        }
    })
    .catch(() => showToast('حدث خطأ أثناء الاستيراد'))
    .finally(() => {
        hideLoader();
        input.value = '';
    });
}

// Add modal logic and API call
window.openCompanyOperationModal = function(company, operation) {
    // Set modal fields
    document.getElementById('company-operation-company').textContent = company;
    document.getElementById('company-operation-type').textContent = operation === 'withdraw' ? 'سحب' : 'إيداع';
    document.getElementById('company-operation-amount').value = '';
    document.getElementById('company-operation-currency').value = '';
    document.getElementById('company-operation-modal').setAttribute('data-company', company);
    document.getElementById('company-operation-modal').setAttribute('data-operation', operation);
    var modal = new bootstrap.Modal(document.getElementById('company-operation-modal'));
    modal.show();
}

window.submitCompanyOperation = async function() {
    const modal = document.getElementById('company-operation-modal');
    const company = modal.getAttribute('data-company');
    const operation = modal.getAttribute('data-operation');
    const amount = parseFloat(document.getElementById('company-operation-amount').value);
    const currency = document.getElementById('company-operation-currency').value;
    if (!amount || !currency) {
        alert('يرجى إدخال المبلغ والعملة');
        return;
    }
    try {
        await apiCall('/company/transaction', 'POST', {
            company_name: company,
            operation,
            amount,
            currency
        });
        bootstrap.Modal.getInstance(modal).hide();
        refreshInventory();
        alert('تمت العملية بنجاح');
    } catch (error) {
        // الخطأ سيظهر تلقائياً من apiCall
    }
}

// Amanat Functions
async function loadAmanat() {
    showLoader();
    try {
        const res = await apiCall('/amanat');
        const tbody = document.getElementById('amanat-table');
        tbody.innerHTML = '';
        res.amanat.forEach(a => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${a.type === 'gold' ? 'ذهب' : 'أموال'}</td>
                <td>${a.person_name}</td>
                <td>${a.currency || '-'}</td>
                <td>${formatNumber(a.amount)}</td>
                <td>${a.date}</td>
                <td>${a.notes || ''}</td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        showToast('حدث خطأ أثناء تحميل الأمانات');
    } finally {
        hideLoader();
    }
}

async function submitAmanah() {
    const form = document.getElementById('addAmanahForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    if (!data.type || !data.person_name || !data.amount || !data.date) {
        alert('يرجى تعبئة جميع الحقول المطلوبة');
        return;
    }
    if (data.type === 'money' && !data.currency) {
        alert('يرجى إدخال العملة');
        return;
    }
    if (data.type === 'gold') {
        data.currency = '';
    }
    try {
        await apiCall('/amanat/add', 'POST', data);
        bootstrap.Modal.getInstance(document.getElementById('addAmanahModal')).hide();
        form.reset();
        loadAmanat();
        alert('تمت إضافة الأمانة بنجاح');
    } catch (error) {
        // الخطأ سيظهر تلقائياً من apiCall
    }
}

// Calculator logic
let calcValue = '';
function calcInput(val) {
    calcValue += val;
    document.getElementById('calc-display').value = calcValue;
}
function calcClear() {
    calcValue = '';
    document.getElementById('calc-display').value = '';
}
function calcEvaluate() {
    try {
        // أمان: فقط أرقام وعمليات بسيطة
        if (/^[0-9+\-*/.() ]+$/.test(calcValue)) {
            let result = eval(calcValue);
            document.getElementById('calc-display').value = result;
            calcValue = result.toString();
        }
    } catch {}
}
function calcCopy() {
    const val = document.getElementById('calc-display').value;
    if (val) {
        navigator.clipboard.writeText(val);
        showToast('تم نسخ النتيجة!');
    }
}
document.getElementById('open-calculator').onclick = function() {
    calcClear();
    var modal = new bootstrap.Modal(document.getElementById('calculatorModal'));
    modal.show();
};

// دعم لوحة المفاتيح للآلة الحاسبة
(function() {
    let calcModal = document.getElementById('calculatorModal');
    calcModal.addEventListener('shown.bs.modal', function() {
        document.addEventListener('keydown', calcKeyHandler);
    });
    calcModal.addEventListener('hidden.bs.modal', function() {
        document.removeEventListener('keydown', calcKeyHandler);
    });
    function calcKeyHandler(e) {
        if (e.key >= '0' && e.key <= '9') {
            calcInput(e.key);
        } else if (["+", "-", "*", "/", "."].includes(e.key)) {
            calcInput(e.key);
        } else if (e.key === 'Enter' || e.key === '=') {
            calcEvaluate();
            e.preventDefault();
        } else if (e.key === 'Backspace') {
            calcValue = calcValue.slice(0, -1);
            document.getElementById('calc-display').value = calcValue;
            e.preventDefault();
        } else if (e.key === 'Delete' || e.key.toLowerCase() === 'c') {
            calcClear();
            e.preventDefault();
        }
    }
})();

async function showRemittanceDetails(remittanceId) {
    try {
        const data = await apiCall('/remittances');
        const remittance = data.find(r => r.id == remittanceId);
        if (!remittance) return;
        let html = `<div class='row'>
            <div class='col-md-6'><b>التاريخ:</b> ${remittance.date}</div>
            <div class='col-md-6'><b>النوع:</b> ${remittance.type === 'send' ? 'إرسال' : 'استلام'}</div>
            <div class='col-md-6'><b>رقم الإشعار:</b> ${remittance.receipt_number}</div>
            <div class='col-md-6'><b>اسم الشخص:</b> ${remittance.person_name}</div>
            <div class='col-md-6'><b>المبلغ:</b> ${formatNumber(remittance.amount)}</div>
            <div class='col-md-6'><b>العملة:</b> ${remittance.currency}</div>
            <div class='col-md-6'><b>الشركة:</b> ${remittance.company_name}</div>
            <div class='col-md-12'><b>ملاحظات:</b> ${remittance.notes || '-'}</div>
        </div>`;
        // صور الهوية
        if (remittance.id_image1 || remittance.id_image2) {
            html += `<hr><b>صور الهوية:</b><div class='d-flex flex-wrap gap-3 mt-2'>`;
            if (remittance.id_image1) {
                html += `<a href="/static/uploads/ids/${remittance.id_image1}" target="_blank"><img src="/static/uploads/ids/${remittance.id_image1}" style="max-width:150px;max-height:150px;border:1px solid #ccc;padding:2px;"></a>`;
            }
            if (remittance.id_image2) {
                html += `<a href="/static/uploads/ids/${remittance.id_image2}" target="_blank"><img src="/static/uploads/ids/${remittance.id_image2}" style="max-width:150px;max-height:150px;border:1px solid #ccc;padding:2px;"></a>`;
            }
            html += `</div>`;
        }
        document.getElementById('remittance-details-body').innerHTML = html;
        var modal = new bootstrap.Modal(document.getElementById('remittanceDetailsModal'));
        modal.show();
    } catch (e) {
        alert('خطأ في تحميل تفاصيل الحوالة');
    }
}

window.openEditRemittanceModal = async function(remittanceId) {
    // جلب بيانات الحوالة
    const remittances = await apiCall('/remittances');
    const remittance = remittances.find(r => r.id == remittanceId);
    if (!remittance) return;
    const modal = document.getElementById('remittanceModal');
    // تعبئة الحقول
    const form = document.getElementById('remittanceForm');
    form.reset();
    form.setAttribute('data-edit-id', remittanceId);
    form.querySelector('[name="type"]').value = remittance.type;
    form.querySelector('[name="receipt_number"]').value = remittance.receipt_number;
    form.querySelector('[name="person_name"]').value = remittance.person_name;
    form.querySelector('[name="amount"]').value = remittance.amount;
    form.querySelector('[name="currency"]').value = remittance.currency;
    form.querySelector('[name="company_id"]').value = remittance.company_id;
    form.querySelector('[name="notes"]').value = remittance.notes || '';
    form.querySelector('[name="date"]').value = remittance.date;
    // لا نملأ صور الهوية (لأنها لا يمكن تعبئتها في input file)
    // تغيير عنوان النافذة
    modal.querySelector('.modal-title').textContent = 'تعديل حوالة';
    // تغيير زر الحفظ
    const saveBtn = modal.querySelector('.modal-footer .btn-primary');
    saveBtn.textContent = 'حفظ التعديلات';
    saveBtn.onclick = submitEditRemittance;
    // عرض النافذة
    var bsModal = new bootstrap.Modal(modal);
    bsModal.show();
};

async function submitEditRemittance() {
    try {
        const form = document.getElementById('remittanceForm');
        const remittanceId = form.getAttribute('data-edit-id');
        const formData = new FormData(form);
        // أرسل فقط الحقول التي تم تعديلها (أو كلها)
        const response = await fetch(`/api/remittance/${remittanceId}`, {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'خطأ في تعديل الحوالة');
        }
        // إغلاق النافذة وتحديث الجدول
        bootstrap.Modal.getInstance(document.getElementById('remittanceModal')).hide();
        form.reset();
        form.removeAttribute('data-edit-id');
        // إعادة عنوان النافذة وزر الحفظ للوضع الافتراضي
        const modal = document.getElementById('remittanceModal');
        modal.querySelector('.modal-title').textContent = 'إضافة حوالة';
        const saveBtn = modal.querySelector('.modal-footer .btn-primary');
        saveBtn.textContent = 'حفظ';
        saveBtn.onclick = submitRemittance;
        loadRemittances();
        refreshInventory();
        alert('تم تعديل الحوالة بنجاح');
    } catch (error) {
        console.error('Error editing remittance:', error);
        alert(error.message || 'خطأ في تعديل الحوالة');
    }
}

// دالة تحويل الأرقام إلى إنجليزية
function toEnglishNumber(str) {
    return str.toString().replace(/[٠-٩]/g, d => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)]);
}

// دالة فتح مودال مطابقة الحساب
window.showCompanyMatchModal = function(companyId) {
    if (!lastInventory || !lastInventory.companies) return;
    const company = lastInventory.companies.find(c => c.id === companyId);
    if (!company) return;
    // رموز الأعلام
    const flags = { USD: '🇺🇸', TRY: '🇹🇷', EUR: '🇪🇺', SYP: '🇸🇾' };
    let lines = [];
    lines.push('✅<<<| الـــســـلام عــــليكــم |>>>✅');
    lines.push('');
    lines.push(`مــــطــــابــــقــــة حــــســــاب لـ${company.name} `);
    lines.push('');
    lines.push('---------------------------------------');
    // أرصدة الشركة
    let lana = [];
    let lakum = [];
    Object.entries(company.balances).forEach(([currency, balance]) => {
        if (balance > 0.0001) {
            lakum.push({currency, balance}); // الموجب لكم
        } else if (balance < -0.0001) {
            lana.push({currency, balance: Math.abs(balance)}); // السالب لنا
        }
    });
    // ترتيب العملات: USD, TRY, EUR, SYP
    const order = ['USD', 'TRY', 'EUR', 'SYP'];
    // لكم
    order.forEach(cur => {
        const item = lakum.find(x => x.currency === cur);
        if (item) lines.push(` ${toEnglishNumber(formatNumber(item.balance))}${flags[cur]||cur}لكم`);
    });
    // لنا
    order.forEach(cur => {
        const item = lana.find(x => x.currency === cur);
        if (item) lines.push(` ${toEnglishNumber(formatNumber(item.balance))}${flags[cur]||cur}لنا`);
    });
    lines.push('');
    lines.push('  ');
    lines.push('ملاحظة : يرجى التأكيد على صحة المطابقة 📍');
    lines.push('لـكــم مـــنــا فائق الاحترام');
    const msg = lines.join('\n');
    document.getElementById('company-match-message').value = msg;
    var modal = new bootstrap.Modal(document.getElementById('companyMatchModal'));
    modal.show();
}
// دالة نسخ الرسالة
window.copyCompanyMatchMessage = function() {
    const textarea = document.getElementById('company-match-message');
    textarea.select();
    document.execCommand('copy');
    showToast('تم نسخ الرسالة!');
}

// Shop Gold Functions
async function loadShopGold() {
    showLoader();
    try {
        const goldList = await apiCall('/shop_gold');
        const table = document.getElementById('shopgold-table');
        table.innerHTML = '';
        goldList.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${item.gold_type}</td>
                <td>${item.piece_type}</td>
                <td>${item.quantity}</td>
                <td>${formatNumber(item.weight)}</td>
                <td>${item.karat}</td>
                <td>${formatNumber(item.price_per_gram)}</td>
                <td>${item.entry_date}</td>
                <td>${item.notes || ''}</td>
                <td>
                    <button class="btn btn-danger btn-sm" onclick="deleteShopGold(${item.id})"><i class="fas fa-trash"></i></button>
                </td>
            `;
            table.appendChild(tr);
        });
        updateShopGoldSummary();
    } catch (e) {
        showToast('حدث خطأ أثناء تحميل ذهب المحل');
    } finally {
        hideLoader();
    }
}

async function deleteShopGold(id) {
    if (!confirm('هل أنت متأكد من حذف هذا السطر؟')) return;
    await apiCall(`/shop_gold/${id}`, 'DELETE');
    loadShopGold();
}

document.getElementById('shopgold-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const data = {
        gold_type: document.getElementById('shopgold-type').value,
        piece_type: document.getElementById('shopgold-piece-type').value,
        quantity: document.getElementById('shopgold-quantity').value,
        weight: document.getElementById('shopgold-weight').value,
        karat: document.getElementById('shopgold-karat').value,
        price_per_gram: document.getElementById('shopgold-price').value,
        notes: document.getElementById('shopgold-notes').value
    };
    await apiCall('/shop_gold', 'POST', data);
    document.getElementById('shopgold-form').reset();
    var modal = bootstrap.Modal.getInstance(document.getElementById('shopGoldModal'));
    modal.hide();
    loadShopGold();
});

document.getElementById('shopgold-buy-price').addEventListener('input', updateShopGoldSummary);
document.getElementById('shopgold-sell-price').addEventListener('input', updateShopGoldSummary);

async function updateShopGoldSummary() {
    const buy = parseFloat(document.getElementById('shopgold-buy-price').value) || 0;
    const sell = parseFloat(document.getElementById('shopgold-sell-price').value) || 0;
    try {
        const res = await apiCall(`/shop_gold/summary?buy_price=${buy}&sell_price=${sell}`);
        document.getElementById('shopgold-total-weight').textContent = formatNumber(res.total_weight);
        document.getElementById('shopgold-total-buy').textContent = formatNumber(res.total_value_buy);
        document.getElementById('shopgold-total-sell').textContent = formatNumber(res.total_value_sell);
    } catch (e) {
        // تجاهل الخطأ
    }
}

