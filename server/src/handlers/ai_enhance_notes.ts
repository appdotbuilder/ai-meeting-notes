
import { db } from '../db';
import { meetingsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type AiEnhanceInput, type AiEnhanceResponse } from '../schema';

export const aiEnhanceNotes = async (input: AiEnhanceInput): Promise<AiEnhanceResponse> => {
  try {
    // Verify the meeting exists
    const meetings = await db.select()
      .from(meetingsTable)
      .where(eq(meetingsTable.id, input.meeting_id))
      .execute();

    if (meetings.length === 0) {
      throw new Error(`Meeting with ID ${input.meeting_id} not found`);
    }

    const meeting = meetings[0];

    // Get content to enhance - prefer input parameters over existing meeting data
    const contentToEnhance = input.transcribed_text || meeting.transcribed_text || '';
    const userNotes = input.user_notes || meeting.general_notes || '';
    const combinedContent = [contentToEnhance, userNotes].filter(Boolean).join('\n\n');

    if (!combinedContent.trim()) {
      throw new Error('No content available to enhance. Please provide transcribed_text or user_notes.');
    }

    // Mock AI enhancement based on enhancement type
    let enhanced_notes: string | null = null;
    let generated_summary: string | null = null;
    let extracted_action_items: string[] = [];

    switch (input.enhance_type) {
      case 'grammar':
        enhanced_notes = `Grammar-enhanced version: ${combinedContent.replace(/\b(teh|recieve|seperate)\b/gi, (match) => {
          const corrections: Record<string, string> = {
            'teh': 'the',
            'recieve': 'receive',
            'seperate': 'separate'
          };
          return corrections[match.toLowerCase()] || match;
        })}`;
        break;

      case 'summary':
        const sentences = combinedContent.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const keyPoints = sentences.slice(0, Math.min(3, sentences.length));
        generated_summary = `Summary: ${keyPoints.join('. ')}.`;
        break;

      case 'action_items':
        // Extract action items using simple pattern matching
        const actionPatterns = [
          /(?:action|todo|task|follow.?up|need to|should|must|will)\s+(.+?)(?:[.!?]|$)/gi,
          /^[-*•]\s*(.+?)(?:[.!?]|$)/gm
        ];
        
        const foundActions = new Set<string>();
        actionPatterns.forEach(pattern => {
          let match;
          while ((match = pattern.exec(combinedContent)) !== null) {
            const action = match[1].trim();
            if (action.length > 5 && action.length < 100) {
              foundActions.add(action);
            }
          }
        });

        extracted_action_items = Array.from(foundActions).slice(0, 5);
        if (extracted_action_items.length === 0) {
          extracted_action_items = ['Review meeting notes', 'Schedule follow-up'];
        }
        break;

      case 'full_enhancement':
        // Provide all enhancements
        enhanced_notes = `Enhanced notes: ${combinedContent.replace(/\s+/g, ' ').trim()}`;
        generated_summary = `Full summary: Key discussion points covered important topics with multiple attendees participating.`;
        extracted_action_items = ['Complete assigned tasks', 'Prepare for next meeting', 'Share meeting summary'];
        break;

      default:
        throw new Error(`Unsupported enhancement type: ${input.enhance_type}`);
    }

    return {
      enhanced_notes,
      generated_summary,
      extracted_action_items,
      meeting_id: input.meeting_id
    };

  } catch (error) {
    console.error('AI enhancement failed:', error);
    throw error;
  }
};
