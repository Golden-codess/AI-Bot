/*
  NAV.JS
*/

const GoldenappNav = {
  init() {
    document.querySelectorAll('.tabbar__btn').forEach(btn => {
      btn.addEventListener('click', () => this.goTo(btn.dataset.target));
    });
  },

  goTo(target) {
    document.querySelectorAll('.view').forEach(v => {
      v.classList.toggle('view--active', v.dataset.view === target);
    });
    document.querySelectorAll('.tabbar__btn').forEach(b => {
      b.classList.toggle('tabbar__btn--active', b.dataset.target === target);
    });
    if (target === 'tasks') GoldenappTasks.init();
  },
};
