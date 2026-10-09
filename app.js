/**
 * FlowBoard — Smart Kanban Task Manager
 * Built with Whispr Flow — Voice-Driven Development
 */

class FlowBoard {
  constructor() {
    this.tasks = [];
    this.currentFilter = 'all';
    this.searchQuery = '';
    this.searchTimeout = null;
    this.draggedTaskId = null;
  }

  init() {
    this.cacheDom();
    this.loadTheme();
    this.loadTasks();
    this.setupEventListeners();
    this.render();
  }

  // =====================
  // DOM Caching
  // =====================

  cacheDom() {
    this.board = document.getElementById('board');
    this.searchInput = document.getElementById('searchInput');
    this.statsTotal = document.getElementById('statsTotal');
    this.statsCompleted = document.getElementById('statsCompleted');
    this.statsOverdue = document.getElementById('statsOverdue');
    this.statsRate = document.getElementById('statsRate');
    this.modalOverlay = document.getElementById('modalOverlay');
    this.taskForm = document.getElementById('taskForm');
    this.modalTitleEl = document.getElementById('modalTitle');
    this.taskIdInput = document.getElementById('taskIdInput');
    this.taskTitleInput = document.getElementById('taskTitleInput');
    this.taskDescInput = document.getElementById('taskDescInput');
    this.taskPriorityInput = document.getElementById('taskPriorityInput');
    this.taskDueDateInput = document.getElementById('taskDueDateInput');
    this.themeToggle = document.getElementById('themeToggle');
    this.toastContainer = document.getElementById('toastContainer');
    this.addTaskBtn = document.getElementById('addTaskBtn');
    this.modalClose = document.getElementById('modalClose');
    this.modalCancel = document.getElementById('modalCancel');
    this.submitBtn = document.getElementById('submitBtn');
    this.confirmOverlay = document.getElementById('confirmOverlay');
    this.confirmOk = document.getElementById('confirmOk');
    this.confirmCancel = document.getElementById('confirmCancel');
    this.filterButtons = document.querySelectorAll('[data-filter]');
  }

  // =====================
  // Data Management
  // =====================

  loadTasks() {
    const saved = localStorage.getItem('flowboard_tasks');
    if (saved) {
      try {
        this.tasks = JSON.parse(saved);
      } catch {
        this.tasks = this.getSampleTasks();
        this.saveTasks();
      }
    } else {
      this.tasks = this.getSampleTasks();
      this.saveTasks();
    }
  }

  saveTasks() {
    localStorage.setItem('flowboard_tasks', JSON.stringify(this.tasks));
  }

  getSampleTasks() {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const tomorrow = new Date(now.getTime() + 86400000).toISOString().split('T')[0];
    const yesterday = new Date(now.getTime() - 86400000).toISOString().split('T')[0];
    const twoDaysAgo = new Date(now.getTime() - 2 * 86400000).toISOString().split('T')[0];

    return [
      {
        id: this.generateId(), title: 'Design landing page',
        description: 'Create wireframes and high-fidelity mockups for the new product landing page.',
        status: 'todo', priority: 'high', dueDate: today, createdAt: now.toISOString()
      },
      {
        id: this.generateId(), title: 'Setup CI/CD pipeline',
        description: 'Configure GitHub Actions for automated testing and deployment.',
        status: 'todo', priority: 'medium', dueDate: tomorrow, createdAt: now.toISOString()
      },
      {
        id: this.generateId(), title: 'Implement user authentication',
        description: 'Add JWT-based login, registration, and password reset endpoints.',
        status: 'inprogress', priority: 'high', dueDate: yesterday, createdAt: now.toISOString()
      },
      {
        id: this.generateId(), title: 'Write API documentation',
        description: 'Document all REST API endpoints with request/response examples.',
        status: 'inprogress', priority: 'low', dueDate: '', createdAt: now.toISOString()
      },
      {
        id: this.generateId(), title: 'Fix mobile navigation bug',
        description: 'Hamburger menu does not close after selecting a menu item on mobile.',
        status: 'done', priority: 'medium', dueDate: twoDaysAgo, createdAt: now.toISOString()
      },
      {
        id: this.generateId(), title: 'Deploy v1.0 to production',
        description: 'Push the initial release to AWS with health checks and monitoring.',
        status: 'done', priority: 'high', dueDate: yesterday, createdAt: now.toISOString()
      }
    ];
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
  }

