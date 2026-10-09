const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(ROOT, relative), 'utf8');
const manifest = JSON.parse(read('manifest.json'));
const packageJson = JSON.parse(read('package.json'));
const coreScripts = manifest.content_scripts.flatMap(item => item.js || []);
const coreStyles = manifest.content_scripts.flatMap(item => item.css || []);

test('release version and user-facing notes stay synchronized', () => {
    assert.equal(manifest.version, '4.0.0');
    assert.equal(packageJson.version, manifest.version);
    assert.match(read('README.md'), /### v4\.0\.0/);
    assert.match(read('README.en.md'), /### v4\.0\.0/);
    assert.doesNotMatch(read('README.md'), /### v3\.8\.0/);
    assert.doesNotMatch(read('README.en.md'), /### v3\.8\.0/);
    assert.match(read('js/global/changelog-modal/changelog.js'), /id: '2026100901'/);
});

test('timeline wrapper reserves a responsive viewport bottom safe area', () => {
    const timelineStyles = read('js/timeline/timeline.css');
    assert.match(timelineStyles, /--ait-timeline-bottom-safe-area: clamp\(20px, 3vh, 32px\)/);
    assert.match(timelineStyles, /bottom: max\(var\(--ait-timeline-bottom-safe-area\), env\(safe-area-inset-bottom, 0px\)\)/);
    assert.match(timelineStyles, /min-height: 96px/);
    assert.match(timelineStyles, /flex: 1 1 auto/);
    assert.match(timelineStyles, /gap: clamp\(6px, 1\.4vh, 10px\)/);
});

test('heavy optional features are absent from the default content script', () => {
    assert.equal(coreScripts.some(file => file.startsWith('js/runner/')), false);
    assert.equal(coreScripts.some(file => file.startsWith('js/formula/')), false);
    assert.equal(coreScripts.some(file => file.startsWith('js/mermaid/')), false);
    assert.equal(coreScripts.some(file => file.startsWith('js/quickAsk/')), false);
    assert.equal(coreScripts.some(file => file.startsWith('js/scrollToBottom/')), false);
    assert.equal(coreScripts.some(file => file.startsWith('js/smartInputBox/animations/')), false);
    assert.equal(coreStyles.some(file =>
        file.startsWith('js/runner/') ||
        file === 'js/formula/formula.css' ||
        file.startsWith('js/mermaid/')
    ), false);
    assert.ok(coreScripts.includes('js/global/optional-feature-loader.js'));
    assert.equal(coreScripts[coreScripts.length - 1], 'js/global/optional-feature-loader.js');
    for (const coreFile of [
        'js/timeline/index.js',
        'js/smartInputBox/index.js',
        'js/sidebarStarred/index.js',
        'js/conversationExport/export-panel.js',
        'js/highlight/index.js'
    ]) {
        assert.ok(coreScripts.includes(coreFile), `Missing core feature: ${coreFile}`);
    }

    const background = read('js/background.js');
    assert.match(background, /LOAD_OPTIONAL_FEATURE/);
    assert.match(background, /js\/runner\/index\.js/);
    assert.match(background, /js\/formula\/index\.js/);
    assert.doesNotMatch(background, /FETCH_IMAGE/);
    const optionalFiles = Array.from(
        background.matchAll(/'(js\/(?:runner|formula|mermaid|quickAsk|scrollToBottom|smartInputBox\/animations)\/[^']+\.(?:js|css))'/g),
        match => match[1]
    );
    assert.ok(optionalFiles.length > 0);
    for (const file of optionalFiles) {
        assert.equal(fs.existsSync(path.join(ROOT, file)), true, `Missing optional file: ${file}`);
    }
});

test('advanced features are opt-in and animation choices are limited to four', () => {
    const runner = read('js/runner/index.js');
    for (const key of ['runnerJsEnabled', 'runnerTypeScriptEnabled', 'runnerSQLEnabled', 'runnerHtmlEnabled', 'runnerJsonEnabled', 'runnerMarkdownEnabled']) {
        assert.match(runner, new RegExp(`result\\.${key} === true`));
    }
    assert.match(read('js/formula/formula-manager.js'), /formulaLatexEnabled === true/);

    const animationScripts = Array.from(
        read('js/background.js').matchAll(/'(js\/smartInputBox\/animations\/[^/]+\/index\.js)'/g),
        match => match[1]
    );
    assert.deepEqual(animationScripts.sort(), [
        'js/smartInputBox/animations/ant/index.js',
        'js/smartInputBox/animations/snail/index.js',
        'js/smartInputBox/animations/wizard/index.js',
        'js/smartInputBox/animations/zombie/index.js'
    ]);
    assert.doesNotMatch(read('js/smartInputBox/animations/index.js'), /new (Cat|Dog|RedPanda)Animation/);
    assert.match(read('js/timeline/timeline-manager.js'), /this\.aiCompleteToastEnabled = false/);
    assert.match(read('js/timeline/timeline-manager.js'), /this\.conversationExportEnabled = true/);
    assert.match(read('js/quickAsk/index.js'), /result\.quickAskEnabled === true/);
    assert.match(read('js/scrollToBottom/scroll-to-bottom-manager.js'), /result\.scrollToBottomEnabled === true/);
    assert.match(read('js/timeline/index.js'), /settings\[platform\.id\] !== false/);
    assert.match(read('js/sidebarStarred/index.js'), /settings\[platform\.id\] !== false/);
    assert.match(read('js/panelModal/tabs/highlight/index.js'), /result\.highlightEnabled !== false/);
});

test('timeline route teardown releases delegated feature handlers', () => {
    const timelineManager = read('js/timeline/timeline-manager.js');
    assert.match(timelineManager, /this\._eventDelegateUnsubs = \[\]/);
    for (const selector of [
        '.ait-question-list-btn',
        '.timeline-starred-btn',
        '.timeline-settings-btn',
        '.ait-conversation-export-btn',
        '.ait-notepad-btn'
    ]) {
        assert.equal(
            timelineManager.includes(`this._eventDelegateUnsubs.push(window.eventDelegateManager.on('click', '${selector}'`),
            true,
            `Missing delegated handler cleanup: ${selector}`
        );
    }
    assert.match(timelineManager, /this\._eventDelegateUnsubs\.splice\(0\)/);

    const listeners = [];
    const delegateContext = {
        window: {},
        document: {
            addEventListener: (type, listener) => listeners.push({ type, listener }),
            removeEventListener: (type, listener) => {
                const index = listeners.findIndex(item => item.type === type && item.listener === listener);
                if (index >= 0) listeners.splice(index, 1);
            }
        },
        console
    };
    vm.createContext(delegateContext);
    vm.runInContext(read('js/global/event-delegate-manager/index.js'), delegateContext);
    const firstUnsubscribe = delegateContext.window.eventDelegateManager.on('click', '.fixture', () => {});
    const unsubscribe = delegateContext.window.eventDelegateManager.on('click', '.fixture', () => {});
    assert.equal(listeners.length, 1);
    firstUnsubscribe();
    assert.equal(listeners.length, 1);
    unsubscribe();
    assert.equal(listeners.length, 0);
});

test('digital pet stays idle when no animation was selected', async () => {
    let intervalCount = 0;
    const animationWindow = { addEventListener: () => {}, removeEventListener: () => {} };
    const animationContext = {
        window: animationWindow,
        document: {
            body: {},
            documentElement: { contains: () => false },
            addEventListener: () => {},
            removeEventListener: () => {},
            visibilityState: 'visible'
        },
        StorageAdapter: {
            get: async () => undefined,
            set: async () => {},
            addChangeListener: () => {},
            removeChangeListener: () => {}
        },
        setInterval: () => { intervalCount += 1; return 1; },
        clearInterval: () => {},
        setTimeout,
        clearTimeout
    };
    vm.createContext(animationContext);
    vm.runInContext(read('js/smartInputBox/animations/index.js'), animationContext);
    await animationWindow.inputBoxAnimationManager.init();
    assert.equal(animationWindow.inputBoxAnimationManager.getActiveId(), null);
    assert.equal(intervalCount, 0);
});

test('rendering and sandbox boundaries reject known dangerous paths', () => {
    const markdown = read('js/runner/languages/markdown/index.js');
    assert.match(markdown, /script, style, iframe, object, embed, link, meta, base, form/);
    assert.match(markdown, /javascript:/);
    assert.match(markdown, /name\.startsWith\('on'\)/);
    assert.match(read('js/runner/languages/mermaid/index.js'), /securityLevel: 'strict'/);
    assert.doesNotMatch(read('js/runner/index.js'), /allow-same-origin/);
    assert.doesNotMatch(read('js/runner/components/runner-panel.js'), /allow-same-origin/);

    for (const language of ['javascript', 'typescript', 'sql']) {
        const manager = read(`js/runner/languages/${language}/sandbox-manager.js`);
        assert.match(manager, /event\.source !== this\.currentSandbox\?\.contentWindow/);
        assert.match(manager, /event\.data\.token !== this\.messageToken/);
        assert.match(manager, /_isValidPayload/);
        assert.match(manager, /removeEventListener\('message'/);
        assert.match(manager, /setAttribute\('sandbox', 'allow-scripts'\)/);
        const sandboxScript = read(`js/runner/languages/${language}/sandbox-script.js`);
        assert.match(sandboxScript, /event\.source !== window\.parent/);
        assert.match(sandboxScript, /event\.data\.token !== messageToken/);
        assert.match(sandboxScript, /code\.length <= 1000000/);
    }
});

test('runner sandbox ignores forged sources, tokens, and payloads', async () => {
    let messageHandler = null;
    const posted = [];
    const trustedSource = { postMessage: message => posted.push(message) };
    const iframe = {
        style: {},
        contentWindow: trustedSource,
        setAttribute: () => {},
        remove: () => {},
        src: ''
    };
    const sandboxWindow = {
        addEventListener: (type, handler) => { if (type === 'message') messageHandler = handler; },
        removeEventListener: () => {}
    };
    const sandboxContext = {
        window: sandboxWindow,
        document: { createElement: () => iframe, body: { appendChild: () => {} } },
        chrome: { runtime: { getURL: value => `chrome-extension://fixture/${value}` } },
        crypto: { randomUUID: () => 'fixture-token' },
        setTimeout,
        clearTimeout
    };
    vm.createContext(sandboxContext);
    vm.runInContext(read('js/runner/languages/javascript/sandbox-manager.js'), sandboxContext);
    const manager = new sandboxWindow.JSSandboxManager();
    let outputs = 0;
    const execution = manager.execute('console.log(1)', () => { outputs += 1; }, 1000);

    messageHandler({ source: {}, data: { type: 'SANDBOX_OUTPUT', token: 'fixture-token', data: { level: 'log', data: ['forged'] } } });
    messageHandler({ source: trustedSource, data: { type: 'SANDBOX_OUTPUT', token: 'wrong', data: { level: 'log', data: ['forged'] } } });
    messageHandler({ source: trustedSource, data: { type: 'SANDBOX_OUTPUT', token: 'fixture-token', data: { level: 'log', data: 'not-an-array' } } });
    assert.equal(outputs, 0);

    messageHandler({ source: trustedSource, data: { type: 'SANDBOX_READY', token: 'fixture-token', data: { ready: true } } });
    assert.equal(posted[0].token, 'fixture-token');
    messageHandler({ source: trustedSource, data: { type: 'SANDBOX_OUTPUT', token: 'fixture-token', data: { level: 'log', data: ['trusted'] } } });
    assert.equal(outputs, 1);
    messageHandler({ source: trustedSource, data: { type: 'SANDBOX_COMPLETE', token: 'fixture-token', data: { success: true } } });
    await execution;
});

test('manifest permissions and platform matches stay bounded', () => {
    assert.ok(manifest.permissions.includes('scripting'));
    assert.equal(manifest.permissions.includes('identity'), false);
    assert.ok(manifest.optional_permissions.includes('identity'));
    assert.equal(manifest.host_permissions.includes('https://www.googleapis.com/*'), false);
    assert.ok(manifest.optional_host_permissions.includes('https://www.googleapis.com/*'));
    assert.equal(manifest.content_scripts.some(item => item.matches.includes('<all_urls>')), false);
    assert.equal(manifest.web_accessible_resources.some(item => item.matches.includes('<all_urls>')), false);
    assert.ok(manifest.host_permissions.includes('https://wenxin.baidu.com/*'));
    const yiyanMatches = manifest.content_scripts.filter(item => item.matches.includes('https://yiyan.baidu.com/*'));
    assert.ok(yiyanMatches.length > 0);
    for (const item of yiyanMatches) {
        assert.ok(item.matches.includes('https://wenxin.baidu.com/*'));
    }
    assert.match(read('js/background.js'), /'wenxin\.baidu\.com'/);
});

test('Firefox build keeps identity required but Google API host optional', () => {
    const buildScript = read('scripts/build-firefox.js');
    assert.match(buildScript, /filter\(permission => permission !== 'identity'\)/);
    assert.match(buildScript, /manifest\.permissions = Array\.from\(new Set/);
    assert.match(read('js/background.js'), /IS_FIREFOX\s*\? \{ origins:/);
});

test('platform-specific tabs expose capability guards', () => {
    for (const file of [
        'js/panelModal/tabs/timeline/index.js',
        'js/panelModal/tabs/starred/index.js',
        'js/panelModal/tabs/smartInputBox/index.js',
        'js/panelModal/tabs/conversationExport/index.js',
        'js/panelModal/tabs/animation/index.js'
    ]) {
        assert.match(read(file), /shouldShow\s*\(\)/, `Missing capability guard: ${file}`);
    }
});

test('settings navigation separates core, advanced, experimental, and backup areas', () => {
    const registry = read('js/panelModal/tab-registry.js');
    for (const group of ['core', 'advanced', 'experimental', 'backup']) {
        assert.match(registry, new RegExp(`group: '${group}'`));
    }
    assert.match(read('js/panelModal/index.js'), /panel-tab-group-title/);
});

test('optional loader injects advanced CSS and scripts only on request', async () => {
    const scriptingCalls = [];
    let messageListener = null;
    const chrome = {
        storage: { local: { get: async () => ({}), set: async () => {} } },
        identity: { getRedirectURL: () => 'https://example.test/callback' },
        permissions: {
            contains: async () => false,
            request: async () => true
        },
        action: { onClicked: { addListener: () => {} } },
        tabs: { sendMessage: async () => {}, create: () => {} },
        runtime: {
            getURL: value => value,
            onMessage: { addListener: listener => { messageListener = listener; } }
        },
        scripting: {
            insertCSS: async request => { scriptingCalls.push(['css', request]); },
            executeScript: async request => {
                scriptingCalls.push(['js', request]);
                return request.func ? [{ result: scriptingCalls.length === 1 ? false : undefined }] : [];
            }
        }
    };
    const backgroundContext = { chrome, URL, fetch: async () => ({ ok: true, json: async () => ({}) }) };
    vm.createContext(backgroundContext);
    vm.runInContext(read('js/background.js'), backgroundContext);
    assert.equal(typeof messageListener, 'function');

    const response = await new Promise(resolve => {
        const keepChannelOpen = messageListener(
            { type: 'LOAD_OPTIONAL_FEATURE', feature: 'runner' },
            { tab: { id: 7 }, frameId: 0 },
            resolve
        );
        assert.equal(keepChannelOpen, true);
    });

    assert.equal(response.success, true);
    assert.ok(scriptingCalls.some(([kind, request]) => kind === 'css' && request.files.includes('js/runner/styles.css')));
    assert.ok(scriptingCalls.some(([kind, request]) => kind === 'js' && request.files?.includes('js/runner/index.js')));

    const permissionResponse = await new Promise(resolve => {
        const keepChannelOpen = messageListener(
            { type: 'REQUEST_GDRIVE_PERMISSIONS' },
            { tab: { id: 7 }, frameId: 0 },
            resolve
        );
        assert.equal(keepChannelOpen, true);
    });
    assert.equal(permissionResponse.success, true);

    chrome.permissions.request = async () => false;
    const deniedResponse = await new Promise(resolve => {
        messageListener(
            { type: 'REQUEST_GDRIVE_PERMISSIONS' },
            { tab: { id: 7 }, frameId: 0 },
            resolve
        );
    });
    assert.equal(deniedResponse.success, false);
    assert.match(deniedResponse.error, /declined/);

    const cloudWithoutPermission = await new Promise(resolve => {
        messageListener(
            { type: 'GDRIVE_DOWNLOAD' },
            { tab: { id: 7 }, frameId: 0 },
            resolve
        );
    });
    assert.equal(cloudWithoutPermission.success, false);
    assert.match(cloudWithoutPermission.error, /permission has not been granted/);
});

test('optional loader stays idle by default and reacts only to opt-in settings', async () => {
    const messages = [];
    let changeListener = null;
    const loaderContext = {
        console,
        window: { inputBoxAnimationManager: { init: async () => {} } },
        chrome: {
            storage: {
                local: { get: async () => ({}) },
                onChanged: { addListener: listener => { changeListener = listener; } }
            },
            runtime: {
                sendMessage: async message => {
                    messages.push(message);
                    return { success: true };
                }
            }
        }
    };
    vm.createContext(loaderContext);
    vm.runInContext(read('js/global/optional-feature-loader.js'), loaderContext);
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(messages, []);

    changeListener({ quickAskEnabled: { newValue: true } }, 'local');
    changeListener({ activeAnimation: { newValue: 'snail' } }, 'local');
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(messages.map(message => message.feature).sort(), ['animation', 'quickAsk']);
});

test('local JSON backup does not request cloud permissions', () => {
    const source = read('js/panelModal/tabs/dataSync/index.js');
    const localExportBody = source.match(/async handleExport\(\) \{([\s\S]*?)\n    \}\n\s*\/\*\*\n     \* 导入数据/)?.[1] || '';
    assert.ok(localExportBody.length > 0);
    assert.doesNotMatch(localExportBody, /requestGDrivePermissions/);
    assert.match(source, /async requestGDrivePermissions\(\)/);
    assert.match(source, /REQUEST_GDRIVE_PERMISSIONS/);
});
