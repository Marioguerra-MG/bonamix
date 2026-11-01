// Variável global para armazenar os dados obtidos da planilha
let dadosGlobais = [];

// ==========================================
// 1. SEGURANÇA (Proteção contra XSS)
// ==========================================
function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ==========================================
// 2. PARSER DE URL DO GOOGLE SHEETS
// ==========================================
// Converte o link completo colado pelo usuário para o formato de exportação CSV via Gviz
function obterUrlExportacao(urlBruta) {
  try {
    const matchId = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/.exec(urlBruta);
    const id = matchId ? matchId[1] : '';

    let gid = '0';
    if (urlBruta.includes('gid=')) {
      gid = urlBruta.split('gid=')[1].split('&')[0].split('#')[0];
    }

    if (!id) throw new Error('O link digitado não é uma URL válida do Google Sheets.');

    return `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&gid=${gid}`;
  } catch (e) {
    throw e;
  }
}

// ==========================================
// 3. CARREGAMENTO DOS DADOS DA PLANILHA
// ==========================================
async function carregarDados() {
  const tbody = document.getElementById('corpoTabela');
  const statusConexao = document.getElementById('statusConexao');
  
  // Pega o link salvo no input da modal de configuração ou do campo direto
  const inputUrl = document.getElementById('inputUrlPlanilha') || document.getElementById('inputUrlPlanilhaModal');
  const urlDigitada = inputUrl ? inputUrl.value.trim() : '';

  if (!urlDigitada) {
    tbody.innerHTML = '<tr><td colspan="7" class="erro">Nenhum link de planilha configurado. Clique na engrenagem (⚙️) no topo.</td></tr>';
    statusConexao.innerText = 'Link ausente';
    return;
  }

  // Salva o link no localStorage para lembrar no próximo acesso
  localStorage.setItem('linkPlanilhaSalvo', urlDigitada);

  try {
    // Exibe loading apenas se a tabela estiver vazia para não piscar a tela toda vez na atualização automática
    if (dadosGlobais.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="loading">Buscando dados na planilha...</td></tr>';
    }
    statusConexao.innerText = 'Carregando...';

    const endpointUrl = obterUrlExportacao(urlDigitada);
    const response = await fetch(endpointUrl);
    if (!response.ok) throw new Error(`Erro ao acessar planilha (Status: ${response.status})`);

    const csvText = await response.text();
    const linhas = csvText.split(/\r?\n/).slice(1); // Ignora a linha de cabeçalho

    // Mapeia as linhas do CSV para objetos estruturados
    dadosGlobais = linhas.map(linha => {
      const col = linha.match(/(?:\"[^\"]*\"|[^,])+/g)?.map(c => c.replace(/^"|"$/g, '').trim()) || [];
      return {
        dataHora: col[0] || '',
        filial: col[1] || '',
        fornecedor: col[2] || '',
        numeroNF: col[3] || '',
        vencimentoValor: col[4] || '',
        chaveAcesso: col[5] || '',
        temFrete: col[6] || '',
        boletoFrete: col[7] || '',
        status: col[8] || ''
      };
    }).filter(item => item.numeroNF.trim() !== ''); // Remove linhas vazias

    document.getElementById('totalRegistros').innerText = `${dadosGlobais.length} NFs - Atualizado agora`;
    statusConexao.innerText = 'Conectado e Atualizado';
    
    // Renderiza a tabela aplicando os filtros atuais (como a filial selecionada)
    filtrar();

  } catch (error) {
    tbody.innerHTML = `<tr><td colspan="7" class="erro">ERRO: ${escapeHtml(error.message)}<br><small>Verifique se o link está correto e se a planilha foi publicada na web.</small></td></tr>`;
    statusConexao.innerText = 'Erro na conexão';
  }
}

// ==========================================
// 4. RENDERIZAÇÃO DA TABELA NA TELA
// ==========================================
function renderizar(dados) {
  const tbody = document.getElementById('corpoTabela');
  if (dados.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="vazio">Nenhum resultado encontrado para o filtro</td></tr>';
    return;
  }

  tbody.innerHTML = dados.map(item => {
    let classe = 'status-conferir';
    const s = item.status.toLowerCase();

    if (s.includes('liberado')) classe = 'status-liberado';
    if (s.includes('aguardar')) classe = 'status-aguardar';

    return `
      <tr>
        <td>${escapeHtml(item.dataHora)}</td>
        <td>${escapeHtml(item.filial)}</td>
        <!-- Fornecedor com truncamento (3 pontos) e tooltip no mouse -->
        <td><span class="texto-truncado" title="${escapeHtml(item.fornecedor)}">${escapeHtml(item.fornecedor)}</span></td>
        <td><strong>${escapeHtml(item.numeroNF)}</strong></td>
        <!-- Vencimento/Valor com truncamento (3 pontos) e tooltip no mouse -->
        <td><span class="texto-truncado" title="${escapeHtml(item.vencimentoValor)}">${escapeHtml(item.vencimentoValor)}</span></td>
        <!-- Chave de Acesso formatada em monospaced com truncamento -->
        <td class="chave" title="${escapeHtml(item.chaveAcesso)}">${escapeHtml(item.chaveAcesso)}</td>
        <td><span class="badge ${classe}">${escapeHtml(item.status)}</span></td>
      </tr>
    `;
  }).join('');
}

// ==========================================
// 5. SISTEMA DE FILTRAGEM LOCAL
// ==========================================
function filtrar() {
  const busca = document.getElementById('busca').value.toLowerCase().trim();
  const filial = document.getElementById('filtroFilial').value.toLowerCase().trim();
  const status = document.getElementById('filtroStatus').value.toLowerCase().trim();

  const filtrados = dadosGlobais.filter(d =>
    (d.fornecedor.toLowerCase().includes(busca) ||
     d.numeroNF.toLowerCase().includes(busca) ||
     d.chaveAcesso.toLowerCase().includes(busca)) &&
    d.filial.toLowerCase().includes(filial) &&
    d.status.toLowerCase().includes(status)
  );

  renderizar(filtrados);
}

// ==========================================
// 6. CONTROLE DOS MODAIS (Configuração e Menu)
// ==========================================
const modalLink = document.getElementById('modalLink');
const btnAbrirModalLink = document.getElementById('btnAbrirModal');
const btnFecharModalLink = document.getElementById('btnFecharModal');
const btnSalvarModal = document.getElementById('btnSalvarModal');

if (btnAbrirModalLink && modalLink) {
  btnAbrirModalLink.addEventListener('click', () => { modalLink.style.display = 'flex'; });
}
if (btnFecharModalLink && modalLink) {
  btnFecharModalLink.addEventListener('click', () => { modalLink.style.display = 'none'; });
}
if (btnSalvarModal && modalLink) {
  btnSalvarModal.addEventListener('click', () => {
    modalLink.style.display = 'none';
    carregarDados();
  });
}

// ==========================================
// 7. EVENTOS E ATUALIZAÇÃO EM TEMPO REAL
// ==========================================
document.getElementById('busca').addEventListener('input', filtrar);
document.getElementById('filtroFilial').addEventListener('change', filtrar);
document.getElementById('filtroStatus').addEventListener('change', filtrar);

// Botão Atualizar: busca dados novos mantendo rigorosamente a filial e filtros ativos
document.getElementById('btnAtualizar').addEventListener('click', async () => {
  await carregarDados();
  filtrar();
});

// TEMPO REAL (POLLING): Atualiza automaticamente a planilha a cada 30 segundos em segundo plano,
// respeitando a filial ou busca que o operador estiver usando no momento.
setInterval(async () => {
  await carregarDados();
  filtrar();
}, 30000); // 30000 ms = 30 segundos (você pode alterar para 60000 se preferir 1 minuto)

// Inicialização ao carregar a página
window.addEventListener('DOMContentLoaded', () => {
  const linkSalvo = localStorage.getItem('linkPlanilhaSalvo');
  const inputUrl = document.getElementById('inputUrlPlanilha') || document.getElementById('inputUrlPlanilhaModal');
  
  if (linkSalvo && inputUrl) {
    inputUrl.value = linkSalvo;
  }
  
  carregarDados();
});