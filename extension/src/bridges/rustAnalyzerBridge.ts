import * as vscode from 'vscode';

export class RustAnalyzerBridge {
  public static isRustAnalyzerAvailable(): boolean {
    const ra = vscode.extensions.getExtension('rust-lang.rust-analyzer');
    return !!ra;
  }

  public static getLspStatusMessage(): string {
    if (this.isRustAnalyzerAvailable()) {
      return '🟢 محرك rust-analyzer نشط: CodeMentor يثري اقتراحات Rust بشروحات المعلم ونماذج الملكية.';
    }
    return 'ℹ️ لم يتم العثور على إضافة rust-analyzer خارجية: CodeMentor يعمل في الوضع الأصلي المستقل (Standalone Offline Mode).';
  }
}
