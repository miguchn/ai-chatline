/**
 * Conversation Extractor
 *
 * 从当前页面提取标准化会话数据。平台差异只通过 adapter 钩子进入这里，
 * 后续格式化、下载、复制都不直接读取页面 DOM。
 */

class ConversationExtractor {
    constructor(adapter) {
        this.adapter = adapter;
    }

    async extract(options = {}) {
        if (!this.adapter) {
            throw new Error('当前页面暂不支持对话导出');
        }

        const root = options.root || window.timelineManager?.conversationContainer || document;
        const platform = typeof getCurrentPlatform === 'function' ? getCurrentPlatform() : null;
        const userElements = this._getUserElements(root);
        const timestamps = await this._loadNodeTimestamps();
        const context = {
            root,
            userElements,
            fiberTexts: this.adapter.extractFiberTexts?.()
        };
        const platformExtractor = typeof ConversationPlatformExtractorRegistry !== 'undefined'
            ? ConversationPlatformExtractorRegistry.get(platform?.id, this)
            : null;
        let messages = null;

        if (platformExtractor) {
            messages = await platformExtractor.extract({ root, platform, timestamps, context });
        } else {
            messages = this._extractByUserTurnPairing({ userElements, timestamps, context });
        }

        const payload = {
            title: this._getTitle(),
            platform: platform?.id || this.adapter.constructor?.name?.replace(/Adapter$/, '').toLowerCase() || 'unknown',
            platformName: platform?.name || 'AI',
            conversationId: this.adapter.extractConversationId?.(location.pathname) || null,
            source: location.href,
            exportedAt: this._formatExportDateTime(Date.now()),
            messages: this._finalizeMessages(messages || [])
        };
        this._debugLog(payload, platformExtractor?.name || 'generic-user-turn-pairing');
        return payload;
    }

    _extractByUserTurnPairing({ userElements, timestamps, context }) {
        const messages = [];
        userElements.forEach((element, turnIndex) => {
            const turnId = this.adapter.generateTurnId?.(element, turnIndex) || `turn-${turnIndex}`;
            const userText = this._extractUserText(element, turnIndex, context);

            this._pushMessage(messages, {
                role: 'user',
                content: userText,
                turnIndex,
                id: turnId,
                createdAt: this._timestampToIso(timestamps[String(turnId)])
            });

            // TODO: 部分平台的 AI 回复 DOM 会虚拟化或动态重组；当前先复用各 adapter
            // 的 assistant target 钩子，无法可靠定位时降级为只导出用户消息。
            const assistantElement = this.adapter.getAssistantTimeLabelTarget?.(element, turnIndex, context);
            const assistantText = this._extractElementText(assistantElement);

            this._pushMessage(messages, {
                role: 'assistant',
                content: assistantText,
                turnIndex,
                id: `${turnId}-assistant`,
                createdAt: this._timestampToIso(timestamps[String(turnId)])
            });
        });
        return messages;
    }

    _getUserElements(root) {
        const elements = typeof this.adapter.getUserMessageElements === 'function'
            ? this.adapter.getUserMessageElements(root)
            : [];

        return Array.from(elements || []).sort((a, b) => {
            if (a === b) return 0;
            return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
        });
    }

    _extractUserText(element, index, context) {
        const richText = this._extractBestText(element, []);
        if (richText) return richText;

        const adapterText = this.adapter.extractMessageText?.(element, index, context) ||
            this.adapter.extractText?.(element, index, context) ||
            '';
        return this._normalizeText(adapterText);
    }

    _extractBestText(element, selectors = [], options = {}) {
        if (!element) return '';

        const targetTexts = [];
        selectors.forEach(selector => {
            this._queryAll(element, selector).forEach(node => {
                const text = this._extractElementText(node, options);
                if (text) targetTexts.push(text);
            });
        });

        const deduped = this._dedupeTexts(targetTexts);
        if (deduped.length > 1) {
            return this._normalizeText(deduped.join('\n\n'));
        }
        if (deduped.length === 1) return deduped[0];

        return this._extractElementText(element, options);
    }

