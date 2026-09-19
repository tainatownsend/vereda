# Vereda — próxima implementação do North Star

## Referência e decisão

Base inspecionada: main 939d48e (PR #114). O registro de conclusão V1.2 de 13/09 não encerra o novo pedido visual de 17/09.

Fontes consultadas: contexto do projeto, atualização aprovada de 17/09, mockup fornecido pela fundadora e registro da publicação V1.2. Referências privadas permanecem fora deste repositório público.

Decisão da fundadora nesta revisão: manter as proporções do mockup por padrão, com opção de leitura ampliada. Reproduzir as interfaces dentro dos quatro aparelhos; molduras, perspectiva e cenário de apresentação não fazem parte do produto. O mockup é referência de composição, não uma fonte de conteúdo doutrinário ou de autoria.

## Evidência e limites

1. Abertura pública: página e navegação para Entrar funcionaram no navegador desta revisão. Nenhuma tela em branco foi observada nesse percurso.
2. Login: formulário de e-mail/senha e Google disponível. Não havia sessão autenticada.
3. Início, Estudos, Leitura e Reflexões: comparação visual em execução bloqueada por login. Os achados abaixo são de código, não observações de telas autenticadas.
4. Mobile e acessibilidade: ainda precisam de captura nas larguras alvo e teste com leitor de tela; não há alegação de conformidade ou igualdade visual.

Não foi comprovado que o deployment público corresponde ao commit main inspecionado. Registrar commit e URL imutável no próximo gate.

## Ordem de implementação

### P0 — abertura recuperável (correção preparada nesta branch)

Evidência: index.html tinha root vazio; main.jsx importava todo App estaticamente; createClient é executado na avaliação do módulo; init no store aguardava getSession sem catch nem limite. Falha de configuração/importação podia impedir a montagem e rejeição/travamento da sessão podia manter loading indefinidamente.

Mudanças: shell HTML inicial com ação de recarregar; importação de App com recuperação de falha; ErrorBoundary de renderização; prazo de 12s para sessão; tela de recuperação em rotas autenticadas e de login quando a sessão falha; chamadas ao perfil adiadas para fora do callback de autenticação. Não limpar armazenamento, não deslogar automaticamente e não reiniciar progresso.

Aceite: configuração ausente, chunk indisponível e erro de renderização apresentam recuperação; sessão rejeitada ou sem resposta sai do spinner; resultado tardio não autentica uma sessão abandonada; recarregar permite nova tentativa. Testes do helper cobrem sessão válida, ausência de sessão, erro retornado, rejeição e timeout.

Limite: este patch não prova a causa do relato anterior. Não elimina falhas de conexão em todos os carregamentos. useBooks/LibraryPage ainda precisam separar vazio, erro e carregamento; useUserData ainda precisa de erro visível e nova tentativa. Não marcar livros/progresso como carregados com sucesso quando a consulta retorna erro.

### P1 — navegação e Estudos

Arquivos: src/components/ui/BottomNav.jsx, src/pages/LibraryPage.jsx, src/pages/SettingsPage.jsx.

Hoje: cinco destinos (Início/Biblioteca/Jornada/Notas/Perfil); barra escondida em Reflexões. Biblioteca contém grande promoção de Estudo Guiado, abas Básicas/Complementares e trilha numerada.

Alvo: quatro destinos Início/Estudos/Reflexões/Mais, com barra também em Reflexões. Estudos abre lista compacta logo abaixo de título, busca e filtros Todos/Em andamento/Concluídos. Cada linha: capa real, título, autor, progresso e seta circular verde. Mover Jornada/Notas/Salvos para Mais, preservando rotas e dados; manter acesso claro a estudo guiado e sugestões de obras.

Aceite: todos os destinos anteriores continuam acessíveis; estado ativo correto; filtros usam progresso real, não percentuais decorativos; busca tem rótulo; lista vazia explica por quê; 320/360/390/430px sem overflow; barra não cobre conteúdo ou teclado. Definir concluído pelo contrato real de progresso, não inferir de current_section sem verificar semântica.

### P1 — Home

Arquivo: src/pages/HomePage.jsx; estilos e componentes compartilhados.

Hoje: cabeçalho horizontal com VEREDA em caixa alta, frases adicionais, separador; saudação isolada com emoji; cartão branco de leitura com plano/frequência; nenhuma paisagem no hero.

Alvo: marca central discreta, perfil no canto, paisagem dourada com saudação na parte inferior, cartão Continuar estudo com painel verde profundo, posição e progresso; Reflexão do dia em cartão creme com detalhe botânico. Remover emoji da saudação. Transferir plano/frequência secundários para Mais, sem perder funcionalidade. Usar posição real e estado inicial honesto para pessoa sem leitura.

Aceite: ação principal chega ao trecho salvo; retomada preservada após recarregar; nome longo não colide com perfil; paisagem tem fallback que preserva altura e contraste; cartão de reflexão não cresce por ações secundárias ausentes no mockup.

### P1 — Leitura e Reflexões

Arquivos: src/pages/ReaderPage.jsx, src/pages/ReflectionPage.jsx, componentes do estudo guiado.

Leitura: replicar ordem voltar/Aa/salvar; livro e parte; capítulo; texto; bloco Para refletir; anterior/próximo. Separar modo de leitura livre e estudo guiado sem inventar reflexão específica para um trecho. Preservar marcações, notas e posição existentes. Esconder controles secundários em menu acessível.

Reflexões: Hoje/Favoritas/Minhas, paisagem superior e citação com autoria centralizadas, ações Salvar/Compartilhar e navegação inferior. Hoje usa reflexão editorial; Minhas usa diário pessoal. Não atribuir textos editoriais a Chico Xavier apenas porque o mockup o mostra: conservar — Vereda e usar nome de autor externo apenas com fonte verificada.

Aceite: salvar persiste; compartilhar cancelado não aparece como erro; preferência Aa persiste; aumentar fonte não corta texto, botões ou bloco de reflexão; textos pessoais não recebem autoria externa.

### P1 — assets e tokens

Arquivos: src/components/northstar/NorthStarUI.jsx, src/assets, public, src/index.css, tailwind.config.js.

Hoje: BookCover desenha capa com cor sólida/ícone/texto; Reflexões usa paisagem SVG; fontes, tons e bordas precisam de comparação renderizada. Não substituir os assets aprovados por outros desenhos aproximados.

Preparar logo, paisagem dourada, folhagem e cinco capas com fontes reutilizáveis; verificar direitos dos assets. Definir tokens a partir dos assets e dos recortes retos das telas: creme, verde oliva, dourado suave, títulos serifados, controles discretos. Não deduzir medidas exatas dos aparelhos em perspectiva. Aprovar por comparação no mesmo viewport/estado.

### P1 — leitura ampliada sem alterar padrão

Nesta branch: atalho Leitura ampliada em Configurações usa preferências persistentes existentes: aplicativo xl (18px base) e obras xl (28px). Escala padrão permanece md. Retorno através dos seletores existentes. Esta é uma primeira entrega; controles com medidas fixas em px ainda precisam ser revisados.

Próximo: disponibilizar a preferência em Mais e no Aa do leitor. Testar zoom 200%, VoiceOver, ordem de foco, nomes acessíveis, navegação por teclado, contraste dos textos sobre fotos e áreas de toque de pelo menos 44x44px usando padding invisível quando necessário para preservar proporções aparentes.

## Gate para dizer “igual ao mockup”

- Registrar URL e commit da build candidata e autenticar uma conta de teste autorizada.
- Capturar as quatro telas em 390px e comparar lado a lado com recortes correspondentes da referência. Repetir em 320/360/430px para adaptação, sem forçar mesma quebra de linha em todas as larguras.
- Comparar hierarquia, distribuição vertical, tamanho da marca, enquadramento das imagens, fontes, cards, cores, espaçamento e navegação. Corrigir divergências antes da próxima captura.
- Testar padrão e ampliado; nome longo; sem progresso; progresso existente; filtros vazios; offline; sessão expirada; abrir rota profunda; voltar do background; versão PWA antiga após deploy.
- Validar no iPhone Safari real. Emulação desktop não equivale a esse aceite.
- Não declarar fidelidade exata, publicação concluída ou eliminação de tela em branco sem essas evidências.

## Observação sobre testes atuais

Os testes tests/ui/north_star_canonical.test.js verificam strings como Biblioteca, cinco destinos e frases da Home antiga. Isso protege a composição anterior; não comprova fidelidade ao novo mockup. Atualizar esses contratos junto de cada mudança e acrescentar testes de comportamento (retomada, filtros, dados preservados), além das capturas visuais.
