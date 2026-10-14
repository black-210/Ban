import * as vscode from 'vscode';
import { KnowledgeBase } from '../knowledge/knowledgeBase';
import { MentorMode } from '../config/mentorConfig';

export class CodeMentorCompletionProvider implements vscode.CompletionItemProvider {
  private kb: KnowledgeBase;
  private currentMode: () => MentorMode;

  constructor(currentMode: () => MentorMode) {
    this.kb = KnowledgeBase.getInstance();
    this.currentMode = currentMode;
  }

  public provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken,
    _context: vscode.CompletionContext
  ): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
    const languageId = document.languageId;
    const lang = languageId === 'rust' ? 'rust' : languageId === 'cpp' ? 'cpp' : 'c';

    // Extract word under cursor
    const linePrefix = document.lineAt(position).text.substring(0, position.character);
    const wordRange = document.getWordRangeAtPosition(position, /[a-zA-Z0-9_:]+/);
    const currentWord = wordRange ? document.getText(wordRange) : '';

    const symbols = this.kb.getSymbols(lang);
    const mode = this.currentMode();

    const completionItems: vscode.CompletionItem[] = [];

    symbols.forEach((item) => {
      // Determine match
      const name = item.name;
      const lowerWord = currentWord.toLowerCase();
      const lowerName = name.toLowerCase();

      // Check if prefix matches or relevant
      if (!currentWord || lowerName.includes(lowerWord) || lowerName.replace(/std::/, '').startsWith(lowerWord)) {
        let itemKind = vscode.CompletionItemKind.Function;
        if (item.category?.includes('Smart Pointers') || item.name.startsWith('std::')) {
          itemKind = vscode.CompletionItemKind.Class;
        } else if (item.kind === 'operator') {
          itemKind = vscode.CompletionItemKind.Operator;
        } else if (item.kind?.includes('keyword')) {
          itemKind = vscode.CompletionItemKind.Keyword;
        } else if (item.kind?.includes('type') || item.category?.includes('Types')) {
          itemKind = vscode.CompletionItemKind.Struct;
        }

        const comp = new vscode.CompletionItem(item.name, itemKind);
        comp.detail = `[CodeMentor ${lang.toUpperCase()}] ${item.summary}`;

        // Format rich markdown teacher card
        const teacherCard = this.kb.formatTeacherCard(item, mode);
        const md = new vscode.MarkdownString(teacherCard);
        md.isTrusted = true;
        md.supportHtml = true;
        comp.documentation = md;

        // Custom insert text and snippet if available
        if (item.name === 'std::make_unique') {
          comp.insertText = new vscode.SnippetString('std::make_unique<${1:Type}>(${2:args})');
        } else if (item.name === 'std::unordered_map') {
          comp.insertText = new vscode.SnippetString('std::unordered_map<${1:std::string}, ${2:int}> ${3:map};');
        } else if (item.name === 'malloc') {
          comp.insertText = new vscode.SnippetString('malloc(${1:count} * sizeof(*${2:ptr}))');
        } else if (item.name === 'Option<T>') {
          comp.insertText = new vscode.SnippetString('Option<${1:T}>');
        } else if (item.name === 'Vec<T>') {
          comp.insertText = new vscode.SnippetString('Vec<${1:T}>');
        }

        completionItems.push(comp);
      }
    });

    return completionItems;
  }
}
