// MAIN world script — can access React Fiber internals (__reactFiber$xxx).
// Content scripts (ISOLATED world) cannot read expando properties due to world isolation.
//
// Communication: content script dispatches 'timeline-extract-fiber' →
// this script reads Fiber data for virtualized user-turn elements →
// dispatches 'timeline-fiber-result' back with { [turnId]: text }.
// DOM events are synchronous, so the round-trip completes within one tick.
document.addEventListener('timeline-extract-fiber', () => {
  try {
    const result = {};
    document.querySelectorAll('[data-turn="user"][data-turn-id]').forEach(el => {
      if (el.childElementCount > 0) return;
      const turnId = el.getAttribute('data-turn-id');
      if (!turnId) return;
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
