<!-- package-site:starter-readme -->
# {{npmName}}

{{description}}

[Demo]({{siteUrl}}) · [Examples]({{siteUrl}}examples/) · [Documentation]({{siteUrl}}docs/) · [Changelog](CHANGELOG.md)

## Table of contents

- [Installation](#installation)
- [Quick start](#quick-start)
{{cdnToc}}- [Capabilities](#capabilities)
- [API at a glance](#api-at-a-glance)
- [Documentation](#documentation)
- [Changelog](#changelog)
- [AI agent skill](#ai-agent-skill)
- [License](#license)

## Installation

```sh
npm install {{npmName}}
```

```sh
pnpm add {{npmName}}
```

```sh
bun add {{npmName}}
```

Describe verified Node/browser requirements and required styles or optional peers.

## Quick start

Replace this paragraph with the smallest verified package integration and its cleanup. Preserve meaningful existing public anchors.

{{cdnSection}}## Capabilities

Replace with distinct capabilities verified against the package. Keep package-specific explanations as H3 subsections.

## API at a glance

| API | Purpose |
| --- | --- |
| Verified public API | Describe its actual behavior. |

### Entrypoints

| Entrypoint | When to use |
| --- | --- |
| `{{npmName}}` | Describe the real exported entry. |

## Documentation

Read the [documentation]({{siteUrl}}docs/) for the full guides and API contracts, and explore [working examples]({{siteUrl}}examples/) with complete and separate source files for both loading modes.

| Guide | What it covers |
| --- | --- |
| [Getting started]({{siteUrl}}docs/getting-started/) | Installation and the first working integration. |

## Changelog

Read [CHANGELOG.md](CHANGELOG.md) or the [published changelog]({{siteUrl}}docs/changelog/) for release history and explicitly marked breaking and behavior changes. Review the notes before upgrading.

## AI agent skill

The [{{name}} skill]({{siteUrl}}skills/{{skill}}/SKILL.md) teaches verified package integration. Its maintained [repository source](skills/{{skill}}/SKILL.md) and website download are the same file. Verify the installed package version before applying its guidance.

Download [SKILL.md]({{siteUrl}}skills/{{skill}}/SKILL.md) into a `{{skill}}/` folder in your agent's supported skill directory. For agents that discover project skills from `.agents/skills/`:

```sh
mkdir -p .agents/skills/{{skill}}
curl --fail --location {{siteUrl}}skills/{{skill}}/SKILL.md \
  --output .agents/skills/{{skill}}/SKILL.md
```

When working from this repository, copy `skills/{{skill}}/SKILL.md` instead. Keep the filename `SKILL.md`; discovery paths and invocation syntax depend on the agent.

## License

{{license}} — [LICENSE.md](LICENSE.md).
