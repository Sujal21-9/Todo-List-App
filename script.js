// --- 1. CONFIGURATION ---
const BIN_ID = '694a9ab343b1c97be9009dec'; 
const MASTER_KEY = '$2a$10$NLCbOL0hIoJgJ.d40YZG8uStvEzTNkdC.0UxNmhY7GK8yk/LJplme'; 

// --- 2. SELECTORS ---
const todoForm = document.querySelector('form');
const todoInput = document.getElementById('todo-input');
const todoListUL = document.getElementById("todo-list");

// IMMEDIATE LOCAL LOAD (Prevents disappearing on refresh)
let allTodos = JSON.parse(localStorage.getItem('my_tasks')) || [];

// --- 3. SYNC LOGIC ---
const urlParams = new URLSearchParams(window.location.search);
let listId = urlParams.get('id') || 'list_' + Math.random().toString(36).substring(2, 7);

if (!urlParams.get('id')) {
    window.history.replaceState({}, '', `${window.location.pathname}?id=${listId}`);
}

// Generate QR (Ensure this runs on the GitHub URL)
// Function to generate QR Code safely
function generateQRCode() {
    const qrContainer = document.getElementById("qrcode");
    
    // Clear previous QR if any
    qrContainer.innerHTML = '';

    if (typeof QRCode !== 'undefined') {
        new QRCode(qrContainer, {
            text: window.location.href,
            width: 150,
            height: 150,
            colorDark : "#000000",
            colorLight : "#ffffff",
            correctLevel : QRCode.CorrectLevel.H
        });
    } else {
        console.error("QRCode library not loaded yet. Retrying...");
        setTimeout(generateQRCode, 1000); // Retry after 1 second
    }
}

// Call it when the window is fully loaded
window.addEventListener('load', generateQRCode);
// --- 4. PERSISTENCE ---

async function saveData() {
    // 1. Instant Local Save
    localStorage.setItem('my_tasks', JSON.stringify(allTodos));

    // 2. Cloud Sync
    try {
        const res = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
            headers: { 'X-Master-Key': MASTER_KEY }
        });
        const cloud = await res.json();
        let record = cloud.record || {};
        record[listId] = allTodos;

        await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'X-Master-Key': MASTER_KEY },
            body: JSON.stringify(record)
        });
    } catch (e) { console.error("Cloud sync pending..."); }
}

async function loadFromCloud() {
    try {
        const res = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
            headers: { 'X-Master-Key': MASTER_KEY }
        });
        const data = await res.json();
        if (data.record && data.record[listId]) {
            // Only re-render if cloud data is actually newer/different
            if (JSON.stringify(allTodos) !== JSON.stringify(data.record[listId])) {
                allTodos = data.record[listId];
                localStorage.setItem('my_tasks', JSON.stringify(allTodos));
                renderTodos();
            }
        }
    } catch (e) { console.log("Offline mode active."); }
}

// --- 5. UI ---

function renderTodos() {
    todoListUL.innerHTML = '';
    allTodos.forEach((todo, i) => {
        const li = document.createElement("li");
        li.className = "todo";
        li.innerHTML = `
    <input type="checkbox" id="todo-${i}" ${todo.completed ? 'checked' : ''}>
    <label for="todo-${i}" class="custom-checkbox">
        <svg fill="transparent" style="width: 2.5vh;" viewBox="0 0 640 640"><path d="M530.8 134.1C545.1 144.5 548.3 164.5 537.9 178.8L281.9 530.8C276.4 538.4 267.9 543.1 258.5 543.9C249.1 544.7 240 541.2 233.4 534.6L105.4 406.6C92.9 394.1 92.9 373.8 105.4 361.3C117.9 348.8 138.2 348.8 150.7 361.3L252.2 462.8L486.2 141.1C496.6 126.8 516.6 123.6 530.9 134z"/></svg>
    </label>
    <label for="todo-${i}" class="todo-text">${todo.text}</label>
    <button class="delete-btn">
        <svg fill="var(--accent-color)" style="width:3vh" viewBox="0 0 640 640"><path d="M576 192C576 156.7 547.3 128 512 128L205.3 128C188.3 128 172 134.7 160 146.7L9.4 297.4C3.4 303.4 0 311.5 0 320C0 328.5 3.4 336.6 9.4 342.6L160 493.3C172 505.3 188.3 512 205.3 512L512 512C547.3 512 576 483.3 576 448L576 192zM284.1 252.1C293.5 242.7 308.7 242.7 318 252.1L351.9 286L385.8 252.1C395.2 242.7 410.4 242.7 419.7 252.1C429 261.5 429.1 276.7 419.7 286L385.8 319.9L419.7 353.8C429.1 363.2 429.1 378.4 419.7 387.7C410.3 397 395.1 397.1 385.8 387.7L351.9 353.8L318 387.7C308.6 397.1 293.4 397.1 284.1 387.7C274.8 378.3 274.7 363.1 284.1 353.8L318 319.9L284.1 286C274.7 276.6 274.7 261.4 284.1 252.1z"/></svg>
    </button>
`;

        li.querySelector('input').onchange = (e) => {
            allTodos[i].completed = e.target.checked;
            saveData(); 
        };

        li.querySelector('.delete-btn').onclick = () => {
            allTodos.splice(i, 1);
            renderTodos();
            saveData();
        };

        todoListUL.appendChild(li);
    });
}

todoForm.onsubmit = (e) => {
    e.preventDefault();
    if (todoInput.value.trim()) {
        allTodos.push({ text: todoInput.value, completed: false });
        renderTodos();
        saveData();
        todoInput.value = '';
    }
};

// Start the app
renderTodos();
loadFromCloud();
setInterval(loadFromCloud, 10000); // Check for phone updates every 10s