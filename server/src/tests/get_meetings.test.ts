
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { meetingsTable } from '../db/schema';
import { getMeetings } from '../handlers/get_meetings';

describe('getMeetings', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no meetings exist', async () => {
    const result = await getMeetings();
    expect(result).toEqual([]);
  });

  it('should return all meetings with proper field types', async () => {
    // Create test meeting data
    const testMeeting = {
      title: 'Test Meeting',
      date: new Date('2024-01-15T10:00:00Z'),
      attendees: JSON.stringify(['Alice', 'Bob']),
      general_notes: 'Important meeting notes',
      discussion_points: JSON.stringify(['Point 1', 'Point 2']),
      action_items: JSON.stringify(['Action 1', 'Action 2']),
      summary: 'Meeting summary',
      transcribed_text: 'Full transcript here',
      ai_enhanced_notes: 'AI enhanced version'
    };

    await db.insert(meetingsTable)
      .values(testMeeting)
      .execute();

    const result = await getMeetings();

    expect(result).toHaveLength(1);
    const meeting = result[0];

    // Verify basic fields
    expect(meeting.title).toEqual('Test Meeting');
    expect(meeting.date).toBeInstanceOf(Date);
    expect(meeting.general_notes).toEqual('Important meeting notes');
    expect(meeting.summary).toEqual('Meeting summary');
    expect(meeting.transcribed_text).toEqual('Full transcript here');
    expect(meeting.ai_enhanced_notes).toEqual('AI enhanced version');

    // Verify JSONB arrays are properly converted
    expect(Array.isArray(meeting.attendees)).toBe(true);
    expect(meeting.attendees).toEqual(['Alice', 'Bob']);
    expect(Array.isArray(meeting.discussion_points)).toBe(true);
    expect(meeting.discussion_points).toEqual(['Point 1', 'Point 2']);
    expect(Array.isArray(meeting.action_items)).toBe(true);
    expect(meeting.action_items).toEqual(['Action 1', 'Action 2']);

    // Verify timestamps
    expect(meeting.created_at).toBeInstanceOf(Date);
    expect(meeting.updated_at).toBeInstanceOf(Date);
    expect(meeting.id).toBeDefined();
  });

  it('should handle multiple meetings correctly', async () => {
    // Create multiple test meetings
    const meetings = [
      {
        title: 'First Meeting',
        date: new Date('2024-01-15T10:00:00Z'),
        attendees: JSON.stringify(['Alice']),
        discussion_points: JSON.stringify(['Discussion 1']),
        action_items: JSON.stringify(['Action 1'])
      },
      {
        title: 'Second Meeting',
        date: new Date('2024-01-16T14:00:00Z'),
        attendees: JSON.stringify(['Bob', 'Charlie']),
        discussion_points: JSON.stringify(['Discussion 2', 'Discussion 3']),
        action_items: JSON.stringify(['Action 2'])
      }
    ];

    for (const meeting of meetings) {
      await db.insert(meetingsTable)
        .values(meeting)
        .execute();
    }

    const result = await getMeetings();

    expect(result).toHaveLength(2);

    // Verify first meeting
    const firstMeeting = result.find(m => m.title === 'First Meeting');
    expect(firstMeeting).toBeDefined();
    expect(firstMeeting!.attendees).toEqual(['Alice']);
    expect(firstMeeting!.discussion_points).toEqual(['Discussion 1']);
    expect(firstMeeting!.action_items).toEqual(['Action 1']);

    // Verify second meeting
    const secondMeeting = result.find(m => m.title === 'Second Meeting');
    expect(secondMeeting).toBeDefined();
    expect(secondMeeting!.attendees).toEqual(['Bob', 'Charlie']);
    expect(secondMeeting!.discussion_points).toEqual(['Discussion 2', 'Discussion 3']);
    expect(secondMeeting!.action_items).toEqual(['Action 2']);
  });

  it('should handle meetings with empty arrays and null fields', async () => {
    const testMeeting = {
      title: 'Minimal Meeting',
      date: new Date('2024-01-15T10:00:00Z'),
      attendees: JSON.stringify([]), // Empty array
      general_notes: null,
      discussion_points: JSON.stringify([]), // Empty array
      action_items: JSON.stringify([]), // Empty array
      summary: null,
      transcribed_text: null,
      ai_enhanced_notes: null
    };

    await db.insert(meetingsTable)
      .values(testMeeting)
      .execute();

    const result = await getMeetings();

    expect(result).toHaveLength(1);
    const meeting = result[0];

    expect(meeting.title).toEqual('Minimal Meeting');
    expect(meeting.attendees).toEqual([]);
    expect(meeting.discussion_points).toEqual([]);
    expect(meeting.action_items).toEqual([]);
    expect(meeting.general_notes).toBeNull();
    expect(meeting.summary).toBeNull();
    expect(meeting.transcribed_text).toBeNull();
    expect(meeting.ai_enhanced_notes).toBeNull();
  });
});
