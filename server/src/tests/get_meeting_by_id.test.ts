
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { meetingsTable } from '../db/schema';
import { getMeetingById } from '../handlers/get_meeting_by_id';

const testMeetingData = {
  title: 'Team Standup',
  date: new Date('2024-01-15T10:00:00Z'),
  attendees: ['Alice', 'Bob', 'Charlie'],
  general_notes: 'Regular standup meeting',
  discussion_points: ['Sprint progress', 'Blockers', 'Next steps'],
  action_items: ['Review PR #123', 'Update documentation'],
  summary: 'Good progress on current sprint',
  transcribed_text: 'Meeting transcription here...',
  ai_enhanced_notes: 'AI enhanced notes here...'
};

describe('getMeetingById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return a meeting when found', async () => {
    // Create test meeting
    const insertResult = await db.insert(meetingsTable)
      .values(testMeetingData)
      .returning()
      .execute();

    const createdMeeting = insertResult[0];
    
    // Fetch the meeting by ID
    const result = await getMeetingById(createdMeeting.id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdMeeting.id);
    expect(result!.title).toEqual('Team Standup');
    expect(result!.date).toEqual(testMeetingData.date);
    expect(result!.attendees).toEqual(['Alice', 'Bob', 'Charlie']);
    expect(result!.general_notes).toEqual('Regular standup meeting');
    expect(result!.discussion_points).toEqual(['Sprint progress', 'Blockers', 'Next steps']);
    expect(result!.action_items).toEqual(['Review PR #123', 'Update documentation']);
    expect(result!.summary).toEqual('Good progress on current sprint');
    expect(result!.transcribed_text).toEqual('Meeting transcription here...');
    expect(result!.ai_enhanced_notes).toEqual('AI enhanced notes here...');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when meeting not found', async () => {
    const result = await getMeetingById(999);
    expect(result).toBeNull();
  });

  it('should handle meetings with null optional fields', async () => {
    // Create minimal meeting with only required fields
    const minimalMeeting = {
      title: 'Minimal Meeting',
      date: new Date('2024-01-15T14:00:00Z'),
      attendees: [],
      general_notes: null,
      discussion_points: [],
      action_items: [],
      summary: null,
      transcribed_text: null,
      ai_enhanced_notes: null
    };

    const insertResult = await db.insert(meetingsTable)
      .values(minimalMeeting)
      .returning()
      .execute();

    const createdMeeting = insertResult[0];
    const result = await getMeetingById(createdMeeting.id);

    expect(result).not.toBeNull();
    expect(result!.title).toEqual('Minimal Meeting');
    expect(result!.attendees).toEqual([]);
    expect(result!.general_notes).toBeNull();
    expect(result!.discussion_points).toEqual([]);
    expect(result!.action_items).toEqual([]);
    expect(result!.summary).toBeNull();
    expect(result!.transcribed_text).toBeNull();
    expect(result!.ai_enhanced_notes).toBeNull();
  });

  it('should handle JSONB arrays correctly', async () => {
    const meetingWithArrays = {
      title: 'Array Test Meeting',
      date: new Date('2024-01-15T16:00:00Z'),
      attendees: ['User1', 'User2', 'User3'],
      general_notes: 'Testing JSONB arrays',
      discussion_points: ['Point A', 'Point B', 'Point C'],
      action_items: ['Action 1', 'Action 2'],
      summary: null,
      transcribed_text: null,
      ai_enhanced_notes: null
    };

    const insertResult = await db.insert(meetingsTable)
      .values(meetingWithArrays)
      .returning()
      .execute();

    const createdMeeting = insertResult[0];
    const result = await getMeetingById(createdMeeting.id);

    expect(result).not.toBeNull();
    expect(Array.isArray(result!.attendees)).toBe(true);
    expect(result!.attendees).toHaveLength(3);
    expect(result!.attendees[0]).toEqual('User1');
    
    expect(Array.isArray(result!.discussion_points)).toBe(true);
    expect(result!.discussion_points).toHaveLength(3);
    expect(result!.discussion_points[1]).toEqual('Point B');
    
    expect(Array.isArray(result!.action_items)).toBe(true);
    expect(result!.action_items).toHaveLength(2);
    expect(result!.action_items[0]).toEqual('Action 1');
  });
});
