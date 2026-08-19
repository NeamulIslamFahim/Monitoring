import { processAdRows, processRows } from './data.js';
import { renderAll } from './ui.js';
import { state } from './state.js';

function handleFile(file, source = 'channel') {
    const errBox = source === 'ad' ? document.getElementById('adErr') : document.getElementById('err');
    const filenameBox = source === 'ad' ? document.getElementById('adFilename') : document.getElementById('filename');

    if (errBox) errBox.style.display = 'none';
    if (filenameBox) filenameBox.textContent = file.name;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const wb = XLSX.read(data, { type: 'array' });
            const sheet = wb.Sheets[wb.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
            const result = source === 'ad' ? processAdRows(rows) : processRows(rows);
            if (source === 'ad') {
                state.AD_CHANNELS = result.channels;
                state.adReportMeta = result.meta;
            } else {
                state.CHANNELS = result.channels;
                state.reportMeta = result.meta;
            }
            state.currentSection = source;
            renderAll();
        } catch (err) {
            if (errBox) {
                errBox.textContent = 'সমস্যা হয়েছে: ' + err.message;
                errBox.style.display = 'block';
            }
            const dash = document.getElementById('dash');
            if (dash) dash.style.display = 'none';
        }
    };
    reader.onerror = () => {
        if (errBox) {
            errBox.textContent = 'ফাইল পড়া যায়নি। আবার চেষ্টা করুন।';
            errBox.style.display = 'block';
        }
    };
    reader.readAsArrayBuffer(file);
}

function attachUploader(dropzoneId, inputId, source) {
    const dropzone = document.getElementById(dropzoneId);
    const fileInput = document.getElementById(inputId);
    if (!dropzone || !fileInput) return;

    dropzone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
        if (e.target.files[0]) handleFile(e.target.files[0], source);
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
        if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0], source);
    });
}

attachUploader('dropzone', 'fileInput', 'channel');
attachUploader('adDropzone', 'adFileInput', 'ad');

document.getElementById('sidePanel').addEventListener('click', (e) => {
    const btn = e.target.closest('.section-btn');
    if (!btn) return;
    state.currentSection = btn.dataset.section;
    renderAll();
});

document.getElementById('tabs').addEventListener('click', (e) => {
    const btn = e.target.closest('.tab-btn');
    if (!btn) return;
    state.currentTab = btn.dataset.tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b === btn));
    renderAll();
});

document.getElementById('adTabs').addEventListener('click', (e) => {
    const btn = e.target.closest('.tab-btn');
    if (!btn) return;
    state.adCurrentTab = btn.dataset.adTab;
    renderAll();
});

document.getElementById('adSearch').addEventListener('input', (e) => {
    state.adSearchTerm = e.target.value.toLowerCase();
    renderAll();
});

document.getElementById('search').addEventListener('input', (e) => {
    state.searchTerm = e.target.value.toLowerCase();
    renderAll();
});