  // =====================
  // CRUD Operations
  // =====================

  addTask(taskData) {
    const newTask = {
      id: this.generateId(),
      title: taskData.title.trim(),
      description: (taskData.description || '').trim(),
      status: 'todo',
      priority: taskData.priority || 'medium',
      dueDate: taskData.dueDate || '',
      createdAt: new Date().toISOString()
    };
    this.tasks.push(newTask);
    this.saveTasks();
    this.render();
    this.showToast('✅ Task added successfully!', 'success');
  }

  editTask(taskId, updatedData) {
    const idx = this.tasks.findIndex(t => t.id === taskId);
    if (idx !== -1) {
      this.tasks[idx] = { ...this.tasks[idx], ...updatedData };
      this.saveTasks();
      this.render();
      this.showToast('✏️ Task updated!', 'success');
    }
  }

  deleteTask(taskId) {
    this.showConfirm('Delete this task?', 'This action cannot be undone.', () => {
      this.tasks = this.tasks.filter(t => t.id !== taskId);
      this.saveTasks();
      this.render();
      this.showToast('🗑️ Task deleted', 'success');
    });
  }

  moveTask(taskId, newStatus) {
    const task = this.tasks.find(t => t.id === taskId);
    if (task && task.status !== newStatus) {
      task.status = newStatus;
      this.saveTasks();
      this.render();
      const labels = { todo: 'To Do', inprogress: 'In Progress', done: 'Done' };
      this.showToast(`📋 Moved to ${labels[newStatus]}`, 'success');
    }
  }

  // =====================
  // Filtering & Sorting
  // =====================

