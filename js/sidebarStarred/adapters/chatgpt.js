/**
 * ChatGPT Sidebar Starred Adapter
 *
 * 旧版侧边栏 DOM 结构：
 *   nav > ... > #history 的父元素
 *     ├── .ait-sidebar-starred       ← 收藏区域（插入位置）
 *     └── #history 的父元素          ← 聊天历史（参考锚点）
 *
 * 新版侧边栏 DOM 结构（2025-10 起，#history / data-sidebar-item 已移除）：
 *   div.group/nav-list[data-appearance]            ← 置顶/项目区
 *     div[data-pinned-content-tab-drop-key]        ← 每个置顶项一个容器
 *       ... a[data-interactive-row-link][href^="/c/"]
 *   div.group/nav-section > ... > div.group/nav-list
 *     div[data-sidebar-chatgpt-conversation-key]   ← 每个最近对话一个容器
 *       div.group[role="group"]                    ← 对话行（hover 出现「聊天操作」按钮）
 *         a[data-interactive-row-link][href^="/c/"]
 *           span[data-thread-title]                ← 标题
 *
 * 策略：
 *   findSidebarContainer → 旧版 #history 祖父元素；新版第一个 group/nav-list 的父元素
 *   findInsertionPoint   → insertBefore(旧版 #history 父元素 / 新版第一个 group/nav-list)
 */

class ChatGPTSidebarStarredAdapter extends BaseSidebarStarredAdapter {
    matches() {
        return matchesPlatform(location.href, 'chatgpt');
    }

    /** 新版 UI：找到包含对话链接的 nav-list 容器（第一个即列表区顶部） */
    _findNewNavList() {
        const link = document.querySelector('a[data-interactive-row-link][href^="/c/"]');
        return link?.closest('[class*="group/nav-list"]') || null;
    }

    findSidebarContainer() {
        const history = document.getElementById('history');
        if (history?.parentElement?.parentElement) return history.parentElement.parentElement;
        const navList = this._findNewNavList();
        return navList?.parentElement || null;
    }

    findInsertionPoint() {
        const history = document.getElementById('history');
        if (history?.parentElement?.parentElement) {
            return { parent: history.parentElement.parentElement, reference: history.parentElement, position: 'before' };
        }
        const navList = this._findNewNavList();
        if (navList?.parentElement) {
            return { parent: navList.parentElement, reference: navList, position: 'before' };
        }
        return null;
    }

    getPlatformClass() {
        return 'chatgpt';
    }

    navigateToConversation(url) {
        try {
            const convId = new URL(url).pathname.split('/').filter(Boolean).pop();
            if (!convId) return false;
            const link = document.querySelector(`a[data-interactive-row-link][href*="${convId}"]`) ||
                document.querySelector(`#history a[href*="${convId}"]`);
            if (link) { link.click(); return true; }
        } catch { /* ignore */ }
        return false;
    }

    // ==================== 侧边栏收藏标记 ====================

    getConversationElements() {
        const newLinks = document.querySelectorAll('a[data-interactive-row-link][href^="/c/"]');
        if (newLinks.length > 0) return newLinks;
        return document.querySelectorAll('#history a[data-sidebar-item]');
    }

    getConversationUrlPath(convEl) {
        try { return new URL(convEl.href).pathname; } catch { return ''; }
    }

    getHideTarget(convEl) {
        // 新版：隐藏整个对话行容器（只隐藏 a 会残留行背景和 hover 区域）
        return convEl.closest?.('[data-sidebar-chatgpt-conversation-key], [data-pinned-content-tab-drop-key], [role="group"]') || convEl;
    }

    injectStarIcon(convEl) {
        const titleEl = convEl.querySelector('[data-thread-title], .truncate');
        if (!titleEl || titleEl.querySelector(`[${BaseSidebarStarredAdapter.STAR_ICON_ATTR}]`)) return;

        const icon = document.createElement('span');
        icon.setAttribute(BaseSidebarStarredAdapter.STAR_ICON_ATTR, 'true');
        icon.className = 'ait-conv-starred-icon';
        icon.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="rgb(255, 125, 3)" stroke="rgb(255, 125, 3)" stroke-width="1"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
        titleEl.insertBefore(icon, titleEl.firstChild);
    }

