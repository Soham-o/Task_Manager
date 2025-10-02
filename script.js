// In script.js

document.addEventListener('DOMContentLoaded', () => {
    // --- START: NEW AUTH GUARD ---
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));

    if (!currentUser) {
        // If no user is logged in, redirect to the auth page
        window.location.href = 'auth_page.html';
        return; // Stop further execution
    }
    // --- END: NEW AUTH GUARD ---

    taskManager = new TaskManager();
});
class TaskManager {
    constructor() {
        this.currentUser = JSON.parse(localStorage.getItem('currentUser'));
        this.tasksKey = `tasks_${this.currentUser.email}`;
        this.tasks = this.loadTasks();
        this.currentView = 'list';
        this.editingTaskId = null;
        this.init();
    }

    init() {
        document.getElementById('userName').textContent = `Welcome, ${this.currentUser.name}!`;
        this.bindEvents();
        this.renderTasks();
        this.updateCounts();
    }

    bindEvents() {
        // Header buttons
        document.getElementById('addTaskBtn').addEventListener('click', () => this.openTaskModal());
        document.getElementById('exportBtn').addEventListener('click', () => this.exportToCSV());
        document.getElementById('importBtn').addEventListener('click', () => document.getElementById('fileInput').click());
        document.getElementById('fileInput').addEventListener('change', (e) => this.importFromCSV(e));
        document.getElementById('signOutBtn').addEventListener('click', () => this.signOut());

        // View toggle
        document.getElementById('listViewBtn').addEventListener('click', () => this.switchView('list'));
        document.getElementById('boardViewBtn').addEventListener('click', () => this.switchView('board'));

        // Modal
        document.getElementById('closeModalBtn').addEventListener('click', () => this.closeTaskModal());
        document.getElementById('taskModal').addEventListener('click', (e) => {
            if (e.target.id === 'taskModal') this.closeTaskModal();
        });

        // Form
        document.getElementById('taskForm').addEventListener('submit', (e) => this.handleTaskSubmit(e));

        // Custom status dropdown
        this.setupCustomDropdown();

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeTaskModal();
        });
    }

    setupCustomDropdown() {
        const selectWrapper = document.querySelector('.select-wrapper');
        const select = document.getElementById('taskStatus');
        const statusOptions = document.getElementById('statusOptions');
        const options = statusOptions.querySelectorAll('.status-option');

        selectWrapper.addEventListener('click', () => {
            statusOptions.classList.toggle('show');
        });

        options.forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                const value = option.dataset.value;
                select.value = value;
                options.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                statusOptions.classList.remove('show');
            });
        });

        document.addEventListener('click', (e) => {
            if (!selectWrapper.contains(e.target)) {
                statusOptions.classList.remove('show');
            }
        });
    }

    switchView(view) {
        this.currentView = view;
        
        const listViewBtn = document.getElementById('listViewBtn');
        const boardViewBtn = document.getElementById('boardViewBtn');
        const listView = document.getElementById('listView');
        const boardView = document.getElementById('boardView');

        if (view === 'list') {
            listViewBtn.classList.add('active');
            boardViewBtn.classList.remove('active');
            listView.style.display = 'flex';
            boardView.style.display = 'none';
        } else {
            boardViewBtn.classList.add('active');
            listViewBtn.classList.remove('active');
            listView.style.display = 'none';
            boardView.style.display = 'block';
        }

        this.renderTasks();
    }

    openTaskModal(taskId = null) {
        this.editingTaskId = taskId;
        const modal = document.getElementById('taskModal');
        const modalTitle = document.getElementById('modalTitle');
        const submitBtn = document.getElementById('submitBtn');
        
        if (taskId) {
            const task = this.tasks.find(t => t.id === taskId);
            modalTitle.textContent = 'Edit task';
            submitBtn.textContent = 'Update task';
            this.populateForm(task);
        } else {
            modalTitle.textContent = 'Add task';
            submitBtn.textContent = 'Add task';
            this.clearForm();
        }
        
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    closeTaskModal() {
        const modal = document.getElementById('taskModal');
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        this.editingTaskId = null;
        this.clearForm();
    }

    populateForm(task) {
        document.getElementById('taskName').value = task.name;
        document.getElementById('taskDescription').value = task.description;
        document.getElementById('taskStatus').value = task.status;
        
        if (task.dueDate) {
            const date = new Date(task.dueDate);
            document.getElementById('taskDay').value = date.getDate();
            document.getElementById('taskMonth').value = date.getMonth() + 1;
            document.getElementById('taskYear').value = date.getFullYear();
        }

        // Update custom dropdown
        const options = document.querySelectorAll('.status-option');
        options.forEach(opt => {
            opt.classList.toggle('selected', opt.dataset.value === task.status);
        });
    }

    clearForm() {
        document.getElementById('taskForm').reset();
        document.querySelectorAll('.status-option').forEach(opt => {
            opt.classList.toggle('selected', opt.dataset.value === 'todo');
        });
    }

    handleTaskSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const name = document.getElementById('taskName').value.trim();
        const description = document.getElementById('taskDescription').value.trim();
        const status = document.getElementById('taskStatus').value;
        const day = document.getElementById('taskDay').value;
        const month = document.getElementById('taskMonth').value;
        const year = document.getElementById('taskYear').value;

        if (!name) {
            alert('Please enter a task name');
            return;
        }

        let dueDate = null;
        if (day && month && year) {
            dueDate = new Date(year, month - 1, day).toISOString();
        }

        const taskData = {
            name,
            description,
            status,
            dueDate,
            createdAt: new Date().toISOString()
        };

        if (this.editingTaskId) {
            this.updateTask(this.editingTaskId, taskData);
        } else {
            this.addTask(taskData);
        }

        this.closeTaskModal();
    }

    addTask(taskData) {
        const task = {
            id: Date.now().toString(),
            ...taskData
        };
        
        this.tasks.push(task);
        this.saveTasks();
        this.renderTasks();
        this.updateCounts();
    }

    updateTask(taskId, taskData) {
        const index = this.tasks.findIndex(t => t.id === taskId);
        if (index !== -1) {
            this.tasks[index] = { ...this.tasks[index], ...taskData };
            this.saveTasks();
            this.renderTasks();
            this.updateCounts();
        }
    }

    deleteTask(taskId) {
        if (confirm('Are you sure you want to delete this task?')) {
            this.tasks = this.tasks.filter(t => t.id !== taskId);
            this.saveTasks();
            this.renderTasks();
            this.updateCounts();
        }
    }

    renderTasks() {
        if (this.currentView === 'list') {
            this.renderListView();
        } else {
            this.renderBoardView();
        }
    }

    renderListView() {
        const containers = {
            todo: document.getElementById('todoTasks'),
            doing: document.getElementById('doingTasks'),
            done: document.getElementById('doneTasks')
        };

        Object.keys(containers).forEach(status => {
            containers[status].innerHTML = '';
            const tasksForStatus = this.tasks.filter(task => task.status === status);
            
            if (tasksForStatus.length === 0) {
                containers[status].innerHTML 
            } else {
                tasksForStatus.forEach(task => {
                    containers[status].appendChild(this.createTaskCard(task));
                });
            }
        });
    }

    renderBoardView() {
        const containers = {
            todo: document.getElementById('todoBoard'),
            doing: document.getElementById('doingBoard'),
            done: document.getElementById('doneBoard')
        };

        Object.keys(containers).forEach(status => {
            containers[status].innerHTML;
            const tasksForStatus = this.tasks.filter(task => task.status === status);
            
            if (tasksForStatus.length === 0) {
                containers[status].innerHTML;
            } else {
                tasksForStatus.forEach(task => {
                    containers[status].appendChild(this.createTaskCard(task));
                });
            }
        });
    }

    createTaskCard(task) {
        const card = document.createElement('div');
        card.className = 'task-card';
        card.dataset.taskId = task.id;

        const dueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '';
        
        card.innerHTML = `
            <div class="task-title">${this.escapeHtml(task.name)}</div>
            ${task.description ? `<div class="task-description">${this.escapeHtml(task.description)}</div>` : ''}
            ${dueDate ? `<div class="task-due-date">Due: ${dueDate}</div>` : ''}
            <div class="task-actions">
                <button class="edit-btn" onclick="taskManager.openTaskModal('${task.id}')">Edit</button>
                <button class="delete-btn" onclick="taskManager.deleteTask('${task.id}')">Delete</button>
            </div>
        `;

        return card;
    }

    updateCounts() {
        const counts = {
            todo: this.tasks.filter(t => t.status === 'todo').length,
            doing: this.tasks.filter(t => t.status === 'doing').length,
            done: this.tasks.filter(t => t.status === 'done').length
        };

        // Update list view counts
        document.querySelector('.status-section[data-status="todo"] .status-count').textContent = counts.todo;
        document.querySelector('.status-section[data-status="doing"] .status-count').textContent = counts.doing;
        document.querySelector('.status-section[data-status="done"] .status-count').textContent = counts.done;

        // Update board view counts
        document.querySelector('.board-column[data-status="todo"] .status-count').textContent = counts.todo;
        document.querySelector('.board-column[data-status="doing"] .status-count').textContent = counts.doing;
        document.querySelector('.board-column[data-status="done"] .status-count').textContent = counts.done;
    }

    exportToCSV() {
        if (this.tasks.length === 0) {
            alert('No tasks to export');
            return;
        }

        const headers = ['ID', 'Name', 'Description', 'Status', 'Due Date', 'Created At'];
        const csvContent = [
            headers.join(','),
            ...this.tasks.map(task => [
                task.id,
                `"${this.escapeCSV(task.name)}"`,
                `"${this.escapeCSV(task.description || '')}"`,
                task.status,
                task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '',
                new Date(task.createdAt).toLocaleDateString()
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tasks-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }

    importFromCSV(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const csv = e.target.result;
                const lines = csv.split('\n');
                const headers = lines[0].split(',');

                if (!headers.includes('Name') || !headers.includes('Status')) {
                    alert('Invalid CSV format. Required columns: Name, Status');
                    return;
                }

                const importedTasks = [];
                for (let i = 1; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (!line) continue;

                    const values = this.parseCSVLine(line);
                    if (values.length < headers.length) continue;

                    const task = {
                        id: Date.now().toString() + i,
                        name: values[headers.indexOf('Name')] || `Task ${i}`,
                        description: values[headers.indexOf('Description')] || '',
                        status: this.normalizeStatus(values[headers.indexOf('Status')] || 'todo'),
                        dueDate: this.parseDueDate(values[headers.indexOf('Due Date')]),
                        createdAt: new Date().toISOString()
                    };

                    importedTasks.push(task);
                }

                if (importedTasks.length > 0) {
                    const shouldReplace = confirm(`Found ${importedTasks.length} tasks. Replace existing tasks?`);
                    if (shouldReplace) {
                        this.tasks = importedTasks;
                    } else {
                        this.tasks.push(...importedTasks);
                    }
                    this.saveTasks();
                    this.renderTasks();
                    this.updateCounts();
                    alert(`Successfully imported ${importedTasks.length} tasks`);
                } else {
                    alert('No valid tasks found in the CSV file');
                }
            } catch (error) {
                alert('Error reading CSV file: ' + error.message);
            }
        };

        reader.readAsText(file);
        event.target.value = '';
    }

    parseCSVLine(line) {
        const values = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        values.push(current.trim());
        return values;
    }

    parseDueDate(dateString) {
        if (!dateString || dateString === '""' || dateString === '') return null;
        
        try {
            const cleaned = dateString.replace(/"/g, '');
            const date = new Date(cleaned);
            return isNaN(date.getTime()) ? null : date.toISOString();
        } catch {
            return null;
        }
    }

    normalizeStatus(status) {
        const cleaned = status.replace(/"/g, '').toLowerCase();
        if (cleaned.includes('doing') || cleaned.includes('progress')) return 'doing';
        if (cleaned.includes('done') || cleaned.includes('complete')) return 'done';
        return 'todo';
    }

    signOut() {
        if (confirm('Are you sure you want to sign out? All data will be cleared.')) {
            localStorage.removeItem('currentUser');
            window.location.href = 'auth_page.html'
            this.tasks = [];
            this.renderTasks();
            this.updateCounts();
            alert('Signed out successfully');
        }
    }

    loadTasks() {
        try {
            const saved = localStorage.getItem('tasks');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    }

    saveTasks() {
        try {
            localStorage.setItem(this.tasksKey, JSON.stringify(this.tasks));
        } catch (error) {
            alert('Error saving tasks: ' + error.message);
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    escapeCSV(text) {
        return text.replace(/"/g, '""');
    }
}

// Initialize the task manager when the page loads
let taskManager;
document.addEventListener('DOMContentLoaded', () => {
    taskManager = new TaskManager();
});