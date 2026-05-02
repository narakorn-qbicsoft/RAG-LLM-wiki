/* ═══════════════════════════════════════════════════════════
   AI Chat Demo — App JavaScript
   Handles: Upload, Chat, Documents, UI interactions
═══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ─── Elements ───────────────────────────────────────
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  const sidebar = $('#sidebar');
  const btnMenu = $('#btnMenu');
  const sidebarClose = $('#sidebarClose');
  const uploadZone = $('#uploadZone');
  const fileInput = $('#fileInput');
  const uploadProgress = $('#uploadProgress');
  const progressFill = $('#progressFill');
  const progressLabel = $('#progressLabel');
  const pipelineSteps = $('#pipelineSteps');
  const progressPct = $('#progressPct');
  const progressEta = $('#progressEta');
  let _pollStartTime = 0;
  let _lastPct = 0;
  const docList = $('#docList');
  const docCount = $('#docCount');
  const chatMessages = $('#chatMessages');
  const chatInput = $('#chatInput');
  const btnSend = $('#btnSend');
  const btnNewChat = $('#btnNewChat');
  const btnClearChat = $('#btnClearChat');
  const welcomeScreen = $('#welcomeScreen');
  const headerStatus = $('#headerStatus');
  const statsSection = $('#statsSection');
  const previewModal = $('#previewModal');
  const previewClose = $('#previewClose');
  const toastContainer = $('#toastContainer');

  // ─── State ──────────────────────────────────────────
  let documents = [];
  let isSending = false;

  // ─── Init ───────────────────────────────────────────
  function init() {
    setupUpload();
    setupChat();
    setupSidebar();
    setupModal();
    setupConfigUI();
    checkConfig();
    loadSession();
    loadDocuments();
    loadStats();

    // Auto-resize textarea
    chatInput.addEventListener('input', autoResize);
  }

  async function loadSession() {
    try {
      const r = await fetch('/api/session');
      const j = await r.json();
      const badge = document.getElementById('sessionBadge');
      if (badge) {
        const mine = j.myDocs || 0;
        const pub = j.publicDocs || 0;
        badge.innerHTML = '🔒 Session <code style="background:#eef2ff;padding:1px 5px;border-radius:3px;color:#4338ca">' + (j.sessionId||'?') + '</code> · ' + mine + ' your docs' + (pub ? ' · ' + pub + ' public' : '');
      }
    } catch(e) { console.warn('session load fail', e); }
  }

  // ═══════════════════════════════════════════════════════
  //  Sidebar
  // ═══════════════════════════════════════════════════════

  function setupSidebar() {
    btnMenu.addEventListener('click', () => toggleSidebar(true));
    sidebarClose.addEventListener('click', () => toggleSidebar(false));

    // Overlay
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    overlay.id = 'sidebarOverlay';
    overlay.addEventListener('click', () => toggleSidebar(false));
    document.body.appendChild(overlay);
  }

  function toggleSidebar(open) {
    sidebar.classList.toggle('open', open);
    const overlay = $('#sidebarOverlay');
    if (overlay) overlay.classList.toggle('active', open);
  }

  // ═══════════════════════════════════════════════════════
  //  Upload
  // ═══════════════════════════════════════════════════════

  function setupUpload() {
    uploadZone.addEventListener('click', () => fileInput.click());

    uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      uploadZone.classList.add('dragover');
    });

    uploadZone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      uploadZone.classList.remove('dragover');
    });

    uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      uploadZone.classList.remove('dragover');
      if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
    });

    fileInput.addEventListener('change', () => {
      if (fileInput.files.length) handleFiles(fileInput.files);
      fileInput.value = '';
    });
  }

  async function handleFiles(files) {
    for (const file of files) {
      await uploadFile(file);
    }
  }

  async function uploadFile(file) {
    uploadProgress.style.display = 'block';
    progressFill.style.width = '0%';
    if (progressPct) progressPct.textContent = '0%';
    if (progressEta) progressEta.textContent = '';
    const sizeMB = (file.size / 1024 / 1024).toFixed(1);
    progressLabel.textContent = '📤 Uploading ' + file.name + '...';
    _pollStartTime = Date.now();
    _lastPct = 0;

    const form = new FormData();
    form.append('file', file);

    try {
      // Use XMLHttpRequest for real upload progress
      const data = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const pct = Math.round(e.loaded / e.total * 5);
            const loaded = (e.loaded / 1024 / 1024).toFixed(1);
            progressFill.style.width = pct + '%';
            if (progressPct) progressPct.textContent = pct + '%';
            progressLabel.textContent = '📤 Upload: ' + loaded + '/' + sizeMB + ' MB';
          }
        });
        xhr.onload = () => {
          try { resolve(JSON.parse(xhr.responseText)); }
          catch(e) { reject(new Error('Bad response')); }
        };
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.ontimeout = () => reject(new Error('Upload timeout'));
        xhr.timeout = 600000; // 10 min timeout for large files on slow networks
        xhr.open('POST', '/api/upload');
        xhr.send(form);
      });

      if (data.success) {
        if (data.processing) {
          progressFill.style.width = '5%';
          if (progressPct) progressPct.textContent = '5%';
          progressLabel.textContent = 'Processing ' + file.name + '...';
          if (pipelineSteps) pipelineSteps.innerHTML = '';
          _pollStartTime = Date.now();
          _lastPct = 5;
          addSystemMessage('\ud83d\udcc4 <b>' + file.name + '</b> uploaded \u2014 Processing with Advanced RAG pipeline...');
          pollProcessingStatus(data.document.id, file.name);
        } else {
          progressFill.style.width = '100%';
          const wc = (data.document.wordCount || 0).toLocaleString();
          const cc = data.document.chunkCount || 0;
          progressLabel.textContent = file.name + ' \u2014 ' + wc + ' words, ' + cc + ' chunks';
          showToast(file.name + ' ready!', 'success');
          addSystemMessage('\ud83d\udcc4 <b>' + file.name + '</b> ready \u2014 ' + wc + ' words, ' + cc + ' chunks');
          setTimeout(() => { uploadProgress.style.display = 'none'; }, 2500);
        }
        await loadDocuments();
        await loadStats();
      } else {
        progressLabel.textContent = (data.error || 'Upload failed');
        showToast(data.error || 'Upload failed', 'error');
        setTimeout(() => { uploadProgress.style.display = 'none'; }, 3000);
      }
    } catch (e) {
      progressLabel.textContent = 'Cannot connect to server';
      showToast('Cannot connect to server', 'error');
      setTimeout(() => { uploadProgress.style.display = 'none'; }, 3000);
    }
  }

  const STEP_LABELS = {
    upload: '📤 Upload', extract: '📄 Extract', chunk: '✂️ Chunk',
    enrich: '🧠 Enrich', embed: '📐 Embed', save: '💾 Save'
  };
  const STEP_ICONS = {
    pending: '<i class="fas fa-circle"></i>',
    active: '<i class="fas fa-spinner fa-spin"></i>',
    done: '<i class="fas fa-check-circle"></i>',
    error: '<i class="fas fa-times-circle"></i>'
  };

  function formatDuration(seconds) {
    if (seconds < 60) return seconds.toFixed(0) + 's';
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return m + 'm ' + s + 's';
  }

  function calcETA(pct) {
    if (!_pollStartTime || pct <= 5) return '';
    const elapsed = (Date.now() - _pollStartTime) / 1000;
    const rate = (pct - _lastPct) > 0 ? elapsed / (pct - _lastPct) : 0;
    // Use simple linear ETA based on elapsed vs pct
    if (pct > 5 && elapsed > 3) {
      const totalEst = elapsed / ((pct - 2) / 98); // normalize 2-100 range
      const remaining = Math.max(0, totalEst - elapsed);
      if (remaining < 2) return '⏱️ Almost done...';
      return '⏱️ ~' + formatDuration(remaining) + ' remaining';
    }
    return '';
  }

  function renderPipelineSteps(steps) {
    if (!pipelineSteps || !steps || !steps.length) {
      if (pipelineSteps) pipelineSteps.innerHTML = '';
      return;
    }
    pipelineSteps.innerHTML = steps.map(s => {
      const label = STEP_LABELS[s.name] || s.name;
      const icon = STEP_ICONS[s.status] || STEP_ICONS.pending;
      let timeStr = '';
      if (s.duration) timeStr = formatDuration(s.duration);
      else if (s.elapsed) timeStr = formatDuration(s.elapsed) + '…';
      const detail = s.detail || '';
      return '<div class="pipeline-step ' + s.status + '">' +
        '<span class="step-icon">' + icon + '</span>' +
        '<span class="step-name">' + label + '</span>' +
        '<span class="step-detail">' + detail + '</span>' +
        (timeStr ? '<span class="step-time">' + timeStr + '</span>' : '') +
        '</div>';
    }).join('');
  }

  function pollProcessingStatus(docId, fileName) {
    _pollStartTime = Date.now();
    _lastPct = 2;
    const poll = async () => {
      try {
        const res = await fetch('/api/upload/progress/' + docId);
        const data = await res.json();
        if (data.status === 'processing') {
          const pct = Math.max(5, data.progress || 5);
          progressFill.style.width = pct + '%';
          if (progressPct) progressPct.textContent = pct + '%';
          progressLabel.textContent = data.message || 'Processing...';
          // ETA
          if (progressEta) progressEta.textContent = calcETA(pct);
          renderPipelineSteps(data.steps || []);
          setTimeout(poll, 1000);
        } else if (data.status === 'done') {
          progressFill.style.width = '100%';
          if (progressPct) progressPct.textContent = '100%';
          if (progressEta) progressEta.textContent = '';
          const wc = (data.wordCount || 0).toLocaleString();
          const cc = data.chunkCount || 0;
          const tt = data.timing && data.timing.total ? ' in ' + formatDuration(data.timing.total) : '';
          progressLabel.textContent = '✅ ' + fileName + ' — ' + wc + ' words, ' + cc + ' chunks — Ready!' + tt;
          renderPipelineSteps(data.steps || []);
          showToast(fileName + ' — Advanced RAG ready!' + tt, 'success');
          addSystemMessage('🎯 <b>' + fileName + '</b> pipeline complete — ' + wc + ' words, ' + cc + ' chunks' + tt);
          loadDocuments();
          loadStats();
          setTimeout(() => { uploadProgress.style.display = 'none'; pipelineSteps.innerHTML = ''; }, 5000);
        } else if (data.status === 'error') {
          if (progressPct) progressPct.textContent = '❌';
          if (progressEta) progressEta.textContent = '';
          progressLabel.textContent = '❌ ' + fileName + ' — ' + (data.message || 'Processing failed');
          renderPipelineSteps(data.steps || []);
          showToast('Processing failed: ' + (data.message || 'Unknown'), 'error');
          setTimeout(() => { uploadProgress.style.display = 'none'; pipelineSteps.innerHTML = ''; }, 5000);
        }
      } catch (e) {
        setTimeout(poll, 1500);
      }
    };
    setTimeout(poll, 1000);
  }

  // ═══════════════════════════════════════════════════════
  //  Documents
  // ═══════════════════════════════════════════════════════

  async function loadDocuments() {
    try {
      const res = await fetch('/api/documents');
      const data = await res.json();
      documents = data.documents || [];
      renderDocList();
      updateHeaderStatus();
    } catch (e) {
      docList.innerHTML = '<div class="doc-empty"><i class="fas fa-exclamation-triangle"></i><br>Cannot connect to API</div>';
    }
  }

  function renderDocList() {
    docCount.textContent = documents.length;
    if (!documents.length) {
      docList.innerHTML = '<div class="doc-empty"><i class="fas fa-inbox"></i><br>No documents yet</div>';
      return;
    }
    docList.innerHTML = documents.map(d => {
      const esc = (s) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
      return '<div class="doc-item" data-id="' + d.id + '">' +
        '<div class="doc-item-icon ' + getIconClass(d.ext) + '"><i class="fas ' + getIconFa(d.ext) + '"></i></div>' +
        '<div class="doc-item-info">' +
          '<div class="doc-item-name" title="' + esc(d.name) + '">' + esc(d.name) + '</div>' +
          '<div class="doc-item-meta">' + formatSize(d.size) + ' \u00b7 ' + (d.wordCount||0).toLocaleString() + ' words \u00b7 ' + (d.chunkCount||0) + ' chunks</div>' +
        '</div>' +
        '<div class="doc-item-actions">' +
          "<button class=\"doc-action-btn reprocess\" title=\"Re-process (OCR + Enrich + Embed)\" onclick=\"window._reprocessDoc('" + d.id + "','" + esc(d.name).replace(/'/g,"\\'") + "')\"><i class=\"fas fa-redo\"></i></button>" +
          "<button class=\"doc-action-btn view\" onclick=\"window._previewDoc('" + d.id + "')\"><i class=\"fas fa-eye\"></i></button>" +
          "<button class=\"doc-action-btn del\" onclick=\"window._deleteDoc('" + d.id + "','" + esc(d.name).replace(/'/g,"\\'") + "')\"><i class=\"fas fa-trash\"></i></button>" +
        '</div></div>';
    }).join('');
  }

  async function loadStats() {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      if (data.documentCount > 0) {
        statsSection.style.display = 'block';
        $('#statDocs').textContent = data.documentCount;
        $('#statWords').textContent = (data.totalWords||0).toLocaleString();
        $('#statChunks').textContent = (data.totalChunks||0).toLocaleString();
        let aiLabel = 'Local Search';
        if (data.hasOpenAI) aiLabel = 'OpenAI GPT';
        else if (data.hasGemini) aiLabel = 'Gemini';
        $('#statAI').textContent = aiLabel;
      } else {
        statsSection.style.display = 'none';
      }
    } catch (e) {}
  }

  function updateHeaderStatus() {
    if (documents.length === 0) {
      headerStatus.innerHTML = '<span class="status-dot"></span> Ready \u2014 Upload documents to start';
    } else {
      const tw = documents.reduce((s, d) => s + (d.wordCount||0), 0);
      headerStatus.innerHTML = '<span class="status-dot"></span> ' + documents.length + ' docs \u00b7 ' + tw.toLocaleString() + ' words \u2014 Ready';
    }
  }

  // ═══════════════════════════════════════════════════════
  //  Chat
  // ═══════════════════════════════════════════════════════

  function setupChat() {
    btnSend.addEventListener('click', sendMessage);
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    btnNewChat.addEventListener('click', newChat);
    btnClearChat.addEventListener('click', clearChat);

    // Quick action buttons
    $$('.quick-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        chatInput.value = btn.dataset.q;
        sendMessage();
      });
    });

    // Suggestion buttons
    $$('.suggestion-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        chatInput.value = btn.dataset.q;
        sendMessage();
      });
    });
  }

  async function sendMessage() {
    const msg = chatInput.value.trim();
    if (!msg || isSending) return;

    isSending = true;
    btnSend.disabled = true;

    // Hide welcome
    if (welcomeScreen) {
      welcomeScreen.style.display = 'none';
    }

    // User message
    addMessage('user', escapeHtml(msg));
    chatInput.value = '';
    chatInput.style.height = 'auto';

    // Typing indicator
    const typingId = 'typing-' + Date.now();
    addTyping(typingId);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: msg }),
      });
      const data = await res.json();

      removeTyping(typingId);

      let answer = data.answer || 'No answer received';

      // Build meta info
      let meta = '';
      if (data.model) {
        meta += '<div class="msg-meta">';
        meta += '<span class="msg-time">' + new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + '</span>';
        meta += '<span class="msg-model"><i class="fas fa-microchip"></i> ' + escapeHtml(data.model) + '</span>';

        if (data.searchMethod === 'level5-agentic') {
          var agentType = data.agentType || 'simple';
          var qScore = data.qualityScore || '?';
          var pTime = data.pipelineTime || '?';
          var agentIcons = {'simple':'fa-search','multi_step':'fa-project-diagram','analytical':'fa-calculator','conversational':'fa-comments'};
          var agentIcon = agentIcons[agentType] || 'fa-robot';
          var refinedBadge = data.refined ? ' <i class="fas fa-sync-alt" title="Refined"></i>' : '';
          meta += '<span class="msg-search-tag hybrid" style="background:linear-gradient(135deg,#f093fb,#f5576c,#4facfe);"><i class="fas ' + agentIcon + '"></i> Agentic RAG · ' + agentType + ' · Q:' + qScore + '/10' + refinedBadge + ' · ' + pTime + 's</span>';
        } else if (data.searchMethod === 'level4-rag') {
          var pTime4 = data.pipelineTime || '?';
          meta += '<span class="msg-search-tag hybrid" style="background:linear-gradient(135deg,#667eea,#764ba2);"><i class="fas fa-rocket"></i> Level 4 RAG · ' + (data.hitCount || 0) + ' hits · ' + pTime4 + 's</span>';
        } else if (data.searchMethod === 'hybrid') {
          meta += '<span class="msg-search-tag hybrid"><i class="fas fa-brain"></i> Hybrid RAG (' + (data.hitCount || 0) + ' hits)</span>';
        } else if (data.searchMethod === 'fulltext') {
          meta += '<span class="msg-search-tag fulltext"><i class="fas fa-search"></i> Fulltext</span>';
        }
        meta += '</div>';
      }

      // Sources
      let sourcesHtml = '';
      if (false && data.sources && data.sources.length > 0) {
        const srcId = 'src-' + Date.now();
        let srcItems = data.sources.map(s =>
          '<div class="source-item">' +
          '<div class="source-name">\u{1f4c4} ' + escapeHtml(s.docName || s.document || '') + '</div>' +
          '<div class="source-preview">' + escapeHtml((s.preview || s.text || '').substring(0, 150)) + '...</div>' +
          '</div>'
        ).join('');
        sourcesHtml = '<div class="msg-sources">' +
          '<button class="sources-toggle" onclick="document.getElementById(\'' + srcId + '\').classList.toggle(\' open\')">' +
          '<i class="fas fa-file-alt"></i> Sources (' + data.sources.length + ')' +
          '<i class="fas fa-chevron-down" style="font-size:0.6rem;margin-left:4px"></i></button>' +
          '<div class="sources-list" id="' + srcId + '">' + srcItems + '</div></div>';
      }

      addMessage('bot', answer, meta + sourcesHtml);

    } catch (e) {
      removeTyping(typingId);
      addMessage('bot', '\u274c Cannot connect to AI<br><small style="color:#a0aec0">Check that server.py is running (port 5000)</small>');
    }

    isSending = false;
    btnSend.disabled = false;
    chatInput.focus();
  }

  function renderMarkdown(text) {
    if (typeof marked !== 'undefined') {
      marked.setOptions({ breaks: true, gfm: true });
      try { return marked.parse(text); } catch(e) { return text; }
    }
    return text.replace(/\n/g, '<br>');
  }

  function addMessage(type, html, extraHtml) {
    const avatarIcon = type === 'bot' ? 'fa-robot' : 'fa-user';
    const div = document.createElement('div');
    div.className = 'msg ' + type;
    var content = html;
    if (type === 'bot') { content = renderMarkdown(html); }
    var extra = extraHtml || '';
    div.innerHTML =
      '<div class="msg-avatar"><i class="fas ' + avatarIcon + '"></i></div>' +
      '<div class="msg-body"><div class="msg-bubble markdown-body">' + content + '</div>' + extra + '</div>';
    chatMessages.appendChild(div);
    if (type === 'bot' && typeof hljs !== 'undefined') {
      div.querySelectorAll('pre code').forEach(function(block) { hljs.highlightElement(block); });
    }
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function addSystemMessage(html) {
    if (welcomeScreen) welcomeScreen.style.display = 'none';
    const div = document.createElement('div');
    div.className = 'msg system';
    div.innerHTML = '<div class="msg-bubble">' + html + '</div>';
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function addTyping(id) {
    const div = document.createElement('div');
    div.className = 'msg bot';
    div.id = id;
    div.innerHTML =
      '<div class="msg-avatar"><i class="fas fa-robot"></i></div>' +
      '<div class="msg-body"><div class="msg-bubble">' +
      '<div class="typing-indicator"><div class="typing-dots"><span></span><span></span><span></span></div>' +
      '&nbsp;AI analyzing...</div></div></div>';
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function removeTyping(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
  }

  function newChat() {
    chatMessages.innerHTML = '';
    if (welcomeScreen) {
      chatMessages.appendChild(welcomeScreen);
      welcomeScreen.style.display = 'flex';
    }
    fetch('/api/chat/clear', { method: 'POST' }).catch(() => {});
    showToast('\u{1f504} New chat started', 'info');
  }

  async function clearChat() {
    if (!confirm('Clear all chat history?')) return;
    chatMessages.innerHTML = '';
    if (welcomeScreen) {
      chatMessages.appendChild(welcomeScreen);
      welcomeScreen.style.display = 'flex';
    }
    try { await fetch('/api/chat/clear', { method: 'POST' }); } catch (e) {}
    showToast('\u{1f5d1} Chat history cleared', 'success');
  }

  // ═══════════════════════════════════════════════════════
  //  Preview / Delete (exposed globally)
  // ═══════════════════════════════════════════════════════

  window._previewDoc = async function (docId) {
    try {
      const res = await fetch('/api/documents/' + docId + '/preview');
      const data = await res.json();
      $('#previewTitle').textContent = '\u{1f4c4} ' + data.name + ' (' + (data.wordCount||0).toLocaleString() + ' words)';
      $('#previewBody').textContent = data.text || '(Cannot preview)';
      previewModal.classList.add('active');
    } catch (e) {
      showToast('\u274c Cannot load preview', 'error');
    }
  };

  window._reprocessDoc = async function (docId, docName) {
    if (!confirm('Re-process "' + docName + '"?\nThis will re-do OCR, chunking, enrichment, and embedding from scratch.')) return;
    try {
      addSystemMessage('🔄 Re-processing <b>' + docName + '</b>...');
      const res = await fetch('/api/reprocess/' + docId, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        uploadProgress.style.display = 'block';
        progressFill.style.width = '5%';
        if (progressPct) progressPct.textContent = '5%';
        progressLabel.textContent = '🔄 Re-processing ' + docName + '...';
        if (progressEta) progressEta.textContent = '';
        if (pipelineSteps) pipelineSteps.innerHTML = '';
        pollProcessingStatus(docId, docName);
        showToast('Re-processing started!', 'success');
      } else {
        showToast(data.error || 'Re-process failed', 'error');
      }
    } catch (e) {
      showToast('Cannot connect to server', 'error');
    }
  };

  window._deleteDoc = async function (docId, docName) {
    if (!confirm('Delete document "' + docName + '"?')) return;
    let ok = false;
    try {
      const res = await fetch('/api/documents/' + docId, { method: 'DELETE' });
      if (!res.ok) {
        let msg = 'HTTP ' + res.status;
        try { const j = await res.json(); if (j && j.error) msg = j.error; } catch (_) {}
        showToast('\u274c ' + msg, 'error');
        addSystemMessage('\u274c \u0e25\u0e1a\u0e44\u0e21\u0e48\u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08: ' + msg);
      } else {
        ok = true;
        showToast('\u{1f5d1} Deleted ' + docName, 'success');
        addSystemMessage('\u{1f5d1} Deleted <b>' + docName + '</b>');
      }
    } catch (e) {
      showToast('\u274c Cannot delete', 'error');
    }
    try { await loadDocuments(); } catch(_){}
    try { await loadStats(); } catch(_){}
    try { if (typeof loadSession === 'function') await loadSession(); } catch(_){}
  };

  // ═══════════════════════════════════════════════════════
  //  Modal
  // ═══════════════════════════════════════════════════════

  function setupModal() {
    previewClose.addEventListener('click', () => previewModal.classList.remove('active'));
    previewModal.addEventListener('click', (e) => {
      if (e.target === previewModal) previewModal.classList.remove('active');
    });
  }

  // ═══════════════════════════════════════════════════════
  //  Utilities
  // ═══════════════════════════════════════════════════════

  function showToast(text, type) {
    type = type || 'info';
    const toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.textContent = text;
    toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  }

  function autoResize() {
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
  }

  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function formatSize(bytes) {
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
    if (bytes >= 1024) return (bytes / 1024).toFixed(0) + ' KB';
    return bytes + ' B';
  }

  function getIconClass(ext) {
    if (ext === '.pdf') return 'pdf';
    if (['.docx', '.doc'].includes(ext)) return 'docx';
    if (['.xlsx', '.xls'].includes(ext)) return 'xlsx';
    if (['.txt', '.csv', '.md'].includes(ext)) return 'txt';
    return 'other';
  }

  function getIconFa(ext) {
    if (ext === '.pdf') return 'fa-file-pdf';
    if (['.docx', '.doc'].includes(ext)) return 'fa-file-word';
    if (['.xlsx', '.xls'].includes(ext)) return 'fa-file-excel';
    if (['.txt', '.md'].includes(ext)) return 'fa-file-alt';
    if (ext === '.csv') return 'fa-file-csv';
    return 'fa-file';
  }

  // ─── Start ──────────────────────────────────────────
  // init() moved to end of IIFE so const declarations below are initialized



  // ═══════════════════════════════════════════════════════
  //  Config / API Key Setup
  // ═══════════════════════════════════════════════════════

  const setupModalEl = document.getElementById('setupModal');
  const setupClose = document.getElementById('setupClose');
  const setupForm  = document.getElementById('setupForm');
  const setupEnvPath = document.getElementById('setupEnvPath');
  const firstRunOverlay = document.getElementById('firstRunOverlay');
  const firstRunBtn = document.getElementById('firstRunBtn');
  const btnSettings = document.getElementById('btnSettings');

  function openSetup() {
    if (!setupModalEl) return;
    loadConfigIntoForm();
    setupModalEl.classList.add('active');
  }
  function closeSetup() {
    if (setupModalEl) setupModalEl.classList.remove('active');
  }

  async function checkConfig() {
    try {
      const r = await fetch('/api/config');
      const d = await r.json();
      if (!d.configured) {
        if (firstRunOverlay) firstRunOverlay.style.display = 'flex';
      } else {
        if (firstRunOverlay) firstRunOverlay.style.display = 'none';
      }
      if (setupEnvPath && d.envPath) setupEnvPath.textContent = d.envPath;
      return d;
    } catch (e) {
      console.error('config check failed', e);
      return null;
    }
  }

  async function loadConfigIntoForm() {
    if (!setupForm) return;
    try {
      const r = await fetch('/api/config');
      const d = await r.json();
      (d.slots || []).forEach(slot => {
        const row = setupForm.querySelector('[data-slot="' + slot.slot + '"]');
        if (!row) return;
        const inp = row.querySelector('input');
        const status = row.querySelector('.setup-status');
        if (slot.set) {
          inp.placeholder = slot.masked + '  (saved — leave blank to keep)';
          status.textContent = 'Saved: ' + slot.masked;
          status.className = 'setup-status ok';
        } else {
          inp.placeholder = 'AIzaSy...';
          status.textContent = '';
          status.className = 'setup-status';
        }
        inp.value = '';
      });
      if (setupEnvPath && d.envPath) setupEnvPath.textContent = d.envPath;
    } catch (e) {}
  }

  function setupConfigUI() {
    if (btnSettings) btnSettings.addEventListener('click', openSetup);
    if (setupClose) setupClose.addEventListener('click', closeSetup);
    if (setupModalEl) setupModalEl.addEventListener('click', (e) => {
      if (e.target === setupModalEl) closeSetup();
    });
    if (firstRunBtn) firstRunBtn.addEventListener('click', () => {
      if (firstRunOverlay) firstRunOverlay.style.display = 'none';
      openSetup();
    });

    // Per-row eye + test buttons
    if (setupForm) {
      setupForm.querySelectorAll('.setup-row').forEach(row => {
        const inp = row.querySelector('input');
        const eye = row.querySelector('.btn-eye');
        const test = row.querySelector('.btn-test');
        const status = row.querySelector('.setup-status');
        if (eye) eye.addEventListener('click', () => {
          inp.type = (inp.type === 'password') ? 'text' : 'password';
          eye.innerHTML = (inp.type === 'password') ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
        });
        if (test) test.addEventListener('click', async () => {
          const k = (inp.value || '').trim();
          if (!k) { status.textContent = 'Enter a key first'; status.className = 'setup-status err'; return; }
          status.textContent = 'Testing...'; status.className = 'setup-status';
          try {
            const r = await fetch('/api/config/test', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({key: k}) });
            const d = await r.json();
            if (d.ok) { status.textContent = '✓ ' + (d.message || 'Valid'); status.className = 'setup-status ok'; }
            else { status.textContent = '✗ ' + (d.error || 'Invalid'); status.className = 'setup-status err'; }
          } catch (e) { status.textContent = 'Network error'; status.className = 'setup-status err'; }
        });
      });

      setupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(setupForm);
        const payload = {};
        let any = false;
        for (const [k, v] of fd.entries()) {
          const val = (v || '').trim();
          if (val) { payload[k] = val; any = true; }
        }
        if (!any) { showToast('Enter at least one key (or leave saved keys untouched)', 'warn'); return; }
        try {
          const r = await fetch('/api/config/keys', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
          const d = await r.json();
          if (d.success) {
            showToast('Saved ' + d.keyCount + ' key(s) — ready to go!', 'ok');
            closeSetup();
            await checkConfig();
            await loadStats();
          } else {
            showToast('Save failed: ' + (d.error || 'unknown'), 'err');
          }
        } catch (e) {
          showToast('Network error: ' + e.message, 'err');
        }
      });
    }
  }


  // ─── Init AFTER all const declarations ───
  init();
})();



// ─────────────────────────────────────────────────────────────
// Document Wiki Module (matches API: tags/entities/tag_pairs/doc_name)
// ─────────────────────────────────────────────────────────────
(function(){
  const modal = document.getElementById('wikiModal');
  const body = document.getElementById('wikiBody');
  const btnOpen = document.getElementById('btnWiki');
  const btnClose = document.getElementById('wikiClose');
  const btnBack = document.getElementById('wikiBack');
  const btnRebuild = document.getElementById('wikiRebuildAll');
  const subtitle = document.getElementById('wikiSubtitle');
  if (!modal || !btnOpen) { console.warn('[wiki] missing modal or button'); return; }
  console.log('[wiki] module initialized');

  function show(){ modal.classList.add('active'); }
  function hide(){ modal.classList.remove('active'); }
  function esc(s){ return String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  async function loadIndex(){
    btnBack.style.display = 'none';
    subtitle.textContent = 'Auto-generated knowledge base';
    body.innerHTML = '<div class="wiki-loading"><i class="fas fa-spinner fa-spin"></i> Loading wiki index...</div>';
    try {
      const r = await fetch('/api/wiki/index');
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const data = await r.json();
      renderIndex(data);
    } catch(e){
      body.innerHTML = '<div class="wiki-empty"><i class="fas fa-exclamation-triangle"></i><h3>Failed to load</h3><p>' + esc(e.message) + '</p></div>';
    }
  }

  function renderIndex(data){
    const docs = data.docs || [];
    // tags is array of {tag, count} or [tag,count]
    const tagsRaw = data.tags || data.top_tags || [];
    const tags = tagsRaw.map(t => Array.isArray(t) ? {tag: t[0], count: t[1]} : t);
    // entities is {organizations, people, places} dict OR array
    const entObj = data.entities || {};
    const entFlat = [];
    if (Array.isArray(entObj)) {
      entObj.forEach(e => entFlat.push(Array.isArray(e) ? {name: e[0], count: e[1]} : e));
    } else {
      ['people','organizations','places'].forEach(cat => {
        (entObj[cat] || []).forEach(item => {
          const name = typeof item === 'string' ? item : (item.name || item.entity || item[0]);
          const count = typeof item === 'string' ? 1 : (item.count || item[1] || 1);
          if (name) entFlat.push({name, count, cat});
        });
      });
    }

    if (!docs.length){
      body.innerHTML = '<div class="wiki-empty"><i class="fas fa-book-open"></i><h3>No wikis yet</h3><p>Upload documents to auto-generate wiki pages.</p></div>';
      return;
    }
    let html = '';
    if (tags.length){
      const max = Math.max.apply(null, tags.map(t => t.count || 1));
      html += '<div class="wiki-section"><div class="wiki-section-title"><i class="fas fa-tags"></i> Top Tags</div><div class="wiki-tag-cloud">';
      tags.slice(0, 40).forEach(t => {
        const sz = 0.85 + ((t.count||1)/max) * 0.9;
        html += '<span class="wiki-tag" style="font-size:' + sz + 'rem" data-tag="' + esc(t.tag) + '">' + esc(t.tag) + ' <b>' + (t.count||1) + '</b></span>';
      });
      html += '</div></div>';
    }
    if (entFlat.length){
      html += '<div class="wiki-section"><div class="wiki-section-title"><i class="fas fa-users"></i> Top Entities</div><div class="wiki-entities">';
      entFlat.slice(0, 30).forEach(e => {
        html += '<span class="wiki-entity">' + esc(e.name) + (e.count > 1 ? ' <b>'+e.count+'</b>' : '') + '</span>';
      });
      html += '</div></div>';
    }
    html += '<div class="wiki-section"><div class="wiki-section-title"><i class="fas fa-folder-open"></i> Documents (' + docs.length + ')</div><div class="wiki-grid">';
    docs.forEach(d => {
      const name = d.doc_name || d.name || 'Untitled';
      const summary = (d.summary || '').slice(0, 200);
      const tagsHtml = (d.tags || []).slice(0, 5).map(t => '<span class="wiki-card-tag">' + esc(t) + '</span>').join('');
      html += '<div class="wiki-doc-card" data-id="' + esc(d.doc_id) + '">'
            + '<div class="wiki-card-name"><i class="fas fa-file-alt"></i> ' + esc(name) + '</div>'
            + '<div class="wiki-card-summary">' + esc(summary) + ((d.summary||'').length>200?'…':'') + '</div>'
            + '<div class="wiki-card-tags">' + tagsHtml + '</div></div>';
    });
    html += '</div></div>';
    body.innerHTML = html;
    body.querySelectorAll('.wiki-doc-card').forEach(c => c.addEventListener('click', () => loadDoc(c.dataset.id)));
    body.querySelectorAll('.wiki-tag').forEach(t => t.addEventListener('click', () => filterByTag(t.dataset.tag, docs)));
  }

  function filterByTag(tag, allDocs){
    const filtered = allDocs.filter(d => (d.tags||[]).includes(tag));
    body.scrollTop = 0;
    let html = '<div class="wiki-filter-bar">Filter: <b>' + esc(tag) + '</b> (' + filtered.length + ' docs) <button class="btn-link" id="wikiClearFilter">Clear</button></div><div class="wiki-grid">';
    filtered.forEach(d => {
      const name = d.doc_name || d.name || 'Untitled';
      const tagsHtml = (d.tags || []).slice(0, 5).map(t => '<span class="wiki-card-tag">' + esc(t) + '</span>').join('');
      html += '<div class="wiki-doc-card" data-id="' + esc(d.doc_id) + '">'
            + '<div class="wiki-card-name"><i class="fas fa-file-alt"></i> ' + esc(name) + '</div>'
            + '<div class="wiki-card-summary">' + esc((d.summary||'').slice(0,200)) + '</div>'
            + '<div class="wiki-card-tags">' + tagsHtml + '</div></div>';
    });
    html += '</div>';
    body.innerHTML = html;
    body.querySelectorAll('.wiki-doc-card').forEach(c => c.addEventListener('click', () => loadDoc(c.dataset.id)));
    document.getElementById('wikiClearFilter').addEventListener('click', loadIndex);
  }

  async function loadDoc(docId){
    btnBack.style.display = 'inline-flex';
    body.innerHTML = '<div class="wiki-loading"><i class="fas fa-spinner fa-spin"></i> Loading wiki page...</div>';
    try {
      const r = await fetch('/api/wiki/' + encodeURIComponent(docId));
      if (!r.ok){
        body.innerHTML = '<div class="wiki-empty"><i class="fas fa-exclamation-triangle"></i><h3>No wiki for this doc</h3><button class="btn-link" id="wikiBuildNow">Build wiki now</button></div>';
        document.getElementById('wikiBuildNow').addEventListener('click', async () => {
          body.innerHTML = '<div class="wiki-loading"><i class="fas fa-spinner fa-spin"></i> Building wiki (may take 10-30s)...</div>';
          await fetch('/api/wiki/rebuild/' + encodeURIComponent(docId), {method:'POST'});
          loadDoc(docId);
        });
        return;
      }
      renderDoc(await r.json());
    } catch(e){
      body.innerHTML = '<div class="wiki-empty">Failed: ' + esc(e.message) + '</div>';
    }
  }

  function renderDoc(w){
    const name = w.doc_name || w.name || 'Untitled';
    subtitle.textContent = name;
    let html = '<article class="wiki-page">'
             + '<h1><i class="fas fa-file-alt"></i> ' + esc(name) + '</h1>';
    if (w.summary) html += '<div class="wiki-summary"><i class="fas fa-quote-left"></i> ' + esc(w.summary) + '</div>';
    if (w.tags && w.tags.length){
      html += '<div class="wiki-block"><h3><i class="fas fa-tags"></i> Tags <small style="font-weight:400;color:#888">(click to ask about this topic)</small></h3><div class="wiki-tag-cloud">';
      w.tags.forEach(t => html += '<span class="wiki-tag wiki-tag-clickable" data-tag="' + esc(t) + '">' + esc(t) + '</span>');
      html += '</div></div>';
    }
    // entities can be dict or array
    if (w.entities){
      let entItems = [];
      if (Array.isArray(w.entities)) {
        entItems = w.entities.map(e => typeof e === 'string' ? e : (e.name || JSON.stringify(e)));
      } else {
        Object.keys(w.entities).forEach(cat => {
          const arr = w.entities[cat] || [];
          arr.forEach(item => {
            const v = typeof item === 'string' ? item : (item.name || item.value || JSON.stringify(item));
            entItems.push(cat + ': ' + v);
          });
        });
      }
      if (entItems.length){
        html += '<div class="wiki-block"><h3><i class="fas fa-users"></i> Entities</h3><div class="wiki-entities">';
        entItems.forEach(e => html += '<span class="wiki-entity">' + esc(e) + '</span>');
        html += '</div></div>';
      }
    }
    if (w.key_points && w.key_points.length){
      html += '<div class="wiki-block"><h3><i class="fas fa-lightbulb"></i> Key Points</h3><ul>';
      w.key_points.forEach(p => html += '<li>' + esc(p) + '</li>');
      html += '</ul></div>';
    }
    if (w.sections && w.sections.length){
      html += '<div class="wiki-block"><h3><i class="fas fa-list"></i> Sections</h3>';
      w.sections.forEach(s => html += '<div class="wiki-sec"><h4>' + esc(s.title||'') + '</h4><p>' + esc(s.summary||'') + '</p></div>');
      html += '</div>';
    }
    if (w.suggested_questions && w.suggested_questions.length){
      html += '<div class="wiki-block"><h3><i class="fas fa-question-circle"></i> Suggested Questions</h3><div class="wiki-questions">';
      w.suggested_questions.forEach(q => html += '<button class="wiki-q-btn" data-q="' + esc(q) + '">' + esc(q) + '</button>');
      html += '</div></div>';
    }
    html += '<div class="wiki-footer-meta">Generated: ' + esc(w.generated_at||'—') + ' · <button class="btn-link" id="wikiRebuildOne" data-id="' + esc(w.doc_id) + '">Rebuild this wiki</button></div></article>';
    body.innerHTML = html;
    body.querySelectorAll('.wiki-q-btn').forEach(b => b.addEventListener('click', () => {
      const inp = document.getElementById('chatInput');
      if (inp){ inp.value = b.dataset.q; inp.focus(); inp.dispatchEvent(new Event('input')); }
      hide();
    }));
    body.querySelectorAll('.wiki-tag-clickable').forEach(b => b.addEventListener('click', () => {
      const inp = document.getElementById('chatInput');
      if (inp){ inp.value = 'อธิบายเรื่อง ' + b.dataset.tag + ' ในเอกสารนี้'; inp.focus(); inp.dispatchEvent(new Event('input')); }
      hide();
    }));
    const rb = document.getElementById('wikiRebuildOne');
    if (rb) rb.addEventListener('click', async () => {
      const id = rb.dataset.id;
      body.innerHTML = '<div class="wiki-loading"><i class="fas fa-spinner fa-spin"></i> Rebuilding...</div>';
      await fetch('/api/wiki/rebuild/' + encodeURIComponent(id), {method:'POST'});
      loadDoc(id);
    });
  }

  btnOpen.addEventListener('click', () => { console.log('[wiki] open clicked'); show(); loadIndex(); });
  btnClose.addEventListener('click', hide);
  btnBack.addEventListener('click', loadIndex);
  btnRebuild.addEventListener('click', async () => {
    if (!confirm('Rebuild wikis for ALL documents? This may take several minutes.')) return;
    body.innerHTML = '<div class="wiki-loading"><i class="fas fa-spinner fa-spin"></i> Rebuilding all wikis...</div>';
    await fetch('/api/wiki/rebuild', {method:'POST'});
    loadIndex();
  });
  modal.addEventListener('click', e => { if (e.target === modal) hide(); });
})();
