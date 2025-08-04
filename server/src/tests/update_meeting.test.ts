
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { meetingsTable } from '../db/schema';
import { type CreateMeetingInput, type UpdateMeetingInput } from '../schema';
import { updateMeeting } from '../handlers/update_meeting';
import { eq } from 'drizzle-orm';

// Test input for creating a meeting to update
const testCreateInput: CreateMeetingInput = {
  title: 'Original Meeting',
  date: new Date('2024-01-15T10:00:00Z'),
  attendees: ['Alice', 'Bob'],
  general_notes: 'Original notes',
  discussion_points: ['Point 1', 'Point 2'],
  action_items: ['Action 1', 'Action 2'],
  summary: 'Original summary',
  transcribed_text: 'Original transcript',
  ai_enhanced_notes: 'Original AI notes'
};

// Helper function to create a meeting for testing
const createTestMeeting = async (input: CreateMeetingInput) => {
  const result = await db.insert(meetingsTable)
    .values({
      title: input.title,
      date: input.date,
      attendees: JSON.stringify(input.attendees || []),
      general_notes: input.general_notes || null,
      discussion_points: JSON.stringify(input.discussion_points || []),
      action_items: JSON.stringify(input.action_items || []),
      summary: input.summary || null,
      transcribed_text: input.transcribed_text || null,
      ai_enhanced_notes: input.ai_enhanced_notes || null
    })
    .returning()
    .execute();

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
};

describe('updateMeeting', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update a meeting with all fields', async () => {
    // Create a meeting first
    const originalMeeting = await createTestMeeting(testCreateInput);

    const updateInput: UpdateMeetingInput = {
      id: originalMeeting.id,
      title: 'Updated Meeting Title',
      date: new Date('2024-01-16T14:00:00Z'),
      attendees: ['Charlie', 'David', 'Eve'],
      general_notes: 'Updated notes',
      discussion_points: ['Updated Point 1', 'Updated Point 2', 'New Point 3'],
      action_items: ['Updated Action 1'],
      summary: 'Updated summary',
      transcribed_text: 'Updated transcript',
      ai_enhanced_notes: 'Updated AI notes'
    };

    const result = await updateMeeting(updateInput);

    // Verify all fields were updated
    expect(result.id).toEqual(originalMeeting.id);
    expect(result.title).toEqual('Updated Meeting Title');
    expect(result.date).toEqual(new Date('2024-01-16T14:00:00Z'));
    expect(result.attendees).toEqual(['Charlie', 'David', 'Eve']);
    expect(result.general_notes).toEqual('Updated notes');
    expect(result.discussion_points).toEqual(['Updated Point 1', 'Updated Point 2', 'New Point 3']);
    expect(result.action_items).toEqual(['Updated Action 1']);
    expect(result.summary).toEqual('Updated summary');
    expect(result.transcribed_text).toEqual('Updated transcript');
    expect(result.ai_enhanced_notes).toEqual('Updated AI notes');
    expect(result.created_at).toEqual(originalMeeting.created_at);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > originalMeeting.updated_at).toBe(true);
  });

  it('should update only specified fields', async () => {
    // Create a meeting first
    const originalMeeting = await createTestMeeting(testCreateInput);

    const updateInput: UpdateMeetingInput = {
      id: originalMeeting.id,
      title: 'Partially Updated Title',
      summary: 'New summary only'
    };

    const result = await updateMeeting(updateInput);

    // Verify only specified fields were updated
    expect(result.title).toEqual('Partially Updated Title');
    expect(result.summary).toEqual('New summary only');
    
    // Verify other fields remained unchanged
    expect(result.date).toEqual(originalMeeting.date);
    expect(result.attendees).toEqual(originalMeeting.attendees);
    expect(result.general_notes).toEqual(originalMeeting.general_notes);
    expect(result.discussion_points).toEqual(originalMeeting.discussion_points);
    expect(result.action_items).toEqual(originalMeeting.action_items);
    expect(result.transcribed_text).toEqual(originalMeeting.transcribed_text);
    expect(result.ai_enhanced_notes).toEqual(originalMeeting.ai_enhanced_notes);
    expect(result.updated_at > originalMeeting.updated_at).toBe(true);
  });

  it('should update meeting in database', async () => {
    // Create a meeting first
    const originalMeeting = await createTestMeeting(testCreateInput);

    const updateInput: UpdateMeetingInput = {
      id: originalMeeting.id,
      title: 'Database Update Test',
      attendees: ['New Attendee']
    };

    await updateMeeting(updateInput);

    // Verify changes were persisted to database
    const dbMeeting = await db.select()
      .from(meetingsTable)
      .where(eq(meetingsTable.id, originalMeeting.id))
      .execute();

    expect(dbMeeting).toHaveLength(1);
    expect(dbMeeting[0].title).toEqual('Database Update Test');
    
    // Parse JSONB field to verify array was stored correctly
    const attendees = Array.isArray(dbMeeting[0].attendees) 
      ? dbMeeting[0].attendees 
      : JSON.parse((dbMeeting[0].attendees as string) || '[]');
    expect(attendees).toEqual(['New Attendee']);
    expect(dbMeeting[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle nullable fields correctly', async () => {
    // Create a meeting first
    const originalMeeting = await createTestMeeting(testCreateInput);

    const updateInput: UpdateMeetingInput = {
      id: originalMeeting.id,
      general_notes: null,
      summary: null,
      transcribed_text: null,
      ai_enhanced_notes: null
    };

    const result = await updateMeeting(updateInput);

    // Verify nullable fields were set to null
    expect(result.general_notes).toBeNull();
    expect(result.summary).toBeNull();
    expect(result.transcribed_text).toBeNull();
    expect(result.ai_enhanced_notes).toBeNull();
  });

  it('should handle empty arrays correctly', async () => {
    // Create a meeting first
    const originalMeeting = await createTestMeeting(testCreateInput);

    const updateInput: UpdateMeetingInput = {
      id: originalMeeting.id,
      attendees: [],
      discussion_points: [],
      action_items: []
    };

    const result = await updateMeeting(updateInput);

    // Verify empty arrays were set correctly
    expect(result.attendees).toEqual([]);
    expect(result.discussion_points).toEqual([]);
    expect(result.action_items).toEqual([]);
  });

  it('should throw error for non-existent meeting', async () => {
    const updateInput: UpdateMeetingInput = {
      id: 99999,
      title: 'Non-existent Meeting'
    };

    expect(updateMeeting(updateInput)).rejects.toThrow(/not found/i);
  });

  it('should always update the updated_at timestamp', async () => {
    // Create a meeting first
    const originalMeeting = await createTestMeeting(testCreateInput);

    // Wait a small amount to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const updateInput: UpdateMeetingInput = {
      id: originalMeeting.id,
      title: 'Timestamp Test'
    };

    const result = await updateMeeting(updateInput);

    // Verify updated_at timestamp was changed
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > originalMeeting.updated_at).toBe(true);
  });
});
