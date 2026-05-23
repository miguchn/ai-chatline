/**
 * Conversation Export Date Utils
 *
 * Exported files use one local display format across all platforms:
 * yyyy-mm-dd hh:mm:ss.ss
 */
const ConversationExportDateUtils = {
    formatDateTime(value = Date.now()) {
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{2}$/.test(value)) {
            return value;
        }
        const date = value instanceof Date ? value : new Date(value);
        if (Number.isNaN(date.getTime())) return null;

        const pad = (number, length = 2) => String(number).padStart(length, '0');
        const hundredths = Math.floor(date.getMilliseconds() / 10);

        return [
            date.getFullYear(),
            pad(date.getMonth() + 1),
            pad(date.getDate())
        ].join('-') + ' ' + [
            pad(date.getHours()),
            pad(date.getMinutes()),
            pad(date.getSeconds())
        ].join(':') + `.${pad(hundredths)}`;
    },

    formatForFilename(value = Date.now()) {
        return (this.formatDateTime(value) || this.formatDateTime(Date.now()))
            .replace(/[ :]/g, '_');
    }
};
