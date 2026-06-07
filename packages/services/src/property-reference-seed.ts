import type { PrismaClient } from '@prisma/client';

const SYSTEM_ACTOR = 'SYSTEM';

/** Seed default reference masters for new societies — SDD §30.3 / §23.10 */
export async function seedPropertyReferenceMasters(
  client: PrismaClient,
  actorId: string = SYSTEM_ACTOR,
): Promise<void> {
  const typeCount = await client.unitType.count();
  if (typeCount === 0) {
    for (const typeName of ['Residential', 'Commercial', 'Shop']) {
      await client.unitType.create({
        data: { typeName, createdBy: actorId, updatedBy: actorId },
      });
    }
  }

  const compositionCount = await client.unitComposition.count();
  if (compositionCount === 0) {
    for (const compositionName of ['1RK', '1BHK', '2BHK', '3BHK', '1 Gala']) {
      await client.unitComposition.create({
        data: { compositionName, createdBy: actorId, updatedBy: actorId },
      });
    }
  }

  const floorCount = await client.floorMaster.count();
  if (floorCount === 0) {
    const floors = [
      { srNo: 0, floorName: 'Ground Floor' },
      { srNo: 1, floorName: 'First Floor' },
      { srNo: 2, floorName: 'Second Floor' },
      { srNo: 3, floorName: 'Third Floor' },
    ];
    for (const floor of floors) {
      await client.floorMaster.create({
        data: { ...floor, createdBy: actorId, updatedBy: actorId },
      });
    }
  }
}
