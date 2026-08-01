# Tokens do VES

## Cores

### Base clara

| Token | Valor | Uso |
|---|---|---|
| `canvas` | `#FAFBF8` | fundo principal |
| `surface` | `#FFFFFF` | superfícies elevadas |
| `surface-soft` | `#F3F7F1` | destaques discretos |
| `ink` | `#203028` | texto principal |
| `muted` | `#627069` | texto secundário |
| `line` | `#DDE4DC` | divisores e bordas |

### Sage

| Token | Valor |
|---|---|
| `sage-50` | `#F3F7F1` |
| `sage-100` | `#E7EFE4` |
| `sage-200` | `#D1DFCE` |
| `sage-300` | `#B3C9B1` |
| `sage-400` | `#91AD92` |
| `sage-500` | `#718F74` |
| `sage-600` | `#58745D` |
| `sage-700` | `#465D4B` |
| `sage-800` | `#374A3C` |
| `sage-900` | `#2D3D32` |
| `sage-950` | `#17221B` |

### Base escura

| Token | Valor | Uso |
|---|---|---|
| `night` | `#111713` | fundo principal |
| `night-ink` | `#F2F5F0` | texto principal |
| `night-muted` | `#A8B4AA` | texto secundário |
| `night-line` | `#2C3730` | divisores e bordas |

Cores de status deverão ser validadas por contraste e nunca depender apenas da
cor para comunicar significado.

## Tipografia

### Display

**Newsreader**

Uso:

- títulos principais;
- nomes de obras;
- abertura de capítulos;
- momentos editoriais.

### Interface

**DM Sans**

Uso:

- botões;
- formulários;
- menus;
- labels;
- textos funcionais;
- configurações.

### Escala inicial

| Token | Tamanho | Uso |
|---|---:|---|
| `display-xl` | 48 px | apresentações e marketing |
| `display-lg` | 40 px | títulos especiais |
| `heading-1` | 32 px | título principal de tela |
| `heading-2` | 28 px | título de seção |
| `heading-3` | 24 px | título de componente |
| `body-lg` | 18 px | introduções e leitura funcional |
| `body` | 16 px | padrão de interface |
| `small` | 14 px | informação secundária |
| `caption` | 12 px | uso excepcional, não essencial |

Texto funcional essencial não deve usar `caption`.

## Espaçamento

A escala usa múltiplos previsíveis:

| Token | Valor |
|---|---:|
| `space-1` | 4 px |
| `space-2` | 8 px |
| `space-3` | 16 px |
| `space-4` | 24 px |
| `space-5` | 32 px |
| `space-6` | 40 px |
| `space-7` | 48 px |
| `space-8` | 64 px |
| `space-9` | 80 px |
| `space-10` | 96 px |

Valores intermediários podem existir quando necessários para acessibilidade ou
composição, mas não devem ser introduzidos arbitrariamente.

## Raios

| Token | Valor |
|---|---:|
| `radius-sm` | 12 px |
| `radius-md` | 20 px |
| `radius-lg` | 28 px |
| `radius-pill` | 999 px |

## Elevação

Sombras são usadas somente para separar planos.

```css
box-shadow: 0 16px 50px rgba(41, 61, 47, 0.08);
```

## Áreas interativas

- mínimo absoluto: 44 × 44 px;
- padrão recomendado: 52–56 px;
- controles críticos devem ser fáceis de alcançar e reconhecer;
- ícones isolados precisam de nome acessível.

## Movimento

Durações iniciais:

- 100 ms para feedback imediato;
- 150 ms para controles;
- 200 ms para transições;
- evitar animações acima de 300 ms.

Movimento deve orientar, nunca decorar. Preferências de redução de movimento
devem ser respeitadas.
