/**
 * Platform-specific Conversation Extractors
 *
 * 这些 extractor 只服务“对话导出”，不改变时间轴节点、收藏或同步逻辑。
 * ChatGPT/Grok 当前通用配对效果较好，继续走 generic extractor。
 */

class BasePlatformConversationExtractor {
    constructor(base) {
        this.base = base;
        this.name = 'platform-base';
    }

    _messagesFromCandidates(candidates, options = {}) {
        const messages = [];
        let userTurnIndex = -1;
        let lastUserTimestamp = null;
        const timestamps = options.timestamps || {};

        const sortedCandidates = this.base._sortByDom(candidates);
        this._currentCandidates = sortedCandidates;

        sortedCandidates.forEach((candidate, rawIndex) => {
            const role = this._roleOf(candidate, rawIndex, options);
            if (!role) return;

            if (role === 'user') userTurnIndex += 1;
            const turnIndex = Math.max(userTurnIndex, 0);
            const id = this._idOf(candidate, rawIndex, role, turnIndex, options);
            const createdAt = role === 'user'
                ? this.base._timestampToIso(timestamps[String(id)])
                : lastUserTimestamp;

            const content = this._contentOf(candidate, role, options);
            const pushed = this.base._pushMessage(messages, {
                role,
                content,
                turnIndex,
                id,
                createdAt
            });

            if (pushed && role === 'user') {
                lastUserTimestamp = this.base._timestampToIso(timestamps[String(id)]);
            }
        });

        return messages;
    }

    _idOf(candidate, rawIndex, role, turnIndex) {
        return candidate.getAttribute?.('data-message-id') ||
            candidate.getAttribute?.('data-msgid') ||
            candidate.id ||
            `${role}-${turnIndex}-${rawIndex}`;
    }

    _roleOf(candidate) {
        return this.base._inferRoleFromElement(candidate, 'assistant');
    }

    _contentOf(candidate) {
        return this.base._extractBestText(candidate, []);
    }

    _queryCandidates(root, selectors) {
        const candidates = [];
        selectors.forEach(selector => {
            candidates.push(...this.base._queryAll(root, selector));
        });
        return this.base._dedupeElements(candidates).filter(element => {
            const text = this.base._extractElementText(element);
            return text && text.length > 0;
        });
    }
}

class DoubaoConversationExtractor extends BasePlatformConversationExtractor {
    constructor(base) {
        super(base);
        this.name = 'doubao-message-stream';
    }

    async extract({ root, timestamps }) {
        const raw = this._queryCandidates(root, ['[data-message-id]']);
        const candidates = this._dedupeByMessageId(raw);
        return this._messagesFromCandidates(candidates, { timestamps });
    }

    _dedupeByMessageId(candidates) {
        const byId = new Map();
        candidates.forEach(element => {
            const id = element.getAttribute('data-message-id') || element.querySelector('[data-message-id]')?.getAttribute('data-message-id');
            const key = id || `no-id-${byId.size}`;
            const current = byId.get(key);
            if (!current) {
                byId.set(key, element);
                return;
            }

            const currentScore = this._candidateScore(current);
            const nextScore = this._candidateScore(element);
            if (nextScore > currentScore) byId.set(key, element);
        });
        return this.base._sortByDom(Array.from(byId.values()));
    }

    _candidateScore(element) {
        let score = 0;
        const classText = String(element.className || '');
        if (classText.includes('justify-end') || classText.includes('justify-start')) score += 8;
        if (element.querySelector('[data-plugin-identifier]')) score += 6;
        if (element.querySelector('.markdown, [class*="markdown"]')) score += 4;
        score += Math.min(20, (this.base._extractElementText(element) || '').length / 80);
        return score;
    }

    _roleOf(candidate) {
        const role = this.base._inferRoleFromElement(candidate, null);
        if (role) return role;

        const classText = String(candidate.className || '').toLowerCase();
        if (classText.includes('justify-end')) return 'user';
        if (classText.includes('justify-start')) return 'assistant';
        return 'assistant';
    }

    _idOf(candidate, rawIndex, role, turnIndex) {
        const id = candidate.getAttribute('data-message-id') ||
            candidate.querySelector('[data-message-id]')?.getAttribute('data-message-id');
        return id ? `doubao-${id}` : `doubao-${role}-${turnIndex}-${rawIndex}`;
    }

    _contentOf(candidate, role) {
        const selectors = role === 'user'
            ? ['[data-plugin-identifier]', '[class*="bubble"]', '[class*="content"]']
            : ['[data-plugin-identifier]', '.markdown', '[class*="markdown"]', '[class*="answer"]', '[class*="content"]'];
        return this.base._extractBestText(candidate, selectors);
    }
}

