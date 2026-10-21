# Vereda: fidelidade à prancha North Star aprovada (21 de outubro de 2026)

> **Estado**: V1 funcional em produção, **fidelidade visual NÃO aprovada**. Issue [#127](https://github.com/tainatownsend/vereda/issues/127). A prancha enviada pela fundadora contém cinco telas e uma linha com paleta/capas/componentes/tipografia. É a referência canônica; renders antigos da PR #125 são evidências de implementação, **não** a arte final.

## Tokens extraídos da prancha

| Uso | Referência |
| --- | --- |
| Verde floresta | `#3E5B3F` |
| Verde sálvia | `#7A8F6B` |
| Dourado solar | `#D4A85A` |
| Marfim | `#F8F4EA` |
| Areia suave | `#E9E1D4` |
| Títulos | Playfair Display Semibold |
| Corpo de leitura e citações | Lora Regular, itálico somente quando a referência utiliza |
| Interface/controles | Inter Regular/Medium |

A fase 1 já substitui a tipografia apenas nas superfícies `northstar-page` e `northstar-reader-page`; evita alterações à landing ou ao OAuth. **Não** marcar fidelidade completa por causa dessas fontes.

## Cinco telas canônicas e desvios bloqueadores

### 01. Início (Home)
- Target: marca de sol/folhas no canto superior esquerdo, perfil à direita, saudação e subtítulo compactos, sol e montanhas **ricamente ilustradas com folhas e flores laterais**, card de retomada creme sobreposto com capa floral individual e CTA redondo discreto; card de reflexão secundário com ilustrações botânicas que abraçam a margem.
- Atual: logo circular/centralizado, paisagem mais difusa e simplificada, retomada em grande bloco verde, reflexão com decoração escassa.
- Correção: recriar ilustrações em assets individuais responsivos; depois alinhar alturas, sobreposição, margens, raios e densidade ao frame.

### 02. Estudos
- Target: filtro **segmentado contíguo** em faixa horizontal, cinco capas botânicas distintas correspondentes às obras, linhas densas com divisores leves, setas em círculos claros, menor altura de cartão.
- Atual: abas em pílulas separadas, capas geométricas e cards grandes com bordas.
- Correção: refazer cinco capas como arquivos próprios, medir tamanhos e proporções em 390px, usar alternância de estados sem variar alturas.

### 03. Reflexões
- Target: paisagem de sol e montanhas com **folhas e flores detalhadas em primeiro plano**, citação em cartão marfim integrado, fonte e autoria verificáveis, ações Salvar/Compartilhar na mesma composição, CTA e reflexões anteriores no fluxo.
- Atual: paisagem lavada sem o detalhamento floral, texto e ações com proporções diferentes.
- Correção: arte botânica responsiva com safe area e tipografia Lora; manter citações genuínas, mesmo quando texto do dia não coincidir com o da imagem.

### 04. Leitor
- Target: cabeçalho enxuto, obra/parte/capítulo, título Playfair e texto Lora em largura confortável com ritmo editorial; **navegação de trechos visível** no rodapé do frame; controles Aa/bookmark/mais.
- Atual: letras e espaçamentos amplos, cabeçalho e hierarquia diferentes; navegação abaixo de grande volume de texto. A comparação precisa preservar acessibilidade: não reduzir o tamanho definido pelo usuário em Grande/Extra nem truncar trecho para caber na referência.
- Correção: reproduzir geometria da opção Média, separar tema do Leitor das preferências globais sem perder leitura, definir rodapé acessível sem sobrepor conteúdo.

### 05. Menu/Opções do Leitor
- Target: único painel, na direita, com Índice, Minha nota, Preferências, Voltar ao início, 2×2 tamanhos, tema do app (Claro/Escuro/Sistema) e tema do Leitor (Claro/Escuro/Sépia).
- Atual: Aa e menu geral separados; opções de tema faltando; print do popup de tamanho mostra conteúdo cortado no lado esquerdo.
- Correção: implementar painel unificado com estados reais e persistência, capturar estado aberto a 320 e 390px; `Escape`, foco, 44px targets e scroll do painel sem clipping.

## Pacote de arte obrigatório antes do aceite

Criar **assets limpos**, independentes e em alta resolução para (i) identidade sun/leaf, (ii) cena de montanhas e sol com flores/folhagens, (iii) cinco capas individuais, (iv) elementos de flores laterais e reflexões. **Não** recortar arte final da imagem composta com molduras/perspectiva de iPhones: geraria baixa qualidade e deformações.

## Procedimento de aceitação

1. Fixar 390×844 CSS px, iPhone/Safari e Chromium, com conteúdo representativo **identificado como fixture** e dados reais em QA autenticado; comparar mesmas cinco telas lado a lado com a prancha.
2. Registrar screenshot e diferenças por regiões: logo, altura da paisagem, área de ilustração, gaps, abas, livros, citação e menu, aceitando diferenças de conteúdo dinâmico quando fiéis às fontes.
3. Verificar 320, 430 e 800 CSS px, modo claro/escuro, tamanho Grande e Extra, nenhum overflow/clipping, alvos de toque >=44px.
4. Preservar e retestar Google OAuth, progresso, notas, favoritos, leitores, citações/fonte e políticas RLS. Não migrar o Supabase para corrigir CSS.
5. Antes de promover: PR draft + Preview com screenshots atualizados e **aceite expresso** da fundadora ao design. Produção mantém V1 funcional até aprovação.

## Limite da fase 1
Somente o sistema tipográfico de títulos/leitura (Playfair/Lora) e tokens fundamentais foram adicionados. Não declarar "idêntico" enquanto arte, cards, densidade, menu e QA visual real estiverem pendentes.

## Execução incremental 21/10/2026, PR #128 (não publicada)

**Implementações concluídas na branch:** (1) cinco tokens oficiais e fontes Playfair/Lora já escopados às telas canônicas; (2) aba segmentada contígua com alvos ≥44px, cartões de Estudos compactos e setas claras; (3) novo asset SVG transparente `public/art/northstar-botanical-frame.svg` com ramos, flores marfim e douradas, sobre o vale SVG nítido em Home/Reflexões, sem reaproveitar o recorte WebP embaçado; (4) cinco capas originais enriquecidas individualmente com flores/árvores/vinhetas vetoriais; (5) cabeçalho Home com identidade à esquerda, retomada mais leve, decoração botânica; (6) ação de busca em Reflexões e botão de próxima reflexão de largura integral; (7) painel **único** do Reader acessível por Aa ou ..., com índice, notas, retorno, grade de quatro tamanhos, tema independente de app Claro/Escuro/Sistema, tema leitor Claro/Escuro/Sépia; persistência Zustand; (8) barra de navegação de trechos fixa com contagem e respeito à safe-area, sem sobrepor o corpo.

**Validação implementada:**
- GitHub Actions `Frontend quality`: **SUCCESS**, 106 arquivos / 672 testes para o commit `6df2f52f5d11537ab503c0c330d860b3994a912f`; incluindo teste de regressão de painel único. `Reviewed Boundary Runtime Integrity Staging Preflight Validation`: SUCCESS.
- Teste adicional de persistência de temas `tests/ui/northstar_theme_persistence.test.js` (4 casos) em `4e0cacdeededb2c7b68abc035be061e04e3fbb64`: test run focado no sandbox com 27/27 casos em três arquivos; mesmo HEAD passou Frontend quality e pré-voo de integridade em GitHub, Vercel Preview READY.
- QA browser Chrome/Chromium em fixture local de desenvolvimento, telas Home, Estudos, Reflexões e Leitor em 320, 390, 430 e 800 CSS px: **16/16 HTTP 200, nenhuma exceção JS, nenhum overflow horizontal e cinco capas carregadas**. Painel Reader aberto testado nos quatro tamanhos: a 320px, bounds `left=12px, right=308px`; a 390px, `left=58px, right=378px`. Grupos de tema app, tema leitor e tamanho presentes; navegação docked em todos. Esta é **fixture com dados fictícios**, não sessão Google nem comparação idêntica do original.
- Tela Refinamentos e teste novo de temas executados após as primeiras capturas. Teste de browser da branch no último HEAD confirmou novamente 16 cenários, sem falhas. O processo de QA temporário expirou antes de arquivar o último JPEG no repositório; portanto **não declarar screenshots arquivados**.

**O que ainda impede paridade 1:1:** os SVGs gerados são novas interpretações botânicas, não os master assets exatos do North Star original; não foi comprovada igualdade pixel a pixel. A prancha de referência inclui flores/folhagens mais ricas, texturas, sombras e diferentes opções de composição, além da tela de Menu; ainda serão necessários refinamentos comparativos lado a lado, inclusive em Safari iPhone real e modos dark/Extra no último commit. A página Mais e a landing pública exigem acabamento consistente próprio, sem interferir no OAuth. Produção `main` e Supabase não foram tocados; PR #128 deve permanecer DRAFT até novo aceite da fundadora.
