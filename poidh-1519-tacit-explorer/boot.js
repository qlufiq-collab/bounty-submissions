/* boot.js — runs first. Marks the document as script-enabled (so reveal animations only apply when JS runs),
 * records reduced-motion preference, and keeps a tiny diagnostics log (CSP violations, script errors). */
(function () {
  'use strict';
  var root = document.documentElement;
  root.classList.add('js');
  var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  window.__rm = !!(mq && mq.matches);
  if (mq && mq.addEventListener) mq.addEventListener('change', function (e) { window.__rm = e.matches; root.classList.toggle('rm', e.matches); });
  if (window.__rm) root.classList.add('rm');
  window.__diag = { csp: [], errors: [] };
  document.addEventListener('securitypolicyviolation', function (e) {
    window.__diag.csp.push(e.violatedDirective + ' ' + (e.blockedURI || '') + ' ' + (e.sourceFile || '') + ':' + (e.lineNumber || ''));
  });
  window.addEventListener('error', function (e) { window.__diag.errors.push(String(e.message) + ' @' + (e.filename || '') + ':' + (e.lineno || '')); });
  window.addEventListener('unhandledrejection', function (e) { window.__diag.errors.push('unhandled: ' + String(e.reason && e.reason.message || e.reason)); });
})();
