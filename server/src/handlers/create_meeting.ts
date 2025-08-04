
import { db } from '../db';
import { meetingsTable } from '../db/schema';
import { type CreateMeetingInput, type Meeting } from '../schema';

export const createMeeting = async (input: CreateMeetingInput): Promise<Meeting> => {
  try {
    // Insert meeting record
    const result = await db.insert(meetingsTable)
      .values({
        title: input.title,
        date: input.date,
        attendees: JSON.stringify(input.attendees || []), // Convert array to JSON string for JSONB storage
        general_notes: input.general_notes || null,
        discussion_points: JSON.stringify(input.discussion_points || []), // Convert array to JSON string for JSONB storage
        action_items: JSON.stringify(input.action_items || []), // Convert array to JSON string for JSONB storage
        summary: input.summary || null,
        transcribed_text: input.transcribed_text || null,
        ai_enhanced_notes: input.ai_enhanced_notes || null
      })
      .returning()
      .execute();

    // Convert JSONB fields back to arrays before returning
    const meeting = result[0];
    return {
      ...meeting,
      attendees: Array.isArray(meeting.attendees) ? meeting.attendees : JSON.parse(meeting.attendees as string),
      discussion_points: Array.isArray(meeting.discussion_points) ? meeting.discussion_points : JSON.parse(meeting.discussion_points as string),
      action_items: Array.isArray(meeting.action_items) ? meeting.action_items : JSON.parse(meeting.action_items as string)
    };
  } catch (error) {
    console.error('Meeting creation failed:', error);
    throw error;
  }
};
