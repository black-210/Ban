# CodeMentor — Native VS Code Extension for C, C++ & Rust

> **The Intelligent Coding Mentor for Systems Programming**  
> Advanced IntelliSense with teacher-grade explanations, interactive hover cards, deep memory hazard analysis, and real-time quick fixes for C, C++, and Rust.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![VS Code](https://img.shields.io/badge/VS%20Code-%5E1.85.0-blueviolet.svg)](https://code.visualstudio.com/)
[![Languages](https://img.shields.io/badge/Languages-C%20%7C%20C%2B%2B%20%7C%20Rust-brightgreen.svg)](#supported-languages)
[![Offline & Private](https://img.shields.io/badge/Privacy-100%25%20Offline%20%26%20Local-success.svg)](#privacy-policy)

---

## 📖 Overview

Traditional IntelliSense tells you *what* a function or type is called. **CodeMentor** acts like a senior systems engineer sitting next to you:
- **Explains what the code actually does** in plain language.
- **Shows you how and when to use it** with idiomatic examples.
- **Breaks down code line-by-line** so you understand every pointer, lifetime, and allocation.
- **Flags memory leaks, use-after-free, double-free, and buffer overflows** before runtime.
- **Provides 1-click Quick Fixes** with previewable diffs.
- **Adapts to your experience level** with 4 customizable mentor modes (`Pedagogical`, `Concise`, `Advanced`, and `Security`).

---

## 🚀 Key Features

### 1. Teacher-Grade IntelliSense (`CompletionItemProvider`)
When you trigger auto-completion (`Ctrl+Space` or typing like `std::uni` or `malloc`), CodeMentor displays rich Markdown documentation cards containing:
- **Summary**: Plain-language explanation of function or concept.
- **What it does & Mechanics**: Internal memory allocation, complexity, or ownership transfer.
- **When to use**: Best practices and architectural rationale.
- **Formal Syntax**: Accurate signatures and types.
- **Practical Code Example**: Complete, compilable code.
- **Line-by-Line Breakdown**: Numbered explanation of every construct.
- **Common Pitfalls**: Frequent bugs and misuse traps.
- **Memory & Security Hazards**: Null pointer dereference, lifetime invalidation, or CVE risks.
- **Better Modern Alternatives**: E.g., `std::unique_ptr` over raw `new`, or `snprintf` over `strcpy`.

### 2. Deep Memory Hazard Analysis & Diagnostics
Continuous background scanner that catches systems programming bugs in real-time:
- **Memory Leaks**: Detects dynamic allocations (`malloc`, `calloc`, raw `new`) lacking deallocation (`free`, `delete`).
- **Use-After-Free (UAF)**: Identifies pointer dereference or member access after a pointer has been freed.
- **Double Free**: Flags multiple `free()` invocations on the same pointer.
- **Buffer Overflow**: Detects dangerous standard functions (`strcpy`, `gets`, `sprintf`) and provides bounds-checked replacements (`snprintf`).
- **C++ RAII Violations**: Flags manual `new` allocations and suggests `std::make_unique<T>()`.
- **Rust Unnecessary Unsafe**: Identifies redundant `unsafe` blocks where safe abstractions exist.
- **Confidence Rating**: Issues are explicitly labeled as **Confirmed**, **Analyzer Warning**, or **Suspicion for Review**.

### 3. Actionable Quick Fixes (`CodeActionProvider`)
When a hazard is flagged, click the yellow lightbulb (`Ctrl+.` or `Cmd+.`) to:
- **Preview the diff** before modifying any code.
- **Apply fixes safely**: E.g., inserting `free(ptr); ptr = NULL;`, replacing `strcpy` with `snprintf`, or wrapping in `std::make_unique`.
- **Never modifies user files silently**.

### 4. Interactive Hover Teacher Cards (`HoverProvider`)
Hover over any keyword, library type, or local function to see a complete 10-point analysis:
1. Symbol name & signature
2. Language and category
3. Meaning & runtime behavior
4. Syntax specification
5. Usage guidance
6. Working example
7. Line-by-line code explanation
8. Common pitfalls
9. Memory & security warnings
10. Official standards documentation links

### 5. Four Customizable Mentor Modes
Adjust the verbosity and depth of explanations via the VS Code Status Bar or Command Palette:
| Mode | Focus | Ideal For |
|---|---|---|
| **Pedagogical** (Default) | Full teacher breakdown, examples, and line-by-line analysis | Learning C/C++/Rust, students, and code review |
| **Concise** | Function summary and syntax only | Experienced developers seeking fast reference |
| **Advanced** | Low-level compiler optimization, cache effects, and assembly details | Systems architects and performance tuners |
| **Security** | CWE vulnerabilities, buffer bounds, and memory safety analysis | Security auditors and defensive coders |

---

## 🛠️ Supported Languages

CodeMentor maintains dedicated, independent knowledge bases with strict language isolation:

| Language | File Extensions | Specialized Knowledge & Rules |
|---|---|---|
| **C** | `.c`, `.h` | Standard Library (C89/C99/C11/C17), pointers, dynamic heap management (`malloc`/`free`), buffer bounds, string safety, memory alignment. |
| **C++** | `.cpp`, `.cc`, `.cxx`, `.hpp`, `.hh`, `.hxx`, `.inl` | Modern C++ (C++11 through C++20/23), STL containers (`vector`, `unordered_map`), smart pointers (`unique_ptr`, `shared_ptr`), RAII, Templates, Concepts. |
| **Rust** | `.rs` | Ownership, Borrowing (`&` vs `&mut`), Lifetimes, `Option<T>`, `Result<T, E>`, `Vec<T>`, Pattern Matching (`match`, `if let`), and Unsafe Auditing. |

---

## 📦 Installation Guide

### Option A: Install from VSIX Package (Recommended)

1. Download `codementor-native-1.0.0.vsix` from this repository or release assets.
2. In VS Code, open the Extensions view (`Ctrl+Shift+X` or `Cmd+Shift+X`).
3. Click the **`...`** (Views and More Actions) menu in the top-right corner.
4. Select **Install from VSIX...** and choose `codementor-native-1.0.0.vsix`.
5. Alternatively, run in your terminal:
   ```bash
   code --install-extension codementor-native-1.0.0.vsix
   ```

### Option B: Build and Package from Source

```bash
# 1. Clone repository
git clone https://github.com/codementor/codementor-native.git
cd codementor-native

# 2. Install dependencies
npm install

# 3. Compile extension bundle
npm run build:extension

# 4. Run automated test suite
npm test

# 5. Package into .vsix installation package
npm run package
```

The resulting `codementor-native-1.0.0.vsix` will be generated in the project root.

---

## 🧪 Automated Testing

CodeMentor includes a comprehensive test suite verifying IntelliSense, memory hazard detection, quick fixes, and language isolation:

```bash
npm test
```

### Verified Test Cases:
- [x] **C Completion**: `malloc` completion with teacher markdown card and `free` warnings.
- [x] **C++ Completion**: `std::unique_ptr` with RAII ownership and `std::make_unique` snippets.
- [x] **Rust Completion**: `Option<T>` with pattern matching (`match` / `if let`).
- [x] **Hover Cards**: Mode-aware rendering (`concise`, `pedagogical`, `security`, `advanced`).
- [x] **Memory Leak Detection**: Identifies allocations lacking deallocation (`free`).
- [x] **Use-After-Free Detection**: Catches pointer dereference following `free()`.
- [x] **Double Free Detection**: Catches duplicate deallocations.
- [x] **Buffer Overflow Detection**: Catches `strcpy` and offers `snprintf` quick fix.
- [x] **C++ RAII Check**: Flags raw `new` and offers `std::make_unique` conversion.
- [x] **Rust Safety Check**: Flags unnecessary `unsafe` blocks.
- [x] **Language Rule Isolation**: Strictly prevents cross-language symbol contamination.

---

## ⚙️ Configuration & Commands

### VS Code Settings (`settings.json`):

```json
{
  // Mentor mode: "pedagogical" | "concise" | "advanced" | "security"
  "codementor.mentorMode": "pedagogical",

  // Enable real-time background memory hazard analysis
  "codementor.enableMemoryAnalysis": true,

  // Confidence threshold: "all" | "warning" | "confirmed"
  "codementor.confidenceThreshold": "all",

  // Enable 1-click Quick Fixes for memory and safety issues
  "codementor.enableQuickFixes": true,

  // Prefer integration with clangd and rust-analyzer if present
  "codementor.preferExternalLsp": true
}
```

### Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`):
- `CodeMentor: Switch Explanation Mode` — Toggle between Pedagogical, Concise, Advanced, and Security.
- `CodeMentor: Explain Current Line & Syntax` (Shortcut: `Alt+M`) — Detailed analysis of current line.
- `CodeMentor: Analyze File for Memory Hazards` — Explicit memory audit with formatted summary report.
- `CodeMentor: Search Knowledge Base for Symbol` — Instant searchable index of C/C++/Rust APIs.
- `CodeMentor: Check Clangd & rust-analyzer LSP Status` — View active language server integration status.

---

## 🔌 External Tool Integration (LSP & Sanitizers)

CodeMentor is engineered to complement industry-standard compilers and tools:
- **LLVM Clangd & Microsoft C/C++ (`ms-vscode.cpptools`)**: When present, CodeMentor injects teacher cards into clangd completion and hover pipelines.
- **rust-analyzer**: Enhances rust-analyzer diagnostics with intuitive ownership mental models.
- **Zero-Dependency Standalone Mode**: If no external language server is installed, CodeMentor functions 100% offline using its embedded rules and knowledge base.
- **Sanitizer Friendly**: Formatted diagnostic reports include guidelines for compiling with `-fsanitize=address,undefined` (ASan/UBSan) and running under Valgrind or Miri.

---

## 🔒 Privacy & Performance Policy

- **100% Local & Offline**: All analysis, tokenization, and teacher explanations execute entirely within your local VS Code environment.
- **Zero Telemetry**: No user code, file names, or keystrokes are transmitted to any external server or API.
- **Non-Blocking Architecture**: Diagnostic analysis is debounced (300ms) and processes only active documents. Large projects never experience editor lag.

---

## 📄 License & Attribution

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for details.
