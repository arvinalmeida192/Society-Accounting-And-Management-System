import type { PrismaClient } from '@prisma/client';
import { LetterType } from '@prisma/client';

const SYSTEM_ACTOR = 'SYSTEM';

const DEFAULT_TEMPLATES = [
  {
    letterType: LetterType.GENERAL_REMINDER,
    name: 'General Reminder',
    bodyTemplate: `<p>To,</p>
<p><strong>{memberName}</strong><br/>Unit No. {unitNo}, {buildingName}</p>
<p>Dear Member,</p>
<p>This is a reminder that your society dues of <strong>Rs. {amount}</strong> remain outstanding as on <strong>[date]</strong>.</p>
<p>Kindly clear the dues at the earliest to avoid further interest and legal action.</p>
<p>Thanking you,<br/>{societyName}</p>`,
  },
  {
    letterType: LetterType.MCACT_101,
    name: 'MCACT-101 Notice',
    bodyTemplate: `<p><strong>NOTICE UNDER SECTION 101 OF THE MAHARASHTRA CO-OPERATIVE SOCIETIES ACT, 1960</strong></p>
<p>Ref: <strong>{referenceNo}</strong><br/>Date: <strong>[date]</strong></p>
<p>To,<br/><strong>{memberName}</strong><br/>Unit No. {unitNo}, {buildingName}<br/>{memberAddress}</p>
<p>Subject: Recovery of outstanding dues</p>
<p>You are hereby called upon to pay the sum of <strong>Rs. {amount}</strong> being outstanding maintenance and allied charges as on <strong>[date]</strong>, failing which the society shall be constrained to initiate recovery proceedings as per law.</p>
<p>For {societyName}</p>`,
  },
  {
    letterType: LetterType.CUSTOM,
    name: 'Custom Notice',
    bodyTemplate: `<p>To,</p>
<p><strong>{memberName}</strong></p>
<p>{customBody}</p>
<p>Regards,<br/>{societyName}</p>`,
  },
] as const;

export async function seedLetterTemplates(
  client: PrismaClient,
  actorId: string = SYSTEM_ACTOR,
): Promise<void> {
  for (const template of DEFAULT_TEMPLATES) {
    const existing = await client.letterTemplate.findFirst({
      where: { letterType: template.letterType, name: template.name },
    });
    if (existing) continue;

    await client.letterTemplate.create({
      data: {
        letterType: template.letterType,
        name: template.name,
        bodyTemplate: template.bodyTemplate,
        isActive: true,
        createdBy: actorId,
        updatedBy: actorId,
      },
    });
  }
}
