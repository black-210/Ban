import * as vscode from 'vscode';

export class ClangdBridge {
  public static isClangdAvailable(): boolean {
    const clangdExt = vscode.extensions.getExtension('llvm-vs-code-extensions.vscode-clangd');
    const cppTools = vscode.extensions.getExtension('ms-vscode.cpptools');
    return !!(clangdExt || cppTools);
  }

  public static getLspStatusMessage(): string {
    if (this.isClangdAvailable()) {
      return '🟢 محرك Clang/Clangd نشط: CodeMentor يعمل جنباً إلى جنب مع مزود LSP لتقديم الشروحات التربوية.';
    }
    return 'ℹ️ لم يتم العثور على إضافة Clangd خارجية: CodeMentor يعمل في الوضع الأصلي المستقل (Standalone Offline Mode).';
  }
}
