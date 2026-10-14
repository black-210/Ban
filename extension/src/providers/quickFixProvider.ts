import * as vscode from 'vscode';
import { MemoryAnalyzer } from './memoryAnalyzer';

export class CodeMentorQuickFixProvider implements vscode.CodeActionProvider {
  public static readonly providedCodeActionKinds = [vscode.CodeActionKind.QuickFix];

  public provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
    _token: vscode.CancellationToken
  ): vscode.ProviderResult<(vscode.Command | vscode.CodeAction)[]> {
    const actions: vscode.CodeAction[] = [];
    const text = document.getText();
    const findings = MemoryAnalyzer.analyzeDocument(text, document.languageId);

    // Look for matching findings intersecting the current range
    findings.forEach((finding) => {
      const findingRange = new vscode.Range(
        new vscode.Position(finding.line, finding.character),
        new vscode.Position(finding.endLine, finding.endCharacter)
      );

      if (range.intersection(findingRange) || context.diagnostics.some((d) => d.code === finding.id)) {
        if (finding.quickFixTitle && finding.quickFixReplacement) {
          const action = new vscode.CodeAction(
            finding.quickFixTitle,
            vscode.CodeActionKind.QuickFix
          );
          action.isPreferred = true;

          const edit = new vscode.WorkspaceEdit();

          if (finding.id.startsWith('memleak-')) {
            // Insert free() before the closing brace of function or next statement
            const line = document.lineAt(finding.line);
            // Insert after current line
            edit.insert(document.uri, line.range.end, finding.quickFixReplacement);
          } else if (finding.id.startsWith('insecure-func-') || finding.id.startsWith('cpp-raw-new-')) {
            // Replace line content
            const line = document.lineAt(finding.line);
            edit.replace(document.uri, line.range, finding.quickFixReplacement);
          } else if (finding.id.startsWith('rust-unnecessary-unsafe-')) {
            const line = document.lineAt(finding.line);
            edit.replace(document.uri, line.range, finding.quickFixReplacement);
          }

          action.edit = edit;
          actions.push(action);
        }

        // Add an explanatory action that opens a Markdown explanation
        const explainAction = new vscode.CodeAction(
          `📖 شرح مشكلة: ${finding.title}`,
          vscode.CodeActionKind.Empty
        );
        explainAction.command = {
          command: 'codementor.explainDiagnostic',
          title: 'عرض تفاصيل التحليل',
          arguments: [finding],
        };
        actions.push(explainAction);
      }
    });

    return actions;
  }
}
