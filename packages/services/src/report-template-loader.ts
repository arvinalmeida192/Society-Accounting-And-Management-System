import { readFile } from 'node:fs/promises';
import path from 'node:path';

export function applyTemplatePlaceholders(
  template: string,
  placeholders: Record<string, string>,
): string {
  return Object.entries(placeholders).reduce(
    (html, [key, value]) => html.replaceAll(`{{${key}}}`, value),
    template,
  );
}

export async function loadReportTemplateHtml(
  htmlTemplatePath: string | null | undefined,
  placeholders: Record<string, string>,
  fallbackHtml: string,
  workspaceRoot = process.cwd(),
): Promise<string> {
  if (!htmlTemplatePath) return fallbackHtml;

  const absolutePath = path.isAbsolute(htmlTemplatePath)
    ? htmlTemplatePath
    : path.join(workspaceRoot, htmlTemplatePath);

  try {
    const template = await readFile(absolutePath, 'utf8');
    return applyTemplatePlaceholders(template, placeholders);
  } catch {
    return fallbackHtml;
  }
}
