import * as vscode from 'vscode';
import { MemoryAnalyzer, MemoryFinding } from './memoryAnalyzer';

export class CodeMentorDiagnosticsProvider {
  private diagnosticCollection: vscode.DiagnosticCollection;
  private pendingAnalysis: Map<string, NodeJS.Timeout> = new Map();

  constructor(context: vscode.ExtensionContext) {
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection('codementor');
    context.subscriptions.push(this.diagnosticCollection);
  }

  public triggerAnalysis(document: vscode.TextDocument) {
    // Only analyze C, C++, and Rust
    if (!['c', 'cpp', 'rust'].includes(document.languageId)) {
      return;
    }

    const uriKey = document.uri.toString();

    // Cancel previous debounce timer for this file to keep editor responsive
    const existing = this.pendingAnalysis.get(uriKey);
    if (existing) {
      clearTimeout(existing);
    }

    // Debounce 300ms for fast typing
    const timer = setTimeout(() => {
      this.runAnalysis(document);
      this.pendingAnalysis.delete(uriKey);
    }, 300);

    this.pendingAnalysis.set(uriKey, timer);
  }

  public runAnalysis(document: vscode.TextDocument) {
    const text = document.getText();
    const findings = MemoryAnalyzer.analyzeDocument(text, document.languageId);

    const diagnostics: vscode.Diagnostic[] = [];

    findings.forEach((finding) => {
      const range = new vscode.Range(
        new vscode.Position(finding.line, finding.character),
        new vscode.Position(finding.endLine, finding.endCharacter)
      );

      let severity = vscode.DiagnosticSeverity.Error;
      if (finding.severity === 'Warning') {
        severity = vscode.DiagnosticSeverity.Warning;
      } else if (finding.severity === 'Information') {
        severity = vscode.DiagnosticSeverity.Information;
      }

      // Format comprehensive diagnostic message with explanation & confidence level
      let fullMessage = `[CodeMentor ${finding.confidence}] ${finding.title}\n\n`;
      fullMessage += `📌 المشكلة: ${finding.message}\n`;
      fullMessage += `❓ لماذا حدثت؟ ${finding.whyItHappened}\n`;
      fullMessage += `💥 التأثير: ${finding.impact}\n`;
      fullMessage += `🔧 كيف تصلحها؟ ${finding.howToFix}`;

      const diagnostic = new vscode.Diagnostic(range, fullMessage, severity);
      diagnostic.source = 'CodeMentor';
      diagnostic.code = finding.id;

      diagnostics.push(diagnostic);
    });

    this.diagnosticCollection.set(document.uri, diagnostics);
  }

  public clear(uri: vscode.Uri) {
    this.diagnosticCollection.delete(uri);
  }

  public dispose() {
    this.diagnosticCollection.dispose();
  }
}