    removeStarIcon(convEl) {
        const icon = convEl.querySelector(`[${BaseSidebarStarredAdapter.STAR_ICON_ATTR}]`);
        if (icon) icon.remove();
    }

    // ==================== 原生菜单注入 ====================

    getClickDelegateSelector() {
        // 旧版：带 data-conversation-options-trigger 的三个点按钮
        // 新版：「聊天操作」按钮无稳定属性（aria-label 随语言变化），委托到对话行容器
        return 'button[data-conversation-options-trigger], [role="group"]:has(a[data-interactive-row-link][href^="/c/"])';
    }

    getConversationFromClickTarget(target) {
        const convLink = target.closest?.('a[data-sidebar-item]') ||
            target.querySelector?.('a[data-interactive-row-link][href^="/c/"]');
        if (!convLink) return null;

        const titleSpan = convLink.querySelector('[data-thread-title], .truncate span[dir="auto"]');
        return {
            url: convLink.href,
            title: titleSpan?.textContent?.trim() || convLink.getAttribute('aria-label') || ''
        };
    }

    findCurrentMenuOverlay() {
        const wrappers = document.querySelectorAll('[data-radix-popper-content-wrapper]');
        for (const w of wrappers) {
            if (w.querySelector('[role="menu"]')) return w;
        }
        return null;
    }

    createStarMenuItem(overlay, isStarred) {
        const menu = overlay.querySelector('[role="menu"]');
        if (!menu) return null;

        const items = menu.querySelectorAll('[role="menuitem"]');
        if (items.length === 0) return null;

        const refItem = items[0];
        const menuItem = refItem.cloneNode(true);
        menuItem.setAttribute('data-ait-star-folder', 'true');
        menuItem.removeAttribute('data-testid');
        menuItem.removeAttribute('data-has-submenu');
        menuItem.removeAttribute('aria-haspopup');
        menuItem.removeAttribute('aria-expanded');
        menuItem.removeAttribute('aria-controls');
        menuItem.removeAttribute('data-state');
        menuItem.className = refItem.className;

        const label = isStarred
            ? (chrome.i18n.getMessage('bpxjkw') || 'Unstar')
            : (chrome.i18n.getMessage('nativeMenuStarToFolder') || 'Star to Folder');

        for (const child of [...menuItem.childNodes].reverse()) {
            if (child.nodeType === Node.TEXT_NODE && child.textContent.trim()) {
                child.textContent = label;
                break;
            }
        }

        const iconDiv = menuItem.querySelector('.icon');
        if (iconDiv) {
            iconDiv.innerHTML = this._starIconSvg(isStarred);
        }
        if (isStarred) menuItem.style.color = '#ef4444';

        const secondItem = items[1] || null;
        menu.insertBefore(menuItem, secondItem);
        return menuItem;
    }

    _starIconSvg(isStarred) {
        return isStarred
            ? '<svg viewBox="0 0 24 24" width="20" height="20" fill="rgb(255, 125, 3)" stroke="rgb(255, 125, 3)" stroke-width="0.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>'
            : '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
    }

    updateStarMenuItemState(menuItem, isStarred) {
        const label = isStarred
            ? (chrome.i18n.getMessage('bpxjkw') || 'Unstar')
            : (chrome.i18n.getMessage('nativeMenuStarToFolder') || 'Star to Folder');

        for (const child of [...menuItem.childNodes].reverse()) {
            if (child.nodeType === Node.TEXT_NODE && child.textContent.trim()) {
                child.textContent = label;
                break;
            }
        }

        const iconDiv = menuItem.querySelector('.icon');
        if (iconDiv) {
            iconDiv.innerHTML = this._starIconSvg(isStarred);
        }
        menuItem.style.color = isStarred ? '#ef4444' : '';
    }
}
