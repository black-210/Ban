/**
 * CodeMentor Extension Configuration
 */

export type MentorMode = 'pedagogical' | 'concise' | 'advanced' | 'security';

export interface CodeMentorConfig {
  mentorMode: MentorMode;
  enableMemoryAnalysis: boolean;
  confidenceThreshold: 'all' | 'warning' | 'confirmed';
  enableQuickFixes: boolean;
  enableHoverCards: boolean;
  enableSignatureHelp: boolean;
  preferExternalLsp: boolean;
}

export const DEFAULT_CONFIG: CodeMentorConfig = {
  mentorMode: 'pedagogical',
  enableMemoryAnalysis: true,
  confidenceThreshold: 'all',
  enableQuickFixes: true,
  enableHoverCards: true,
  enableSignatureHelp: true,
  preferExternalLsp: true,
};
