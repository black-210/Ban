import * as vscode from 'vscode';
import { KnowledgeBase } from '../knowledge/knowledgeBase';

export class CodeMentorSignatureHelpProvider implements vscode.SignatureHelpProvider {
  private kb: KnowledgeBase;

  constructor() {
    this.kb = KnowledgeBase.getInstance();
  }

  public provideSignatureHelp(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken,
    _context: vscode.SignatureHelpContext
  ): vscode.ProviderResult<vscode.SignatureHelp> {
    const lineUntilPos = document.lineAt(position).text.substring(0, position.character);
    const lastOpenParen = lineUntilPos.lastIndexOf('(');
    if (lastOpenParen === -1) return null;

    // Extract function name preceding '('
    const beforeParen = lineUntilPos.substring(0, lastOpenParen).trim();
    const funcMatch = /([a-zA-Z0-9_:]+)$/.exec(beforeParen);
    if (!funcMatch) return null;

    const funcName = funcMatch[1];
    const languageId = document.languageId;
    const lang = languageId === 'rust' ? 'rust' : languageId === 'cpp' ? 'cpp' : 'c';

    const item = this.kb.findSymbol(lang, funcName);
    if (!item || !item.signature) return null;

    const sigHelp = new vscode.SignatureHelp();
    const sigInfo = new vscode.SignatureInformation(item.signature, new vscode.MarkdownString(item.summary));

    // Calculate parameter index by counting commas outside quotes/parentheses
    const insideArgs = lineUntilPos.substring(lastOpenParen + 1);
    let commaCount = 0;
    for (const char of insideArgs) {
      if (char === ',') commaCount++;
    }

    sigHelp.signatures = [sigInfo];
    sigHelp.activeSignature = 0;
    sigHelp.activeParameter = commaCount;

    return sigHelp;
  }
}
