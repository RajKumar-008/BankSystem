const API_BASE_URL = 'https://banksystem-jx9l.onrender.com/api';
/**
 * app.js - RAJ Premium Banking Logic
 */

// --- Mock Database (Expanded for full features) ---
const mockUsers = {
    '1001': {
        name: 'Rajkumar',
        email: 'rajkumar@example.com',
        password: '1234',
        accountNo: '1001',
        balance: 250000.50,
        transactions: [
            { date: new Date().toISOString(), ref: 'RAJ-0001', type: 'Credit', amount: 250000.50, closingBalance: 250000.50, desc: 'Initial Deposit' }
        ],
        fds: [],
        loans: []
    }
};

let currentUser = null; 

// --- Core UI Logic ---
const authLayout = document.getElementById('auth-layout');
const mainLayout = document.getElementById('main-layout');
const sideMenuItems = document.querySelectorAll('.side-menu li');

function switchView(viewId) {
    document.querySelectorAll('#auth-layout .view').forEach(v => {
        if (v.id === viewId) {
            v.classList.add('active');
            v.classList.remove('hidden');
        } else {
            v.classList.remove('active');
            v.classList.add('hidden');
        }
    });
}

function switchMainView(viewId) {
    document.querySelectorAll('.main-view').forEach(v => {
        if (v.id === viewId) {
            v.classList.add('active');
            v.classList.remove('hidden');
        } else {
            v.classList.remove('active');
            v.classList.add('hidden');
        }
    });

    sideMenuItems.forEach(item => {
        if (item.getAttribute('data-target') === viewId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    if (viewId === 'dashboard-view') updateDashboard();
    if (viewId === 'transactions-view') renderTransactions();
    if (viewId === 'cards-view') updateCardsView();
    if (viewId === 'deposits-view') renderFDs();
    if (viewId === 'loans-view') renderLoans();
}

sideMenuItems.forEach(item => {
    item.addEventListener('click', () => {
        switchMainView(item.getAttribute('data-target'));
    });
});

function toggleLayouts(isLoggedIn) {
    if (isLoggedIn) {
        authLayout.classList.remove('active');
        setTimeout(() => {
            authLayout.classList.add('hidden');
            mainLayout.classList.remove('hidden');
            setTimeout(() => mainLayout.classList.add('active'), 50);
            switchMainView('dashboard-view');
        }, 300);
    } else {
        mainLayout.classList.remove('active');
        setTimeout(() => {
            mainLayout.classList.add('hidden');
            authLayout.classList.remove('hidden');
            setTimeout(() => authLayout.classList.add('active'), 50);
            switchView('login-view');
        }, 300);
    }
}

// --- Utils ---
const formatCurrency = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
const formatDate = (isoStr) => new Date(isoStr).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
const generateRef = () => 'RAJ-' + Math.floor(Math.random() * 900000 + 100000);

function showToast(message) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i class='bx bx-check-circle'></i> ${message}`;
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3000);
}

// --- Auth logic ---
document.querySelectorAll('input[name="loginType"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        const label = document.getElementById('login-input-label');
        const input = document.getElementById('login-username');
        if (e.target.value === 'gmail') {
            label.textContent = 'Gmail Address';
            input.placeholder = 'you@gmail.com';
            input.type = 'email';
        } else {
            label.textContent = 'Account Number';
            input.placeholder = 'e.g. 1001';
            input.type = 'text';
        }
    });
});

async function loadTransactions() {
    try {
        const response = await fetch(`${API_BASE_URL}/transactions/${currentUser.accountNo}`);
        if (response.ok) {
            const data = await response.json();
            currentUser.transactions = data.map(t => ({
                date: t.timestamp,
                ref: t.referenceNumber,
                type: t.type,
                amount: t.amount,
                closingBalance: t.closingBalance,
                desc: t.description
            }));
        }
    } catch (e) {
        console.error('Failed to fetch transactions', e);
    }
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const errorMsg = document.getElementById('login-error');
    const submitBtn = document.querySelector('#login-form button[type="submit"]');

    submitBtn.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> Authenticating...";
    submitBtn.disabled = true;
    errorMsg.classList.add('hidden');

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accountNumber: username, password: password }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
            const data = await response.json();
            currentUser = {
                name: data.name,
                email: data.email,
                password: data.password,
                accountNo: data.accountNumber,
                balance: data.balance,
                transactions: [], 
                fds: [],
                loans: [],
                subAccounts: [],
                notifications: [],
                avatarUrl: data.avatarUrl
            };
            
            // Load live data
            await loadTransactions();
            await loadSubAccounts();
            await loadNotifications();
            await loadLoans();

            document.getElementById('login-form').reset();
            
            // Setup Header & Profile
            updateHeaderAvatar();
            document.getElementById('header-acc').textContent = `Acc: ${currentUser.accountNo}`;
            
            document.getElementById('prof-name').value = currentUser.name;
            document.getElementById('prof-email').value = currentUser.email;
            
            toggleLayouts(true);
        } else if (response.status === 401) {
            errorMsg.textContent = "Invalid Account Details or Password";
            errorMsg.classList.remove('hidden');
        } else if (response.status === 500 || response.status === 502 || response.status === 503) {
            alert(`Backend Error (${response.status}): The server encountered an error or is currently restarting. Please try again in a few minutes.`);
        } else if (response.status === 404) {
            alert("API Not Found (404). This usually means the backend server is offline or failed to deploy.");
        } else {
            alert(`Unexpected HTTP Error: ${response.status}`);
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            alert("Network Timeout: The backend took too long to respond. It might be waking up from sleep on Render.");
        } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            alert("Network/CORS Error: Could not reach the live server. The backend might be completely down, or CORS is blocking the request.");
        } else {
            alert("Error connecting to live server: " + error.message);
        }
        console.error("Login fetch error:", error);
    } finally {
        submitBtn.innerHTML = "Sign In";
        submitBtn.disabled = false;
    }
});

// --- Feature Loaders ---
async function loadSubAccounts() {
    try {
        const res = await fetch(`${API_BASE_URL}/subaccounts/${currentUser.accountNo}`);
        if(res.ok) currentUser.subAccounts = await res.json();
    } catch (e) { console.error('Subaccount load failed', e); }
}

async function loadNotifications() {
    try {
        const res = await fetch(`${API_BASE_URL}/notifications/${currentUser.accountNo}`);
        if(res.ok) {
            currentUser.notifications = await res.json();
            renderNotifications();
        }
    } catch (e) { console.error('Notif load failed', e); }
}

function toggleNotifications() {
    const dropdown = document.getElementById('notif-dropdown');
    dropdown.classList.toggle('hidden');
}

function renderNotifications() {
    const list = document.getElementById('notif-list');
    const badge = document.getElementById('notif-badge');
    const unreadCount = currentUser.notifications.filter(n => !n.read).length;
    
    if(unreadCount > 0) {
        badge.textContent = unreadCount;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }

    list.innerHTML = '';
    if(currentUser.notifications.length === 0) {
        list.innerHTML = '<p class="text-muted text-center py-2" style="font-size: 0.85rem;">No notifications yet.</p>';
        return;
    }

    currentUser.notifications.forEach(n => {
        const icon = n.type === 'ALERT' ? 'bx-error text-red bg-red-light' : (n.type === 'SUCCESS' ? 'bx-check text-green bg-success-bg' : 'bx-info-circle text-blue bg-blue-light');
        const bg = n.read ? '' : 'background: #f0fdf4; border-left: 3px solid var(--success);';
        
        list.innerHTML += `
            <div style="display:flex; gap:10px; padding: 10px; border-radius: 8px; cursor:pointer; ${bg}" onclick="markNotifRead(${n.id})">
                <div class="${icon}" style="width: 32px; height: 32px; border-radius: 50%; display:flex; align-items:center; justify-content:center; font-size:1.2rem; flex-shrink:0;"></div>
                <div style="font-size: 0.85rem; color: var(--text-main);">
                    <p style="margin-bottom:2px; font-weight: ${n.read ? 'normal' : 'bold'};">${n.message}</p>
                    <span style="font-size: 0.75rem; color: var(--text-muted);">${formatDate(n.timestamp)}</span>
                </div>
            </div>
        `;
    });
}

async function markNotifRead(id) {
    await fetch(`${API_BASE_URL}/notifications/read/${id}`, { method: 'POST' });
    await loadNotifications();
}

async function createNewSubAccount() {
    const type = prompt("Enter Account Type (Savings or Current):", "Savings");
    if(!type) return;
    
    try {
        const res = await fetch(`${API_BASE_URL}/subaccounts/create`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ parentAccountNumber: currentUser.accountNo, accountType: type })
        });
        if(res.ok) {
            showToast(`${type} account successfully created!`);
            await loadSubAccounts();
            await loadNotifications();
            updateDashboard();
        }
    } catch(e) { console.error('Subaccount create failed', e); }
}

document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const confirm = document.getElementById('reg-confirm').value;
    const deposit = parseFloat(document.getElementById('reg-deposit').value);
    const errorMsg = document.getElementById('reg-error');

    if (password !== confirm) { errorMsg.classList.remove('hidden'); return; }
    if (deposit < 0) return;

    const newAccountNo = (Math.floor(Math.random() * 9000) + 1000).toString(); // Generate 4-digit ID

    try {
        const response = await fetch(API_BASE_URL + '/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                accountNumber: newAccountNo,
                name: name,
                email: email,
                password: password,
                balance: deposit
            })
        });

        if (response.ok) {
            alert(`Account created in Cloud Database!\nYour Account Number is: ${newAccountNo}`);
            errorMsg.classList.add('hidden');
            document.getElementById('register-form').reset();
            switchView('login-view');
        } else {
            const errData = await response.json();
            alert("Registration failed: " + errData.error);
        }
    } catch (error) {
        alert("Error connecting to live server!");
        console.error(error);
    }
});

document.getElementById('logout-btn').addEventListener('click', () => { currentUser = null; toggleLayouts(false); });

// --- Dashboard ---
function updateDashboard() {
    if (!currentUser) return;
    
    // Calculate total balance (main + subaccounts)
    let totalConsolidated = currentUser.balance;
    if (currentUser.subAccounts) {
        currentUser.subAccounts.forEach(sa => totalConsolidated += sa.balance);
    }
    
    document.getElementById('dash-balance').textContent = formatCurrency(totalConsolidated);
    renderRecentTransactions();
    renderSubAccounts();
}

function renderSubAccounts() {
    const list = document.getElementById('subaccounts-list');
    if (!list) return;
    
    list.innerHTML = `
        <div class="info-box bg-body border" style="flex-direction: column; align-items: flex-start; justify-content: center; padding: 1.5rem;">
            <strong style="color:var(--text-main); font-size:1.1rem;">Main Account</strong>
            <span class="text-muted" style="margin-bottom:0.5rem; font-family:monospace;">${currentUser.accountNo}</span>
            <h3 class="text-green">${formatCurrency(currentUser.balance)}</h3>
        </div>
    `;

    if(currentUser.subAccounts) {
        currentUser.subAccounts.forEach(sa => {
            list.innerHTML += `
                <div class="info-box bg-body border" style="flex-direction: column; align-items: flex-start; justify-content: center; padding: 1.5rem;">
                    <strong style="color:var(--text-main); font-size:1.1rem;">${sa.accountType} Account</strong>
                    <span class="text-muted" style="margin-bottom:0.5rem; font-family:monospace;">${sa.accountNumber}</span>
                    <h3 class="text-blue">${formatCurrency(sa.balance)}</h3>
                </div>
            `;
        });
    }
}

function renderRecentTransactions() {
    const table = document.getElementById('recent-txn-table');
    table.innerHTML = '';
    const recent = currentUser.transactions.slice(0, 3);
    
    if (recent.length === 0) {
        table.innerHTML = '<tr><td class="text-muted text-center py-3">No recent activity</td></tr>';
        return;
    }

    recent.forEach(txn => {
        const isCredit = txn.type === 'Credit';
        const icon = isCredit ? 'bx-down-arrow-alt text-green' : 'bx-up-arrow-alt text-main';
        const bg = isCredit ? 'bg-success-bg' : 'bg-gray-light';
        const sign = isCredit ? '+' : '-';
        const amountClass = isCredit ? 'amount-in' : 'amount-out';

        table.innerHTML += `
            <tr>
                <td class="txn-icon-cell"><div class="txn-icon ${bg}"><i class='bx ${icon}'></i></div></td>
                <td class="txn-desc"><strong>${txn.desc}</strong><span>${formatDate(txn.date)}</span></td>
                <td class="text-right ${amountClass}">${sign}${formatCurrency(txn.amount)}</td>
            </tr>
        `;
    });
}

// --- Cards ---
function updateCardsView() {
    document.getElementById('card-name-display').textContent = currentUser.name.toUpperCase();
    document.getElementById('card-last-4').textContent = currentUser.accountNo.padStart(4, '0').slice(-4);
}

document.getElementById('freeze-toggle').addEventListener('change', (e) => {
    const isFrozen = e.target.checked;
    const cardEl = document.querySelector('.credit-card');
    if (isFrozen) {
        cardEl.style.opacity = '0.5';
        showToast('Card has been temporarily frozen.');
    } else {
        cardEl.style.opacity = '1';
        showToast('Card is now active.');
    }
});

// --- Transfer ---
document.getElementById('transfer-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payee = document.getElementById('transfer-payee').value.trim();
    const amount = parseFloat(document.getElementById('transfer-amount').value);
    const remarks = document.getElementById('transfer-remarks').value || 'Fund Transfer';
    const pin = document.getElementById('transfer-pin').value;
    const submitBtn = document.querySelector('#transfer-form button[type="submit"]');

    submitBtn.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> Processing Transfer...";
    submitBtn.disabled = true;

    try {
        const response = await fetch(API_BASE_URL + '/transfer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fromAccount: currentUser.accountNo,
                toAccount: payee,
                amount: amount,
                pin: pin
            })
        });

        if (response.ok) {
            const data = await response.json();
            currentUser.balance = data.newBalance; // Update local balance
            
            await loadTransactions(); // Fetch new transactions from DB
            await loadNotifications(); // Fetch new transfer notification

            showToast(`Successfully transferred ${formatCurrency(amount)} to ${payee}.`);
            document.getElementById('transfer-form').reset();
            updateDashboard();
        } else {
            const errData = await response.json();
            alert("Transfer failed: " + (errData.error || "Invalid Details"));
        }
    } catch (error) {
        alert("Error connecting to server!");
        console.error(error);
    } finally {
        submitBtn.innerHTML = "Secure Transfer";
        submitBtn.disabled = false;
    }
});

// --- Fixed Deposits (FD) ---
document.getElementById('fd-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('fd-amount').value);
    const tenure = document.getElementById('fd-tenure').value;
    let rate = tenure === '6' ? 5.5 : tenure === '12' ? 6.5 : 7.1;

    if (amount > currentUser.balance) {
        alert("Insufficient balance for this deposit.");
        return;
    }

    // Deduct from balance
    currentUser.balance -= amount;
    currentUser.transactions.unshift({
        date: new Date().toISOString(), ref: generateRef(), type: 'Debit',
        amount: amount, closingBalance: currentUser.balance, desc: `FD Creation (${tenure} mos)`
    });

    // Add to FDs
    currentUser.fds.push({
        id: generateRef(), amount, rate, tenure,
        maturity: amount + (amount * (rate/100) * (parseInt(tenure)/12))
    });

    showToast(`Fixed Deposit of ${formatCurrency(amount)} created successfully.`);
    document.getElementById('fd-form').reset();
    renderFDs();
    updateDashboard();
});

function renderFDs() {
    const list = document.getElementById('fd-list');
    list.innerHTML = '';
    
    if (currentUser.fds.length === 0) {
        list.innerHTML = `<div class="empty-state text-center text-muted mt-4"><i class='bx bx-layer' style="font-size: 3rem; opacity: 0.5;"></i><p class="mt-2">No active fixed deposits.</p></div>`;
        return;
    }

    currentUser.fds.forEach(fd => {
        list.innerHTML += `
            <div class="info-box bg-body border mt-2" style="justify-content: space-between;">
                <div>
                    <strong style="display:block; color:var(--text-main)">${formatCurrency(fd.amount)} at ${fd.rate}%</strong>
                    <span class="text-muted text-sm">Tenure: ${fd.tenure} months | ID: ${fd.id}</span>
                </div>
                <div class="text-right">
                    <span class="text-muted text-sm" style="display:block">Maturity Value</span>
                    <strong class="text-green">${formatCurrency(fd.maturity)}</strong>
                </div>
            </div>
        `;
    });
}

// --- Loans ---
async function loadLoans() {
    try {
        const res = await fetch(`${API_BASE_URL}/loans/${currentUser.accountNo}`);
        if(res.ok) {
            currentUser.loans = await res.json();
            renderLoans();
        }
    } catch (e) { console.error('Failed to load loans', e); }
}

document.getElementById('loan-type-select')?.addEventListener('change', (e) => {
    const customGroup = document.getElementById('loan-custom-type-group');
    if (e.target.value === 'Custom') {
        customGroup.classList.remove('hidden');
    } else {
        customGroup.classList.add('hidden');
    }
});

document.getElementById('loan-apply-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const typeSelect = document.getElementById('loan-type-select').value;
    const type = typeSelect === 'Custom' ? document.getElementById('loan-custom-type').value.trim() : typeSelect;
    const amount = document.getElementById('loan-amount').value;
    const reason = document.getElementById('loan-reason').value.trim();

    if (!type) {
        alert("Please enter a valid loan type.");
        return;
    }
    
    // Check loan reason length
    if (reason.length < 10) {
        alert("Please provide a valid reason for the loan (minimum 10 characters). Check loan details.");
        return;
    }

    const btn = document.querySelector('#loan-apply-form button');
    btn.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> Submitting...";
    btn.disabled = true;

    try {
        const res = await fetch(API_BASE_URL + '/loans/apply', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accountNumber: currentUser.accountNo, type: type, amount: amount, reason: reason })
        });
        if(res.ok) {
            showToast(`${type} application submitted and is PENDING approval!`);
            document.getElementById('loan-apply-form').reset();
            document.getElementById('loan-custom-type-group').classList.add('hidden');
            await loadLoans();
            await loadNotifications();
        } else {
            alert("Failed to submit loan.");
        }
    } catch(e) { console.error('Loan apply failed', e); }

    btn.innerHTML = "Submit Application";
    btn.disabled = false;
});

function renderLoans() {
    const list = document.getElementById('active-loans-list');
    list.innerHTML = '';
    
    if (currentUser.loans.length === 0) {
        list.innerHTML = `<div class="empty-state text-center text-muted"><p>You have no loan history.</p></div>`;
        return;
    }

    currentUser.loans.forEach(loan => {
        let statusColor = loan.status === 'APPROVED' ? 'var(--success)' : (loan.status === 'REJECTED' ? 'var(--danger)' : 'var(--text-muted)');
        list.innerHTML += `
            <div class="info-box bg-body border mt-2" style="flex-direction: column; align-items: stretch; padding: 1rem;">
                <div style="display:flex; justify-content: space-between; align-items:center;">
                    <div>
                        <strong style="display:block; color:var(--text-main)">${loan.type}</strong>
                        <span class="text-muted text-sm">Est. EMI: ${formatCurrency(loan.emi)}/mo</span>
                    </div>
                    <div class="text-right">
                        <span style="display:block; font-size:0.8rem; font-weight:bold; color:${statusColor}">${loan.status}</span>
                        <strong>${formatCurrency(loan.amount)}</strong>
                    </div>
                </div>
                <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--border); font-size: 0.85rem; color: var(--text-muted);">
                    <strong>Reason:</strong> ${loan.reason || 'N/A'}
                </div>
            </div>
        `;
    });
}

// === ADMIN PORTAL LOGIC ===
document.getElementById('admin-login-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('admin-username').value.trim();
    const pass = document.getElementById('admin-password').value;
    if (id === 'admin' && pass === 'admin123') {
        document.getElementById('admin-login-form').reset();
        document.getElementById('auth-layout').classList.add('hidden');
        document.getElementById('auth-layout').classList.remove('active');
        document.getElementById('admin-layout').classList.remove('hidden');
        setTimeout(() => document.getElementById('admin-layout').classList.add('active'), 50);
        loadAdminLoans();
    } else {
        alert('Invalid Admin Credentials');
    }
});

function logoutAdmin() {
    document.getElementById('admin-layout').classList.remove('active');
    setTimeout(() => {
        document.getElementById('admin-layout').classList.add('hidden');
        document.getElementById('auth-layout').classList.remove('hidden');
        setTimeout(() => document.getElementById('auth-layout').classList.add('active'), 50);
        switchView('login-view');
    }, 300);
}

// Admin Tab Switching
document.querySelectorAll('#admin-layout .side-menu li').forEach(item => {
    item.addEventListener('click', () => {
        document.querySelectorAll('#admin-layout .side-menu li').forEach(l => l.classList.remove('active'));
        item.classList.add('active');
        
        document.querySelectorAll('.admin-view, .main-view').forEach(view => {
            if(view.closest('#admin-layout')) {
                view.classList.add('hidden');
                view.classList.remove('active');
            }
        });
        
        const targetId = item.getAttribute('data-target');
        const targetView = document.getElementById(targetId);
        if(targetView) {
            targetView.classList.remove('hidden');
            setTimeout(() => targetView.classList.add('active'), 10);
        }

        if (targetId === 'admin-loans-view') loadAdminLoans();
        if (targetId === 'admin-txns-view') loadAdminTxns();
        if (targetId === 'admin-users-view') loadAdminUsers();
    });
});

async function loadAdminLoans() {
    try {
        const res = await fetch(API_BASE_URL + '/admin/loans/pending');
        const tbody = document.getElementById('admin-loans-tbody');
        if (!res.ok) return;
        const loans = await res.json();
                tbody.innerHTML = loans.map(l => `
            <tr>
                <td>${l.accountNumber}</td>
                <td>
                    <strong>${l.type}</strong><br>
                    <small class="text-muted" style="font-size:0.75rem;">${l.reason || 'N/A'}</small>
                </td>
                <td>${formatCurrency(l.amount)}</td>
                <td><span class="badge" style="background:var(--warning);color:#000;">${l.status}</span></td>
                <td>
                    <button class="btn btn-outline-sm text-green" onclick="approveLoan(${l.id})">Approve</button>
                    <button class="btn btn-outline-sm text-red" onclick="rejectLoan(${l.id})">Reject</button>
                </td>
            </tr>
        `).join('');
        if(loans.length===0) tbody.innerHTML = '<tr><td colspan="5" class="text-center">No pending loans</td></tr>';
    } catch(e) {}
}

async function approveLoan(id) {
    await fetch(`${API_BASE_URL}/admin/loans/approve/${id}`, { method: 'POST' });
    loadAdminLoans();
}
async function rejectLoan(id) {
    await fetch(`${API_BASE_URL}/admin/loans/reject/${id}`, { method: 'POST' });
    loadAdminLoans();
}

async function loadAdminTxns() {
    try {
        const res = await fetch(API_BASE_URL + '/admin/transactions');
        const tbody = document.getElementById('admin-txns-tbody');
        if(!res.ok) return;
        const txns = await res.json();
        tbody.innerHTML = txns.map(t => `
            <tr>
                <td>${t.accountNumber}</td>
                <td style="color:${t.type==='Credit'?'var(--success)':'var(--danger)'}">${t.type}</td>
                <td>${formatCurrency(t.amount)}</td>
                <td><small class="text-muted">${t.referenceNumber}</small></td>
                <td>${formatDate(t.timestamp)}</td>
            </tr>
        `).join('');
    } catch(e) {}
}

async function loadAdminUsers() {
    try {
        const res = await fetch(API_BASE_URL + '/admin/users');
        const tbody = document.getElementById('admin-users-tbody');
        if(!res.ok) return;
        const users = await res.json();
        tbody.innerHTML = users.map(u => `
            <tr>
                <td>${u.name}</td>
                <td>${u.email}</td>
                <td><strong>${u.accountNumber}</strong></td>
                <td>${formatCurrency(u.balance)}</td>
            </tr>
        `).join('');
    } catch(e) {}
}





