import { describe, expect, it } from 'vitest';
import { memberCsvTemplateContent, MEMBER_CSV_HEADERS } from './import-service.js';

describe('import-service', () => {
  it('exports expected CSV headers per SDD §20.4', () => {
    expect(MEMBER_CSV_HEADERS).toContain('memberName');
    expect(MEMBER_CSV_HEADERS).toContain('buildingShort');
    expect(MEMBER_CSV_HEADERS).toContain('regularPrincipalOB');
    expect(MEMBER_CSV_HEADERS).toContain('supplementaryInterestOB');
  });

  it('generates template with header row only', () => {
    const content = memberCsvTemplateContent();
    const lines = content.trim().split('\n');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe(MEMBER_CSV_HEADERS.join(','));
  });
});
