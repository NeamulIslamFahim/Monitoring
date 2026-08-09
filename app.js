import { processRows } from './data.js';
import { renderAll } from './ui.js';
import { state } from './state.js';

function handleFile(file) {
    const errBox = document.getElementById('err');
    errBox.style.display = 'none';
    document.getElementById('filename').textContent = file.name;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const wb = XLSX.read(data, { type: 'array' });
            const sheet = wb.Sheets[wb.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
            const result = processRows(rows);
            state.CHANNELS = result.channels;
            state.reportMeta = result.meta;
            renderAll();
        } catch (err) {
            errBox.textContent = 'সমস্যা হয়েছে: ' + err.message;
            errBox.style.display = 'block';
            document.getElementById('dash').style.display = 'none';
        }
    };
    reader.onerror = () => {
        errBox.textContent = 'ফাইল পড়া যায়নি। আবার চেষ্টা করুন।';
        errBox.style.display = 'block';
    };
    reader.readAsArrayBuffer(file);
}

const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
dropzone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => {
    if (e.target.files[0]) handleFile(e.target.files[0]);
});
['dragover'].forEach(evt =>
    dropzone.addEventListener(evt, (e) => {
        e.preventDefault();
        dropzone.classList.add('drag');
    })
);
['dragleave', 'drop'].forEach(evt =>
    dropzone.addEventListener(evt, (e) => {
        e.preventDefault();
        dropzone.classList.remove('drag');
    })
);
dropzone.addEventListener('drop', (e) => {
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
});

document.getElementById('tabs').addEventListener('click', (e) => {
    const btn = e.target.closest('.tab-btn');
    if (!btn) return;
    state.currentTab = btn.dataset.tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b === btn));
    renderAll();
});

document.getElementById('search').addEventListener('input', (e) => {
    state.searchTerm = e.target.value.toLowerCase();
    renderAll();
});
