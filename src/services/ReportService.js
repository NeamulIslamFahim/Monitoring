import { ProgramReportParser, TvcReportParser } from '../../data.js';

export class ReportService {
    constructor({ programParser = new ProgramReportParser(), tvcParser = new TvcReportParser() } = {}) {
        this.programParser = programParser;
        this.tvcParser = tvcParser;
    }

    parse(rows, source) {
        return source === 'ad' ? this.tvcParser.parse(rows) : this.programParser.parse(rows);
    }
}
