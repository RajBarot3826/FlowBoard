/**
 * FlowBoard — Intelligent Voice-Driven Kanban Suite
 * Built with Whispr Flow — Voice-Driven Software Engineering
 */

// ==========================================================================
// 1. SOUND EFFECTS SYNTHESIZER (Web Audio API - 0 Dependencies)
// ==========================================================================
class SoundFX {
  constructor() {
    this.ctx = null;
    this.enabled = localStorage.getItem('flowboard_sound') !== 'false';
  }

  init() {
    if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
  }

  play(type) {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);

      switch (type) {
        case 'click':
          osc.type = 'sine';
          osc.frequency.setValueAtTime(600, now);
          osc.frequency.exponentialRampToValueAtTime(300, now + 0.05);
          gain.gain.setValueAtTime(0.12, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
          osc.start(now);
          osc.stop(now + 0.05);
          break;

        case 'drop':
          osc.type = 'sine';
          osc.frequency.setValueAtTime(320, now);
          osc.frequency.exponentialRampToValueAtTime(140, now + 0.09);
          gain.gain.setValueAtTime(0.18, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.09);
          osc.start(now);
          osc.stop(now + 0.09);
          break;

        case 'complete':
          // Two-tone cheerful chime
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(523.25, now); // C5
          osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
          osc.start(now);
          osc.stop(now + 0.22);
          break;

        case 'voiceStart':
          osc.type = 'sine';
          osc.frequency.setValueAtTime(440, now);
          osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
          osc.start(now);
          osc.stop(now + 0.12);
          break;

        case 'delete':
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(300, now);
          osc.frequency.exponentialRampToValueAtTime(100, now + 0.14);
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);
          osc.start(now);
          osc.stop(now + 0.14);
          break;
      }
    } catch {
      // Audio autoplay restrictions gracefully handled
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    localStorage.setItem('flowboard_sound', this.enabled ? 'true' : 'false');
    return this.enabled;
  }
}

// ==========================================================================
// 2. MAIN APPLICATION CONTROLLER
// ==========================================================================
class FlowBoardApp {
  constructor() {
    this.sound = new SoundFX();
    this.tasks = [];
    this.activities = [];
    this.currentFilter = 'all';
    this.currentTag = 'all';
    this.searchQuery = '';
    this.searchTimeout = null;
    this.draggedTaskId = null;
    this.speechRecognition = null;
    this.isListening = false;
  }

  init() {
    this.cacheDom();
    this.loadTheme();
    this.loadSoundState();
    this.loadTasks();
    this.loadActivities();
    this.setupSpeechRecognition();
    this.setupEventListeners();
    this.render();
  }

  // ========================================================================
  // DOM Cache
  // ========================================================================
  cacheDom() {
    this.board = document.getElementById('board');
    this.searchInput = document.getElementById('searchInput');
    this.searchClearBtn = document.getElementById('searchClearBtn');

    // Stats
    this.statsTotal = document.getElementById('statsTotal');
    this.statsInProgress = document.getElementById('statsInProgress');
    this.statsCompleted = document.getElementById('statsCompleted');
    this.statsOverdue = document.getElementById('statsOverdue');
    this.statsRate = document.getElementById('statsRate');
    this.progressBarFill = document.getElementById('progressBarFill');
    this.progressSubtext = document.getElementById('progressSubtext');

    // Header buttons
    this.themeToggle = document.getElementById('themeToggle');
    this.soundToggleBtn = document.getElementById('soundToggleBtn');
    this.soundIcon = document.getElementById('soundIcon');
    this.historyToggleBtn = document.getElementById('historyToggleBtn');
    this.historyBadgeDot = document.getElementById('historyBadgeDot');
    this.helpBtn = document.getElementById('helpBtn');
    this.voiceTriggerBtn = document.getElementById('voiceTriggerBtn');
    this.addTaskBtn = document.getElementById('addTaskBtn');
    this.cmdPaletteBtn = document.getElementById('cmdPaletteBtn');

    // Voice Floating Banner
    this.voiceBanner = document.getElementById('voiceBanner');
    this.voiceTranscript = document.getElementById('voiceTranscript');
    this.voiceStopBtn = document.getElementById('voiceStopBtn');

    // Dropdowns
    this.backupMenuBtn = document.getElementById('backupMenuBtn');
    this.backupDropdown = document.getElementById('backupDropdown');
    this.exportJsonBtn = document.getElementById('exportJsonBtn');
    this.exportCsvBtn = document.getElementById('exportCsvBtn');
    this.importJsonInput = document.getElementById('importJsonInput');
    this.resetDemoBtn = document.getElementById('resetDemoBtn');

    // Task Modal
    this.modalOverlay = document.getElementById('modalOverlay');
    this.taskForm = document.getElementById('taskForm');
    this.modalTitle = document.getElementById('modalTitle');
    this.taskIdInput = document.getElementById('taskIdInput');
    this.taskTitleInput = document.getElementById('taskTitleInput');
    this.taskDescInput = document.getElementById('taskDescInput');
    this.taskPriorityInput = document.getElementById('taskPriorityInput');
    this.taskDueDateInput = document.getElementById('taskDueDateInput');
    this.modalClose = document.getElementById('modalClose');
    this.modalCancel = document.getElementById('modalCancel');
    this.submitBtn = document.getElementById('submitBtn');

    // Activity Drawer
    this.activityDrawer = document.getElementById('activityDrawer');
    this.drawerBackdrop = document.getElementById('drawerBackdrop');
    this.closeDrawerBtn = document.getElementById('closeDrawerBtn');
    this.clearHistoryBtn = document.getElementById('clearHistoryBtn');
    this.activityList = document.getElementById('activityList');

    // Command Palette Modal
    this.paletteOverlay = document.getElementById('paletteOverlay');
    this.paletteInput = document.getElementById('paletteInput');
    this.paletteResults = document.getElementById('paletteResults');

    // Guide Modal
    this.guideOverlay = document.getElementById('guideOverlay');
    this.guideClose = document.getElementById('guideClose');

    // Confirm Dialog
    this.confirmOverlay = document.getElementById('confirmOverlay');
    this.confirmTitle = document.getElementById('confirmTitle');
    this.confirmMessage = document.getElementById('confirmMessage');
    this.confirmOk = document.getElementById('confirmOk');
    this.confirmCancel = document.getElementById('confirmCancel');

    // Toasts
    this.toastContainer = document.getElementById('toastContainer');
  }

