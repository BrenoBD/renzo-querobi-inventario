/* =========================================================================
   RENZO E QUEROBI — Inventário · interações da página (sem o form: é o FateZap)
   ========================================================================= */
(function () {
  'use strict';
  function ready(fn) { if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }

  function initYear() { var y = document.getElementById('yr'); if (y) y.textContent = new Date().getFullYear(); }

  function initFaq() {
    var items = document.querySelectorAll('.faq__item');
    items.forEach(function (item) {
      var q = item.querySelector('.faq__q');
      var wrap = item.querySelector('.faq__wrap');
      q.addEventListener('click', function () {
        var open = item.classList.contains('on');
        items.forEach(function (o) { o.classList.remove('on'); o.querySelector('.faq__wrap').style.maxHeight = null; });
        if (!open) { item.classList.add('on'); wrap.style.maxHeight = wrap.scrollHeight + 'px'; }
      });
    });
  }

  ready(function () { initYear(); initFaq(); });
})();
