
import { db } from '../db';
import { meetingsTable } from '../db/schema';
import { type Meeting } from '../schema';
import { eq } from 'drizzle-orm';

export const getMeetingById = async (id: number): Promise<Meeting | null> => {
  try {
    const result = await db.select()
      .from(meetingsTable)
      .where(eq(meetingsTable.id, id))
      .execute();

    if (result.length === 0) {
      return null;
    }

    const meeting = result[0];
    
    // Convert the database record to match the Meeting schema
    return {
      id: meeting.id,
      title: meeting.title,
      date: meeting.date,
      attendees: meeting.attendees as string[], // JSONB field cast to string array
      general_notes: meeting.general_notes,
      discussion_points: meeting.discussion_points as string[], // JSONB field cast to string array
      action_items: meeting.action_items as string[], // JSONB field cast to string array
      summary: meeting.summary,
      transcribed_text: meeting.transcribed_text,
      ai_enhanced_notes: meeting.ai_enhanced_notes,
      created_at: meeting.created_at,
      updated_at: meeting.updated_at
    };
  } catch (error) {
    console.error('Failed to fetch meeting:', error);
    throw error;
  }
};
