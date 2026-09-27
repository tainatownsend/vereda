# Vereda — auditoria por personas e correções

Revisão de 23–24/09/2026. Branch `feat/vereda-editorial-north-star`; complemento ao PR #122.

## Conclusão

A direção editorial está consistente nas telas principais. O maior problema desta rodada era confiança: as reflexões ofereciam textos editoriais do aplicativo onde a usuária esperava citações de autores originais. Também havia lacunas na retomada do estudo guiado, retorno de navegação e clareza dos controles de leitura. Essas correções foram implementadas sem alterar o corpus canônico ou o esquema do banco.

O produto ainda precisa de uma primeira experiência mais curta, continuidade unificada entre leitura livre e guiada e validação com pessoas idosas em aparelhos reais. A revisão não equivale a certificação de acessibilidade nem a teste de usabilidade com participantes.

## Personas recuperadas e critérios

As conversas anteriores trouxeram três perfis ilustrativos; o repositório documenta dois perfis operacionais em `docs/ux/persona-stress-test-2026-08-25.md`. Não foram encontrados outros perfis específicos de Vereda no contexto recuperado. Não se incorporaram personas de outros produtos.

| Perfil | Trabalho que quer realizar | Resultado da análise |
|---|---|---|
| Ana, 32 — pouco tempo, nunca terminou O Livro dos Espíritos, sente culpa | Retomar sem cobrança e saber o próximo passo | Home acolhedora e ação principal clara. Corrigida retomada para quem tem somente progresso guiado. Plano ainda registra intenção, não adapta sessões. |
| Carlos, 58 — frequenta centro, busca profundidade, pouca familiaridade digital | Estudar com confiança, conferir fonte, ajustar letras | Autor e fonte agora visíveis e compartilháveis; controles de tamanho agora em português. Índice, notas e ajustes ainda exigem descoberta no menu. |
| Marina, 24 — curiosa, nunca leu Kardec | Entender por onde começar e distinguir obra de orientação | Escolhas iniciais explicadas, mas abertura longa. Introdução do estudo guiado encurtada; “Como funciona” expansível. |
| A — iniciante com pouca familiaridade digital | Começar sem compreender a arquitetura do produto | Quatro destinos ajudam. Corrigidos retorno das abas e caminhos de Notas/Trechos salvos. Ainda há redundância entre Mais, Favoritos e coleções individuais. |
| B — estudante que retorna | Explorar temas, consultar fontes e reencontrar anotações | Pesquisa e trechos de origem preservados. Favoritos passou a incluir também as citações salvas. Falta integrar progresso livre/guiado na coleção. |
| Perspectiva transversal: pessoa idosa / baixa visão | Ler e navegar sem esforço ou rótulos técnicos | Navegação principal 14px e 64px de altura; com ampliação, 15,75px e 72px. Textos pequenos aumentados em telas secundárias; não houve teste real com leitor de tela ou usuário de 80 anos. |

## Percurso avaliado

