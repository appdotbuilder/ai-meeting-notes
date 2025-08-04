
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { meetingsTable } from '../db/schema';
import { type AiEnhanceInput, type CreateMeetingInput } from '../schema';
import { aiEnhanceNotes } from '../handlers/ai_enhance_notes';

describe('aiEnhanceNotes', () => {
  let testMeetingId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create a test meeting
    const testMeeting: CreateMeetingInput = {
      title: 'Test Meeting',
      date: new Date('2024-01-15T10:00:00Z'),
      attendees: ['Alice', 'Bob'],
      general_notes: 'We discussed the project timeline and budget.',
      discussion_points: ['Timeline', 'Budget'],
      action_items: ['Review proposal'],
      transcribed_text: 'Hello everyone, we need to review the proposal and schedule follow-up meeting.'
    };

    const result = await db.insert(meetingsTable)
      .values({
        title: testMeeting.title,
        date: testMeeting.date,
        attendees: JSON.stringify(testMeeting.attendees),
        general_notes: testMeeting.general_notes,
        discussion_points: JSON.stringify(testMeeting.discussion_points),
        action_items: JSON.stringify(testMeeting.action_items),
        transcribed_text: testMeeting.transcribed_text
      })
      .returning()
      .execute();

    testMeetingId = result[0].id;
  });

  afterEach(resetDB);

  it('should enhance grammar when enhance_type is grammar', async () => {
    const input: AiEnhanceInput = {
      meeting_id: testMeetingId,
      transcribed_text: 'Teh team will recieve feedback and seperate tasks.',
      enhance_type: 'grammar'
    };

    const result = await aiEnhanceNotes(input);

    expect(result.meeting_id).toEqual(testMeetingId);
    expect(result.enhanced_notes).toContain('Grammar-enhanced version');
    expect(result.enhanced_notes).toContain('the team will receive feedback and separate tasks');
    expect(result.generated_summary).toBeNull();
    expect(result.extracted_action_items).toHaveLength(0);
  });

  it('should generate summary when enhance_type is summary', async () => {
    const input: AiEnhanceInput = {
      meeting_id: testMeetingId,
      transcribed_text: 'We discussed the project timeline. Budget allocation was reviewed. Next steps were defined.',
      enhance_type: 'summary'
    };

    const result = await aiEnhanceNotes(input);

    expect(result.meeting_id).toEqual(testMeetingId);
    expect(result.enhanced_notes).toBeNull();
    expect(result.generated_summary).toContain('Summary:');
    expect(result.generated_summary).toContain('project timeline');
    expect(result.extracted_action_items).toHaveLength(0);
  });

  it('should extract action items when enhance_type is action_items', async () => {
    const input: AiEnhanceInput = {
      meeting_id: testMeetingId,
      transcribed_text: 'We need to review the proposal. John will follow up with the client. Task: prepare presentation.',
      enhance_type: 'action_items'
    };

    const result = await aiEnhanceNotes(input);

    expect(result.meeting_id).toEqual(testMeetingId);
    expect(result.enhanced_notes).toBeNull();
    expect(result.generated_summary).toBeNull();
    expect(result.extracted_action_items.length).toBeGreaterThan(0);
    expect(result.extracted_action_items.some(item => 
      item.toLowerCase().includes('review') || item.toLowerCase().includes('follow')
    )).toBe(true);
  });

  it('should provide full enhancement when enhance_type is full_enhancement', async () => {
    const input: AiEnhanceInput = {
      meeting_id: testMeetingId,
      transcribed_text: 'Meeting discussion about project status.',
      enhance_type: 'full_enhancement'
    };

    const result = await aiEnhanceNotes(input);

    expect(result.meeting_id).toEqual(testMeetingId);
    expect(result.enhanced_notes).toContain('Enhanced notes:');
    expect(result.generated_summary).toContain('Full summary:');
    expect(result.extracted_action_items.length).toBeGreaterThan(0);
  });

  it('should use user_notes when transcribed_text is not provided', async () => {
    const input: AiEnhanceInput = {
      meeting_id: testMeetingId,
      user_notes: 'Important discussion about deadlines.',
      enhance_type: 'summary'
    };

    const result = await aiEnhanceNotes(input);

    expect(result.meeting_id).toEqual(testMeetingId);
    expect(result.generated_summary).toContain('Summary:');
    expect(result.generated_summary).toContain('deadlines');
  });

  it('should use existing meeting data when no input content provided', async () => {
    const input: AiEnhanceInput = {
      meeting_id: testMeetingId,
      enhance_type: 'summary'
    };

    const result = await aiEnhanceNotes(input);

    expect(result.meeting_id).toEqual(testMeetingId);
    expect(result.generated_summary).toContain('Summary:');
  });

  it('should throw error when meeting does not exist', async () => {
    const input: AiEnhanceInput = {
      meeting_id: 99999,
      transcribed_text: 'Some text',
      enhance_type: 'grammar'
    };

    await expect(aiEnhanceNotes(input)).rejects.toThrow(/Meeting with ID 99999 not found/);
  });

  it('should throw error when no content available to enhance', async () => {
    // Create meeting with no content
    const result = await db.insert(meetingsTable)
      .values({
        title: 'Empty Meeting',
        date: new Date(),
        attendees: JSON.stringify([]),
        discussion_points: JSON.stringify([]),
        action_items: JSON.stringify([])
      })
      .returning()
      .execute();

    const input: AiEnhanceInput = {
      meeting_id: result[0].id,
      enhance_type: 'grammar'
    };

    await expect(aiEnhanceNotes(input)).rejects.toThrow(/No content available to enhance/);
  });

  it('should throw error for unsupported enhancement type', async () => {
    const input = {
      meeting_id: testMeetingId,
      transcribed_text: 'Some text',
      enhance_type: 'invalid_type' as any
    };

    await expect(aiEnhanceNotes(input)).rejects.toThrow(/Unsupported enhancement type/);
  });
});