class DeepSeekConversationExtractor extends BasePlatformConversationExtractor {
    constructor(base) {
        super(base);
        this.name = 'deepseek-message-stream';
        this._userParentClass = null;
    }

    async extract({ root, timestamps }) {
        const candidates = this._queryCandidates(root, ['.ds-message']);
        this._userParentClass = this._detectUserParentClass(candidates);
        return this._messagesFromCandidates(candidates, { timestamps, candidates });
    }

    _detectUserParentClass(candidates) {
        const firstUserLike = candidates.find(element => {
            const role = this.base.adapter?.detectDeepSeekMessageRole?.(element, candidates, candidates.indexOf(element));
            return role === 'user' || this.base._inferRoleFromLayout(element) === 'user';
        });
        const className = firstUserLike?.parentElement?.classList?.[0];
        return className || null;
    }

    _roleOf(candidate, rawIndex, options = {}) {
        const adapterRole = this.base.adapter?.detectDeepSeekMessageRole?.(candidate, options.candidates || this._currentCandidates, rawIndex);
        if (adapterRole) return adapterRole;

        const attrRole = this.base._inferRoleFromElement(candidate, null);
        if (attrRole) return attrRole;

        const parentClass = candidate.parentElement?.classList?.[0];
        if (this._userParentClass && parentClass === this._userParentClass) return 'user';

        const layoutRole = this.base._inferRoleFromLayout(candidate);
        if (layoutRole) return layoutRole;

        // DeepSeek's hashed wrapper classes occasionally lose semantic role hints.
        // When DOM/layout signals are unavailable, preserve the common user -> assistant turn order.
        return rawIndex % 2 === 0 ? 'user' : 'assistant';
    }

    _idOf(candidate, rawIndex, role, turnIndex) {
        return `deepseek-${role === 'user' ? turnIndex : `${turnIndex}-assistant-${rawIndex}`}`;
    }

    _contentOf(candidate) {
        return this.base._extractBestText(candidate, [
            '.ds-markdown',
            '.markdown',
            '[class*="markdown"]',
            '[class*="content"]',
            'div'
        ]);
    }
}

class KimiConversationExtractor extends BasePlatformConversationExtractor {
    constructor(base) {
        super(base);
        this.name = 'kimi-message-stream';
    }

    async extract({ root, timestamps }) {
        const candidates = this._queryCandidates(root, [
            '.chat-content-item',
            '.user-content',
            '.assistant-content',
            '.segment-content',
            '.markdown'
        ]);
        return this._messagesFromCandidates(this._dedupeKimiCandidates(candidates), { timestamps });
    }

    _dedupeKimiCandidates(candidates) {
        return this.base._sortByDom(candidates.filter((element, index, all) => {
            if (element.matches?.('.user-content, .assistant-content, .segment-content, .markdown')) {
                return !element.closest?.('.chat-content-item');
            }
            return !all.some(other => other !== element && other.contains(element) && other.matches?.('.chat-content-item'));
        }));
    }

    _roleOf(candidate) {
        if (candidate.matches?.('.user-content') || candidate.querySelector?.('.user-content')) return 'user';
        if (candidate.matches?.('.assistant-content, .segment-content, .markdown') ||
            candidate.querySelector?.('.assistant-content, .segment-content, .markdown')) return 'assistant';
        return this.base._inferRoleFromElement(candidate, 'assistant');
    }

    _idOf(candidate, rawIndex, role, turnIndex) {
        return `kimi-${role === 'user' ? turnIndex : `${turnIndex}-assistant-${rawIndex}`}`;
    }

    _contentOf(candidate, role) {
        const selectors = role === 'user'
            ? ['.user-content']
            : ['.assistant-content', '.segment-content', '.markdown', '[class*="markdown"]'];
        return this.base._extractBestText(candidate, selectors, {
            removeSelectors: [
                '[role="toolbar"]',
                '[role="button"]',
                '[class*="toolbar"]',
                '[class*="action"]',
                '[class*="operation"]',
                '[class*="operate"]',
                '[class*="copy"]',
                '[class*="share"]',
                '[class*="edit"]',
                '[class*="feedback"]',
                '[class*="hover"]',
                '[class*="sr-only"]',
                '[class*="visually-hidden"]',
                '[aria-label*="复制"]',
                '[aria-label*="分享"]',
                '[aria-label*="编辑"]',
                '[aria-label*="Copy"]',
                '[aria-label*="Share"]',
                '[aria-label*="Edit"]'
            ],
            afterNormalize: text => this._stripOperationLines(text)
        });
    }

