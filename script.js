const API_URL = 'https://c4285.coresuz1.ru/Earnstars/api.php';
const tg = window.Telegram.WebApp;
tg.expand();

let userData = {};
let chestSessionId = null;
let chestAdCount = 0;
let isJackpot = false;

// ===== LOAD USER =====
async function loadUser() {
    try {
        const res = await fetch(`${API_URL}?action=getUser&tg_id=${tg.initDataUnsafe.user.id}`);
        const data = await res.json();
        userData = data;
        updateUI();
    } catch(e) { console.error('Load error', e); }
}

function updateUI() {
    document.getElementById('coinBalance').textContent = userData.coin_balance || 0;
    document.getElementById('starBalance').textContent = (userData.stars_balance || 0).toFixed(2);
    document.getElementById('adsCount').textContent = userData.ads_watched || 0;
    document.getElementById('exchangeCoins').textContent = userData.coin_balance || 0;
    document.getElementById('profileAds').textContent = userData.ads_watched || 0;
    document.getElementById('userId').textContent = tg.initDataUnsafe.user.id;
    document.getElementById('userName').textContent = tg.initDataUnsafe.user.first_name || 'Guest';
}

// ===== TAP =====
function handleTap() {
    const coin = document.getElementById('tapCoin');
    const counter = document.getElementById('tapCounter');
    counter.textContent = '+1';
    counter.className = '';
    void counter.offsetWidth;
    counter.classList.add('tap-float');
    coin.style.transform = 'scale(0.8)';
    setTimeout(() => coin.style.transform = 'scale(1)', 150);

    fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'tap', tg_id: tg.initDataUnsafe.user.id })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            userData.coin_balance = data.new_balance;
            document.getElementById('coinBalance').textContent = userData.coin_balance;
        }
    });
}

// ===== CHEST =====
async function startChestFlow() {
    if (!chestSessionId) {
        const res = await fetch(`${API_URL}?action=startChest&tg_id=${tg.initDataUnsafe.user.id}`);
        const data = await res.json();
        chestSessionId = data.session_id;
        chestAdCount = 0;
        isJackpot = data.is_jackpot || false;
        document.getElementById('chestStatus').textContent = '🎬 Reklama 1/3 ...';
    }

    const blockId = 41159; // Reward ID
    try {
        const ad = await window.Adsgram.showRewardedVideo({ blockId });
        chestAdCount++;
        const maxAds = isJackpot ? 5 : 3;
        const progress = Math.min((chestAdCount / maxAds) * 100, 100);
        document.getElementById('progressFill').style.width = progress + '%';

        const container = document.getElementById('chestContainer');
        container.className = '';
        if (chestAdCount >= maxAds) {
            container.classList.add('open-3');
            if (isJackpot) {
                container.classList.add('jackpot');
                const starsWon = Math.floor(Math.random() * 2) + 2;
                await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'finishChest',
                        tg_id: tg.initDataUnsafe.user.id,
                        session_id: chestSessionId,
                        stars_won: starsWon,
                        ads_watched: chestAdCount
                    })
                });
                document.getElementById('chestStatus').textContent = `🎉 JACKPOT! +${starsWon} Stars!`;
                alert(`🎉 Tabriklaymiz! ${starsWon} Stars yutdingiz!`);
                loadUser();
            } else {
                const starsWon = parseFloat((Math.random() * 0.5 + 0.01).toFixed(2));
                await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'finishChest',
                        tg_id: tg.initDataUnsafe.user.id,
                        session_id: chestSessionId,
                        stars_won: starsWon,
                        ads_watched: chestAdCount
                    })
                });
                document.getElementById('chestStatus').textContent = `⭐ +${starsWon} Stars!`;
                loadUser();
            }
            chestSessionId = null;
        } else {
            if (chestAdCount === 2) {
                container.classList.add('open-2');
                if (isJackpot) document.getElementById('chestStatus').textContent = '🔥 Katta yutuq yoqasida! Yana 3 ta reklama...';
                else document.getElementById('chestStatus').textContent = '⚡ Yana 1 ta reklama!';
            } else {
                container.classList.add('open-1');
                document.getElementById('chestStatus').textContent = `⏳ Reklama ${chestAdCount+1}/${maxAds} ...`;
            }
        }
    } catch(e) {
        console.error('Ad error', e);
        document.getElementById('chestStatus').textContent = '❌ Reklama yuklanmadi, qayta urinib ko‘ring.';
    }
}

// ===== TASKS =====
async function loadTasks() {
    const res = await fetch(`${API_URL}?action=getTasks&tg_id=${tg.initDataUnsafe.user.id}`);
    const tasks = await res.json();
    let html = '';
    tasks.forEach((task, i) => {
        html += `<div class="task-item">
            <span>📺 Reklama ko‘rish (${i+1}/5)</span>
            <button onclick="watchTaskAd(${task.id})">${task.completed ? '✅ Bajarildi' : '+300 coin'}</button>
        </div>`;
    });
    document.getElementById('taskList').innerHTML = html;
}

async function watchTaskAd(taskId) {
    try {
        await window.Adsgram.showRewardedVideo({ blockId: 41159 });
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'completeTask', tg_id: tg.initDataUnsafe.user.id, task_id: taskId })
        });
        const data = await res.json();
        if (data.success) {
            alert('✅ +300 coin!');
            loadUser();
            loadTasks();
        }
    } catch(e) { alert('Reklama xatosi'); }
}

// ===== EXCHANGE =====
async function requestExchange() {
    const stars = parseInt(document.getElementById('exchangeInput').value);
    if (!stars || stars < 1) return alert('Iltimos, 1 yoki undan ko‘p Stars kiriting.');
    const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'exchange', tg_id: tg.initDataUnsafe.user.id, stars })
    });
    const data = await res.json();
    document.getElementById('exchangeResult').innerHTML = data.message || '❌ Xatolik';
    if (data.success) {
        try { await window.Adsgram.showInterstitialAd({ blockId: 41269 }); } catch(e) {}
        loadUser();
        document.getElementById('exchangeInput').value = '';
    }
}

// ===== WITHDRAW =====
async function requestWithdraw() {
    const stars = parseInt(document.getElementById('withdrawInput').value);
    if (!stars) return alert('Miqdorni kiriting!');
    if (!(stars === 15 || stars === 25 || stars >= 50)) {
        return alert('Faqat 15, 25 yoki 50+ ruxsat etilgan!');
    }
    const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'withdraw', tg_id: tg.initDataUnsafe.user.id, stars })
    });
    const data = await res.json();
    document.getElementById('withdrawResult').innerHTML = data.message || '❌ Xatolik';
    if (data.success) {
        try { await window.Adsgram.showInterstitialAd({ blockId: 41269 }); } catch(e) {}
        loadUser();
        document.getElementById('withdrawInput').value = '';
    }
}

// ===== TABS =====
function showTab(tab) {
    document.querySelectorAll('.tab-pane').forEach(el => el.classList.remove('active'));
    document.getElementById(`tab-${tab}`).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.querySelector(`.nav-item[data-tab="${tab}"]`).classList.add('active');
    if (tab === 'tasks') loadTasks();
}
document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => showTab(btn.dataset.tab));
});

// ===== INIT =====
loadUser();