1. **Entrada e primeiro estudo — atenção.** A interface explica quatro intenções sem prender a pessoa a um caminho. A primeira dobra dedica muito espaço à apresentação; uma pessoa iniciante precisa rolar para conhecer as escolhas e o botão final. Próximo trabalho: reduzir a introdução e aproximar a ação da opção selecionada. Evidência: captura `06-first-study.jpg`. Autenticação é coberta por regressões; acesso real por Google/e-mail e recuperação não foram exercitados com credenciais nesta rodada.
2. **Início e retomada — corrigido, com limite conhecido.** Saudação e leitura livre preservadas. Quem concluiu encontros guiados, mas não tem leitura livre em andamento, agora recebe o próximo encontro. Quando coexistem os dois modos, a leitura livre ainda tem precedência; o modelo guiado atual não registra data de última atividade para ordenar os dois com segurança. Não foi inventada uma ordem temporal. Evidência: `01-home.jpg` e teste comportamental de retomada guiada.
3. **Estudos — saudável no percurso testado.** Coleção coerente, autoria das obras, progresso e filtros. Filtro “Em andamento” conferido no navegador. Os filtros medem leitura livre; não devem ser interpretados como conclusão do percurso guiado. Pesquisa e estudo guiado permanecem acessíveis. Melhoria: evidenciar os dois tipos de progresso com rótulos distintos.
4. **Estudo guiado — corrigido.** Título e apresentação antes ocupavam quase toda a tela de 320px ampliada. Abertura encurtada, explicação expansível, próximo encontro mais próximo. A seleção do próximo percurso agora prioriza um percurso já iniciado. O conteúdo das 40 sessões e ligações às fontes foi preservado. Evidência inicial `03-guided.jpg`, captura final `09-guided-after.jpg`.
5. **Leitor — corrigido.** Corpo editorial, contexto da obra, reflexão claramente identificada como convite do Vereda, anterior/próximo e ocultação da barra inferior preservados. “SM/MD/LG/XL” substituídos por “Pequena/Média/Grande/Extra”, em duas colunas. Os convites de reflexão continuam editoriais: não são citações atribuídas artificialmente a autores. Evidência inicial `05-reader.jpg`, final `10-reader-after.jpg`.
6. **Reflexões e compartilhamento — corrigido.** Sete citações verificadas substituem a rotação editorial diária. Cada registro tem autor, obra/localização, URL e tipo de conteúdo. Fonte acessível em Hoje, anteriores e favoritas; nome e referência também na imagem. Vereda permanece como marca no rodapé. Favoritos antigos conservam texto e ID, identificados como “Vereda · texto editorial”. Textos pessoais não recebem autoria doutrinária. Salvamento e leitura de favorita e de reflexão pessoal testados com dados fictícios. Evidência: `04-share.jpg` e `07-dark-large.jpg`.
7. **Mais, notas e coleções — corrigido.** Retorno de Notas/Trechos salvos considera histórico interno e usa Mais como destino seguro sem histórico. Falha de carregamento das obras em Trechos salvos agora tem recuperação em vez de carregamento indefinido. A coleção Favoritos ganhou acesso às Reflexões favoritas, preservando Minhas reflexões. Resta simplificar os nomes/agrupamento de coleções sem quebrar links existentes.
8. **Plano, jornada e preferências — atenção.** O plano salva duração/frequência, porém não há consumo dessas preferências para adaptar a recomendação de sessões. Corrigida a promessa indevida na interface. Preferências oferecem tamanho do app separado do texto das obras; lembretes explicam a indisponibilidade do navegador. Privacidade ainda não oferece exportação/exclusão autônoma: isso é trabalho funcional pendente, não algo validado ou implementado nesta rodada.

## Correções entregues

- Autoria original e fonte das citações no início, Reflexões, favoritas, histórico e imagem compartilhada.
- Preservação dos IDs e textos editoriais anteriormente favoritados.
- Cálculo da rotação por dia civil sem deslocamento por horário de verão.
- Quebra de linhas para autor/fonte da imagem; espaço reservado para a atribuição.
- Texto de marca do compartilhamento alinhado ao posicionamento atual.
- Troca de abas de Reflexões sem criar entradas adicionais no histórico de voltar.
- Retomada guiada na Home quando não há leitura livre ativa; prioridade a percurso guiado iniciado.
- Introdução do estudo guiado mais curta, detalhes sob demanda.
- Controles de tamanho legíveis em português e tipografia secundária ampliada.
- Retorno contextual em Notas e Trechos salvos; recuperação de erro na carga de obras.
- Reflexões favoritas acessíveis também pela coleção Favoritos.
- Plano com linguagem fiel à funcionalidade atual.

## Melhorias ainda prioritárias