  // ========================================================================
  // Data Persistence & Defaults
  // ========================================================================
  loadTasks() {
    const saved = localStorage.getItem('flowboard_tasks');
    if (saved) {
      try {
        this.tasks = JSON.parse(saved);
      } catch {
        this.tasks = this.getInitialSampleTasks();
        this.saveTasks();
      }
    } else {
      this.tasks = this.getInitialSampleTasks();
      this.saveTasks();
    }
  }

  saveTasks() {
    localStorage.setItem('flowboard_tasks', JSON.stringify(this.tasks));
  }

  loadActivities() {
    const saved = localStorage.getItem('flowboard_activities');
    if (saved) {
      try {
        this.activities = JSON.parse(saved);
      } catch {
        this.activities = [];
      }
    } else {
      this.activities = [
        { id: '1', text: '⚡ FlowBoard project initialized with Whispr Flow voice commands', time: new Date().toISOString(), isVoice: true }
      ];
      this.saveActivities();
    }
  }

  saveActivities() {
    localStorage.setItem('flowboard_activities', JSON.stringify(this.activities));
  }

  logActivity(text, isVoice = false) {
    this.activities.unshift({
      id: Date.now().toString(),
      text,
      time: new Date().toISOString(),
      isVoice
    });
    if (this.activities.length > 50) this.activities.pop();
    this.saveActivities();
    this.renderActivities();
    if (this.historyBadgeDot) this.historyBadgeDot.style.display = 'block';
  }

  getInitialSampleTasks() {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const tomorrow = new Date(now.getTime() + 86400000).toISOString().split('T')[0];
    const yesterday = new Date(now.getTime() - 86400000).toISOString().split('T')[0];

    return [
      {
        id: 't-101',
        title: 'Voice dictation latency optimization',
        description: 'Profile audio capture buffers and reduce end-to-end transcription delay to under 250ms.',
        status: 'todo',
        priority: 'high',
        tag: 'DevOps',
        dueDate: today,
        createdAt: now.toISOString()
      },
      {
        id: 't-102',
        title: 'Dark mode contrast accessibility audit',
        description: 'Verify WCAG AAA color contrast ratios across all Kanban cards and modal overlays.',
        status: 'todo',
        priority: 'medium',
        tag: 'Design',
        dueDate: tomorrow,
        createdAt: now.toISOString()
      },
      {
        id: 't-103',
        title: 'Natural language speech command parser',
        description: 'Map conversational commands like "create high priority task fix auth" directly into structured JSON.',
        status: 'inprogress',
        priority: 'high',
        tag: 'Feature',
        dueDate: today,
        createdAt: now.toISOString()
      },
      {
        id: 't-104',
        title: 'Web Audio API sound feedback engine',
        description: 'Synthesize subtle acoustic tones for card drops, deletions, and voice triggers without external audio assets.',
        status: 'inprogress',
        priority: 'low',
        tag: 'Backend',
        dueDate: '',
        createdAt: now.toISOString()
      },
      {
        id: 't-105',
        title: 'Local backup JSON export & restore',
        description: 'Enable one-click encrypted offline backup and CSV export for sprint status reports.',
        status: 'done',
        priority: 'medium',
        tag: 'Feature',
        dueDate: yesterday,
        createdAt: now.toISOString()
      },
      {
        id: 't-106',
        title: 'Wispr Flow Shortlisting Task blueprint',
        description: 'Complete voice-driven development workflow demonstration for Hacker House Goa 2026.',
        status: 'done',
        priority: 'high',
        tag: 'Feature',
        dueDate: yesterday,
        createdAt: now.toISOString()
      }
    ];
  }

