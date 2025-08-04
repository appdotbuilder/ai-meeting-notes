
import { db } from '../db';
import { meetingsTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export const deleteMeeting = async (id: number): Promise<boolean> => {
  try {
    // Delete the meeting record by ID
    const result = await db.delete(meetingsTable)
      .where(eq(meetingsTable.id, id))
      .execute();

    // Check if any rows were affected (deleted)
    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    console.error('Meeting deletion failed:', error);
    throw error;
  }
};
