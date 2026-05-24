/**
 * InputBox Animation Manager
 *
 * 管理输入框区域的电子宠物。只允许同时开启一个动画。
 * 支持养成系统：发送消息越多，动物越多越大。
 *
 * Storage keys:
 *   activeAnimation — 当前选中的动画 id
 *   animationPetData — 养成数据 { [id]: { count, messages } }
 */

class InputBoxAnimationManager {
    constructor() {
        this._animations = new Map();
        this._active = null;
        this._storageKey = 'activeAnimation';
        this._petDataKey = 'animationPetData';
        this._petData = {};
        this._initialized = false;
        this._initPromise = null;
        this._activeCount = 1;
        this._activePaused = true;
        this._isPositioned = false;
        this._lastReferenceRect = null;
        this._healthTimer = null;
        this._pauseTimer = null;
        this._visibilityHandler = null;
    }

    register(animation) {
        this._animations.set(animation.id, animation);
    }

    getAll() {
        return [...this._animations.values()];
    }

    getActiveId() {
        return this._active?.id || null;
    }

    getPetData(id) {
        return this._petData[id] || { count: 1, messages: 0 };
    }

    async init() {
        if (this._initPromise) return this._initPromise;
        this._initPromise = this._init();
        try {
            return await this._initPromise;
        } finally {
            this._initPromise = null;
        }
    }

    async _init() {
        if (this._initialized) {
            this._ensureActiveElement();
            return;
        }
        this._petData = await StorageAdapter.get(this._petDataKey) || {};
        const savedId = await StorageAdapter.get(this._storageKey);
        // 默认动画为巫师
        const activeId = savedId !== undefined ? savedId : 'wizard';
        if (activeId && this._animations.has(activeId)) {
            this._activate(activeId);
        }
        this._startStorageListener();
        this._startAIStateListener();
        this._startRecoveryHooks();
        this._initialized = true;
        this.pauseActive();
    }

    async toggle(id) {
        this._cancelPreview();
        if (this._active?.id === id) {
            this._deactivate();
            await StorageAdapter.set(this._storageKey, '');
        } else {
            this._deactivate();
            this._activate(id);
            await StorageAdapter.set(this._storageKey, id);
            this._startPreview();
        }
    }

    async _onMessage() {
        const id = this.getActiveId();
        if (!id) return;
        const anim = this._animations.get(id);
        if (!anim || !anim.maxCount) return;

        const data = this.getPetData(id);
        const maxMsg = anim.growAt?.[anim.growAt.length - 1];
        if (maxMsg && data.messages >= maxMsg) return;
        data.messages++;
        let newCount = 1;
        if (anim.growAt) {
            for (let i = 0; i < anim.growAt.length; i++) {
                if (data.messages >= anim.growAt[i]) newCount = i + 2;
            }
            newCount = Math.min(newCount, anim.maxCount);
        }
        const grew = newCount > data.count;
        data.count = newCount;
        this._activeCount = data.count;
        this._petData[id] = data;
        await StorageAdapter.set(this._petDataKey, this._petData);

        if (grew && anim.addFollower) {
            anim.addFollower(data.count);
        }
    }

    _startPreview() {
        this._cancelPreview();
        const aiMon = window.AIStateMonitor?.getInstance();
        if (aiMon?.isGenerating) return;
        this.resumeActive();
        const duration = this._active?.marchDuration || 60;
        this._previewTimer = setTimeout(() => {
            this._previewTimer = null;
            const aiMon = window.AIStateMonitor?.getInstance();
            if (!aiMon?.isGenerating) this.pauseActive();
        }, duration * 1000);
    }

    _cancelPreview() {
        if (this._previewTimer) {
            clearTimeout(this._previewTimer);
            this._previewTimer = null;
        }
    }