| Prioridade | Melhoria | Por quê / critério de aceitação |
|---|---|---|
| P1 | Unificar continuidade livre/guiada com data de última atividade | Ana deve abrir a Home e retomar o modo usado mais recentemente, sem perder progresso nem confundir encontros com trechos. Exige evolução deliberada do modelo de progresso. |
| P1 | Reduzir a primeira experiência | Marina deve identificar sua escolha e avançar sem percorrer uma longa apresentação. Manter livre escolha e orientação acessível. |
| P1 | Validar acessibilidade em iPhone/Android reais | Carlos e pessoas mais idosas devem ajustar texto, voltar, salvar e retomar sem ajuda. Conferir VoiceOver/TalkBack, teclado, zoom e safe area; não afirmar conformidade só com testes de DOM. |
| P1 | Verificar conta, offline e sincronização entre dois aparelhos | Confirmar Google/e-mail, confirmação, recuperação, retorno de sessão e persistência de notas/favoritas/progresso. A simulação local não valida o serviço. |
| P1 | Dar utilidade concreta ao plano | Usar a duração escolhida nas sugestões sem fragmentar o texto canônico ou criar cobrança de frequência. |
| P2 | Reorganizar coleções de Mais | Reduzir duplicidade entre Favoritos, Trechos salvos e Notas; preservar links e contexto. |
| P2 | Ampliar curadoria de citações verificadas | Sete citações repetem semanalmente. Toda inclusão deve registrar edição, trecho exato, autoria/signatura e localização antes de publicação. |
| P2 | Harmonizar telas secundárias e capas | Capas atuais diferem da coleção do mockup; não substituí-las por capas inventadas. Reduzir introduções e manter hierarquia editorial. |
| P2 | Exportação e gestão dos dados pessoais | Desenhar fluxo claro e reversível quando possível, com testes de autorização. Ainda ausente na interface atual. |

## Evidências e limites de QA

- Comandos executados: `npm ci`, `npm run test:run`, `npm run lint`, `npm run build`.
- Resultado local final: 100 arquivos, 647 testes aprovados; lint sem erros, dois avisos preexistentes de variáveis não utilizadas em scripts do pipeline de conteúdo; build/PWA aprovados.
- Testes novos protegem autoria/fonte das sete imagens, favoritos editoriais antigos, retomada exclusivamente guiada, retorno sem percorrer abas e fallback de navegação secundária.
- Reflexões medida em 320, 360, 375, 390, 414, 430, 768, 1024 e 1280px: sem overflow horizontal nos estados medidos. Registro em `docs/qa/persona-audit/reflection-widths.json`.
- Verificação adicional de Estudos, leitor, Reflexões e Perfil em 320px com texto ampliado; modo escuro em Reflexões. Não é uma certificação de todas as combinações de largura, conteúdo e preferências.
- Navegador usa componentes reais em fixture isolada de desenvolvimento com conta, progressos e conteúdo fictícios. Ela não entra no build de produção. As capturas marcadas QA não representam dados da conta da usuária.
- Imagem compartilhada renderizada pelo mesmo código de canvas do produto. Não foi enviada mensagem a terceiros nem validado o fluxo nativo do WhatsApp no iPhone.
- Não se executou migração de banco nem alteração de texto canônico.
- Revisão heurística por personas, não entrevistas ou observação de participantes reais.

## Fontes da curadoria

As URLs de cada citação ficam no próprio catálogo `src/features/reflections/dailyReflections.js`, com referência visível no produto. Foram conferidos trechos de O Evangelho segundo o Espiritismo (X,16; XV,4–5; XVII,4; XIX,7; VI,5) e do comentário de Kardec à questão 918 de O Livro dos Espíritos. A assinatura de José e a do Espírito de Verdade foram preservadas; não foram substituídas automaticamente por Allan Kardec, organizador da obra. A fala de Jesus indica Mateus 22:39 e a localização da reprodução no Evangelho segundo o Espiritismo.

A frase da captura enviada pela usuária era um texto editorial do catálogo anterior. Não há base verificada para atribuí-la a um autor histórico; ela saiu da rotação diária em vez de receber um nome por suposição.
