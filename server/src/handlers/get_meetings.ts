
import { db } from '../db';
import { meetingsTable } from '../db/schema';
import { type Meeting } from '../schema';

export const getMeetings = async (): Promise<Meeting[]> => {
  try {
    const results = await db.select()
      .from(meetingsTable)
      .execute();

    // Convert JSONB fields back to TypeScript arrays
    return results.map(meeting => ({
      ...meeting,
      attendees: Array.isArray(meeting.attendees) ? meeting.attendees : [],
      discussion_points: Array.isArray(meeting.discussion_points) ? meeting.discussion_points : [],
      action_items: Array.isArray(meeting.action_items) ? meeting.action_items : []
    }));
  } catch (error) {
    console.error('Failed to fetch meetings:', error);
    throw error;
  }
};