    updatePosition(referenceRect) {
        if (referenceRect?.width) {
            this._lastReferenceRect = {
                left: referenceRect.left,
                top: referenceRect.top,
                width: referenceRect.width,
                height: referenceRect.height
            };
            this._isPositioned = true;
        }
        if (this._active) {
            this._ensureActiveElement();
            this._active.updatePosition(referenceRect);
        }
    }

    hideActive() {
        this._isPositioned = false;
        if (this._active) this._active.hide();
    }

    pauseActive() {
        this._activePaused = true;
        this._clearPauseTimer();
        if (!this._active?._el) return;
        this._active._el.classList.add('anim-paused');
    }

    resumeActive() {
        this._activePaused = false;
        this._clearPauseTimer();
        this._ensureActiveElement();
        if (!this._active?._el) return;
        this._active._el.classList.remove('anim-paused');
        this._recoverMovementIfNeeded();
    }

    destroy() {
        this._cancelPreview();
        this._clearPauseTimer();
        this._deactivate();
        if (this._storageListener) {
            StorageAdapter.removeChangeListener(this._storageListener);
            this._storageListener = null;
        }
        if (this._aiStateHandler) {
            window.removeEventListener('ai:stateChange', this._aiStateHandler);
            this._aiStateHandler = null;
        }
        if (this._healthTimer) {
            clearInterval(this._healthTimer);
            this._healthTimer = null;
        }
        if (this._visibilityHandler) {
            document.removeEventListener('visibilitychange', this._visibilityHandler);
            this._visibilityHandler = null;
        }
        this._initialized = false;
        this._isPositioned = false;
        this._lastReferenceRect = null;
    }

    _activate(id) {
        const anim = this._animations.get(id);
        if (!anim) return;
        const data = this.getPetData(id);
        if (anim.growAt) {
            let correct = 1;
            for (let i = 0; i < anim.growAt.length; i++) {
                if (data.messages >= anim.growAt[i]) correct = i + 2;
            }
            data.count = Math.min(correct, anim.maxCount);
        }
        this._active = anim;
        this._activeCount = data.count || 1;
        this._ensureActiveElement();
        const aiMon = window.AIStateMonitor?.getInstance();
        if (!aiMon?.isGenerating) {
            this.pauseActive();
        } else {
            this.resumeActive();
        }
    }

    _deactivate() {
        if (this._active) {
            this._active.destroy();
            this._active = null;
        }
    }

    _startAIStateListener() {
        if (this._aiStateHandler) return;
        this._aiStateHandler = (e) => {
            if (e.detail.generating) {
                this._cancelPreview();
                this.resumeActive();
                this._onMessage();
            } else {
                this._schedulePause();
            }
        };
        window.addEventListener('ai:stateChange', this._aiStateHandler);
    }

    _startStorageListener() {
        if (this._storageListener) return;
        this._storageListener = (changes, areaName) => {
            if (areaName !== 'local' || !changes[this._storageKey]) return;
            const newId = changes[this._storageKey].newValue;
            if (newId !== this.getActiveId()) {
                this._deactivate();
                if (newId && this._animations.has(newId)) {
                    this._activate(newId);
                }
            }
        };
        StorageAdapter.addChangeListener(this._storageListener);
    }

    _clearPauseTimer() {
        if (this._pauseTimer) {
            clearTimeout(this._pauseTimer);
            this._pauseTimer = null;
        }
    }

    _schedulePause() {
        this._clearPauseTimer();
        const duration = this._active?.marchDuration || 45;
        this._pauseTimer = setTimeout(() => {
            this._pauseTimer = null;
            const aiMon = window.AIStateMonitor?.getInstance?.();
            if (!aiMon?.isGenerating) {
                this.pauseActive();
            }
        }, duration * 1000);
    }

    _startRecoveryHooks() {
        if (!this._healthTimer) {
            this._healthTimer = setInterval(() => this._healthCheck(), 2000);
        }
        if (!this._visibilityHandler) {
            this._visibilityHandler = () => {
                if (document.visibilityState === 'visible') {
                    this._healthCheck();
                }
            };
            document.addEventListener('visibilitychange', this._visibilityHandler);
        }
    }

