
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { meetingsTable } from '../db/schema';
import { type CreateMeetingInput } from '../schema';
import { createMeeting } from '../handlers/create_meeting';
import { eq } from 'drizzle-orm';

// Test input with all fields
const testInput: CreateMeetingInput = {
  title: 'Weekly Team Standup',
  date: new Date('2024-01-15T10:00:00Z'),
  attendees: ['John Doe', 'Jane Smith', 'Bob Wilson'],
  general_notes: 'Team meeting to discuss weekly progress',
  discussion_points: ['Sprint review', 'Bug fixes', 'Next sprint planning'],
  action_items: ['Fix login issue', 'Update documentation', 'Schedule client call'],
  summary: 'Productive meeting with clear action items',
  transcribed_text: 'Meeting transcript would go here...',
  ai_enhanced_notes: 'AI enhanced version of notes'
};

// Minimal test input with required fields and defaults
const minimalInput: CreateMeetingInput = {
  title: 'Quick Meeting',
  date: new Date('2024-01-16T14:00:00Z'),
  attendees: [],
  discussion_points: [],
  action_items: []
};

describe('createMeeting', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a meeting with all fields', async () => {
    const result = await createMeeting(testInput);

    // Basic field validation
    expect(result.title).toEqual('Weekly Team Standup');
    expect(result.date).toEqual(testInput.date);
    expect(result.attendees).toEqual(['John Doe', 'Jane Smith', 'Bob Wilson']);
    expect(result.general_notes).toEqual('Team meeting to discuss weekly progress');
    expect(result.discussion_points).toEqual(['Sprint review', 'Bug fixes', 'Next sprint planning']);
    expect(result.action_items).toEqual(['Fix login issue', 'Update documentation', 'Schedule client call']);
    expect(result.summary).toEqual('Productive meeting with clear action items');
    expect(result.transcribed_text).toEqual('Meeting transcript would go here...');
    expect(result.ai_enhanced_notes).toEqual('AI enhanced version of notes');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a meeting with minimal fields and apply defaults', async () => {
    const result = await createMeeting(minimalInput);

    // Basic field validation
    expect(result.title).toEqual('Quick Meeting');
    expect(result.date).toEqual(minimalInput.date);
    expect(result.attendees).toEqual([]);
    expect(result.general_notes).toBeNull();
    expect(result.discussion_points).toEqual([]);
    expect(result.action_items).toEqual([]);
    expect(result.summary).toBeNull();
    expect(result.transcribed_text).toBeNull();
    expect(result.ai_enhanced_notes).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save meeting to database correctly', async () => {
    const result = await createMeeting(testInput);

    // Query database to verify storage
    const meetings = await db.select()
      .from(meetingsTable)
      .where(eq(meetingsTable.id, result.id))
      .execute();

    expect(meetings).toHaveLength(1);
    const meeting = meetings[0];
    
    expect(meeting.title).toEqual('Weekly Team Standup');
    expect(meeting.date).toEqual(testInput.date);
    expect(meeting.general_notes).toEqual('Team meeting to discuss weekly progress');
    expect(meeting.summary).toEqual('Productive meeting with clear action items');
    expect(meeting.transcribed_text).toEqual('Meeting transcript would go here...');
    expect(meeting.ai_enhanced_notes).toEqual('AI enhanced version of notes');
    expect(meeting.created_at).toBeInstanceOf(Date);
    expect(meeting.updated_at).toBeInstanceOf(Date);

    // Verify JSONB arrays are stored and retrieved correctly
    const attendees = Array.isArray(meeting.attendees) ? meeting.attendees : JSON.parse(meeting.attendees as string);
    const discussionPoints = Array.isArray(meeting.discussion_points) ? meeting.discussion_points : JSON.parse(meeting.discussion_points as string);
    const actionItems = Array.isArray(meeting.action_items) ? meeting.action_items : JSON.parse(meeting.action_items as string);

    expect(attendees).toEqual(['John Doe', 'Jane Smith', 'Bob Wilson']);
    expect(discussionPoints).toEqual(['Sprint review', 'Bug fixes', 'Next sprint planning']);
    expect(actionItems).toEqual(['Fix login issue', 'Update documentation', 'Schedule client call']);
  });

  it('should handle empty arrays correctly', async () => {
    const inputWithEmptyArrays: CreateMeetingInput = {
      title: 'Meeting with Empty Arrays',
      date: new Date('2024-01-17T09:00:00Z'),
      attendees: [],
      discussion_points: [],
      action_items: []
    };

    const result = await createMeeting(inputWithEmptyArrays);

    expect(result.attendees).toEqual([]);
    expect(result.discussion_points).toEqual([]);
    expect(result.action_items).toEqual([]);

    // Verify in database
    const meetings = await db.select()
      .from(meetingsTable)
      .where(eq(meetingsTable.id, result.id))
      .execute();

    const meeting = meetings[0];
    const attendees = Array.isArray(meeting.attendees) ? meeting.attendees : JSON.parse(meeting.attendees as string);
    const discussionPoints = Array.isArray(meeting.discussion_points) ? meeting.discussion_points : JSON.parse(meeting.discussion_points as string);
    const actionItems = Array.isArray(meeting.action_items) ? meeting.action_items : JSON.parse(meeting.action_items as string);

    expect(attendees).toEqual([]);
    expect(discussionPoints).toEqual([]);
    expect(actionItems).toEqual([]);
  });
});
