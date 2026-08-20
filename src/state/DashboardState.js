export class DashboardState {
    constructor() {
        this.CHANNELS = [];
        this.AD_CHANNELS = [];
        this.currentTab = 'overview';
        this.adCurrentTab = 'channels';
        this.currentSection = 'channel';
        this.searchTerm = '';
        this.adSearchTerm = '';
        this.reportMeta = { date: '', totalRows: 0 };
        this.adReportMeta = { date: '', totalRows: 0 };
    }

    setProgramReport(report) {
        this.CHANNELS = report.channels;
        this.reportMeta = report.meta;
    }

    setTvcReport(report) {
        this.AD_CHANNELS = report.channels;
        this.adReportMeta = report.meta;
    }

    selectSection(section) {
        this.currentSection = section;
    }

    selectProgramTab(tab) {
        this.currentTab = tab;
    }

    selectTvcTab(tab) {
        this.adCurrentTab = tab;
    }

    setProgramSearch(value) {
        this.searchTerm = value.toLowerCase();
    }

    setTvcSearch(value) {
        this.adSearchTerm = value.toLowerCase();
    }
}

export const dashboardState = new DashboardState();
