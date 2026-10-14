# Changelog

All notable changes to the **CodeMentor** extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-10-14

### Initial Release
- **Core IntelliSense Engine**:
  - Implemented teacher-grade Markdown cards for C, C++, and Rust (`CompletionItemProvider`).
  - Full support for `.c`, `.h`, `.cpp`, `.cc`, `.cxx`, `.hpp`, `.hh`, `.hxx`, `.inl`, and `.rs`.
  - Line-by-line breakdown for practical code examples.
- **Deep Memory Hazard Analysis**:
  - Real-time detection of memory leaks (`malloc`/`free` matching).
  - Use-After-Free (UAF) detection.
  - Double-Free detection.
  - Insecure buffer function warnings (`strcpy`, `gets`, `sprintf`).
  - C++ RAII violations and manual `new` warnings.
  - Rust unnecessary `unsafe` block inspection and `.unwrap()` panic warnings.
- **Interactive Hover System**:
  - 10-point structured Hover card (`HoverProvider`).
  - Dynamic signature extraction for user-defined functions and types.
- **Quick Fixes & Code Actions**:
  - One-click memory deallocation insertion with NULL assignment.
  - Safe replacement of `strcpy` with `snprintf`.
  - Automatic conversion to `std::make_unique<T>()`.
- **Customizable Mentor Modes**:
  - Status Bar and Command Palette switcher: `Pedagogical`, `Concise`, `Advanced`, and `Security`.
- **LSP Compatibility & Graceful Fallback**:
  - Seamless bridge with LLVM Clangd, Microsoft C/C++, and rust-analyzer.
  - 100% offline standalone execution without external dependencies.
