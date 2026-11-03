# Security Policy

## Supported Versions

| Version | Supported          |
| :---    | :---               |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

We take the security of `dsh-agentic-swarm` and the DeepSeek Harness ecosystem seriously.

If you believe you have discovered a vulnerability related to:
- Prompt injection or inter-agent infection propagation
- MCP tool poisoning or unauthorized tool invocation
- Telegram Bot remote authentication or command injection bypasses
- Path traversal or sensitive credential leakage

Please **DO NOT** create a public GitHub issue.

Instead, please report the vulnerability privately via [GitHub Security Advisories](https://github.com/openthot/dsh-agentic-swarm/security/advisories/new).

Please provide:
1. A clear description of the vulnerability.
2. Steps to reproduce or proof-of-concept payload.
3. Impact assessment on autonomous agent execution.

We aim to acknowledge reports within 48 hours and release patched versions promptly.

## Security Controls Implemented

- **OWASP AISVS C10 Alignment**: Untrusted tool responses are strictly quarantined within semantic isolation tags.
- **Strict Per-Agent Whitelists**: Execution privileges are partitioned by role; read-only agents cannot invoke destructive commands.
- **Telegram Gateway Guard**: User ID verification precedes all command parsing; rate-limiting mitigates flooding attacks.
- **Defensive Error Masking**: Internal system file paths and raw JavaScript stack traces are never leaked to remote interfaces.
