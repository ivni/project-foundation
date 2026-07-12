# project-foundation

Скил в формате Agent Skills: best practices по закладке архитектуры, процесса и набора артефактов проекта — на старте нового проекта (bootstrap) или при переделке существующего (audit → gap-план). Не привязан к конкретному стеку или технологии. Инструкция установки ниже относится к Claude Code; создаваемый проектный agent contract настраивается независимо под `CLAUDE.md`, `AGENTS.md` или путь пользователя.

## Режимы

- **Bootstrap (greenfield)** — бриф → capability-матрица и закрытие «неизвестных» вопросами по одному → генерация набора артефактов (настраиваемый agent contract, PRD, tech-stack, план фаз, ADR, architecture-lite схема, реестр долгов/рисков, локальная проверка и CI) и настройка процесса.
- **Audit (brownfield)** — инвентаризация кода/доков/процесса → сравнение со стандартом → приоритизированный план доведения, включая ретро-ADR.
- **Reference (точечно)** — срез требований фазы, оформление ADR, проверка расхождений доков с кодом, ведение реестра долгов.

## Принципы

- Нормативные уровни `MUST / SHOULD / MAY / N/A`; MUST-отклонение требует явного одобрения и ADR.
- Правила применяются по capability-матрице: `N/A` с обоснованием не считается отклонением.
- Agent contract выбирается в discovery (`CLAUDE.md`, `AGENTS.md` или путь пользователя); параллельные контракты без явной необходимости не создаются.
- Сам скил и шаблоны — на английском; язык генерируемых артефактов определяется на discovery проекта.
- Рассчитан на связку «соло-инженер + AI-агент».

## Структура

```
SKILL.md                    # точка входа: десять правил стандарта, роутер режимов, процессы
references/
  artifacts.md              # ядро артефактов: agent contract, PRD, tech-stack, stages, ADR, architecture-lite, реестры, runbooks
  process.md                # фазы: срез требований, подфазы, DoD, конвенция спайков, техника discovery
  gates.md                  # гейты: единая локальная проверка, хуки, CI, дисциплина релизов и git
  platform.md               # платформенные чек-листы: наблюдаемость, безопасность, целостность данных, эксплуатация
  ai-collaboration.md       # правила работы AI-агента: память в доках, верификация, границы автономии
templates/
  discovery.md  agent-contract.md  prd.md  tech-stack.md  stages.md  architecture.md
  adr.md  adr-index.md  registers.md  runbook.md  spike.md
  phase-slice/              # scope.md, checklist.md, blockers.md, consistency-check.md
```

## Установка в Claude Code

Символическая ссылка (или копия) папки репозитория в личную папку скилов:

```bash
# Windows (от администратора или с включённым Developer Mode)
mklink /D %USERPROFILE%\.claude\skills\project-foundation C:\code\project-foundation

# macOS / Linux
ln -s /path/to/project-foundation ~/.claude/skills/project-foundation
```

После установки скил вызывается в Claude Code как `/project-foundation`.
