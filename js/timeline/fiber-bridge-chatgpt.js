// MAIN world script — can access React Fiber internals (__reactFiber$xxx).
// Content scripts (ISOLATED world) cannot read expando properties due to world isolation.
//
// Communication: content script dispatches 'timeline-extract-fiber' →
// this script reads Fiber data for virtualized user-turn elements →
// dispatches 'timeline-fiber-result' back with { [messageId]: text }.
// DOM events are synchronous, so the round-trip completes within one tick.
document.addEventListener('timeline-extract-fiber', () => {
  try {
    const result = {};

    // 新版 UI（2025-10 起）：用户单元 = [data-chatgpt-search-unit-key$=":user"]，
    // 稳定 ID 在 data-chatgpt-search-message-ids（多个时空格分隔，取第一个）。
    // Fiber 数据形状：memoizedProps.entry.turn.items[] 中 type === 'user-message' 的 message 字段。
    document.querySelectorAll('[data-chatgpt-search-unit-key$=":user"]').forEach(el => {
      if (el.childElementCount > 0) return;
      const ids = el.getAttribute('data-chatgpt-search-message-ids');
      const turnId = ids ? ids.trim().split(/\s+/)[0] : null;
      if (!turnId) return;
      try {
        const fk = Object.keys(el).find(k => k.startsWith('__reactFiber'));
        if (!fk) return;
        let fiber = el[fk];
        for (let i = 0; i < 25 && fiber; i++) {
          const items = fiber.memoizedProps?.entry?.turn?.items;
          if (Array.isArray(items)) {
            const um = items.find(it => it?.type === 'user-message' && typeof it.message === 'string');
            if (um?.message) result[turnId] = um.message;
            break;
          }
          fiber = fiber.return;
        }
      } catch {}
    });

    // 旧版 UI 回退：data-turn-id + turn.messages[0].content.parts（灰度期间两套并存）
    document.querySelectorAll('[data-turn="user"][data-turn-id]').forEach(el => {
      if (el.childElementCount > 0) return;
      const turnId = el.getAttribute('data-turn-id');
      if (!turnId || result[turnId]) return;
      try {
        const fk = Object.keys(el).find(k => k.startsWith('__reactFiber'));
        if (!fk) return;
        let fiber = el[fk];
        for (let i = 0; i < 20 && fiber; i++) {
          const parts =
            fiber.memoizedProps?.turn?.messages?.[0]?.content?.parts ??
            fiber.memoizedProps?.message?.content?.parts;
          if (Array.isArray(parts)) {
            const txt = parts.filter(p => typeof p === 'string').join(' ');
            if (txt) result[turnId] = txt;
            break;
          }
          fiber = fiber.return;
        }
      } catch {}
    });

    document.dispatchEvent(new CustomEvent('timeline-fiber-result', { detail: result }));
  } catch {
    document.dispatchEvent(new CustomEvent('timeline-fiber-result', { detail: {} }));
  }
});
