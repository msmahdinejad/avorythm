# Contributing

Thank you for improving LingoDub. English and Persian issues are both welcome.

1. Search existing issues and open one before a large change.
2. Fork the repository and branch from `main`.
3. Keep changes focused. Preserve the module boundaries in `ARCHITECTURE.md`.
4. Add or update tests for behavior changes.
5. Run `pytest -q`, `ruff check src tests`, `mypy src`, and JavaScript syntax checks.
6. Submit a pull request using the template and explain user-visible impact, risks, and verification.

Use Conventional Commit subjects where practical, for example `fix(extension): restore source gain after ducking`.

Never commit API keys, recordings, generated builds, or third-party binaries without their license notice. By contributing, you agree that your contribution is licensed under the repository's MIT License.
