/**
 * Conversation Export Formatters
 */

const ConversationExportFormatters = {
    format(payload, format) {
        switch (format) {
            case 'markdown':
                return this.markdown(payload);
            case 'obsidian':
                return this.obsidian(payload);
            case 'txt':
                return this.txt(payload);
            case 'json':
                return this.json(payload);
            default:
                throw new Error('不支持的导出格式');
        }
    },

    extension(format) {
        return format === 'txt' ? 'txt' : format === 'json' ? 'json' : 'md';
    },

    markdown(payload) {
        const lines = [
            `# ${payload.title}`,
            '',
            `- Platform: ${payload.platformName || payload.platform}`,
            `- Source: ${payload.source}`,
            `- Exported At: ${payload.exportedAt}`,
            ''
        ];

        payload.messages.forEach(message => {
            lines.push(`## ${this._roleLabel(message.role)} ${message.turnIndex + 1}`);
            if (message.createdAt) lines.push(`> ${message.createdAt}`);
            lines.push('', message.content, '');
        });

        return lines.join('\n').replace(/\n{4,}/g, '\n\n\n').trim() + '\n';
    },

    obsidian(payload) {
        const yaml = [
            '---',
            `title: ${this._yamlString(payload.title)}`,
            `platform: ${this._yamlString(payload.platform)}`,
            `exportedAt: ${this._yamlString(payload.exportedAt)}`,
            `source: ${this._yamlString(payload.source)}`,
            'tags:',
            '  - chatline',
            '  - conversation-export',
            `  - ${this._yamlTag(payload.platform)}`,
            '---',
            ''
        ];

        return yaml.join('\n') + this.markdown(payload);
    },

    txt(payload) {
        const lines = [
            payload.title,
            `Platform: ${payload.platformName || payload.platform}`,
            `Source: ${payload.source}`,
            `Exported At: ${payload.exportedAt}`,
            ''
        ];

        payload.messages.forEach(message => {
            const time = message.createdAt ? ` (${message.createdAt})` : '';
            lines.push(`[${this._roleLabel(message.role)} ${message.turnIndex + 1}]${time}`);
            lines.push(message.content, '');
        });

        return lines.join('\n').trim() + '\n';
    },

    json(payload) {
        return JSON.stringify({
            title: payload.title,
            platform: payload.platform,
            platformName: payload.platformName,
            conversationId: payload.conversationId,
            source: payload.source,
            exportedAt: payload.exportedAt,
            messages: payload.messages.map(message => ({
                role: message.role,
                content: message.content,
                index: message.index,
                createdAt: message.createdAt
            }))
        }, null, 2) + '\n';
    },

    _roleLabel(role) {
        return role === 'assistant' ? 'AI' : 'User';
    },

    _yamlString(value) {
        return JSON.stringify(String(value || ''));
    },

    _yamlTag(value) {
        return String(value || 'ai')
            .toLowerCase()
            .replace(/[^a-z0-9_-]+/g, '-')
            .replace(/^-+|-+$/g, '') || 'ai';
    }
};