    _extractElementText(element, options = {}) {
        if (!element) return '';

        const clone = element.cloneNode(true);
        clone.querySelectorAll?.('button, svg, style, script, noscript, [aria-hidden="true"]').forEach(node => {
            node.remove();
        });
        (options.removeSelectors || []).forEach(selector => {
            this._queryAll(clone, selector).forEach(node => node.remove());
        });
        clone.querySelectorAll?.('[data-ait-time]').forEach(node => node.removeAttribute('data-ait-time'));

        let text = this._normalizeText(this._walkNode(clone, { inPre: false, inCode: false }));
        if (typeof options.afterNormalize === 'function') {
            text = this._normalizeText(options.afterNormalize(text));
        }
        return text;
    }

    _walkNode(node, state) {
        if (!node) return '';

        if (node.nodeType === Node.TEXT_NODE) {
            return state.inPre ? node.textContent || '' : (node.textContent || '').replace(/[ \t]+/g, ' ');
        }

        if (node.nodeType !== Node.ELEMENT_NODE) return '';

        const tag = node.tagName?.toLowerCase();
        if (!tag) return '';

        if (tag === 'br') return '\n';
        if (tag === 'pre') {
            const code = node.textContent || '';
            return code.trim() ? `\n\`\`\`\n${code.replace(/\n+$/, '')}\n\`\`\`\n` : '';
        }
        if (tag === 'tr') {
            const cells = Array.from(node.children || [])
                .filter(child => ['td', 'th'].includes(child.tagName?.toLowerCase()))
                .map(child => this._normalizeText(this._walkNode(child, state)))
                .filter(Boolean);
            return cells.length ? `\n| ${cells.join(' | ')} |` : '';
        }
        if (tag === 'code' && !state.inCode && !state.inPre) {
            const code = (node.textContent || '').trim();
            return code ? `\`${code}\`` : '';
        }

        const childState = {
            inPre: state.inPre || tag === 'pre',
            inCode: state.inCode || tag === 'code'
        };
        const content = Array.from(node.childNodes || [])
            .map(child => this._walkNode(child, childState))
            .join('');

        if (!content.trim()) return '';

        if (/^h[1-6]$/.test(tag)) return `\n${content.trim()}\n`;
        if (tag === 'li') return `\n- ${content.trim()}`;
        if (tag === 'table') return `\n${content.trim()}\n`;
        if (tag === 'td' || tag === 'th') return content.trim();
        if (tag === 'blockquote') {
            const quote = content.trim().split('\n').map(line => `> ${line}`).join('\n');
            return `\n${quote}\n`;
        }
        if (tag === 'p') return `\n${content.trim()}\n`;
        if (['div', 'section', 'article', 'main', 'header', 'footer', 'tr'].includes(tag)) {
            return `${content}\n`;
        }

        return content;
    }

