import { dashboardState } from '../state/DashboardState.js';
import { ReportService } from '../services/ReportService.js';
import { WorkbookReader } from '../services/WorkbookReader.js';
import { DashboardView } from '../views/DashboardView.js';

export class DashboardApp {
    constructor({ store = dashboardState, reportService = new ReportService(), workbookReader = new WorkbookReader(), view = new DashboardView() } = {}) {
        this.store = store;
        this.reportService = reportService;
        this.workbookReader = workbookReader;
        this.view = view;
    }

    start() {
        this.attachUploader('dropzone', 'fileInput', 'channel');
        this.attachUploader('adDropzone', 'adFileInput', 'ad');
        this.bindNavigation();
        this.bindTabs();
        this.bindSearch();
    }

    async handleFile(file, source) {
        this.view.clearError(source);
        this.view.showFileName(source, file.name);

        try {
            const rows = await this.workbookReader.read(file);
            const report = this.reportService.parse(rows, source);

            if (source === 'ad') {
                this.store.setTvcReport(report);
            } else {
                this.store.setProgramReport(report);
            }

            this.store.selectSection(source);
            this.view.render();
        } catch (error) {
            this.view.showError(source, error.message);
            const programDashboard = document.getElementById('dash');
            if (programDashboard && source === 'channel') programDashboard.style.display = 'none';
        }
    }

    attachUploader(dropzoneId, inputId, source) {
        const dropzone = document.getElementById(dropzoneId);
        const fileInput = document.getElementById(inputId);
        if (!dropzone || !fileInput) return;

        dropzone.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (event) => {
            if (event.target.files[0]) this.handleFile(event.target.files[0], source);
        });

        dropzone.addEventListener('dragover', (event) => {
            event.preventDefault();
            dropzone.classList.add('drag');
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropzone.addEventListener(eventName, (event) => {
                event.preventDefault();
                dropzone.classList.remove('drag');
            });
        });

        dropzone.addEventListener('drop', (event) => {
            if (event.dataTransfer.files[0]) this.handleFile(event.dataTransfer.files[0], source);
        });
    }

    bindNavigation() {
        document.getElementById('sidePanel').addEventListener('click', (event) => {
            const button = event.target.closest('.section-btn');
            if (!button) return;
            this.store.selectSection(button.dataset.section);
            this.view.render();
        });
    }

    bindTabs() {
        document.getElementById('tabs').addEventListener('click', (event) => {
            const button = event.target.closest('.tab-btn');
            if (!button) return;
            this.store.selectProgramTab(button.dataset.tab);
            this.view.render();
        });

        document.getElementById('adTabs').addEventListener('click', (event) => {
            const button = event.target.closest('.tab-btn');
            if (!button) return;
            this.store.selectTvcTab(button.dataset.adTab);
            this.view.render();
        });
    }

    bindSearch() {
        document.getElementById('search').addEventListener('input', (event) => {
            this.store.setProgramSearch(event.target.value);
            this.view.render();
        });

        document.getElementById('adSearch').addEventListener('input', (event) => {
            this.store.setTvcSearch(event.target.value);
            this.view.render();
        });
    }
}