  // ========================================================================
  // Task Operations (CRUD)
  // ========================================================================
  addTask(taskData, fromVoice = false) {
    const newTask = {
      id: 'task_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      title: taskData.title.trim(),
      description: (taskData.description || '').trim(),
      status: taskData.status || 'todo',
      priority: taskData.priority || 'medium',
      tag: taskData.tag || 'Feature',
      dueDate: taskData.dueDate || '',
      createdAt: new Date().toISOString()
    };

    this.tasks.push(newTask);
    this.saveTasks();
    this.render();
    this.sound.play('click');

    const activityText = fromVoice
      ? `🎙️ Voice created task: "${newTask.title}" (${newTask.priority.toUpperCase()} priority)`
      : `Added task: "${newTask.title}"`;
    this.logActivity(activityText, fromVoice);

    this.showToast(fromVoice ? '🎙️ Task added via voice!' : 'Task added successfully!', 'success');
  }

  updateTask(taskId, updatedData) {
    const idx = this.tasks.findIndex(t => t.id === taskId);
    if (idx !== -1) {
      this.tasks[idx] = { ...this.tasks[idx], ...updatedData };
      this.saveTasks();
      this.render();
      this.sound.play('click');
      this.logActivity(`Updated task: "${this.tasks[idx].title}"`);
      this.showToast('Task updated successfully!', 'success');
    }
  }

  deleteTask(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return;

    this.showConfirm(
      'Delete Task?',
      `Are you sure you want to delete "${task.title}"? This cannot be undone.`,
      () => {
        this.tasks = this.tasks.filter(t => t.id !== taskId);
        this.saveTasks();
        this.render();
        this.sound.play('delete');
        this.logActivity(`Deleted task: "${task.title}"`);
        this.showToast('Task deleted', 'error');
      }
    );
  }

  moveTask(taskId, newStatus) {
    const task = this.tasks.find(t => t.id === taskId);
    if (task && task.status !== newStatus) {
      const oldStatus = task.status;
      task.status = newStatus;
      this.saveTasks();
      this.render();

      if (newStatus === 'done') {
        this.sound.play('complete');
      } else {
        this.sound.play('drop');
      }

      const statusLabels = { todo: 'To Do', inprogress: 'In Progress', done: 'Done' };
      this.logActivity(`Moved "${task.title}" from ${statusLabels[oldStatus]} to ${statusLabels[newStatus]}`);
      this.showToast(`Moved to ${statusLabels[newStatus]}`, 'info');
    }
  }

