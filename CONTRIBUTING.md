# Contributing to CodeMentor

Thank you for your interest in contributing to CodeMentor! We welcome contributions from the community to help make systems programming in C, C++, and Rust safer, more understandable, and accessible to everyone.

## 🛠️ Development Setup

### Prerequisites
- [Node.js](https://nodejs.org/) v18+ or v20+
- [Visual Studio Code](https://code.visualstudio.com/) v1.85.0+
- [Git](https://git-scm.com/)

### Getting Started

```bash
# 1. Fork and clone the repository
git clone https://github.com/<your-username>/codementor-native.git
cd codementor-native

# 2. Install dependencies
npm install

# 3. Compile the extension bundle
npm run build:extension

# 4. Run tests
npm test
```

## 🧪 Testing Guidelines

Before submitting a Pull Request, verify that all test suites pass:

```bash
npm test
```

When adding new knowledge items for C, C++, or Rust:
1. Ensure the explanation is technically rigorous and pedagogical.
2. Provide a verified, compilable code example.
3. Explicitly document memory hazards, pitfalls, and modern alternatives.
4. Add a corresponding test case in `extension/src/test/suite/extension.test.ts`.

## 📝 Code Style & Commit Conventions
- Written in TypeScript with strict typing.
- Commit messages follow conventional commits: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`.
