import { DashboardRenderer } from '../../ui.js';

export class DashboardView {
    constructor({ renderer = new DashboardRenderer() } = {}) {
        this.renderer = renderer;
    }

    render() {
        this.renderer.render();
    }

    showFileName(source, fileName) {
        const fileNameBox = document.getElementById(source === 'ad' ? 'adFilename' : 'filename');
        if (fileNameBox) fileNameBox.textContent = fileName;
    }

    clearError(source) {
        const errorBox = document.getElementById(source === 'ad' ? 'adErr' : 'err');
        if (errorBox) errorBox.style.display = 'none';
    }

    showError(source, message) {
        const errorBox = document.getElementById(source === 'ad' ? 'adErr' : 'err');
        if (!errorBox) return;
        errorBox.textContent = 'সমস্যা হয়েছে: ' + message;
        errorBox.style.display = 'block';
    }
}
