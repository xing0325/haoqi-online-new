const views = document.querySelectorAll('.view');
const navItems = document.querySelectorAll('.nav-item');
const pageKicker = document.getElementById('page-kicker');
const sidebar = document.querySelector('.sidebar');
const modal = document.getElementById('modal-backdrop');
const modalTitle = document.getElementById('modal-title');
const modalOptions = document.getElementById('modal-options');
const leaveForm = document.getElementById('leave-form');

const labels = {
  home: '此刻',
  courses: '课程',
  schedule: '我的一周',
  credits: '信用积分',
  reading: '阅读联赛',
  projects: '做事空间',
  community: '大家在干嘛',
};

function showView(viewName) {
  const selected = labels[viewName] ? viewName : 'home';
  views.forEach((view) => view.classList.toggle('active', view.id === `${selected}-view`));
  navItems.forEach((item) => item.classList.toggle('active', item.dataset.view === selected));
  pageKicker.innerHTML = `好奇学习社区 / <span>${labels[selected]}</span>`;
  sidebar.classList.remove('open');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

navItems.forEach((item) => {
  item.addEventListener('click', (event) => {
    event.preventDefault();
    showView(item.dataset.view);
    history.replaceState(null, '', `#${item.dataset.view}`);
  });
});

document.querySelectorAll('[data-open-view]').forEach((button) => {
  button.addEventListener('click', () => showView(button.dataset.openView));
});

document.querySelector('.mobile-menu').addEventListener('click', () => sidebar.classList.toggle('open'));

document.getElementById('notice-close').addEventListener('click', () => {
  const banner = document.getElementById('notice-banner');
  banner.style.opacity = '0';
  banner.style.transform = 'translateY(-6px)';
  setTimeout(() => banner.remove(), 220);
});

document.querySelectorAll('.course-chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.course-chip').forEach((item) => item.classList.remove('selected'));
    chip.classList.add('selected');
    const filter = chip.dataset.filter;
    document.querySelectorAll('.feed-item').forEach((item) => {
      const visible = filter === 'all' || item.dataset.course === filter;
      item.style.display = visible ? 'flex' : 'none';
    });
  });
});

function openModal(mode = 'create') {
  const isLeave = mode === 'leave';
  modalTitle.textContent = isLeave ? '提前说一声' : '你想发起什么？';
  modalOptions.hidden = isLeave;
  leaveForm.hidden = !isLeave;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
}

function closeModal() {
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
}

document.getElementById('create-button').addEventListener('click', openModal);
document.getElementById('status-button').addEventListener('click', openModal);
document.getElementById('plan-button').addEventListener('click', openModal);
document.getElementById('project-create').addEventListener('click', openModal);
document.getElementById('community-status').addEventListener('click', openModal);
document.getElementById('leave-button').addEventListener('click', () => openModal('leave'));
document.querySelector('.modal-close').addEventListener('click', closeModal);
modal.addEventListener('click', (event) => { if (event.target === modal) closeModal(); });
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeModal(); });

document.querySelectorAll('.modal-options button').forEach((option) => {
  option.addEventListener('click', () => {
    option.classList.add('chosen');
    option.querySelector('small').textContent = '第一版正在准备，想法已经记下。';
  });
});

document.querySelectorAll('.vote-option').forEach((option) => {
  option.addEventListener('click', () => {
    document.querySelectorAll('.vote-option').forEach((item) => item.classList.remove('selected-vote'));
    option.classList.add('selected-vote');
  });
});

leaveForm.addEventListener('submit', (event) => {
  event.preventDefault();
  document.getElementById('leave-submit').textContent = '草稿已保存 · 等待提交接口';
});

const requestedView = window.location.hash.slice(1);
if (labels[requestedView]) showView(requestedView);
