import { writeFile } from 'node:fs/promises';
import { BrowserWindow, dialog } from 'electron';
import { PermissionAction } from '@sams/shared-types';
import type {
  ReportCatalogEntryDto,
  ReportExportResultDto,
  ReportPreviewResultDto,
  ReportResultDto,
  ReportRunPayload,
} from '@sams/shared-types';
import {
  exportReportCsv,
  listReportCatalog,
  previewReport,
  renderReportHtml,
  runReport,
} from '@sams/services';
import { getActivePrisma } from '../../database/database-manager.js';
import type { IpcHandler } from '../pipeline.js';

async function htmlToPdf(html: string, targetPath: string): Promise<string> {
  const win = new BrowserWindow({
    show: false,
    webPreferences: { offscreen: true },
  });
  try {
    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    const pdf = await win.webContents.printToPDF({ printBackground: true });
    await writeFile(targetPath, pdf);
    return targetPath;
  } finally {
    win.destroy();
  }
}

export const reportHandlers = {
  list: (async () => listReportCatalog()) as IpcHandler<Record<string, never>, ReportCatalogEntryDto[]>,

  run: (async (_ctx, payload: ReportRunPayload) =>
    runReport(getActivePrisma(), payload.reportId, payload.parameters ?? {})) as IpcHandler<
    ReportRunPayload,
    ReportResultDto
  >,

  preview: (async (_ctx, payload: ReportRunPayload) =>
    previewReport(getActivePrisma(), payload.reportId, payload.parameters ?? {})) as IpcHandler<
    ReportRunPayload,
    ReportPreviewResultDto
  >,

  exportCsv: (async (_ctx, payload: ReportRunPayload & { targetPath?: string }) => {
    const result = await runReport(
      getActivePrisma(),
      payload.reportId,
      payload.parameters ?? {},
    );
    let targetPath = payload.targetPath;
    if (!targetPath) {
      const pick = await dialog.showSaveDialog({
        title: 'Export Report CSV',
        defaultPath: `${payload.reportId}-${new Date().toISOString().slice(0, 10)}.csv`,
        filters: [{ name: 'CSV', extensions: ['csv'] }],
      });
      if (pick.canceled || !pick.filePath) {
        return { path: '' };
      }
      targetPath = pick.filePath;
    }
    const path = await exportReportCsv(result, targetPath);
    return { path };
  }) as IpcHandler<ReportRunPayload & { targetPath?: string }, ReportExportResultDto>,

  exportPdf: (async (_ctx, payload: ReportRunPayload & { targetPath?: string }) => {
    const result = await runReport(
      getActivePrisma(),
      payload.reportId,
      payload.parameters ?? {},
    );
    const html = renderReportHtml(result);
    let targetPath = payload.targetPath;
    if (!targetPath) {
      const pick = await dialog.showSaveDialog({
        title: 'Export Report PDF',
        defaultPath: `${payload.reportId}-${new Date().toISOString().slice(0, 10)}.pdf`,
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
      });
      if (pick.canceled || !pick.filePath) {
        return { path: '' };
      }
      targetPath = pick.filePath;
    }
    const path = await htmlToPdf(html, targetPath);
    return { path };
  }) as IpcHandler<ReportRunPayload & { targetPath?: string }, ReportExportResultDto>,

  print: (async (_ctx, payload: ReportRunPayload) => {
    const preview = await previewReport(
      getActivePrisma(),
      payload.reportId,
      payload.parameters ?? {},
    );
    return preview;
  }) as IpcHandler<ReportRunPayload, ReportPreviewResultDto>,
};

export const reportReadOptions = {
  resource: 'reports',
  action: PermissionAction.READ,
  requireDatabase: true,
};

export const reportExportOptions = {
  resource: 'reports',
  action: PermissionAction.EXPORT,
  requireDatabase: true,
};

export const reportPrintOptions = {
  resource: 'reports',
  action: PermissionAction.PRINT,
  requireDatabase: true,
};
