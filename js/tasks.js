/*
  TASKS.JS
*/

const GoldenappTasks = {
  async init() {
    await this._load();
    document.getElementById('tasksProgress').textContent =
      this._doneCount() + '/' + Goldenapp.user.dailyTasks.length;
  },

  async _load() {
    const tasks = await GoldenappApi.getTasks();
    Goldenapp.user.dailyTasks = Array.isArray(tasks) ? tasks : [];
    this._render();
  },

  _doneCount() {
    return Goldenapp.user.dailyTasks.filter(t => t.completed).length;
  },

  _render() {
    const stack = document.getElementById('taskStack');
    stack.innerHTML = '';

    Goldenapp.user.dailyTasks.forEach((task, idx) => {
      const card = document.createElement('div');
      card.className = 'task-card' + (task.completed ? ' task-card--done' : '');
      card.innerHTML = `
        <div class="task-card__glyph">📺</div>
        <div class="task-card__body">
          <span class="task-card__title">Reklama ko'rish (${idx + 1}/${Goldenapp.user.dailyTasks.length})</span>
          <span class="task-card__reward">+300 🪙</span>
        </div>
        <button class="task-card__action" type="button" ${task.completed ? 'disabled' : ''}>
          ${task.completed ? '✅' : 'Ko\'rish'}
        </button>
      `;
      if (!task.completed) {
        card.querySelector('.task-card__action').addEventListener('click', () => {
          GoldenappAds.showTask(async () => {
            const res = await GoldenappApi.completeTask(task.id);
            if (res && res.success) {
              task.completed = true;
              Goldenapp.addCoin(300);
              GoldenappUI.toast('+300 🪙 qo\'shildi!');
              this._render();
              document.getElementById('tasksProgress').textContent =
                this._doneCount() + '/' + Goldenapp.user.dailyTasks.length;
            }
          });
        });
      }
      stack.appendChild(card);
    });
  },
};
