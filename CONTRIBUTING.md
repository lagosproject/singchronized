# Contributing to SingChronized

Thank you for your interest in contributing to SingChronized! We welcome community contributions, including bug reports, feature requests, and code modifications.

Please review the guidelines below to ensure a smooth contribution process.

---

## 1. Branching & Workflow

We follow a typical GitHub Flow workflow:

1. **Fork the Repository**: Create a fork of the main repository on your GitHub account.
2. **Clone Locally**: Clone your fork to your local environment.
   ```bash
   git clone https://github.com/<your-username>/singchronized.git
   ```
3. **Create a Branch**: Create a descriptive branch starting with a category prefix:
   - `feature/` for new features (e.g., `feature/add-visualizer`)
   - `bugfix/` for bug fixes (e.g., `bugfix/fix-audio-routing`)
   - `docs/` for documentation updates (e.g., `docs/update-install-guide`)
   
   ```bash
   git checkout -b feature/your-feature-name
   ```
4. **Implement Your Changes**: Write your code, following the styling and architecture of the project.
5. **Write/Run Tests & Linters**: Make sure all tests and linters pass (see below).
6. **Commit Code**: Keep your commit messages clear, descriptive, and imperative (e.g., `feat: add support for Genius artwork provider`).
7. **Push & Pull Request**: Push your branch to your fork and submit a Pull Request to the `main` branch of the official repository.

---

## 2. Local Setup & Development

To set up the development environment, make sure you have:
- **Python 3.12+**
- **Node.js 22+**
- **pnpm** ([install guide](https://pnpm.io/installation))
- **Rust (stable)** (only required if building Tauri native app components)

### Backend Development
1. Create and activate a virtual environment:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```
2. Install dependencies:
   ```bash
   pip install --upgrade pip
   pip install -r backend/requirements.txt
   ```
3. Run the FastAPI development server:
   ```bash
   python -m uvicorn backend.app.main:app --reload --port 8000
   ```

### Frontend Development
1. Navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```
2. Install dependencies (requires [pnpm](https://pnpm.io/installation)):
   ```bash
   pnpm install
   ```
3. Start the Vite dev server:
   ```bash
   pnpm dev
   ```

---

## 3. Code Quality & Formatting

Before committing your changes, please run the following quality checks.

### Frontend Linting
We use ESLint for checking frontend TypeScript/JavaScript syntax and style issues.
```bash
cd frontend
pnpm lint
```

### Backend Code Style
We use PEP8 standards for python development. Ensure your code is clean and properly formatted. If you use `ruff` or `flake8`, you can run it on the `backend` directory:
```bash
# If you have ruff installed
ruff check backend/
ruff format backend/
```

---

## 4. Pull Request Checklist

When submitting a PR, please ensure:
- [ ] Your branch is up to date with `main`.
- [ ] The PR title follows conventional commit formatting (e.g., `feat: ...`, `fix: ...`, `docs: ...`).
- [ ] You have run ESLint and Python formatting/checks locally.
- [ ] You have verified that secrets, personal API tokens, or credentials are **NOT** committed (either in code or configuration files).
- [ ] You have updated `CHANGELOG.md` if making user-facing changes.