    _stripOperationLines(text) {
        const operationLine = /^(编辑|复制|分享|删除|更多|引用|收藏|点赞|点踩|重新生成|Edit|Copy|Share|Delete|More|Quote|Favorite|Regenerate)(\s+(编辑|复制|分享|删除|更多|引用|收藏|点赞|点踩|重新生成|Edit|Copy|Share|Delete|More|Quote|Favorite|Regenerate))*$/i;
        return String(text || '')
            .split('\n')
            .filter(line => !operationLine.test(line.trim()))
            .join('\n');
    }
}

class TongyiConversationExtractor extends BasePlatformConversationExtractor {
    constructor(base) {
        super(base);
        this.name = 'tongyi-question-answer-stream';
    }

    async extract({ root, timestamps }) {
        const candidates = this._queryCandidates(root, [
            '[class*="questionItem"]',
            '[class*="question-item"]',
            '[class*="answerItem"]',
            '[class*="answer-item"]',
            '[class*="responseItem"]',
            '.qwen-chat-message-user',
            '.qwen-chat-message-assistant',
            '.chat-user-message',
            '.chat-assistant-message',
            '[id^="qwen-chat-message-user"]',
            '[id^="qwen-chat-message-assistant"]'
        ]);
        return this._messagesFromCandidates(candidates, { timestamps });
    }

    _roleOf(candidate) {
        const classText = String(candidate.className || '').toLowerCase();
        const idText = String(candidate.id || '').toLowerCase();
        if (classText.includes('questionitem') || classText.includes('question-item')) return 'user';
        if (classText.includes('answeritem') || classText.includes('answer-item') || classText.includes('responseitem')) return 'assistant';
        if (idText.includes('qwen-chat-message-user') || classText.includes('chat-message-user') || classText.includes('chat-user-message')) return 'user';
        if (idText.includes('qwen-chat-message-assistant') || classText.includes('chat-message-assistant') || classText.includes('chat-assistant-message')) return 'assistant';
        return this.base._inferRoleFromElement(candidate, 'assistant');
    }

    _idOf(candidate, rawIndex, role, turnIndex) {
        const msgId = candidate.getAttribute('data-msgid') || candidate.id;
        return msgId ? `tongyi-${msgId}` : `tongyi-${role}-${turnIndex}-${rawIndex}`;
    }

    _contentOf(candidate) {
        return this.base._extractBestText(candidate, [
            '[class*="bubble"]',
            '.user-message-content',
            '.assistant-message-content',
            '.chat-user-message',
            '.chat-assistant-message',
            '.markdown',
            '.markdown-body',
            '[class*="markdown"]',
            '[class*="content"]',
            'article'
        ]);
    }
}

class QwenConversationExtractor extends BasePlatformConversationExtractor {
    constructor(base) {
        super(base);
        this.name = 'qwen-message-stream';
    }

    async extract({ root, timestamps }) {
        const candidates = this._queryCandidates(root, [
            '.qwen-chat-message-user',
            '.qwen-chat-message-assistant',
            '.chat-user-message',
            '.chat-assistant-message',
            '[id^="qwen-chat-message-user"]',
            '[id^="qwen-chat-message-assistant"]'
        ]);
        return this._messagesFromCandidates(this._dedupeQwenCandidates(candidates), { timestamps });
    }

    _dedupeQwenCandidates(candidates) {
        return this.base._sortByDom(candidates.filter((element, index, all) => {
            return !all.some(other => other !== element && other.contains(element) && this._roleOf(other) === this._roleOf(element));
        }));
    }

    _roleOf(candidate) {
        const text = `${candidate.id || ''} ${candidate.className || ''}`.toLowerCase();
        if (text.includes('message-user') || text.includes('chat-user')) return 'user';
        if (text.includes('message-assistant') || text.includes('chat-assistant')) return 'assistant';
        return this.base._inferRoleFromElement(candidate, 'assistant');
    }

    _idOf(candidate, rawIndex, role, turnIndex) {
        if (candidate.id) return `qwen-${candidate.id}`;
        return `qwen-${role}-${turnIndex}-${rawIndex}`;
    }

    _contentOf(candidate, role) {
        const selectors = role === 'user'
            ? ['.user-message-content', '.chat-user-message', '[class*="user-message-content"]']
            : ['.markdown-body', '.assistant-message-content', '.chat-assistant-message', '[class*="assistant-message-content"]', '.markdown'];
        return this.base._extractBestText(candidate, selectors);
    }
}

const ConversationPlatformExtractorRegistry = {
    get(platformId, base) {
        const registry = {
            doubao: DoubaoConversationExtractor,
            deepseek: DeepSeekConversationExtractor,
            tongyi: TongyiConversationExtractor,
            qwen: QwenConversationExtractor,
            kimi: KimiConversationExtractor
        };
        const ExtractorClass = registry[platformId];
        return ExtractorClass ? new ExtractorClass(base) : null;
    }
};