  getFilteredTasks() {
    let filtered = [...this.tasks];

    // Search filter
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
      );
    }

    // Category filter
    const today = new Date().toISOString().split('T')[0];
    switch (this.currentFilter) {
      case 'high':
        filtered = filtered.filter(t => t.priority === 'high');
        break;
      case 'today':
        filtered = filtered.filter(t => t.dueDate === today);
        break;
      case 'overdue':
        filtered = filtered.filter(t => t.dueDate && t.dueDate < today && t.status !== 'done');
        break;
    }

    // Sort: high priority first, then by creation date (oldest first)
    const pw = { high: 3, medium: 2, low: 1 };
    filtered.sort((a, b) => {
      if (pw[a.priority] !== pw[b.priority]) return pw[b.priority] - pw[a.priority];
      return new Date(a.createdAt) - new Date(b.createdAt);
    });

    return filtered;
  }

  // =====================
  // Rendering
  // =====================

  render() {
    this.updateStats();
    this.renderBoard();
  }

  renderBoard() {
    const filtered = this.getFilteredTasks();
    const columns = [
      { status: 'todo', containerId: 'todoTasks', countId: 'countTodo' },
      { status: 'inprogress', containerId: 'inprogressTasks', countId: 'countInprogress' },
      { status: 'done', containerId: 'doneTasks', countId: 'countDone' }
    ];

    columns.forEach(col => {
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
            <div class="empty-state-text">No tasks here yet</div>
          </div>`;
        return;
      }

      colTasks.forEach(task => {
        container.appendChild(this.createTaskCard(task));
      });
    });
  }

  createTaskCard(task) {
    const card = document.createElement('div');
    card.className = 'task-card';
    card.dataset.id = task.id;
    card.draggable = true;

    const today = new Date().toISOString().split('T')[0];
    const isOverdue = task.dueDate && task.dueDate < today && task.status !== 'done';

    const priorityEmoji = { high: '🔴', medium: '🟡', low: '🟢' };

    card.innerHTML = `
      <div class="task-meta">
        <span class="task-priority priority-${task.priority}">
          ${priorityEmoji[task.priority]} ${task.priority}
        </span>
        <div class="task-actions">
          <button class="edit-btn" title="Edit task">✏️</button>
          <button class="delete-btn" title="Delete task">🗑️</button>
        </div>
      </div>
      <div class="task-title">${this.escapeHtml(task.title)}</div>
      ${task.description ? `<div class="task-description">${this.escapeHtml(task.description)}</div>` : ''}
      ${task.dueDate ? `<div class="task-due-date ${isOverdue ? 'overdue' : ''}">📅 ${this.formatDate(task.dueDate)}${isOverdue ? ' — Overdue!' : ''}</div>` : ''}
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
      // Clean up any drag-over highlights
      document.querySelectorAll('.column.drag-over').forEach(c => c.classList.remove('drag-over'));
    });

    // Edit button
    card.querySelector('.edit-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      this.openModal(task);
    });

    // Delete button
    card.querySelector('.delete-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      this.deleteTask(task.id);
    });

    return card;
  }

  updateStats() {
    const total = this.tasks.length;
    const completed = this.tasks.filter(t => t.status === 'done').length;
    const today = new Date().toISOString().split('T')[0];
    const overdue = this.tasks.filter(t => t.dueDate && t.dueDate < today && t.status !== 'done').length;
    const rate = total === 0 ? 0 : Math.round((completed / total) * 100);

    this.statsTotal.textContent = total;
    this.statsCompleted.textContent = completed;
    this.statsOverdue.textContent = overdue;
    this.statsRate.textContent = `${rate}%`;
  }

  // =====================
  // Modal
  // =====================

  openModal(task = null) {
    if (task) {
      // Edit mode
      this.modalTitleEl.textContent = 'Edit Task';
      this.submitBtn.innerHTML = '<span class="btn-icon">✏️</span> Update Task';
      this.taskIdInput.value = task.id;
      this.taskTitleInput.value = task.title;
      this.taskDescInput.value = task.description;
      this.taskPriorityInput.value = task.priority;
      this.taskDueDateInput.value = task.dueDate;
    } else {
      // Add mode
      this.modalTitleEl.textContent = 'Add New Task';
      this.submitBtn.innerHTML = '<span class="btn-icon">+</span> Add Task';
      this.taskForm.reset();
      this.taskIdInput.value = '';
      this.taskPriorityInput.value = 'medium';
    }

    this.modalOverlay.classList.add('active');
    setTimeout(() => this.taskTitleInput.focus(), 100);
  }

  closeModal() {
    this.modalOverlay.classList.remove('active');
    this.taskForm.reset();
    this.taskIdInput.value = '';
  }

  handleFormSubmit(e) {
    e.preventDefault();

    const title = this.taskTitleInput.value.trim();
    if (!title) {
      this.taskTitleInput.style.animation = 'shake 0.3s ease';
      setTimeout(() => this.taskTitleInput.style.animation = '', 300);
      this.showToast('❌ Title is required!', 'error');
      return;
    }

    const taskData = {
      title,
      description: this.taskDescInput.value.trim(),
      priority: this.taskPriorityInput.value,
      dueDate: this.taskDueDateInput.value
    };

    const taskId = this.taskIdInput.value;
    if (taskId) {
      this.editTask(taskId, taskData);
    } else {
      this.addTask(taskData);
    }

    this.closeModal();
  }

  // =====================
  // Confirm Dialog
  // =====================

  showConfirm(title, message, onConfirm) {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    this.confirmOverlay.style.display = 'flex';
    this.confirmOverlay.style.opacity = '1';

    const handleOk = () => {
      this.confirmOverlay.style.display = 'none';
      this.confirmOk.removeEventListener('click', handleOk);
      onConfirm();
    };

    const handleCancel = () => {
      this.confirmOverlay.style.display = 'none';
      this.confirmOk.removeEventListener('click', handleOk);
    };

    this.confirmOk.addEventListener('click', handleOk);
    this.confirmCancel.addEventListener('click', handleCancel);
  }

  // =====================
  // Theme
  // =====================

  loadTheme() {
    const savedTheme = localStorage.getItem('flowboard_theme') || 'light';
    document.body.setAttribute('data-theme', savedTheme);
    this.updateThemeIcon(savedTheme);
  }

  toggleTheme() {
    const current = document.body.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', next);
    localStorage.setItem('flowboard_theme', next);
    this.updateThemeIcon(next);
  }

  updateThemeIcon(theme) {
    if (this.themeToggle) {
      this.themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
  }

  // =====================
  // Toast Notifications
  // =====================

  showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    this.toastContainer.appendChild(toast);

    // Trigger reflow then animate in
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // =====================
  // Drag & Drop
  // =====================

  setupColumnDragListeners() {
    document.querySelectorAll('.column').forEach(column => {
      column.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        column.classList.add('drag-over');
      });

      column.addEventListener('dragleave', (e) => {
        // Only remove if we're actually leaving the column
        if (!column.contains(e.relatedTarget)) {
          column.classList.remove('drag-over');
        }
      });

      column.addEventListener('drop', (e) => {
        e.preventDefault();
        column.classList.remove('drag-over');
        const taskId = e.dataTransfer.getData('text/plain');
        const newStatus = column.dataset.status;
        if (taskId && newStatus) {
          this.moveTask(taskId, newStatus);
        }
      });
    });
  }

  // =====================
  // Event Listeners
  // =====================

  setupEventListeners() {
    // Add task button
    this.addTaskBtn.addEventListener('click', () => this.openModal());

    // Form submit
    this.taskForm.addEventListener('submit', (e) => this.handleFormSubmit(e));

    // Modal close buttons
    this.modalClose.addEventListener('click', () => this.closeModal());
    this.modalCancel.addEventListener('click', () => this.closeModal());

    // Click outside modal to close
    this.modalOverlay.addEventListener('click', (e) => {
      if (e.target === this.modalOverlay) this.closeModal();
    });

    // Theme toggle
    this.themeToggle.addEventListener('click', () => this.toggleTheme());

    // Search with debounce
    this.searchInput.addEventListener('input', (e) => {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = setTimeout(() => {
        this.searchQuery = e.target.value.trim();
        this.render();
        this.setupColumnDragListeners();
      }, 300);
    });

    // Filter buttons
    this.filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentFilter = btn.dataset.filter;
        this.render();
        this.setupColumnDragListeners();
      });
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      const activeTag = document.activeElement.tagName;
      const isTyping = activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT';

      if (e.key === 'Escape') {
        this.closeModal();
        if (this.confirmOverlay.style.display === 'flex') {
          this.confirmOverlay.style.display = 'none';
        }
        if (isTyping) document.activeElement.blur();
        return;
      }

      if (isTyping) return;

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        this.openModal();
      } else if (e.key === '/') {
        e.preventDefault();
        this.searchInput.focus();
      }
    });

    // Setup column drag listeners after initial render
    this.setupColumnDragListeners();

    // Re-setup drag listeners after any re-render via MutationObserver
    const observer = new MutationObserver(() => {
      this.setupColumnDragListeners();
    });
    observer.observe(this.board, { childList: true, subtree: true });
  }

  // =====================
  // Utilities
  // =====================

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  }
}

// =====================
// Initialize
// =====================
document.addEventListener('DOMContentLoaded', () => {
  const app = new FlowBoard();
  app.init();
});