  // ========================================================================
  // Speech Recognition & Voice Commands
  // ========================================================================
  setupSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Web Speech API is not supported in this browser.');
      return;
    }

    this.speechRecognition = new SpeechRecognition();
    this.speechRecognition.continuous = false;
    this.speechRecognition.interimResults = true;
    this.speechRecognition.lang = 'en-US';

    this.speechRecognition.onstart = () => {
      this.isListening = true;
      this.sound.play('voiceStart');
      if (this.voiceBanner) this.voiceBanner.style.display = 'block';
      if (this.voiceTriggerBtn) this.voiceTriggerBtn.classList.add('active');
      if (this.voiceTranscript) this.voiceTranscript.textContent = 'Listening... Speak a command';
    };

    this.speechRecognition.onresult = (event) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      const displayText = final || interim;
      if (this.voiceTranscript && displayText) {
        this.voiceTranscript.textContent = `"${displayText}"`;
      }

      if (final) {
        this.processVoiceCommand(final.trim());
      }
    };

    this.speechRecognition.onerror = (event) => {
      console.warn('Speech recognition error:', event.error);
      this.stopListening();
      if (event.error === 'not-allowed') {
        this.showToast('Microphone access denied. Enable permissions in browser.', 'error');
      }
    };

    this.speechRecognition.onend = () => {
      this.stopListening();
    };
  }

  toggleListening() {
    if (!this.speechRecognition) {
      this.showToast('Speech Recognition not supported in this browser.', 'error');
      return;
    }

    if (this.isListening) {
      this.stopListening();
    } else {
      try {
        this.speechRecognition.start();
      } catch (e) {
        this.stopListening();
      }
    }
  }

  stopListening() {
    this.isListening = false;
    if (this.speechRecognition) {
      try { this.speechRecognition.stop(); } catch {}
    }
    if (this.voiceBanner) this.voiceBanner.style.display = 'none';
    if (this.voiceTriggerBtn) this.voiceTriggerBtn.classList.remove('active');
  }

  processVoiceCommand(command) {
    const cmd = command.toLowerCase().trim();
    this.sound.play('click');

    // 1. Theme Commands
    if (cmd.includes('dark mode') || cmd.includes('night mode')) {
      this.setTheme('dark');
      this.showToast('🎙️ Switched to Dark Mode', 'success');
      return;
    }
    if (cmd.includes('light mode') || cmd.includes('day mode')) {
      this.setTheme('light');
      this.showToast('🎙️ Switched to Light Mode', 'success');
      return;
    }
    if (cmd.includes('toggle theme')) {
      this.toggleTheme();
      return;
    }

    // 2. Sound Commands
    if (cmd.includes('mute sound') || cmd.includes('turn off sound')) {
      this.sound.enabled = true;
      this.toggleSound();
      return;
    }
    if (cmd.includes('enable sound') || cmd.includes('turn on sound')) {
      this.sound.enabled = false;
      this.toggleSound();
      return;
    }

    // 3. Navigation / Drawers
    if (cmd.includes('history') || cmd.includes('activity')) {
      this.openActivityDrawer();
      return;
    }
    if (cmd.includes('guide') || cmd.includes('help') || cmd.includes('shortcuts')) {
      this.openGuideModal();
      return;
    }
    if (cmd.includes('backup') || cmd.includes('export json')) {
      this.exportJsonBackup();
      return;
    }
    if (cmd.includes('export csv') || cmd.includes('export spreadsheet')) {
      this.exportCsv();
      return;
    }

    // 4. Search & Filter Commands
    if (cmd.startsWith('search ') || cmd.startsWith('find ')) {
      const query = cmd.replace(/^(search|find)\s+/, '').trim();
      this.searchInput.value = query;
      this.searchQuery = query;
      this.render();
      this.showToast(`🎙️ Searched: "${query}"`, 'info');
      return;
    }
    if (cmd.includes('clear search') || cmd.includes('clear filter') || cmd.includes('show all')) {
      this.searchInput.value = '';
      this.searchQuery = '';
      this.currentFilter = 'all';
      this.currentTag = 'all';
      this.updateFilterButtons();
      this.render();
      this.showToast('🎙️ Reset all filters', 'info');
      return;
    }
    if (cmd.includes('filter high') || cmd.includes('high priority')) {
      this.setFilter('high');
      return;
    }
    if (cmd.includes('filter overdue') || cmd.includes('show overdue')) {
      this.setFilter('overdue');
      return;
    }
    if (cmd.includes('due today') || cmd.includes('today')) {
      this.setFilter('today');
      return;
    }

    // 5. Create Task Commands (e.g., "create task fix login due tomorrow", "add high priority task database migration")
    if (cmd.startsWith('add task') || cmd.startsWith('create task') || cmd.startsWith('new task') || cmd.startsWith('make task')) {
      let rawText = cmd.replace(/^(add task|create task|new task|make task)\s*/, '').trim();

      // Priority detection
      let priority = 'medium';
      if (rawText.includes('high priority') || rawText.includes('priority high') || rawText.includes('urgent')) {
        priority = 'high';
        rawText = rawText.replace(/(high priority|priority high|urgent)/g, '').trim();
      } else if (rawText.includes('low priority') || rawText.includes('priority low')) {
        priority = 'low';
        rawText = rawText.replace(/(low priority|priority low)/g, '').trim();
      }

      // Due date detection
      let dueDate = '';
      const today = new Date();
      if (rawText.includes('due tomorrow') || rawText.includes('tomorrow')) {
        const tomorrow = new Date(today.getTime() + 86400000);
        dueDate = tomorrow.toISOString().split('T')[0];
        rawText = rawText.replace(/(due tomorrow|tomorrow)/g, '').trim();
      } else if (rawText.includes('due today') || rawText.includes('today')) {
        dueDate = today.toISOString().split('T')[0];
        rawText = rawText.replace(/(due today|today)/g, '').trim();
      }

      // Tag detection
      let tag = 'Feature';
      if (rawText.includes('bug')) { tag = 'Bug'; rawText = rawText.replace(/\bbug\b/g, '').trim(); }
      else if (rawText.includes('design')) { tag = 'Design'; rawText = rawText.replace(/\bdesign\b/g, '').trim(); }
      else if (rawText.includes('devops')) { tag = 'DevOps'; rawText = rawText.replace(/\bdevops\b/g, '').trim(); }
      else if (rawText.includes('backend')) { tag = 'Backend'; rawText = rawText.replace(/\bbackend\b/g, '').trim(); }

      const title = rawText.replace(/^to\s+/, '').trim() || 'New Voice Task';
      const capitalizedTitle = title.charAt(0).toUpperCase() + title.slice(1);

      this.addTask({
        title: capitalizedTitle,
        description: `Created via Whispr Flow voice recognition on ${new Date().toLocaleTimeString()}`,
        priority,
        tag,
        dueDate
      }, true);
      return;
    }

    // Fallback: general query
    this.showToast(`🎙️ Voice heard: "${command}" (Say 'help' for commands)`, 'info');
  }

  // ========================================================================
  // In-Field Speech Dictation
  // ========================================================================
  dictateField(targetId, btnEl) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      this.showToast('Speech Recognition not supported in this browser.', 'error');
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'en-US';

    btnEl.classList.add('listening');
    this.sound.play('voiceStart');

    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      const targetInput = document.getElementById(targetId);
      if (targetInput) {
        if (targetInput.tagName === 'TEXTAREA' && targetInput.value) {
          targetInput.value += ' ' + transcript;
        } else {
          targetInput.value = transcript;
        }
      }
      this.sound.play('click');
    };

    rec.onend = () => {
      btnEl.classList.remove('listening');
    };

    rec.onerror = () => {
      btnEl.classList.remove('listening');
    };

    try { rec.start(); } catch {}
  }

  // ========================================================================
  // Rendering
  // ========================================================================
  render() {
    this.updateStats();
    this.renderColumns();
  }

  getFilteredTasks() {
    let filtered = [...this.tasks];

    // Search query
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.tag && t.tag.toLowerCase().includes(q))
      );
    }

    // Priority / Date filter
    const today = new Date().toISOString().split('T')[0];
    if (this.currentFilter === 'high') {
      filtered = filtered.filter(t => t.priority === 'high');
    } else if (this.currentFilter === 'medium') {
      filtered = filtered.filter(t => t.priority === 'medium');
    } else if (this.currentFilter === 'low') {
      filtered = filtered.filter(t => t.priority === 'low');
    } else if (this.currentFilter === 'today') {
      filtered = filtered.filter(t => t.dueDate === today);
    } else if (this.currentFilter === 'overdue') {
      filtered = filtered.filter(t => t.dueDate && t.dueDate < today && t.status !== 'done');
    }

    // Tag filter
    if (this.currentTag !== 'all') {
      filtered = filtered.filter(t => t.tag === this.currentTag);
    }

    // Sort: High priority first, then date
    const weights = { high: 3, medium: 2, low: 1 };
    filtered.sort((a, b) => {
      if (weights[a.priority] !== weights[b.priority]) {
        return weights[b.priority] - weights[a.priority];
      }
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    return filtered;
  }

  renderColumns() {
    const filtered = this.getFilteredTasks();
    const cols = [
      { status: 'todo', containerId: 'todoTasks', countId: 'countTodo' },
      { status: 'inprogress', containerId: 'inprogressTasks', countId: 'countInprogress' },
      { status: 'done', containerId: 'doneTasks', countId: 'countDone' }
    ];

    cols.forEach(col => {
      const container = document.getElementById(col.containerId);
      const countEl = document.getElementById(col.countId);
      if (!container) return;

      const colTasks = filtered.filter(t => t.status === col.status);
      countEl.textContent = colTasks.length;

      container.innerHTML = '';

      if (colTasks.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">📭</div>
            <div class="empty-state-text">No tasks in this lane</div>
          </div>
        `;
        return;
      }

      colTasks.forEach(task => {
        container.appendChild(this.createTaskElement(task));
      });
    });
  }

  createTaskElement(task) {
    const card = document.createElement('div');
    card.className = 'task-card';
    card.dataset.id = task.id;
    card.draggable = true;

    const today = new Date().toISOString().split('T')[0];
    const isOverdue = task.dueDate && task.dueDate < today && task.status !== 'done';
    const isToday = task.dueDate === today;

    const priorityEmojis = { high: '🔴', medium: '🟡', low: '🟢' };

    card.innerHTML = `
      <div class="task-meta-top">
        <div class="task-badges">
          <span class="task-priority priority-${task.priority}">
            ${priorityEmojis[task.priority]} ${task.priority}
          </span>
          ${task.tag ? `<span class="task-tag-badge">${this.escapeHtml(task.tag)}</span>` : ''}
        </div>
        <div class="task-actions">
          <button class="card-action-btn edit-task-btn" title="Edit Task">✏️</button>
          <button class="card-action-btn delete-task-btn" title="Delete Task">🗑️</button>
        </div>
      </div>

      <div class="task-title">${this.escapeHtml(task.title)}</div>

      ${task.description ? `<div class="task-description">${this.escapeHtml(task.description)}</div>` : ''}

      <div class="task-meta-bottom">
        <div class="task-due-date ${isOverdue ? 'overdue' : ''} ${isToday ? 'today' : ''}">
          ${task.dueDate ? `📅 ${this.formatDate(task.dueDate)} ${isOverdue ? '(Overdue)' : isToday ? '(Today)' : ''}` : '<span>No deadline</span>'}
        </div>
        <div class="quick-move-wrap">
          <select class="quick-move-select" title="Move lane">
            <option value="todo" ${task.status === 'todo' ? 'selected' : ''}>To Do</option>
            <option value="inprogress" ${task.status === 'inprogress' ? 'selected' : ''}>In Progress</option>
            <option value="done" ${task.status === 'done' ? 'selected' : ''}>Done</option>
          </select>
        </div>
      </div>
    `;

    // Drag events
    card.addEventListener('dragstart', (e) => {
      this.draggedTaskId = task.id;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', task.id);
      setTimeout(() => card.classList.add('dragging'), 0);
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      this.draggedTaskId = null;
      document.querySelectorAll('.column').forEach(c => c.classList.remove('drag-over'));
    });

    // Buttons
    card.querySelector('.edit-task-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      this.openTaskModal(task);
    });

    card.querySelector('.delete-task-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      this.deleteTask(task.id);
    });

    card.querySelector('.quick-move-select').addEventListener('change', (e) => {
      e.stopPropagation();
      this.moveTask(task.id, e.target.value);
    });

    return card;
  }

  updateStats() {
    const total = this.tasks.length;
    const inProgress = this.tasks.filter(t => t.status === 'inprogress').length;
    const completed = this.tasks.filter(t => t.status === 'done').length;
    const today = new Date().toISOString().split('T')[0];
    const overdue = this.tasks.filter(t => t.dueDate && t.dueDate < today && t.status !== 'done').length;
    const rate = total === 0 ? 0 : Math.round((completed / total) * 100);

    this.statsTotal.textContent = total;
    this.statsInProgress.textContent = inProgress;
    this.statsCompleted.textContent = completed;
    this.statsOverdue.textContent = overdue;
    this.statsRate.textContent = `${rate}%`;

    if (this.progressBarFill) {
      this.progressBarFill.style.width = `${rate}%`;
    }
    if (this.progressSubtext) {
      this.progressSubtext.textContent = `${completed} of ${total} tasks completed (${rate}%)`;
    }
  }

  renderActivities() {
    if (!this.activityList) return;
    this.activityList.innerHTML = '';

    if (this.activities.length === 0) {
      this.activityList.innerHTML = '<div class="empty-state"><div class="empty-state-text">No recent activity</div></div>';
      return;
    }

    this.activities.forEach(item => {
      const el = document.createElement('div');
      el.className = 'activity-item';
      const timeStr = new Date(item.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      el.innerHTML = `
        <div>${this.escapeHtml(item.text)}</div>
        <div class="activity-item-time">${timeStr}</div>
      `;
      this.activityList.appendChild(el);
    });
  }

  // ========================================================================
  // Modals & Panels
  // ========================================================================
  openTaskModal(task = null) {
    if (task) {
      this.modalTitle.textContent = 'Edit Task';
      this.submitBtn.innerHTML = '<span class="btn-icon">✏️</span><span>Update Task</span>';
      this.taskIdInput.value = task.id;
      this.taskTitleInput.value = task.title;
      this.taskDescInput.value = task.description || '';
      this.taskPriorityInput.value = task.priority || 'medium';
      this.taskDueDateInput.value = task.dueDate || '';

      // Radio tag
      const tagRadio = document.querySelector(`input[name="taskTag"][value="${task.tag || 'Feature'}"]`);
      if (tagRadio) tagRadio.checked = true;
    } else {
      this.modalTitle.textContent = 'Add New Task';
      this.submitBtn.innerHTML = '<span class="btn-icon">+</span><span>Add Task</span>';
      this.taskForm.reset();
      this.taskIdInput.value = '';
      this.taskPriorityInput.value = 'medium';
      const defaultTag = document.querySelector('input[name="taskTag"][value="Feature"]');
      if (defaultTag) defaultTag.checked = true;
    }

    this.modalOverlay.classList.add('active');
    setTimeout(() => this.taskTitleInput.focus(), 80);
  }

  closeTaskModal() {
    this.modalOverlay.classList.remove('active');
    this.taskForm.reset();
    this.taskIdInput.value = '';
  }

  handleFormSubmit(e) {
    e.preventDefault();
    const title = this.taskTitleInput.value.trim();
    if (!title) {
      this.showToast('Please enter a task title', 'error');
      return;
    }

    const selectedTag = document.querySelector('input[name="taskTag"]:checked');

    const taskData = {
      title,
      description: this.taskDescInput.value.trim(),
      priority: this.taskPriorityInput.value,
      dueDate: this.taskDueDateInput.value,
      tag: selectedTag ? selectedTag.value : 'Feature'
    };

    const taskId = this.taskIdInput.value;
    if (taskId) {
      this.updateTask(taskId, taskData);
    } else {
      this.addTask(taskData);
    }

    this.closeTaskModal();
  }

  showConfirm(title, message, onOk) {
    this.confirmTitle.textContent = title;
    this.confirmMessage.textContent = message;
    this.confirmOverlay.style.display = 'flex';

    const handleOk = () => {
      this.confirmOverlay.style.display = 'none';
      cleanup();
      onOk();
    };

    const handleCancel = () => {
      this.confirmOverlay.style.display = 'none';
      cleanup();
    };

    const cleanup = () => {
      this.confirmOk.removeEventListener('click', handleOk);
      this.confirmCancel.removeEventListener('click', handleCancel);
    };

    this.confirmOk.addEventListener('click', handleOk);
    this.confirmCancel.addEventListener('click', handleCancel);
  }

  // ========================================================================
  // Activity Drawer & Guide Modal
  // ========================================================================
  openActivityDrawer() {
    this.renderActivities();
    this.activityDrawer.classList.add('open');
    this.drawerBackdrop.classList.add('active');
    if (this.historyBadgeDot) this.historyBadgeDot.style.display = 'none';
  }

  closeActivityDrawer() {
    this.activityDrawer.classList.remove('open');
    this.drawerBackdrop.classList.remove('active');
  }

  openGuideModal() {
    this.guideOverlay.classList.add('active');
  }

  closeGuideModal() {
    this.guideOverlay.classList.remove('active');
  }

  // ========================================================================
  // Command Palette (⌘K)
  // ========================================================================
  openCommandPalette() {
    this.paletteOverlay.classList.add('active');
    this.paletteInput.value = '';
    this.renderPaletteCommands('');
    setTimeout(() => this.paletteInput.focus(), 60);
  }

  closeCommandPalette() {
    this.paletteOverlay.classList.remove('active');
  }

  renderPaletteCommands(filterText) {
    const q = filterText.toLowerCase().trim();
    const commands = [
      { icon: '🎙️', name: 'Start Voice Assistant', action: () => this.toggleListening(), kbd: 'V' },
      { icon: '➕', name: 'Create New Task', action: () => this.openTaskModal(), kbd: 'N' },
      { icon: '🌙', name: 'Switch to Dark Mode', action: () => this.setTheme('dark'), kbd: '' },
      { icon: '☀️', name: 'Switch to Light Mode', action: () => this.setTheme('light'), kbd: '' },
      { icon: '🔴', name: 'Filter High Priority Tasks', action: () => this.setFilter('high'), kbd: '' },
      { icon: '⚠️', name: 'Filter Overdue Tasks', action: () => this.setFilter('overdue'), kbd: '' },
      { icon: '🔄', name: 'Show All Tasks (Reset Filters)', action: () => this.setFilter('all'), kbd: '' },
      { icon: '📜', name: 'Open Activity History', action: () => this.openActivityDrawer(), kbd: 'H' },
      { icon: '💾', name: 'Export JSON Backup', action: () => this.exportJsonBackup(), kbd: '' },
      { icon: '📊', name: 'Export to CSV Spreadsheet', action: () => this.exportCsv(), kbd: '' },
      { icon: '❓', name: 'Voice & Hotkeys Guide', action: () => this.openGuideModal(), kbd: '?' }
    ];

    const filtered = q
      ? commands.filter(c => c.name.toLowerCase().includes(q))
      : commands;

    this.paletteResults.innerHTML = '';
    if (filtered.length === 0) {
      this.paletteResults.innerHTML = '<div style="padding: 1rem; text-align: center; color: var(--text-muted);">No matching commands</div>';
      return;
    }

    filtered.forEach((cmd, idx) => {
      const item = document.createElement('div');
      item.className = 'palette-item' + (idx === 0 ? ' selected' : '');
      item.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.65rem;">
          <span>${cmd.icon}</span>
          <span>${this.escapeHtml(cmd.name)}</span>
        </div>
        ${cmd.kbd ? `<kbd>${cmd.kbd}</kbd>` : ''}
      `;
      item.addEventListener('click', () => {
        this.closeCommandPalette();
        cmd.action();
      });
      this.paletteResults.appendChild(item);
    });
  }

  // ========================================================================
  // Theme & Sound Management
  // ========================================================================
  loadTheme() {
    const saved = localStorage.getItem('flowboard_theme') || 'light';
    this.setTheme(saved);
  }

  setTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('flowboard_theme', theme);
    if (this.themeToggle) {
      this.themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
  }

  toggleTheme() {
    const current = document.body.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    this.setTheme(next);
    this.sound.play('click');
    this.logActivity(`Switched to ${next} mode`);
  }

  loadSoundState() {
    if (this.soundIcon) {
      this.soundIcon.textContent = this.sound.enabled ? '🔊' : '🔇';
    }
  }

  toggleSound() {
    const enabled = this.sound.toggle();
    if (this.soundIcon) {
      this.soundIcon.textContent = enabled ? '🔊' : '🔇';
    }
    this.showToast(enabled ? 'Sound effects enabled' : 'Sound effects muted', 'info');
  }

  // ========================================================================
  // Filter & Search Controls
  // ========================================================================
  setFilter(filterName) {
    this.currentFilter = filterName;
    this.updateFilterButtons();
    this.render();
  }

  updateFilterButtons() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === this.currentFilter);
    });
  }

  // ========================================================================
  // Backup, Export & Reset
  // ========================================================================
  exportJsonBackup() {
    const data = {
      app: 'FlowBoard',
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      tasks: this.tasks,
      activities: this.activities
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flowboard-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    this.sound.play('click');
    this.logActivity('Exported JSON backup file');
    this.showToast('📥 Backup downloaded successfully!', 'success');
  }

  exportCsv() {
    const headers = ['ID', 'Title', 'Description', 'Status', 'Priority', 'Tag', 'Due Date', 'Created At'];
    const rows = this.tasks.map(t => [
      `"${t.id}"`,
      `"${(t.title || '').replace(/"/g, '""')}"`,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      `"${t.status}"`,
      `"${t.priority}"`,
      `"${t.tag || ''}"`,
      `"${t.dueDate || ''}"`,
      `"${t.createdAt}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flowboard-tasks-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    this.sound.play('click');
    this.logActivity('Exported CSV spreadsheet');
    this.showToast('📊 CSV spreadsheet exported!', 'success');
  }

  importJson(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (Array.isArray(parsed.tasks)) {
          this.tasks = parsed.tasks;
          this.saveTasks();
          if (Array.isArray(parsed.activities)) {
            this.activities = parsed.activities;
            this.saveActivities();
          }
          this.render();
          this.sound.play('complete');
          this.logActivity('Restored board from backup file');
          this.showToast('📤 Board restored from backup successfully!', 'success');
        } else {
          throw new Error('Invalid schema');
        }
      } catch (err) {
        this.showToast('Failed to import: Invalid JSON backup file', 'error');
      }
    };
    reader.readAsText(file);
  }

  resetToDemo() {
    this.showConfirm(
      'Reset Demo Data?',
      'This will replace current tasks with the initial demo setup. Continue?',
      () => {
        this.tasks = this.getInitialSampleTasks();
        this.saveTasks();
        this.render();
        this.sound.play('click');
        this.logActivity('Reset board to default sample state');
        this.showToast('Reset to demo data complete', 'info');
      }
    );
  }

  // ========================================================================
  // Event Listeners
  // ========================================================================
  setupEventListeners() {
    // Top Bar Actions
    this.voiceTriggerBtn.addEventListener('click', () => this.toggleListening());
    if (this.voiceStopBtn) this.voiceStopBtn.addEventListener('click', () => this.stopListening());

    this.addTaskBtn.addEventListener('click', () => this.openTaskModal());
    this.themeToggle.addEventListener('click', () => this.toggleTheme());
    this.soundToggleBtn.addEventListener('click', () => this.toggleSound());
    this.historyToggleBtn.addEventListener('click', () => this.openActivityDrawer());
    this.helpBtn.addEventListener('click', () => this.openGuideModal());
    this.cmdPaletteBtn.addEventListener('click', () => this.openCommandPalette());

    // In-Field Dictation
    document.querySelectorAll('.field-mic-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-target');
        this.dictateField(targetId, btn);
      });
    });

    // Backup dropdown
    this.backupMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.backupDropdown.classList.toggle('show');
    });

    document.addEventListener('click', (e) => {
      if (this.backupDropdown && !this.backupDropdown.contains(e.target)) {
        this.backupDropdown.classList.remove('show');
      }
    });

    this.exportJsonBtn.addEventListener('click', () => {
      this.backupDropdown.classList.remove('show');
      this.exportJsonBackup();
    });

    this.exportCsvBtn.addEventListener('click', () => {
      this.backupDropdown.classList.remove('show');
      this.exportCsv();
    });

    this.importJsonInput.addEventListener('change', (e) => {
      this.backupDropdown.classList.remove('show');
      if (e.target.files && e.target.files[0]) {
        this.importJson(e.target.files[0]);
      }
    });

    this.resetDemoBtn.addEventListener('click', () => {
      this.backupDropdown.classList.remove('show');
      this.resetToDemo();
    });

    // Activity Drawer
    this.closeDrawerBtn.addEventListener('click', () => this.closeActivityDrawer());
    this.drawerBackdrop.addEventListener('click', () => this.closeActivityDrawer());
    this.clearHistoryBtn.addEventListener('click', () => {
      this.activities = [];
      this.saveActivities();
      this.renderActivities();
      this.showToast('Activity log cleared', 'info');
    });

    // Task Modal
    this.taskForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
    this.modalClose.addEventListener('click', () => this.closeTaskModal());
    this.modalCancel.addEventListener('click', () => this.closeTaskModal());
    this.modalOverlay.addEventListener('click', (e) => {
      if (e.target === this.modalOverlay) this.closeTaskModal();
    });

    // Guide Modal
    this.guideClose.addEventListener('click', () => this.closeGuideModal());
    this.guideOverlay.addEventListener('click', (e) => {
      if (e.target === this.guideOverlay) this.closeGuideModal();
    });

    // Command Palette Modal
    this.paletteOverlay.addEventListener('click', (e) => {
      if (e.target === this.paletteOverlay) this.closeCommandPalette();
    });
    this.paletteInput.addEventListener('input', (e) => {
      this.renderPaletteCommands(e.target.value);
    });

    // Search bar
    this.searchInput.addEventListener('input', (e) => {
      clearTimeout(this.searchTimeout);
      const val = e.target.value.trim();
      if (this.searchClearBtn) {
        this.searchClearBtn.style.display = val ? 'block' : 'none';
      }
      this.searchTimeout = setTimeout(() => {
        this.searchQuery = val;
        this.render();
      }, 250);
    });

    if (this.searchClearBtn) {
      this.searchClearBtn.addEventListener('click', () => {
        this.searchInput.value = '';
        this.searchQuery = '';
        this.searchClearBtn.style.display = 'none';
        this.render();
        this.searchInput.focus();
      });
    }

    // Filter Buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.setFilter(btn.dataset.filter);
      });
    });

    // Tag Filter Chips
    document.querySelectorAll('.tag-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.tag-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.currentTag = chip.dataset.tag;
        this.render();
      });
    });

    // Drag and Drop (Columns)
    document.querySelectorAll('.column').forEach(col => {
      col.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        col.classList.add('drag-over');
      });

      col.addEventListener('dragleave', (e) => {
        if (!col.contains(e.relatedTarget)) {
          col.classList.remove('drag-over');
        }
      });

      col.addEventListener('drop', (e) => {
        e.preventDefault();
        col.classList.remove('drag-over');
        const taskId = e.dataTransfer.getData('text/plain');
        const newStatus = col.dataset.status;
        if (taskId && newStatus) {
          this.moveTask(taskId, newStatus);
        }
      });
    });

    // Global Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);

      // Escape closes any open modal
      if (e.key === 'Escape') {
        this.closeTaskModal();
        this.closeGuideModal();
        this.closeCommandPalette();
        this.closeActivityDrawer();
        if (this.confirmOverlay) this.confirmOverlay.style.display = 'none';
        if (isInput) document.activeElement.blur();
        return;
      }

      // Command Palette (⌘K or Ctrl+K)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        this.openCommandPalette();
        return;
      }

      if (isInput) return;

      if (e.key === 'v' || e.key === 'V') {
        e.preventDefault();
        this.toggleListening();
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        this.openTaskModal();
      } else if (e.key === '/') {
        e.preventDefault();
        this.searchInput.focus();
      } else if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        this.openActivityDrawer();
      } else if (e.key === '?') {
        e.preventDefault();
        this.openGuideModal();
      }
    });
  }

  // ========================================================================
  // Utilities & Helpers
  // ========================================================================
  showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    this.toastContainer.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('show'));

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 250);
    }, 3200);
  }

  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  formatDate(dateStr) {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  }
}

// ==========================================================================
// Bootstrap
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  window.flowBoardApp = new FlowBoardApp();
  window.flowBoardApp.init();
});
