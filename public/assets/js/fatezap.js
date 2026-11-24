/* =========================================================================
   FateZap — modal de captação de lead → webhook → WhatsApp
   White-label, autocontido (injeta o próprio CSS e HTML). Sem dependências.
   Desenvolvido por FATE Marketing.

   USO MÍNIMO:
     <script src="/fatezap/fatezap.js" defer></script>
     <script>
       FateZap.init({
         whatsapp: '5562994542199',
         webhook:  'https://n8n.fatemarketing.com.br/webhook/novo-lead'
       });
     </script>
   Qualquer elemento com [data-fatezap] (ou [data-open-wa]) abre o modal.
   Veja o README.md para todas as opções.
   ========================================================================= */
(function (global) {
  'use strict';

  var VERSION = '1.1.0';
  var STYLE_ID = 'fatezap-style';
  var ROOT_ID = 'fatezap';

  // ------------------------- Defaults -------------------------
  var DEFAULTS = {
    whatsapp: '',                 // obrigatório — número destino, só dígitos com DDI (ex.: 5562994542199)
    webhook: 'https://n8n.fatemarketing.com.br/webhook/renzo-e-querobi-fp',                  // opcional — URL do webhook (n8n). Se vazio, pula o envio e vai direto ao WhatsApp.

    brand: 'Atendimento',         // nome exibido no cabeçalho
    logo: '',                     // opcional — URL de uma imagem redonda no topo (senão usa ícone do WhatsApp)
    title: 'Solicite seu atendimento',
    subtitle: 'Preencha os dados abaixo e a nossa equipe vai te atender em instantes pelo WhatsApp.',
    tagText: '',                  // selo acima do título (ex.: 'Atendimento 24 horas'); vazio = escondido
    submitText: 'Chamar no WhatsApp',

    // tema (todas opcionais)
    theme: {
      headerFrom: '#0e1626',      // gradiente do cabeçalho (início)
      headerTo: '#13244a',        // gradiente do cabeçalho (fim)
      accent: '#ffc21a',          // cor do selo/destaque
      button: '#25d366',          // cor do botão (default = verde WhatsApp)
      buttonHover: '#1ebe55',
      ring: '#1e7fff',            // cor do anel de foco dos campos
      radius: '20px'              // arredondamento do card
    },

    // campos — nome e telefone são sempre exibidos
    name: { label: 'Nome', placeholder: 'Seu nome completo' },
    phone: { label: 'WhatsApp (com DDD)', placeholder: '(00) 90000-0000' },
    // menu suspenso opcional. Defina `select: null` para não exibir.
    select: {
      key: 'service',             // chave usada no payload do webhook
      label: 'Serviço desejado',
      placeholder: 'Selecione uma opção',
      options: []                 // ex.: ['Opção 1', 'Opção 2', 'Outros']; vazio = select escondido
    },

    // perguntas qualificadoras opcionais (segmentos Sim/Não/…). Vão no payload em "qualificacao"
    // e são anexadas à mensagem do WhatsApp. Ex.:
    // [{ key: 'Há imóvel', label: 'Há imóvel a partilhar?', options: ['Sim','Não','Não sei'], required: false }]
    questions: [],
    questionsLegend: 'Para adiantar (opcional):', // título do bloco de perguntas; vazio = sem título

    // campos estáticos extras mesclados no payload. Ex.: { service: 'Inventário' }
    extra: {},

    // mensagem enviada ao WhatsApp. Tokens: {name} {phone} e a chave do select (ex.: {service}).
    // As respostas das perguntas são anexadas automaticamente em linhas abaixo.
    waMessage: 'Olá! Me chamo {name} e gostaria de mais informações.',

    origem: 'Site',               // vai no payload (identifica a origem do lead)
    trigger: '[data-fatezap],[data-open-wa]', // seletor dos botões que abrem o modal
    privacy: 'Seus dados são usados apenas para este atendimento.', // vazio = escondido
    watermark: true,              // rodapé "Desenvolvido por FATE Marketing"

    onSubmit: null                // callback opcional: function(payload){}
  };

  // ------------------------- Ícones -------------------------
  var ICON_WA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.5 14.4c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.9-.8-1.5-1.77-1.67-2.07-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.5s1.07 2.9 1.22 3.1c.15.2 2.1 3.2 5.08 4.48 3.02 1.3 3.02.87 3.57.82.55-.05 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35zM12 2a10 10 0 0 0-8.5 15.3L2 22l4.8-1.26A10 10 0 1 0 12 2z"/></svg>';
  var ICON_LOCK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11z"/></svg>';
  var ICON_CHEVRON = '<svg class="fatezap-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10l5 5 5-5z"/></svg>';

  // ------------------------- CSS -------------------------
  function css() {
    return [
      '.fatezap-overlay{position:fixed;inset:0;z-index:12000;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(10,16,30,.62);-webkit-backdrop-filter:blur(5px);backdrop-filter:blur(5px);opacity:0;visibility:hidden;transition:opacity .25s ease,visibility .25s ease;font-family:inherit;}',
      '.fatezap-overlay.fz-open{opacity:1;visibility:visible;}',
      '.fatezap-modal{position:relative;width:100%;max-width:430px;max-height:calc(100vh - 40px);overflow-y:auto;background:#fff;border-radius:var(--fz-radius,20px);box-shadow:0 30px 70px rgba(10,16,30,.45);transform:translateY(24px) scale(.97);opacity:0;transition:transform .3s cubic-bezier(.2,.8,.2,1),opacity .3s ease;}',
      '.fatezap-overlay.fz-open .fatezap-modal{transform:translateY(0) scale(1);opacity:1;}',
      '.fatezap-close{position:absolute;top:12px;right:12px;z-index:2;width:34px;height:34px;border:0;border-radius:50%;background:rgba(255,255,255,.18);color:#fff;font-size:1.5rem;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .2s ease;}',
      '.fatezap-close:hover{background:rgba(255,255,255,.34);}',
      '.fatezap-head{background:linear-gradient(135deg,var(--fz-header-from,#0e1626) 0%,var(--fz-header-to,#13244a) 100%);color:#fff;padding:30px 28px 24px;text-align:center;}',
      '.fatezap-avatar{width:60px;height:60px;margin:0 auto 14px;border-radius:50%;overflow:hidden;background:rgba(255,255,255,.12);display:flex;align-items:center;justify-content:center;}',
      '.fatezap-avatar img{width:100%;height:100%;object-fit:cover;}',
      '.fatezap-avatar svg{width:32px;height:32px;fill:#fff;}',
      '.fatezap-tag{display:inline-flex;align-items:center;gap:6px;background:color-mix(in srgb,var(--fz-accent,#ffc21a) 18%,transparent);color:var(--fz-accent,#ffc21a);font-size:.72rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase;padding:6px 12px;border-radius:999px;margin-bottom:12px;}',
      '.fatezap-head h3{margin:0 0 8px;font-size:1.4rem;font-weight:800;line-height:1.2;}',
      '.fatezap-head p{margin:0;font-size:.92rem;color:#c9d4e8;line-height:1.5;}',
      '.fatezap-form{padding:24px 28px 8px;}',
      '.fatezap-field{margin-bottom:15px;text-align:left;}',
      '.fatezap-field label{display:block;font-size:.82rem;font-weight:600;color:#1a1a1a;margin-bottom:6px;}',
      '.fatezap-field input,.fatezap-field select{width:100%;box-sizing:border-box;padding:13px 15px;font-family:inherit;font-size:.98rem;color:#1a1a1a;background:#f5f7fb;border:1.5px solid #e6e6e6;border-radius:11px;transition:border-color .18s ease,box-shadow .18s ease,background .18s ease;}',
      '.fatezap-field input::placeholder{color:#9aa3b2;}',
      '.fatezap-field input:focus,.fatezap-field select:focus{outline:none;border-color:var(--fz-ring,#1e7fff);background:#fff;box-shadow:0 0 0 3px color-mix(in srgb,var(--fz-ring,#1e7fff) 18%,transparent);}',
      '.fatezap-select{position:relative;}',
      '.fatezap-select select{appearance:none;-webkit-appearance:none;-moz-appearance:none;padding-right:42px;cursor:pointer;}',
      '.fatezap-select select:invalid{color:#9aa3b2;}',
      '.fatezap-chevron{position:absolute;right:14px;top:50%;transform:translateY(-50%);width:20px;height:20px;fill:#5a5a5a;pointer-events:none;}',
      '.fatezap-submit{width:100%;margin-top:4px;display:inline-flex;align-items:center;justify-content:center;gap:9px;padding:15px 20px;border:0;border-radius:12px;cursor:pointer;background:var(--fz-btn,#25d366);color:#fff;font-family:inherit;font-size:1.02rem;font-weight:700;box-shadow:0 10px 24px rgba(0,0,0,.18);transition:background .2s ease,transform .15s ease,box-shadow .2s ease;}',
      '.fatezap-submit svg{width:22px;height:22px;fill:#fff;}',
      '.fatezap-submit:hover{background:var(--fz-btn-hover,#1ebe55);transform:translateY(-2px);}',
      '.fatezap-submit:disabled{opacity:.7;cursor:default;transform:none;}',
      '.fatezap-privacy{display:flex;align-items:center;justify-content:center;gap:6px;margin:14px 0 0;font-size:.76rem;color:#5a5a5a;text-align:center;}',
      '.fatezap-privacy svg{width:14px;height:14px;fill:var(--fz-btn,#25d366);flex-shrink:0;}',
      '.fatezap-watermark{padding:14px 20px 18px;text-align:center;font-size:.72rem;color:#9aa3b2;}',
      '.fatezap-watermark a{color:var(--fz-ring,#1e7fff);font-weight:600;text-decoration:none;}',
      '.fatezap-qual{border:0;margin:2px 0 14px;padding:14px 0 0;border-top:1px dashed #e6e6e6;}',
      '.fatezap-qual legend{font-size:.8rem;color:#5a5a5a;padding:0;margin-bottom:10px;}',
      '.fatezap-q{margin-bottom:12px;text-align:left;}',
      '.fatezap-q > span{display:block;font-size:.86rem;font-weight:700;color:#1a1a1a;margin-bottom:7px;}',
      '.fatezap-seg{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:6px;}',
      '.fatezap-seg button{font-family:inherit;font-size:.82rem;font-weight:700;padding:9px 4px;cursor:pointer;background:#f5f7fb;color:#5a5a5a;border:1.5px solid #e6e6e6;border-radius:9px;transition:all .15s ease;}',
      '.fatezap-seg button:hover{border-color:var(--fz-accent,#ffc21a);}',
      '.fatezap-seg button.on{background:var(--fz-header-from,#0e1626);color:#fff;border-color:var(--fz-header-from,#0e1626);}',
      '@media (max-width:420px){.fatezap-head{padding:26px 22px 20px;}.fatezap-head h3{font-size:1.22rem;}.fatezap-form{padding:20px 22px 6px;}}'
    ].join('');
  }

  // ------------------------- Helpers -------------------------
  function deepMerge(base, over) {
    var out = {}, k;
    for (k in base) if (Object.prototype.hasOwnProperty.call(base, k)) out[k] = base[k];
    for (k in over) if (Object.prototype.hasOwnProperty.call(over, k)) {
      if (over[k] && typeof over[k] === 'object' && !Array.isArray(over[k]) && typeof base[k] === 'object' && base[k]) {
        out[k] = deepMerge(base[k], over[k]);
      } else { out[k] = over[k]; }
    }
    return out;
  }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function ready(fn) { if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }

  function isValidName(n) { var t = (n || '').trim(); if (t.length < 2) return false; if (/^[aeiou]+$/i.test(t)) return false; if (/^[^aeiou]+$/i.test(t)) return false; if (/(.)\1{3,}/i.test(t)) return false; return true; }
  function isValidPhone(p) { var d = (p || '').replace(/\D/g, ''); if (d.length < 10 || d.length > 11) return false; if (/^(\d)\1+$/.test(d)) return false; if ('01234567890123456789'.indexOf(d) !== -1) return false; return true; }
  function getUrlParams() { var p = new URLSearchParams(location.search); return { gclid: p.get('gclid') || '', utm_source: p.get('utm_source') || '', utm_medium: p.get('utm_medium') || '', utm_term: p.get('utm_term') || '', utm_content: p.get('utm_content') || '', utm_campaign: p.get('utm_campaign') || '' }; }

  // ------------------------- Núcleo -------------------------
  var cfg = null, overlay = null, bound = false;

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement('style');
    s.id = STYLE_ID; s.textContent = css();
    document.head.appendChild(s);
  }

  function buildMarkup() {
    var hasSelect = cfg.select && cfg.select.options && cfg.select.options.length;
    var avatar = cfg.logo
      ? '<div class="fatezap-avatar"><img src="' + esc(cfg.logo) + '" alt="' + esc(cfg.brand) + '"></div>'
      : '<div class="fatezap-avatar">' + ICON_WA + '</div>';
    var tag = cfg.tagText ? '<span class="fatezap-tag">' + esc(cfg.tagText) + '</span>' : '';
    var selectField = '';
    if (hasSelect) {
      var opts = '<option value="" disabled selected>' + esc(cfg.select.placeholder) + '</option>';
      cfg.select.options.forEach(function (o) {
        var val = (o && o.value != null) ? o.value : o;
        var lab = (o && o.label != null) ? o.label : o;
        opts += '<option value="' + esc(val) + '">' + esc(lab) + '</option>';
      });
      selectField =
        '<div class="fatezap-field"><label for="fatezap-select">' + esc(cfg.select.label) + '</label>' +
        '<div class="fatezap-select"><select id="fatezap-select" required>' + opts + '</select>' + ICON_CHEVRON + '</div></div>';
    }
    var questionsBlock = '';
    if (cfg.questions && cfg.questions.length) {
      var qItems = cfg.questions.map(function (q) {
        var options = (q.options && q.options.length) ? q.options : ['Sim', 'Não', 'Não sei'];
        var btns = options.map(function (o) { return '<button type="button" data-v="' + esc(o) + '">' + esc(o) + '</button>'; }).join('');
        var key = q.key || q.label;
        return '<div class="fatezap-q" data-q="' + esc(key) + '"' + (q.required ? ' data-required="1"' : '') +
          '><span>' + esc(q.label) + '</span><div class="fatezap-seg" role="group" aria-label="' + esc(q.label) + '">' + btns + '</div></div>';
      }).join('');
      var legend = cfg.questionsLegend ? '<legend>' + esc(cfg.questionsLegend) + '</legend>' : '';
      questionsBlock = '<fieldset class="fatezap-qual">' + legend + qItems + '</fieldset>';
    }
    var privacy = cfg.privacy ? '<p class="fatezap-privacy">' + ICON_LOCK + esc(cfg.privacy) + '</p>' : '';
    var watermark = cfg.watermark ? '<div class="fatezap-watermark">Desenvolvido por <a href="https://fatemarketing.com.br" target="_blank" rel="noopener">FATE Marketing</a></div>' : '';

    return '' +
      '<div class="fatezap-modal" role="document">' +
        '<button class="fatezap-close" id="fatezap-close" type="button" aria-label="Fechar">&times;</button>' +
        '<div class="fatezap-head">' + avatar + tag +
          '<h3 id="fatezap-title">' + esc(cfg.title) + '</h3>' +
          '<p>' + esc(cfg.subtitle) + '</p>' +
        '</div>' +
        '<form class="fatezap-form" id="fatezap-form" novalidate>' +
          '<div class="fatezap-field"><label for="fatezap-name">' + esc(cfg.name.label) + '</label>' +
            '<input type="text" id="fatezap-name" placeholder="' + esc(cfg.name.placeholder) + '" autocomplete="name" required></div>' +
          '<div class="fatezap-field"><label for="fatezap-phone">' + esc(cfg.phone.label) + '</label>' +
            '<input type="tel" id="fatezap-phone" placeholder="' + esc(cfg.phone.placeholder) + '" maxlength="15" autocomplete="tel" inputmode="numeric" required></div>' +
          selectField +
          questionsBlock +
          '<button type="submit" class="fatezap-submit">' + ICON_WA + '<span>' + esc(cfg.submitText) + '</span></button>' +
          privacy +
        '</form>' + watermark +
      '</div>';
  }

  function applyTheme(el) {
    var t = cfg.theme || {};
    var map = { '--fz-header-from': t.headerFrom, '--fz-header-to': t.headerTo, '--fz-accent': t.accent, '--fz-btn': t.button, '--fz-btn-hover': t.buttonHover, '--fz-ring': t.ring, '--fz-radius': t.radius };
    for (var k in map) if (map[k]) el.style.setProperty(k, map[k]);
  }

  function mount() {
    injectStyle();
    overlay = document.getElementById(ROOT_ID);
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = ROOT_ID;
      overlay.className = 'fatezap-overlay';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-labelledby', 'fatezap-title');
      document.body.appendChild(overlay);
    }
    overlay.innerHTML = buildMarkup();
    applyTheme(overlay);
    wire();
  }

  function open(e) { if (e && e.preventDefault) e.preventDefault(); overlay.classList.add('fz-open'); document.body.style.overflow = 'hidden'; setTimeout(function () { var n = document.getElementById('fatezap-name'); if (n) n.focus(); }, 120); }
  function close() { overlay.classList.remove('fz-open'); document.body.style.overflow = ''; }

  function wire() {
    var closeBtn = document.getElementById('fatezap-close');
    var form = document.getElementById('fatezap-form');
    var nameI = document.getElementById('fatezap-name');
    var phoneI = document.getElementById('fatezap-phone');
    var selectI = document.getElementById('fatezap-select');

    if (closeBtn) closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });

    // máscara de telefone (00) 90000-0000
    phoneI.addEventListener('input', function (e) {
      var x = e.target.value.replace(/\D/g, '').match(/(\d{0,2})(\d{0,5})(\d{0,4})/);
      e.target.value = !x[2] ? x[1] : '(' + x[1] + ') ' + x[2] + (x[3] ? '-' + x[3] : '');
    });

    // perguntas qualificadoras (segmentos)
    overlay.querySelectorAll('.fatezap-q').forEach(function (q) {
      q.querySelectorAll('.fatezap-seg button').forEach(function (b) {
        b.addEventListener('click', function () {
          q.querySelectorAll('.fatezap-seg button').forEach(function (o) { o.classList.remove('on'); });
          b.classList.add('on');
          q.setAttribute('data-answer', b.getAttribute('data-v'));
        });
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = nameI.value, phone = phoneI.value, sel = selectI ? selectI.value : '';
      if (!isValidName(name)) { alert('Por favor, insira um nome válido.'); nameI.focus(); return; }
      if (!isValidPhone(phone)) { alert('Por favor, insira um WhatsApp válido com DDD.'); phoneI.focus(); return; }
      if (selectI && !sel) { alert('Por favor, selecione uma opção.'); selectI.focus(); return; }

      // coleta/valida perguntas qualificadoras
      var qual = {}, missing = null;
      overlay.querySelectorAll('.fatezap-q').forEach(function (q) {
        var a = q.getAttribute('data-answer');
        if (a) qual[q.getAttribute('data-q')] = a;
        else if (q.getAttribute('data-required') && !missing) missing = q;
      });
      if (missing) { alert('Por favor, responda: ' + missing.querySelector('span').textContent); missing.scrollIntoView({ block: 'center' }); return; }

      var btn = form.querySelector('.fatezap-submit'); btn.disabled = true; var span = btn.querySelector('span'); if (span) span.textContent = 'Processando...';

      var payload = { name: name, phone: phone, email: '', origem: cfg.origem, page: location.href };
      if (cfg.extra) for (var ek in cfg.extra) if (Object.prototype.hasOwnProperty.call(cfg.extra, ek)) payload[ek] = cfg.extra[ek];
      var selKey = (cfg.select && cfg.select.key) || 'service';
      if (selectI) payload[selKey] = sel;
      if (Object.keys(qual).length) payload.qualificacao = qual;
      var params = getUrlParams(); for (var p in params) payload[p] = params[p];

      // conta conversão no painel de analytics, se houver
      if (typeof global.trackContact === 'function') { try { global.trackContact('whatsapp'); } catch (err) {} }
      if (typeof cfg.onSubmit === 'function') { try { cfg.onSubmit(payload); } catch (err) {} }

      var tokens = { name: name, phone: phone }; tokens[selKey] = sel;
      var msg = cfg.waMessage.replace(/\{(\w+)\}/g, function (m, k) { return tokens[k] != null ? tokens[k] : ''; });
      Object.keys(qual).forEach(function (k) { msg += '\n• ' + k + ': ' + qual[k]; });
      var go = function () { location.href = 'https://wa.me/' + cfg.whatsapp + '?text=' + encodeURIComponent(msg); };

      if (cfg.webhook) {
        fetch(cfg.webhook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
          .catch(function (err) { console.error('[FateZap] webhook:', err); })
          .finally(go);
      } else { go(); }
    });
  }

  function bindTriggers() {
    if (bound) return; bound = true;
    document.addEventListener('click', function (e) {
      if (!cfg) return;
      var t = e.target.closest && e.target.closest(cfg.trigger);
      if (t) open(e);
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && overlay && overlay.classList.contains('fz-open')) close(); });
  }

  // ------------------------- API pública -------------------------
  var FateZap = {
    version: VERSION,
    init: function (options) {
      cfg = deepMerge(DEFAULTS, options || {});
      if (!cfg.whatsapp) console.warn('[FateZap] defina "whatsapp" (número com DDI, só dígitos).');
      ready(function () { mount(); bindTriggers(); });
      return FateZap;
    },
    open: function () { if (overlay) open(); },
    close: function () { if (overlay) close(); },
    config: function () { return cfg; }
  };

  global.FateZap = FateZap;
})(typeof window !== 'undefined' ? window : this);
