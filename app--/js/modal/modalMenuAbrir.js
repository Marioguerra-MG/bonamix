// CONTROLE APENAS DO MODAL MENU
const modalMenu = document.getElementById('modalMenu');
const btnAbrirMenu = document.getElementById('abrirMenu');
const btnFecharMenuTopo = document.getElementById('btnFecharMenuTopo');
const btnFecharMenuAbaixo = document.getElementById('btnFecharMenuAbaixo');

btnAbrirMenu.addEventListener('click', () => {
  modalMenu.style.display = 'flex';
});

btnFecharMenuTopo.addEventListener('click', () => {
  modalMenu.style.display = 'none';
});

btnFecharMenuAbaixo.addEventListener('click', () => {
  modalMenu.style.display = 'none';
});

// Fecha o modal ao clicar fora da janela
window.addEventListener('click', (event) => {
  if (event.target === modalMenu) {
    modalMenu.style.display = 'none';
  }
});