# Design tooling setup

| Tool | Source | Installed version / commit | Project location | Role |
|---|---|---|---|---|
| UI UX Pro Max | `nextlevelbuilder/ui-ux-pro-max-skill` | CLI 2.15.0 | `.agents/skills/ui-ux-pro-max` | Design-system research and UI guidance |
| Impeccable | `pbakaus/impeccable` | Skill 4.3.1 / engine 0.1.5 | `.agents/skills/impeccable` | Product context, critique, detector and polish |
| Karpathy Guidelines | `multica-ai/andrej-karpathy-skills` | installed from official `main` | `.agents/skills/karpathy-guidelines` | Simplicity and surgical cleanup |
| React Bits | `DavidHDev/react-bits` | reference commit `e1bbb69` | external reference only | Optional free component library |

Impeccable installed `.codex/hooks.json`. Codex Desktop may require manual project-hook approval. Skill CLIs are development tooling and are not application runtime dependencies.
