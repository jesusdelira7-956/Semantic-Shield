/**
 * Semantic Shield - Visual Element Picker & Semantic Rule Builder
 */

(function () {
  'use strict';

  let active = false;
  let hoveredEl = null;
  let overlayBox = null;
  let tooltip = null;

  function createOverlay() {
    if (overlayBox) return;

    overlayBox = document.createElement('div');
    overlayBox.id = 'ag-picker-overlay-box';
    overlayBox.style.cssText = `
      position: absolute;
      pointer-events: none;
      border: 2px solid #00e5ff;
      background: rgba(0, 229, 255, 0.15);
      border-radius: 4px;
      z-index: 2147483646;
      transition: all 0.05s ease;
      display: none;
    `;
    document.documentElement.appendChild(overlayBox);

    tooltip = document.createElement('div');
    tooltip.id = 'ag-picker-tooltip';
    tooltip.style.cssText = `
      position: absolute;
      background: #0f172a;
      border: 1px solid #00e5ff;
      color: #f8fafc;
      padding: 6px 10px;
      font-size: 11px;
      font-family: monospace;
      border-radius: 4px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
      z-index: 2147483647;
      pointer-events: none;
      display: none;
      max-width: 320px;
      word-break: break-all;
    `;
    document.documentElement.appendChild(tooltip);
  }

  function onMouseMove(e) {
    if (!active) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el === overlayBox || el === tooltip || el === document.body || el === document.documentElement) {
      return;
    }

    hoveredEl = el;
    const rect = el.getBoundingClientRect();
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;

    overlayBox.style.display = 'block';
    overlayBox.style.top = `${rect.top + scrollY}px`;
    overlayBox.style.left = `${rect.left + scrollX}px`;
    overlayBox.style.width = `${rect.width}px`;
    overlayBox.style.height = `${rect.height}px`;

    tooltip.style.display = 'block';
    tooltip.style.top = `${rect.top + scrollY - 28 < 0 ? rect.bottom + scrollY + 8 : rect.top + scrollY - 28}px`;
    tooltip.style.left = `${Math.max(10, rect.left + scrollX)}px`;
    tooltip.textContent = `<${el.tagName.toLowerCase()}> ${el.id ? '#' + el.id : ''} ${el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : ''} (Click to Heal & Block)`;
  }

  function onClick(e) {
    if (!active || !hoveredEl) return;
    e.preventDefault();
    e.stopPropagation();

    // Generate 3-point semantic signature
    const signature = window.SemanticHeuristics ? window.SemanticHeuristics.generateSignature(hoveredEl) : null;

    if (signature) {
      // Hide element immediately
      hoveredEl.style.display = 'none';

      // Save to extension storage
      chrome.runtime.sendMessage({
        action: 'saveSemanticRule',
        rule: signature,
      }, (res) => {
        showToast(`Rule Saved! Created resilient semantic rule (${signature.tagName}).`);
      });
    }

    stopPicker();
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      stopPicker();
      showToast('Element picker cancelled.');
    }
  }

  function showToast(msg) {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #0f172a;
      border: 1px solid #10b981;
      color: #10b981;
      padding: 10px 16px;
      font-size: 13px;
      border-radius: 6px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.6);
      z-index: 2147483647;
      font-family: system-ui, sans-serif;
    `;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
  }

  function startPicker() {
    createOverlay();
    active = true;
    document.addEventListener('mousemove', onMouseMove, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKeyDown, true);
    document.body.style.cursor = 'crosshair';
  }

  function stopPicker() {
    active = false;
    document.removeEventListener('mousemove', onMouseMove, true);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('keydown', onKeyDown, true);
    document.body.style.cursor = 'default';
    if (overlayBox) overlayBox.style.display = 'none';
    if (tooltip) tooltip.style.display = 'none';
  }

  window.SemanticShieldElementPicker = {
    start: startPicker,
    stop: stopPicker,
  };
})();