    _healthCheck() {
        if (!this._active) return;
        this._ensureActiveElement();
        if (this._isPositioned && this._lastReferenceRect) {
            this._active.updatePosition(this._lastReferenceRect);
        }
        const aiMon = window.AIStateMonitor?.getInstance?.();
        if (aiMon?.isGenerating && !this._activePaused) {
            this.resumeActive();
        } else if (this._activePaused && this._active?._el) {
            this._active._el.classList.add('anim-paused');
        }
    }

    _ensureActiveElement() {
        if (!this._active || !document.body) return false;
        const connected = this._active._el && document.documentElement.contains(this._active._el);
        if (!connected) {
            this._active._el = null;
            this._active.create(this._activeCount);
            this._bindActiveEvents();
            if (this._activePaused) {
                this._active._el?.classList.add('anim-paused');
            } else {
                this._active._el?.classList.remove('anim-paused');
            }
        }
        if (this._isPositioned && this._lastReferenceRect && this._active._el) {
            this._active.updatePosition(this._lastReferenceRect);
        }
        return !!this._active._el;
    }

    _bindActiveEvents() {
        if (!this._active?._el || this._active._el._aitPetEventsBound) return;
        const clickTarget = this._active._el.querySelector('[class$="-group"], [class$="-runner"]') || this._active._el;
        clickTarget.addEventListener('click', () => {
            if (window.panelModal) window.panelModal.show('animation');
        });
        clickTarget.addEventListener('mouseenter', () => {
            if (window.globalTooltipManager) {
                const msg = (typeof chrome !== 'undefined' && chrome.i18n && chrome.i18n.getMessage)
                    ? (chrome.i18n.getMessage('animViewMore') || '更换宠物')
                    : '更换宠物';
                window.globalTooltipManager.show('anim-hint', 'button', clickTarget,
                    msg,
                    { style: 'mini', placement: 'top' }
                );
            }
        });
        clickTarget.addEventListener('mouseleave', () => {
            if (window.globalTooltipManager) {
                window.globalTooltipManager.hide();
            }
        });
        this._active._el._aitPetEventsBound = true;
    }

    _recoverMovementIfNeeded() {
        const movementEl = this._active?._el?.querySelector('[class$="-group"], [class$="-runner"]');
        if (!movementEl) return;
        if (movementEl.matches?.(':hover')) return;
        const style = window.getComputedStyle?.(movementEl);
        if (!style || style.animationName === 'none' || style.animationPlayState === 'running') return;
        movementEl.style.animation = 'none';
        movementEl.offsetHeight;
        movementEl.style.animation = '';
    }
}

if (typeof window.inputBoxAnimationManager === 'undefined') {
    window.inputBoxAnimationManager = new InputBoxAnimationManager();
    if (typeof SnailAnimation !== 'undefined') {
        window.inputBoxAnimationManager.register(new SnailAnimation());
    }
    if (typeof ZombieAnimation !== 'undefined') {
        window.inputBoxAnimationManager.register(new ZombieAnimation());
    }
    if (typeof AntAnimation !== 'undefined') {
        window.inputBoxAnimationManager.register(new AntAnimation());
    }
    if (typeof WizardAnimation !== 'undefined') {
        window.inputBoxAnimationManager.register(new WizardAnimation());
    }
    if (typeof CatAnimation !== 'undefined') {
        window.inputBoxAnimationManager.register(new CatAnimation());
    }
    if (typeof DogAnimation !== 'undefined') {
        window.inputBoxAnimationManager.register(new DogAnimation());
    }
    if (typeof RedPandaAnimation !== 'undefined') {
        window.inputBoxAnimationManager.register(new RedPandaAnimation());
    }
}
