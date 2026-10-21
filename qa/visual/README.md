# Vereda North Star | Visual QA fixture (não produção)

## Por quê
Screenshots reais, repetíveis, das quatro telas canônicas com **dados fictícios**. O visual deve ser comparado ao North Star aprovado em `docs/qa/north-star`. A existência desta fixture não comprova fidelidade; apenas permite encontrar regressões de proporção, arte e navegação antes do teste iPhone.

## Execução local
```bash
npm ci
npm run dev -- --config vite.config.visual-qa.js
# in another shell:
npx playwright install chromium
npx playwright screenshot --browser chromium --viewport-size '390,844' --wait-for-timeout 800 http://localhost:4174/qa.visual.html?screen=home home.png
npx playwright screenshot --browser chromium --viewport-size '390,844' --wait-for-timeout 800 http://localhost:4174/qa.visual.html?screen=studies studies.png
npx playwright screenshot --browser chromium --viewport-size '390,844' --wait-for-timeout 800 http://localhost:4174/qa.visual.html?screen=reader reader.png
npx playwright screenshot --browser chromium --viewport-size '390,844' --wait-for-timeout 800 http://localhost:4174/qa.visual.html?screen=reflections reflections.png
```

Altere as larguras para 320, 430 e 800 para a matriz mobile/responsiva. Os quatro `?screen=` possíveis são `home`, `studies`, `reader`, `reflections`. As rotas internas simulam a navegação real.

## Restrições de segurança e representatividade
- O arquivo `qa.visual.html` é servido **somente pelo servidor Vite de QA**, não é entrada do build normal (`vite build` gera a aplicação a partir de `index.html`). A fixture não deve ser configurada como rota na aplicação em produção.
- Mock de usuário é `fixture@example.invalid`; progresso, obras e conteúdo exemplificativo vêm de `qa/visual`. Nunca conectar a fixture ao projeto Supabase hospedado, fazer `vercel --prod`, usar contas reais, ou publicar screenshots contendo dados da fundadora.
- Fluxos autenticação real Google, persistência cross-device, conteúdo integral e Safari físico **não** são testados aqui.
- Não modificar artificialmente a interface para encaixar dados do mockup: progresso deve representar *trechos* existentes e reflexões devem manter fonte/autoria verdadeiras.
- Não usar screenshots artificiais para declarar V1 aprovada. A validação final exige screenshots reais do Preview autenticado nos mesmos tamanhos e aprovação expressa da fundadora.

## Gates visuais
1. Home: marca botânica centrada, saudação legível, paisagem e sobreposição de retomada, arte botânica na reflexão; informação no primeiro viewport com navegação fixa.
2. Estudos: todas as 5 capas únicas, títulos reais, barras proporcionais, chips legíveis, ação circular e acesso ao estudo guiado.
3. Reflexões: paisagem com citação/autoria/bibliografia e ações Salvar/Compartilhar contidas no mesmo cartão, sem cortar conteúdo.
4. Leitor: título longo sem overflow, Aa isolado do menu de ações, tamanho Médio legível, Grande/Extra preservados, texto canônico não abreviado.
5. 320/390/430/800: zero scroll horizontal, botões >=44px, foco de teclado, dark mode. iPhone/Safari físico continua gate posterior.

## Alternar aparência e tamanho de leitura
A fixture também reconhece parâmetros `theme=dark` (padrão: light) e `font=xl` (padrão: md), por exemplo:
```
http://localhost:4174/qa.visual.html?screen=reflections&theme=dark
http://localhost:4174/qa.visual.html?screen=reader&theme=dark&font=xl
```
Os parâmetros são restritos ao ambiente de QA, sem gravação de preferências reais. O leitor em `Extra` deve renderizar corpo de 28px, mas somente testes com usuário em Safari validam conforto e acessibilidade.
