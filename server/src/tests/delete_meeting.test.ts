
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { meetingsTable } from '../db/schema';
import { type CreateMeetingInput } from '../schema';
import { deleteMeeting } from '../handlers/delete_meeting';
import { eq } from 'drizzle-orm';

// Test input for creating a meeting
const testMeetingInput: CreateMeetingInput = {
  title: 'Test Meeting',
  date: new Date('2024-01-15T10:00:00Z'),
  attendees: ['Alice', 'Bob'],
  general_notes: 'Test notes',
  discussion_points: ['Point 1', 'Point 2'],
  action_items: ['Action 1', 'Action 2'],
  summary: 'Test summary',
  transcribed_text: 'Test transcription',
  ai_enhanced_notes: 'Enhanced notes'
};

describe('deleteMeeting', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an existing meeting and return true', async () => {
    // Create a meeting first
    const createResult = await db.insert(meetingsTable)
      .values({
        title: testMeetingInput.title,
        date: testMeetingInput.date,
        attendees: testMeetingInput.attendees,
        general_notes: testMeetingInput.general_notes,
        discussion_points: testMeetingInput.discussion_points,
        action_items: testMeetingInput.action_items,
        summary: testMeetingInput.summary,
        transcribed_text: testMeetingInput.transcribed_text,
        ai_enhanced_notes: testMeetingInput.ai_enhanced_notes
      })
      .returning()
      .execute();

    const createdMeeting = createResult[0];

    // Delete the meeting
    const result = await deleteMeeting(createdMeeting.id);

    expect(result).toBe(true);
  });

  it('should return false when trying to delete non-existent meeting', async () => {
    // Try to delete a meeting that doesn't exist
    const result = await deleteMeeting(999);

    expect(result).toBe(false);
  });

  it('should actually remove the meeting from database', async () => {
    // Create a meeting first
    const createResult = await db.insert(meetingsTable)
      .values({
        title: testMeetingInput.title,
        date: testMeetingInput.date,
        attendees: testMeetingInput.attendees,
        general_notes: testMeetingInput.general_notes,
        discussion_points: testMeetingInput.discussion_points,
        action_items: testMeetingInput.action_items,
        summary: testMeetingInput.summary,
        transcribed_text: testMeetingInput.transcribed_text,
        ai_enhanced_notes: testMeetingInput.ai_enhanced_notes
      })
      .returning()
      .execute();

    const createdMeeting = createResult[0];

    // Verify meeting exists before deletion
    const beforeDelete = await db.select()
      .from(meetingsTable)
      .where(eq(meetingsTable.id, createdMeeting.id))
      .execute();

    expect(beforeDelete).toHaveLength(1);

    // Delete the meeting
    await deleteMeeting(createdMeeting.id);

    // Verify meeting no longer exists
    const afterDelete = await db.select()
      .from(meetingsTable)
      .where(eq(meetingsTable.id, createdMeeting.id))
      .execute();

    expect(afterDelete).toHaveLength(0);
  });

  it('should not affect other meetings when deleting one', async () => {
    // Create two meetings
    const createResult1 = await db.insert(meetingsTable)
      .values({
        title: 'Meeting 1',
        date: testMeetingInput.date,
        attendees: testMeetingInput.attendees,
        general_notes: testMeetingInput.general_notes,
        discussion_points: testMeetingInput.discussion_points,
        action_items: testMeetingInput.action_items,
        summary: testMeetingInput.summary,
        transcribed_text: testMeetingInput.transcribed_text,
        ai_enhanced_notes: testMeetingInput.ai_enhanced_notes
      })
      .returning()
      .execute();

    const createResult2 = await db.insert(meetingsTable)
      .values({
        title: 'Meeting 2',
        date: testMeetingInput.date,
        attendees: testMeetingInput.attendees,
        general_notes: testMeetingInput.general_notes,
        discussion_points: testMeetingInput.discussion_points,
        action_items: testMeetingInput.action_items,
        summary: testMeetingInput.summary,
        transcribed_text: testMeetingInput.transcribed_text,
        ai_enhanced_notes: testMeetingInput.ai_enhanced_notes
      })
      .returning()
      .execute();

    const meeting1 = createResult1[0];
    const meeting2 = createResult2[0];

    // Delete first meeting
    const deleteResult = await deleteMeeting(meeting1.id);
    expect(deleteResult).toBe(true);

    // Verify first meeting is deleted
    const deletedMeeting = await db.select()
      .from(meetingsTable)
      .where(eq(meetingsTable.id, meeting1.id))
      .execute();

    expect(deletedMeeting).toHaveLength(0);

    // Verify second meeting still exists
    const remainingMeeting = await db.select()
      .from(meetingsTable)
      .where(eq(meetingsTable.id, meeting2.id))
      .execute();

    expect(remainingMeeting).toHaveLength(1);
    expect(remainingMeeting[0].title).toBe('Meeting 2');
  });
});
