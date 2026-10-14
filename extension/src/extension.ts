import * as vscode from 'vscode';
import { MentorMode, DEFAULT_CONFIG } from './config/mentorConfig';
import { KnowledgeBase } from './knowledge/knowledgeBase';
import { CodeMentorCompletionProvider } from './providers/completionProvider';
import { CodeMentorHoverProvider } from './providers/hoverProvider';
import { CodeMentorSignatureHelpProvider } from './providers/signatureHelpProvider';
import { CodeMentorDiagnosticsProvider } from './providers/diagnosticsProvider';
import { CodeMentorQuickFixProvider } from './providers/quickFixProvider';
import { MemoryAnalyzer, MemoryFinding } from './providers/memoryAnalyzer';
import { ClangdBridge } from './bridges/clangdBridge';
import { RustAnalyzerBridge } from './bridges/rustAnalyzerBridge';

let outputChannel: vscode.OutputChannel;
let statusBarItem: vscode.StatusBarItem;
let currentMode: MentorMode = 'pedagogical';

export function activate(context: vscode.ExtensionContext) {
  outputChannel = vscode.window.createOutputChannel('CodeMentor Engine');
  outputChannel.appendLine('[CodeMentor] Extension activated successfully.');
  outputChannel.appendLine(`[CodeMentor] Mode: ${currentMode}`);
  outputChannel.appendLine(`[CodeMentor] C/C++ LSP: ${ClangdBridge.getLspStatusMessage()}`);
  outputChannel.appendLine(`[CodeMentor] Rust LSP: ${RustAnalyzerBridge.getLspStatusMessage()}`);

  const supportedLanguages = ['c', 'cpp', 'rust'];

  // 1. Status Bar Item
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = 'codementor.setMentorMode';
  updateStatusBar();
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // 2. Register Completion Providers
  const completionProvider = new CodeMentorCompletionProvider(() => currentMode);
  supportedLanguages.forEach((lang) => {
    const disposable = vscode.languages.registerCompletionItemProvider(
      { scheme: 'file', language: lang },
      completionProvider,
      '.',
      ':',
      '>',
      '<'
    );
    context.subscriptions.push(disposable);
  });

  // 3. Register Hover Providers
  const hoverProvider = new CodeMentorHoverProvider(() => currentMode);
  supportedLanguages.forEach((lang) => {
    const disposable = vscode.languages.registerHoverProvider(
      { scheme: 'file', language: lang },
      hoverProvider
    );
    context.subscriptions.push(disposable);
  });

  // 4. Register Signature Help Providers
  const sigProvider = new CodeMentorSignatureHelpProvider();
  supportedLanguages.forEach((lang) => {
    const disposable = vscode.languages.registerSignatureHelpProvider(
      { scheme: 'file', language: lang },
      sigProvider,
      '(',
      ','
    );
    context.subscriptions.push(disposable);
  });

  // 5. Diagnostics & Memory Analyzer
  const diagnosticsProvider = new CodeMentorDiagnosticsProvider(context);

  if (vscode.window.activeTextEditor) {
    diagnosticsProvider.triggerAnalysis(vscode.window.activeTextEditor.document);
  }

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      diagnosticsProvider.triggerAnalysis(event.document);
    }),
    vscode.workspace.onDidOpenTextDocument((doc) => {
      diagnosticsProvider.triggerAnalysis(doc);
    }),
    vscode.workspace.onDidCloseTextDocument((doc) => {
      diagnosticsProvider.clear(doc.uri);
    })
  );

  // 6. Register Quick Fix Provider
  supportedLanguages.forEach((lang) => {
    const disposable = vscode.languages.registerCodeActionsProvider(
      { scheme: 'file', language: lang },
      new CodeMentorQuickFixProvider(),
      { providedCodeActionKinds: CodeMentorQuickFixProvider.providedCodeActionKinds }
    );
    context.subscriptions.push(disposable);
  });

  // 7. Register Commands
  context.subscriptions.push(
    vscode.commands.registerCommand('codementor.setMentorMode', async () => {
      const selected = await vscode.window.showQuickPick(
        [
          { label: 'pedagogical', description: 'وضع تعليمي شامل مع أمثلة وشرح سطر بسطر' },
          { label: 'concise', description: 'وضع مختصر: الوظيفة والصيغة فقط دون تفاصيل مطولة' },
          { label: 'advanced', description: 'وضع متقدم: التفاصيل المعمارية والأداء والـ Low-level' },
          { label: 'security', description: 'وضع أمني: التركيز الحصري على الثغرات وسلامة الذاكرة' },
        ],
        { placeHolder: 'اختر أسلوب الشرح التفاعلي (Mentor Mode):' }
      );

      if (selected) {
        currentMode = selected.label as MentorMode;
        updateStatusBar();
        outputChannel.appendLine(`[CodeMentor] Switched mode to: ${currentMode}`);
      }
    }),

    vscode.commands.registerCommand('codementor.explainCurrentLine', () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const lineText = editor.document.lineAt(editor.selection.active.line).text.trim();
      if (!lineText) {
        vscode.window.showInformationMessage('السطر المحدد فارغ.');
        return;
      }

      outputChannel.clear();
      outputChannel.appendLine('==================================================');
      outputChannel.appendLine(`🎓 CodeMentor: تحليل السطر ${editor.selection.active.line + 1}`);
      outputChannel.appendLine('==================================================');
      outputChannel.appendLine(`الكود: ${lineText}\n`);
      outputChannel.appendLine(`اللغة: ${editor.document.languageId.toUpperCase()}`);
      outputChannel.appendLine(`الوضع النشط: ${currentMode}`);
      outputChannel.show(true);
    }),

    vscode.commands.registerCommand('codementor.analyzeMemoryHazards', () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const findings = MemoryAnalyzer.analyzeDocument(
        editor.document.getText(),
        editor.document.languageId
      );

      outputChannel.clear();
      outputChannel.appendLine('==================================================');
      outputChannel.appendLine('🛡️ تقرير فحص مخاطر الذاكرة الصريح من CodeMentor');
      outputChannel.appendLine('==================================================');
      outputChannel.appendLine(`الملف: ${editor.document.fileName}`);
      outputChannel.appendLine(`عدد المشاكل المكتشفة: ${findings.length}\n`);

      if (findings.length === 0) {
        outputChannel.appendLine('✅ لم يتم العثور على مخاطر ذاكرة واضحة في هذا الملف.');
      } else {
        findings.forEach((f, idx) => {
          outputChannel.appendLine(`[${idx + 1}] [${f.confidence}] ${f.title}`);
          outputChannel.appendLine(`    الموقع: السطر ${f.line + 1}`);
          outputChannel.appendLine(`    المشكلة: ${f.message}`);
          outputChannel.appendLine(`    التأثير: ${f.impact}`);
          outputChannel.appendLine(`    الإصلاح: ${f.howToFix}\n`);
        });
      }
      outputChannel.show(true);
    }),

    vscode.commands.registerCommand('codementor.showKnowledgeCard', async () => {
      const editor = vscode.window.activeTextEditor;
      const lang = (editor?.document.languageId as 'c' | 'cpp' | 'rust') || 'cpp';
      const kb = KnowledgeBase.getInstance();
      const symbols = kb.getSymbols(lang);

      const items = symbols.map((s) => ({
        label: s.name,
        description: s.summary,
        detail: s.syntax,
        item: s,
      }));

      const pick = await vscode.window.showQuickPick(items, {
        placeHolder: `ابحث في قاعدة معرفة CodeMentor (${lang.toUpperCase()}):`,
        matchOnDescription: true,
      });

      if (pick) {
        const doc = await vscode.workspace.openTextDocument({
          language: 'markdown',
          content: kb.formatTeacherCard(pick.item, currentMode),
        });
        vscode.window.showTextDocument(doc, { preview: true });
      }
    }),

    vscode.commands.registerCommand('codementor.explainDiagnostic', (finding: MemoryFinding) => {
      outputChannel.clear();
      outputChannel.appendLine('==================================================');
      outputChannel.appendLine(`🔍 تفاصيل تشخيص CodeMentor: ${finding.title}`);
      outputChannel.appendLine('==================================================');
      outputChannel.appendLine(`درجة الثقة: ${finding.confidence}`);
      outputChannel.appendLine(`السطر: ${finding.line + 1}`);
      outputChannel.appendLine(`المشكلة: ${finding.message}\n`);
      outputChannel.appendLine(`❓ لماذا حدثت؟\n${finding.whyItHappened}\n`);
      outputChannel.appendLine(`💥 التأثير المتوقع:\n${finding.impact}\n`);
      outputChannel.appendLine(`🔧 خطوات الإصلاح:\n${finding.howToFix}\n`);
      if (finding.codeBefore) {
        outputChannel.appendLine(`الكود قبل الإصلاح:\n${finding.codeBefore}\n`);
      }
      if (finding.codeAfter) {
        outputChannel.appendLine(`الكود بعد الإصلاح:\n${finding.codeAfter}\n`);
      }
      outputChannel.show(true);
    }),

    vscode.commands.registerCommand('codementor.showLspStatus', () => {
      const msg = `${ClangdBridge.getLspStatusMessage()}\n\n${RustAnalyzerBridge.getLspStatusMessage()}`;
      vscode.window.showInformationMessage(msg);
    })
  );
}

function updateStatusBar() {
  if (statusBarItem) {
    statusBarItem.text = `$(mortar-board) CodeMentor: ${capitalize(currentMode)}`;
    statusBarItem.tooltip = `انقر لتغيير مستوى الشرح التفاعلي (النمط الحالي: ${currentMode})`;
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function deactivate() {
  if (outputChannel) {
    outputChannel.dispose();
  }
}
