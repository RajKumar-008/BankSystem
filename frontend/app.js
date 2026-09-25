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

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const errorMsg = document.getElementById('login-error');

    try {
        const response = await fetch('https://banksystem-rtrs.onrender.com/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accountNumber: username, password: password })
        });
        
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
                loans: []
            };
            errorMsg.classList.add('hidden');
            document.getElementById('login-form').reset();
            
            // Setup Header
            document.getElementById('header-name').textContent = currentUser.name.split(' ')[0];
            document.getElementById('header-acc').textContent = `Acc: ${currentUser.accountNo}`;
            
            toggleLayouts(true);
        } else {
            errorMsg.classList.remove('hidden');
        }
    } catch (error) {
        alert("Error connecting to live server!");
        console.error(error);
    }
});

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
        const response = await fetch('https://banksystem-rtrs.onrender.com/api/register', {
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
    document.getElementById('dash-balance').textContent = formatCurrency(currentUser.balance);
    renderRecentTransactions();
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

    try {
        const response = await fetch('https://banksystem-rtrs.onrender.com/api/transfer', {
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
            
            currentUser.transactions.unshift({
                date: new Date().toISOString(), ref: generateRef(), type: 'Debit',
                amount: amount, closingBalance: currentUser.balance, desc: `To Acc: ${payee} - ${remarks}`
            });

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
function applyLoan(type, amount) {
    currentUser.loans.push({ type, amount, status: 'Active', emi: amount * 0.05 });
    showToast(`${type} of ${formatCurrency(amount)} approved and active!`);
    renderLoans();
}

function renderLoans() {
    const list = document.getElementById('active-loans-list');
    list.innerHTML = '';
    
    if (currentUser.loans.length === 0) {
        list.innerHTML = `<div class="empty-state text-center text-muted"><p>You have no active loans.</p></div>`;
        return;
    }

    currentUser.loans.forEach(loan => {
        list.innerHTML += `
            <div class="info-box bg-body border mt-2" style="justify-content: space-between;">
                <div>
                    <strong style="display:block; color:var(--text-main)">${loan.type}</strong>
                    <span class="text-muted text-sm">Est. EMI: ${formatCurrency(loan.emi)}/mo</span>
                </div>
                <div class="text-right">
                    <span class="text-muted text-sm" style="display:block">Principal</span>
                    <strong>${formatCurrency(loan.amount)}</strong>
                </div>
            </div>
        `;
    });
}

// --- Full Transactions Ledger ---
function renderTransactions() {
    const tbody = document.getElementById('transactions-tbody');
    tbody.innerHTML = '';

    if (!currentUser || currentUser.transactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No transactions found.</td></tr>';
        return;
    }

    currentUser.transactions.forEach(txn => {
        const isCredit = txn.type === 'Credit';
        const sign = isCredit ? '+' : '-';
        const amountClass = isCredit ? 'amount-in' : 'amount-out';

        tbody.innerHTML += `
            <tr>
                <td>${formatDate(txn.date)}</td>
                <td><strong>${txn.desc}</strong></td>
                <td style="font-family: monospace;" class="text-muted">${txn.ref}</td>
                <td class="text-right ${amountClass}">${sign}${formatCurrency(txn.amount)}</td>
                <td class="text-right" style="font-weight: 500;">${formatCurrency(txn.closingBalance)}</td>
            </tr>
        `;
    });
}

// Start
document.addEventListener('DOMContentLoaded', () => { showView('login-view'); });
