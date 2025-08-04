
import { db } from '../db';
import { meetingsTable } from '../db/schema';
import { type UpdateMeetingInput, type Meeting } from '../schema';
import { eq } from 'drizzle-orm';

export const updateMeeting = async (input: UpdateMeetingInput): Promise<Meeting> => {
  try {
    // Build update object with only provided fields
    const updateData: any = {};
    
    if (input.title !== undefined) {
      updateData.title = input.title;
    }
    
    if (input.date !== undefined) {
      updateData.date = input.date;
    }
    
    if (input.attendees !== undefined) {
      updateData.attendees = JSON.stringify(input.attendees);
    }
    
    if (input.general_notes !== undefined) {
      updateData.general_notes = input.general_notes;
    }
    
    if (input.discussion_points !== undefined) {
      updateData.discussion_points = JSON.stringify(input.discussion_points);
    }
    
    if (input.action_items !== undefined) {
      updateData.action_items = JSON.stringify(input.action_items);
    }
    
    if (input.summary !== undefined) {
      updateData.summary = input.summary;
    }
    
    if (input.transcribed_text !== undefined) {
      updateData.transcribed_text = input.transcribed_text;
    }
    
    if (input.ai_enhanced_notes !== undefined) {
      updateData.ai_enhanced_notes = input.ai_enhanced_notes;
    }
    
    // Always update the updated_at timestamp
    updateData.updated_at = new Date();

    // Update the meeting record
    const result = await db.update(meetingsTable)
      .set(updateData)
      .where(eq(meetingsTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Meeting with id ${input.id} not found`);
    }

    // Convert JSONB fields back to arrays for response
    const meeting = result[0];
    return {
      ...meeting,
      attendees: Array.isArray(meeting.attendees) 
        ? meeting.attendees 
        : JSON.parse((meeting.attendees as string) || '[]'),
      discussion_points: Array.isArray(meeting.discussion_points) 
        ? meeting.discussion_points 
        : JSON.parse((meeting.discussion_points as string) || '[]'),
      action_items: Array.isArray(meeting.action_items) 
        ? meeting.action_items 
        : JSON.parse((meeting.action_items as string) || '[]')
    };
  } catch (error) {
    console.error('Meeting update failed:', error);
    throw error;
  }
};
