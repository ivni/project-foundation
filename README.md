# project-foundation

Скил для Claude Code: best practices по закладке архитектуры, процесса и набора артефактов проекта — на старте нового проекта (bootstrap) или при переделке существующего (audit → gap-план). Не привязан к конкретному стеку или технологии.

## Режимы

- **Bootstrap (greenfield)** — бриф → закрытие «неизвестных» вопросами по одному → генерация набора артефактов (CLAUDE.md, PRD, tech-stack, план фаз, ADR, C4-lite схема, реестр долгов/рисков, QA-гейт) и настройка процесса.
- **Audit (brownfield)** — инвентаризация кода/доков/процесса → сравнение со стандартом → приоритизированный план доведения, включая ретро-ADR.
- **Reference (точечно)** — срез требований фазы, оформление ADR, проверка расхождений доков с кодом, ведение реестра долгов.

## Принципы

- Жёсткие дефолты; отклонение от стандарта — осознанно, через мини-ADR.
- Сам скил и шаблоны — на английском; язык генерируемых артефактов определяется на discovery проекта.
- Рассчитан на связку «соло-инженер + AI-агент».

## Структура

```
SKILL.md                    # точка входа: десять правил стандарта, роутер режимов, процессы
references/
  artifacts.md              # ядро артефактов: CLAUDE.md, PRD, tech-stack, stages, ADR, C4-lite, реестры, runbooks
  process.md                # фазы: срез требований, подфазы, DoD, конвенция спайков, техника discovery
  gates.md                  # гейты: единая точка QA, хуки, CI, дисциплина релизов и git
  platform.md               # платформенные чек-листы: наблюдаемость, безопасность, целостность данных, эксплуатация
  ai-collaboration.md       # правила работы AI-агента: память в доках, верификация, границы автономии
templates/
  claude-md.md  prd.md  tech-stack.md  stages.md  architecture.md
  adr.md  registers.md  runbook.md  spike.md
  phase-slice/              # scope.md, checklist.md, blockers.md, consistency-check.md
```

## Установка

Символическая ссылка (или копия) папки репозитория в личную папку скилов:

```bash
# Windows (от администратора или с включённым Developer Mode)
mklink /D %USERPROFILE%\.claude\skills\project-foundation C:\code\project-foundation

# macOS / Linux
ln -s /path/to/project-foundation ~/.claude/skills/project-foundation
```

После установки скил вызывается в Claude Code как `/project-foundation`.