    _normalizeText(text) {
        return String(text || '')
            .replace(/\u00a0/g, ' ')
            .replace(/[ \t]+\n/g, '\n')
            .replace(/\n[ \t]+/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }

    _queryAll(root, selector) {
        if (!root?.querySelectorAll || !selector) return [];
        try {
            return Array.from(root.querySelectorAll(selector));
        } catch {
            return [];
        }
    }

    _sortByDom(elements) {
        return Array.from(elements || []).sort((a, b) => {
            if (a === b) return 0;
            return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
        });
    }

    _dedupeElements(elements) {
        return this._sortByDom(Array.from(new Set(elements || [])));
    }

    _dedupeTexts(texts) {
        const result = [];
        const seen = new Set();
        texts.forEach(text => {
            const normalized = this._normalizeText(text);
            if (!normalized || seen.has(normalized)) return;
            if (result.some(existing => existing.includes(normalized))) return;
            for (let i = result.length - 1; i >= 0; i--) {
                if (normalized.includes(result[i])) {
                    seen.delete(result[i]);
                    result.splice(i, 1);
                }
            }
            result.push(normalized);
            seen.add(normalized);
        });
        return result;
    }

    _pushMessage(messages, message) {
        const content = this._normalizeText(message?.content || '');
        if (!content) return false;
        messages.push({
            role: message.role === 'assistant' ? 'assistant' : 'user',
            content,
            index: messages.length,
            turnIndex: Number.isFinite(message.turnIndex) ? message.turnIndex : messages.length,
            id: message.id || `${message.role || 'message'}-${messages.length}`,
            createdAt: message.createdAt || null
        });
        return true;
    }

    _finalizeMessages(messages) {
        const result = [];
        messages.forEach(message => {
            this._pushMessage(result, message);
        });
        return result;
    }

    _elementMatches(element, selectors) {
        if (!element || !selectors) return false;
        const selectorList = Array.isArray(selectors) ? selectors : [selectors];
        return selectorList.some(selector => {
            try {
                return !!selector && element.matches(selector);
            } catch {
                return false;
            }
        });
    }

    _inferRoleFromElement(element, fallback = 'assistant') {
        if (!element) return fallback;

        const attrText = [
            element.getAttribute?.('role'),
            element.getAttribute?.('data-role'),
            element.getAttribute?.('data-author'),
            element.getAttribute?.('data-message-author-role'),
            element.getAttribute?.('aria-label'),
            element.id,
            element.className
        ].join(' ').toLowerCase();

        if (/\b(user|human|question|query|prompt|me|my)\b/.test(attrText)) return 'user';
        if (/\b(assistant|ai|bot|answer|response|agent|model)\b/.test(attrText)) return 'assistant';

        const layoutRole = this._inferRoleFromLayout(element);
        return layoutRole || fallback;
    }

    _inferRoleFromLayout(element) {
        let current = element;
        for (let depth = 0; current && current !== document.body && depth < 4; depth++) {
            try {
                const style = window.getComputedStyle(current);
                const classText = String(current.className || '').toLowerCase();
                if (style.justifyContent === 'flex-end' || style.alignItems === 'flex-end' || style.textAlign === 'right' || classText.includes('justify-end')) {
                    return 'user';
                }
                if (style.justifyContent === 'flex-start' || style.alignItems === 'flex-start' || classText.includes('justify-start')) {
                    return 'assistant';
                }
            } catch {}
            current = current.parentElement;
        }
        return null;
    }

    _debugLog(payload, extractorName) {
        let enabled = false;
        try {
            enabled = localStorage.getItem('conversationExportDebug') === '1' ||
                localStorage.getItem('chatgptTimelineDebugPerf') === '1' ||
                (typeof GLOBAL_DEBUG !== 'undefined' && GLOBAL_DEBUG === true);
        } catch {}
        if (!enabled) return;

        const messages = payload.messages || [];
        const userCount = messages.filter(m => m.role === 'user').length;
        const assistantCount = messages.filter(m => m.role === 'assistant').length;
        const emptyCount = messages.filter(m => !m.content?.trim()).length;
        const shortCount = messages.filter(m => (m.content || '').trim().length > 0 && (m.content || '').trim().length < 8).length;
        const consecutiveSameRole = messages.some((m, index) => index > 0 && messages[index - 1].role === m.role);
        const totalContentLength = messages.reduce((sum, m) => sum + (m.content || '').length, 0);

        console.debug('[ConversationExport]', {
            platform: payload.platform,
            extractor: extractorName,
            totalMessages: messages.length,
            userMessages: userCount,
            assistantMessages: assistantCount,
            emptyMessages: emptyCount,
            shortMessages: shortCount,
            consecutiveSameRole,
            totalContentLength,
            roleOrder: messages.map(m => m.role[0]).join('')
        });
    }

    async _loadNodeTimestamps() {
        try {
            const key = location.href.replace(/^https?:\/\//, '').split('?')[0].split('#')[0];
            const data = await ChatTimeStorageManager.getByConversation(key);
            return data?.nodes || {};
        } catch {
            return {};
        }
    }

    _timestampToIso(timestamp) {
        return this._formatExportDateTime(timestamp);
    }

    _formatExportDateTime(timestamp) {
        if (!timestamp) return null;
        if (typeof ConversationExportDateUtils !== 'undefined') {
            return ConversationExportDateUtils.formatDateTime(timestamp);
        }
        const date = new Date(timestamp);
        if (Number.isNaN(date.getTime())) return null;
        const pad = (number, length = 2) => String(number).padStart(length, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
            `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.` +
            `${pad(Math.floor(date.getMilliseconds() / 10))}`;
    }

    _getTitle() {
        const adapterTitle = this.adapter.getDefaultChatTheme?.();
        const title = adapterTitle || document.title || 'Untitled Conversation';
        return title.replace(/\s+/g, ' ').trim() || 'Untitled Conversation';
    }
}
