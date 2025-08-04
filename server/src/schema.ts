
import { z } from 'zod';

// Meeting schema
export const meetingSchema = z.object({
  id: z.number(),
  title: z.string(),
  date: z.coerce.date(),
  attendees: z.array(z.string()),
  general_notes: z.string().nullable(),
  discussion_points: z.array(z.string()),
  action_items: z.array(z.string()),
  summary: z.string().nullable(),
  transcribed_text: z.string().nullable(),
  ai_enhanced_notes: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Meeting = z.infer<typeof meetingSchema>;

// Input schema for creating meetings
export const createMeetingInputSchema = z.object({
  title: z.string().min(1, "Title is required"),
  date: z.coerce.date(),
  attendees: z.array(z.string()).default([]),
  general_notes: z.string().nullable().optional(),
  discussion_points: z.array(z.string()).default([]),
  action_items: z.array(z.string()).default([]),
  summary: z.string().nullable().optional(),
  transcribed_text: z.string().nullable().optional(),
  ai_enhanced_notes: z.string().nullable().optional()
});

export type CreateMeetingInput = z.infer<typeof createMeetingInputSchema>;

// Input schema for updating meetings
export const updateMeetingInputSchema = z.object({
  id: z.number(),
  title: z.string().min(1, "Title is required").optional(),
  date: z.coerce.date().optional(),
  attendees: z.array(z.string()).optional(),
  general_notes: z.string().nullable().optional(),
  discussion_points: z.array(z.string()).optional(),
  action_items: z.array(z.string()).optional(),
  summary: z.string().nullable().optional(),
  transcribed_text: z.string().nullable().optional(),
  ai_enhanced_notes: z.string().nullable().optional()
});

export type UpdateMeetingInput = z.infer<typeof updateMeetingInputSchema>;

// Input schema for AI enhancement requests
export const aiEnhanceInputSchema = z.object({
  meeting_id: z.number(),
  transcribed_text: z.string().optional(),
  user_notes: z.string().optional(),
  enhance_type: z.enum(['grammar', 'summary', 'action_items', 'full_enhancement'])
});

export type AiEnhanceInput = z.infer<typeof aiEnhanceInputSchema>;

// Response schema for AI enhancement
export const aiEnhanceResponseSchema = z.object({
  enhanced_notes: z.string().nullable(),
  generated_summary: z.string().nullable(),
  extracted_action_items: z.array(z.string()),
  meeting_id: z.number()
});

export type AiEnhanceResponse = z.infer<typeof aiEnhanceResponseSchema>;
