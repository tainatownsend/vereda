# Contribuindo com o Vereda

Obrigado pelo interesse em contribuir.

O Vereda é um projeto sem fins lucrativos orientado por produto, acessibilidade
e respeito ao estudante. Antes de propor uma mudança, leia:

- [Visão do produto](docs/vision.md)
- [Princípios de produto](docs/product-principles.md)
- [Roadmap](docs/roadmap.md)
- [Vereda Editorial System](design/ves/README.md)

## Antes de começar

Pergunte:

1. esta mudança facilita o estudo?
2. reduz carga cognitiva?
3. melhora acessibilidade?
4. respeita a linguagem do Vereda?
5. continuará fazendo sentido no futuro?

Uma funcionalidade não deve ser implementada apenas porque existe em outros
aplicativos.

## Fluxo de trabalho

1. atualize a `main`;
2. crie uma branch de escopo pequeno;
3. implemente uma mudança coerente;
4. execute as validações;
5. revise acessibilidade e microcopy;
6. abra um Pull Request com contexto e evidências.

Exemplo:

```bash
git switch main
git pull --ff-only
git switch -c feat/nome-curto
```

## Convenção de branches

- `feat/` — funcionalidade;
- `fix/` — correção;
- `docs/` — documentação;
- `refactor/` — refatoração;
- `test/` — testes;
- `chore/` — manutenção.

## Commits

Prefira mensagens curtas no formato Conventional Commits:

```text
docs: establish product foundations
feat: add accessible reading card
fix: preserve reader position
```

## Validação

Execute:

```bash
npm run lint
npm run build
```

Quando houver testes automatizados:

```bash
npm test
```

Não use `npm audit fix --force` sem avaliar as mudanças de versão e os riscos de
compatibilidade.

## Pull Requests

Um Pull Request deve incluir:

- problema;
- solução;
- escopo;
- decisões relevantes;
- validação executada;
- evidências visuais para alterações de interface;
- riscos ou limitações;
- itens deliberadamente deixados para depois.

Evite misturar documentação, refatoração e funcionalidades não relacionadas.

## Design e acessibilidade

Alterações de interface devem:

- utilizar tokens do VES;
- manter uma ação principal;
- oferecer foco visível;
- funcionar por teclado;
- manter áreas de toque adequadas;
- preservar contraste;
- respeitar ampliação de texto;
- evitar linguagem de culpa;
- ser revisadas em modo claro, escuro e telas pequenas.

## Segurança

Nunca faça commit de:

- `.env.local`;
- chaves privadas;
- `service_role`;
- tokens pessoais;
- dados reais de estudantes.

Use apenas chaves públicas apropriadas ao navegador e mantenha políticas de
Row Level Security no Supabase.

## Conduta

Contribuições devem ser respeitosas, objetivas e acolhedoras. Discordâncias são
resolvidas com base na missão do produto, evidências de uso, acessibilidade e
manutenibilidade.
