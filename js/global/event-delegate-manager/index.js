/**
 * Global Event Delegate Manager - 全局事件委托管理器
 * 
 * 解决问题：
 * - 页面长时间停留后，绑定在元素上的事件监听器可能失效
 * - 通过事件委托，在 document 上统一监听，确保事件始终能被捕获
 * 
 * 使用方式：
 * window.eventDelegateManager.on('click', '.my-button', (e, target) => {
 *     console.log('Button clicked:', target);
 * });
 */

class EventDelegateManager {
    constructor(options = {}) {
        this.config = {
            debug: options.debug || false
        };
        
        // 事件处理器映射：{ eventType: Map<selector, handler> }
        this.handlers = {};
        
        // 已绑定的事件类型
        this.boundEvents = new Set();
        this.boundListeners = new Map();
        
        this._log('Event delegate manager initialized');
    }
    
    /**
     * 注册事件处理器（简化 API）
     * @param {string} eventType - 事件类型（click, mouseenter 等）
     * @param {string} selector - CSS 选择器
     * @param {Function} handler - 处理函数，接收 (event, matchedElement) 参数
     */
    on(eventType, selector, handler) {
        if (!eventType || !selector || typeof handler !== 'function') {
            this._log('Invalid handler ignored:', eventType, selector);
            return () => {};
        }

        // 初始化该事件类型的处理器 Map
        if (!this.handlers[eventType]) {
            this.handlers[eventType] = new Map();
        }
        
        // 存储处理器（相同选择器会覆盖）
        this.handlers[eventType].set(selector, handler);
        
        // 确保该事件类型已在 document 上绑定
        this._bindEventType(eventType);
        
        this._log('Handler registered:', eventType, selector);

        return () => this.off(eventType, selector, handler);
    }
    
    /**
     * 移除事件处理器
     * @param {string} eventType - 事件类型
     * @param {string} selector - CSS 选择器
     */
    off(eventType, selector, handler) {
        const handlersMap = this.handlers[eventType];
        if (!handlersMap) return;

        if (selector) {
            if (!handler || handlersMap.get(selector) === handler) {
                handlersMap.delete(selector);
                this._log('Handler removed:', eventType, selector);
            }
        } else {
            handlersMap.clear();
            this._log('All handlers removed:', eventType);
        }

        if (handlersMap.size === 0) {
            this._unbindEventType(eventType);
        }
    }
    
    /**
     * 在 document 上绑定事件类型
     */
    _bindEventType(eventType) {
        if (this.boundEvents.has(eventType)) return;
        
        // 使用冒泡阶段，让原有的事件监听器先执行
        // 如果原有监听器失效，委托的监听器会兜底
        const listener = (e) => {
            this._handleEvent(eventType, e);
        };

        document.addEventListener(eventType, listener, false);
        
        this.boundEvents.add(eventType);
        this.boundListeners.set(eventType, listener);
        this._log('Event type bound:', eventType);
    }

    /**
     * 解绑 document 上的事件类型
     */
    _unbindEventType(eventType) {
        const listener = this.boundListeners.get(eventType);
        if (!listener) return;

        document.removeEventListener(eventType, listener, false);
        this.boundEvents.delete(eventType);
        this.boundListeners.delete(eventType);
        delete this.handlers[eventType];
        this._log('Event type unbound:', eventType);
    }
    
    /**
     * 处理事件
     */
    _handleEvent(eventType, e) {
        const handlersMap = this.handlers[eventType];
        if (!handlersMap || handlersMap.size === 0) return;
        
        // 遍历快照，避免 handler 内部注册/解绑影响当前事件分发
        const handlers = Array.from(handlersMap.entries());

        // 遍历所有注册的选择器
        for (const [selector, handler] of handlers) {
            let matchedElement = null;

            try {
                matchedElement = this._findMatchedElement(e, selector);
            } catch (error) {
                console.error('[EventDelegateManager] Selector error:', {
                    eventType,
                    selector,
                    error
                });
                continue;
            }
            
            if (matchedElement) {
                this._log('Handler matched:', selector);
                
                try {
                    handler(e, matchedElement);
                } catch (error) {
                    console.error('[EventDelegateManager] Handler error:', {
                        eventType,
                        selector,
                        target: matchedElement,
                        error
                    });
                }
            }
        }
    }

    /**
     * 查找匹配的元素，兼容 Text 节点和 Shadow DOM 事件路径
     */
    _findMatchedElement(e, selector) {
        const path = typeof e.composedPath === 'function' ? e.composedPath() : [];
        const candidates = [e.target, ...path];
        const seen = new Set();

        for (const candidate of candidates) {
            const element = this._toElement(candidate);
            if (!element || seen.has(element)) continue;
            seen.add(element);

            if (element.matches?.(selector)) {
                return element;
            }

            const closest = element.closest?.(selector);
            if (closest) {
                return closest;
            }
        }

        return null;
    }

    /**
     * 将事件目标规范化为 Element
     */
    _toElement(target) {
        if (!target) return null;
        if (target.nodeType === 1) return target;
        if (target.parentElement) return target.parentElement;
        return null;
    }
    
    /**
     * 调试日志
     */
    _log(...args) {
        if (this.config.debug) {
            console.log('[EventDelegateManager]', ...args);
        }
    }
}

// ==================== 全局单例 ====================

if (typeof window.eventDelegateManager === 'undefined') {
    window.eventDelegateManager = new EventDelegateManager({
        debug: false
    });
}
