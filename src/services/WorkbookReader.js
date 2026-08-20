export class WorkbookReader {
    read(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (event) => {
                try {
                    const data = new Uint8Array(event.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const sheet = workbook.Sheets[workbook.SheetNames[0]];
                    resolve(XLSX.utils.sheet_to_json(sheet, { defval: '' }));
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = () => reject(new Error('ফাইল পড়া যায়নি। আবার চেষ্টা করুন।'));
            reader.readAsArrayBuffer(file);
        });
    }
}
