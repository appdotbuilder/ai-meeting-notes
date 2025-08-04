
import { useState, useEffect, useCallback, useRef } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Meeting, CreateMeetingInput, AiEnhanceInput } from '../../server/src/schema';

// Audio transcription interface (client-side only)
interface TranscriptionState {
  isRecording: boolean;
  isTranscribing: boolean;
  transcribedText: string;
}

function App() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [aiProcessing, setAiProcessing] = useState(false);

  // Audio transcription state (client-side only - no raw audio sent to server)
  const [transcription, setTranscription] = useState<TranscriptionState>({
    isRecording: false,
    isTranscribing: false,
    transcribedText: ''
  });

  // Form state for creating/editing meetings
  const [formData, setFormData] = useState<CreateMeetingInput>({
    title: '',
    date: new Date(),
    attendees: [],
    general_notes: null,
    discussion_points: [],
    action_items: [],
    summary: null,
    transcribed_text: null,
    ai_enhanced_notes: null
  });

  // Individual input states for arrays
  const [newAttendee, setNewAttendee] = useState('');
  const [newDiscussionPoint, setNewDiscussionPoint] = useState('');
  const [newActionItem, setNewActionItem] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const loadMeetings = useCallback(async () => {
    try {
      const result = await trpc.getMeetings.query();
      setMeetings(result);
    } catch (error) {
      console.error('Failed to load meetings:', error);
    }
  }, []);

  useEffect(() => {
    loadMeetings();
  }, [loadMeetings]);

  const resetForm = () => {
    setFormData({
      title: '',
      date: new Date(),
      attendees: [],
      general_notes: null,
      discussion_points: [],
      action_items: [],
      summary: null,
      transcribed_text: null,
      ai_enhanced_notes: null
    });
    setNewAttendee('');
    setNewDiscussionPoint('');
    setNewActionItem('');
    setTranscription({ isRecording: false, isTranscribing: false, transcribedText: '' });
  };

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await trpc.createMeeting.mutate({
        ...formData,
        transcribed_text: transcription.transcribedText || null
      });
      setMeetings((prev: Meeting[]) => [...prev, response]);
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Failed to create meeting:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateMeeting = async () => {
    if (!selectedMeeting) return;
    setIsLoading(true);
    try {
      const response = await trpc.updateMeeting.mutate({
        id: selectedMeeting.id,
        ...formData,
        transcribed_text: transcription.transcribedText || selectedMeeting.transcribed_text
      });
      setMeetings((prev: Meeting[]) => 
        prev.map((m: Meeting) => m.id === selectedMeeting.id ? response : m)
      );
      setSelectedMeeting(response);
      setIsEditMode(false);
    } catch (error) {
      console.error('Failed to update meeting:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteMeeting = async (meetingId: number) => {
    try {
      await trpc.deleteMeeting.mutate({ id: meetingId });
      setMeetings((prev: Meeting[]) => prev.filter((m: Meeting) => m.id !== meetingId));
      if (selectedMeeting?.id === meetingId) {
        setSelectedMeeting(null);
      }
    } catch (error) {
      console.error('Failed to delete meeting:', error);
    }
  };

  const handleAiEnhancement = async (enhanceType: 'grammar' | 'summary' | 'action_items' | 'full_enhancement') => {
    if (!selectedMeeting) return;
    setAiProcessing(true);
    try {
      const enhanceInput: AiEnhanceInput = {
        meeting_id: selectedMeeting.id,
        transcribed_text: transcription.transcribedText || selectedMeeting.transcribed_text || undefined,
        user_notes: selectedMeeting.general_notes || undefined,
        enhance_type: enhanceType
      };
      
      const response = await trpc.aiEnhanceNotes.mutate(enhanceInput);
      
      // Update the meeting with AI enhancements
      const updatedMeeting = { ...selectedMeeting };
      if (response.enhanced_notes) {
        updatedMeeting.ai_enhanced_notes = response.enhanced_notes;
      }
      if (response.generated_summary) {
        updatedMeeting.summary = response.generated_summary;
      }
      if (response.extracted_action_items.length > 0) {
        updatedMeeting.action_items = [...updatedMeeting.action_items, ...response.extracted_action_items];
      }
      
      setSelectedMeeting(updatedMeeting);
      setMeetings((prev: Meeting[]) => 
        prev.map((m: Meeting) => m.id === selectedMeeting.id ? updatedMeeting : m)
      );
    } catch (error) {
      console.error('Failed to enhance notes:', error);
    } finally {
      setAiProcessing(false);
    }
  };

  // Audio recording functions (client-side only)
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        // Note: This is where real-time transcription would happen CLIENT-SIDE
        // Raw audio never leaves the device for privacy
        setTranscription(prev => ({
          ...prev,
          isRecording: false,
          isTranscribing: true
        }));
        
        // Simulate client-side transcription (in real app, use Web Speech API or client-side ML)
        setTimeout(() => {
          setTranscription(prev => ({
            ...prev,
            isTranscribing: false,
            transcribedText: prev.transcribedText + " [Transcribed audio content would appear here - processed locally for privacy]"
          }));
        }, 2000);
      };

      mediaRecorder.start();
      setTranscription(prev => ({ ...prev, isRecording: true }));
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
    }
  };

  const loadMeetingIntoForm = (meeting: Meeting) => {
    setFormData({
      title: meeting.title,
      date: meeting.date,
      attendees: meeting.attendees,
      general_notes: meeting.general_notes,
      discussion_points: meeting.discussion_points,
      action_items: meeting.action_items,
      summary: meeting.summary,
      transcribed_text: meeting.transcribed_text,
      ai_enhanced_notes: meeting.ai_enhanced_notes
    });
    setTranscription(prev => ({
      ...prev,
      transcribedText: meeting.transcribed_text || ''
    }));
  };

  const addArrayItem = (field: 'attendees' | 'discussion_points' | 'action_items', value: string) => {
    if (!value.trim()) return;
    setFormData((prev: CreateMeetingInput) => ({
      ...prev,
      [field]: [...prev[field], value.trim()]
    }));
    
    // Clear the input
    if (field === 'attendees') setNewAttendee('');
    if (field === 'discussion_points') setNewDiscussionPoint('');
    if (field === 'action_items') setNewActionItem('');
  };

  const removeArrayItem = (field: 'attendees' | 'discussion_points' | 'action_items', index: number) => {
    setFormData((prev: CreateMeetingInput) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">🤖 AI Meeting Notepad</h1>
          <p className="text-gray-600 text-lg">Capture, transcribe, and enhance your meeting notes with AI</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Meetings List */}
          <div className="lg:col-span-1">
            <Card className="h-fit">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  📅 Meetings
                </CardTitle>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={resetForm} className="bg-indigo-600 hover:bg-indigo-700">
                      ➕ New Meeting
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Create New Meeting</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateMeeting} className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium mb-2">Meeting Title</label>
                        <Input
                          value={formData.title}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setFormData((prev: CreateMeetingInput) => ({ ...prev, title: e.target.value }))
                          }
                          placeholder="Enter meeting title"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Date & Time</label>
                        <Input
                          type="datetime-local"
                          value={formData.date.toISOString().slice(0, 16)}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setFormData((prev: CreateMeetingInput) => ({ ...prev, date: new Date(e.target.value) }))
                          }
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Attendees</label>
                        <div className="flex gap-2 mb-2">
                          <Input
                            value={newAttendee}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewAttendee(e.target.value)}
                            placeholder="Add attendee"
                            onKeyPress={(e: React.KeyboardEvent) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addArrayItem('attendees', newAttendee);
                              }
                            }}
                          />
                          <Button type="button" onClick={() => addArrayItem('attendees', newAttendee)}>
                            Add
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {formData.attendees.map((attendee: string, index: number) => (
                            <Badge key={index} variant="secondary" className="flex items-center gap-1">
                              {attendee}
                              <button
                                type="button"
                                onClick={() => removeArrayItem('attendees', index)}
                                className="ml-1 text-red-500 hover:text-red-700"
                              >
                                ×
                              </button>
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">General Notes</label>
                        <Textarea
                          value={formData.general_notes || ''}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                            setFormData((prev: CreateMeetingInput) => ({ 
                              ...prev, 
                              general_notes: e.target.value || null 
                            }))
                          }
                          placeholder="Enter general meeting notes"
                          rows={4}
                        />
                      </div>

                      {/* Audio Recording Section */}
                      <div className="border rounded-lg p-4 bg-gradient-to-r from-purple-50 to-pink-50">
                        <label className="block text-sm font-medium mb-2">🎤 Audio Transcription</label>
                        <p className="text-xs text-gray-600 mb-3">
                          🔒 Privacy-first: Audio is processed locally and never sent to servers
                        </p>
                        <div className="flex gap-2 mb-3">
                          <Button
                            type="button"
                            onClick={transcription.isRecording ? stopRecording : startRecording}
                            variant={transcription.isRecording ? "destructive" : "default"}
                            disabled={transcription.isTranscribing}
                          >
                            {transcription.isRecording ? "🛑 Stop Recording" : "🎤 Start Recording"}
                          </Button>
                          {transcription.isTranscribing && (
                            <Badge variant="outline" className="animate-pulse">
                              🔄 Transcribing...
                            </Badge>
                          )}
                        </div>
                        {transcription.transcribedText && (
                          <Textarea
                            value={transcription.transcribedText}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                              setTranscription(prev => ({ ...prev, transcribedText: e.target.value }))
                            }
                            placeholder="Transcribed text will appear here"
                            rows={3}
                            className="bg-white"
                          />
                        )}
                      </div>

                      <Button type="submit" disabled={isLoading} className="w-full">
                        {isLoading ? 'Creating...' : 'Create Meeting'}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  {meetings.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                      No meetings yet. Create your first meeting! 📝
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {meetings.map((meeting: Meeting) => (
                        <Card
                          key={meeting.id}
                          className={`cursor-pointer transition-all hover:shadow-md ${
                            selectedMeeting?.id === meeting.id 
                              ? 'ring-2 ring-indigo-500 bg-indigo-50' 
                              : 'hover:bg-gray-50'
                          }`}
                          onClick={() => setSelectedMeeting(meeting)}
                        >
                          <CardContent className="p-4">
                            <h3 className="font-semibold text-sm mb-1">{meeting.title}</h3>
                            <p className="text-xs text-gray-600 mb-2">
                              📅 {meeting.date.toLocaleDateString()} at {meeting.date.toLocaleTimeString()}
                            </p>
                            <div className="flex items-center justify-between">
                              <Badge variant="outline" className="text-xs">
                                👥 {meeting.attendees.length} attendees
                              </Badge>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-500 hover:text-red-700 h-6 w-6 p-0"
                                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                                  >
                                    🗑️
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Meeting</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "{meeting.title}"? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteMeeting(meeting.id)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Meeting Detail */}
          <div className="lg:col-span-2">
            {selectedMeeting ? (
              <Card className="h-fit">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">{selectedMeeting.title}</CardTitle>
                    <p className="text-gray-600 mt-1">
                      📅 {selectedMeeting.date.toLocaleDateString()} at {selectedMeeting.date.toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        loadMeetingIntoForm(selectedMeeting);
                        setIsEditMode(!isEditMode);
                      }}
                      className="flex items-center gap-1"
                    >
                      ✏️ {isEditMode ? 'Cancel' : 'Edit'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {isEditMode ? (
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium mb-2">Meeting Title</label>
                        <Input
                          value={formData.title}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setFormData((prev: CreateMeetingInput) => ({ ...prev, title: e.target.value }))
                          }
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Date & Time</label>
                        <Input
                          type="datetime-local"
                          value={formData.date.toISOString().slice(0, 16)}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setFormData((prev: CreateMeetingInput) => ({ ...prev, date: new Date(e.target.value) }))
                          }
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Attendees</label>
                        <div className="flex gap-2 mb-2">
                          <Input
                            value={newAttendee}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewAttendee(e.target.value)}
                            placeholder="Add attendee"
                          />
                          <Button type="button" onClick={() => addArrayItem('attendees', newAttendee)}>
                            Add
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {formData.attendees.map((attendee: string, index: number) => (
                            <Badge key={index} variant="secondary" className="flex items-center gap-1">
                              {attendee}
                              <button
                                onClick={() => removeArrayItem('attendees', index)}
                                className="ml-1 text-red-500 hover:text-red-700"
                              >
                                ×
                              </button>
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <Tabs defaultValue="notes" className="w-full">
                        <TabsList className="grid w-full grid-cols-4">
                          <TabsTrigger value="notes">📝 Notes</TabsTrigger>
                          <TabsTrigger value="discussion">💬 Discussion</TabsTrigger>
                          <TabsTrigger value="actions">✅ Actions</TabsTrigger>
                          <TabsTrigger value="ai">🤖 AI</TabsTrigger>
                        </TabsList>

                        <TabsContent value="notes" className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium mb-2">General Notes</label>
                            <Textarea
                              value={formData.general_notes || ''}
                              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                                setFormData((prev: CreateMeetingInput) => ({ 
                                  ...prev, 
                                  general_notes: e.target.value || null 
                                }))
                              }
                              rows={6}
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-2">Summary</label>
                            <Textarea
                              value={formData.summary || ''}
                              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                                setFormData((prev: CreateMeetingInput) => ({ 
                                  ...prev, 
                                  summary: e.target.value || null 
                                }))
                              }
                              rows={4}
                            />
                          </div>

                          {/* Audio Recording Section */}
                          <div className="border rounded-lg p-4 bg-gradient-to-r from-purple-50 to-pink-50">
                            <label className="block text-sm font-medium mb-2">🎤 Audio Transcription</label>
                            <div className="flex gap-2 mb-3">
                              <Button
                                type="button"
                                onClick={transcription.isRecording ? stopRecording : startRecording}
                                variant={transcription.isRecording ? "destructive" : "default"}
                                disabled={transcription.isTranscribing}
                              >
                                {transcription.isRecording ? "🛑 Stop Recording" : "🎤 Start Recording"}
                              </Button>
                              {transcription.isTranscribing && (
                                <Badge variant="outline" className="animate-pulse">
                                  🔄 Transcribing...
                                </Badge>
                              )}
                            </div>
                            <Textarea
                              value={transcription.transcribedText}
                              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                                setTranscription(prev => ({ ...prev, transcribedText: e.target.value }))
                              }
                              placeholder="Transcribed text will appear here"
                              rows={4}
                              className="bg-white"
                            />
                          </div>
                        </TabsContent>

                        <TabsContent value="discussion" className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium mb-2">Discussion Points</label>
                            <div className="flex gap-2 mb-3">
                              <Input
                                value={newDiscussionPoint}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewDiscussionPoint(e.target.value)}
                                placeholder="Add discussion point"
                              />
                              <Button type="button" onClick={() => addArrayItem('discussion_points', newDiscussionPoint)}>
                                Add
                              </Button>
                            </div>
                            <div className="space-y-2">
                              {formData.discussion_points.map((point: string, index: number) => (
                                <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                                  <span className="flex-1">• {point}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeArrayItem('discussion_points', index)}
                                    className="text-red-500 hover:text-red-700"
                                  >
                                    Remove
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </TabsContent>

                        <TabsContent value="actions" className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium mb-2">Action Items</label>
                            <div className="flex gap-2 mb-3">
                              <Input
                                value={newActionItem}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewActionItem(e.target.value)}
                                placeholder="Add action item"
                              />
                              <Button type="button" onClick={() => addArrayItem('action_items', newActionItem)}>
                                Add
                              </Button>
                            </div>
                            <div className="space-y-2">
                              {formData.action_items.map((item: string, index: number) => (
                                <div key={index} className="flex items-center gap-2 p-2 bg-yellow-50 rounded border-l-4 border-yellow-400">
                                  <span className="flex-1">✅ {item}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeArrayItem('action_items', index)}
                                    className="text-red-500 hover:text-red-700"
                                  >
                                    Remove
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </TabsContent>

                        <TabsContent value="ai" className="space-y-4">
                          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-lg">
                            <h3 className="font-medium mb-3">🤖 AI Enhancement Options</h3>
                            <div className="grid grid-cols-2 gap-2">
                              <Button
                                onClick={() => handleAiEnhancement('grammar')}
                                disabled={aiProcessing}
                                variant="outline"
                                className="flex items-center gap-2"
                              >
                                📝 Fix Grammar
                              </Button>
                              <Button
                                onClick={() => handleAiEnhancement('summary')}
                                disabled={aiProcessing}
                                variant="outline"
                                className="flex items-center gap-2"
                              >
                                📄 Generate Summary
                              </Button>
                              <Button
                                onClick={() => handleAiEnhancement('action_items')}
                                disabled={aiProcessing}
                                variant="outline"
                                className="flex items-center gap-2"
                              >
                                ✅ Extract Actions
                              </Button>
                              <Button
                                onClick={() => handleAiEnhancement('full_enhancement')}
                                disabled={aiProcessing}
                                variant="outline"
                                className="flex items-center gap-2"
                              >
                                🚀 Full Enhancement
                              </Button>
                            </div>
                            {aiProcessing && (
                              <Badge variant="outline" className="mt-3 animate-pulse">
                                🤖 AI is processing your notes...
                              </Badge>
                            )}
                          </div>

                          {selectedMeeting.ai_enhanced_notes && (
                            <div>
                              <label className="block text-sm font-medium mb-2">AI Enhanced Notes</label>
                              <Textarea
                                value={selectedMeeting.ai_enhanced_notes}
                                readOnly
                                rows={6}
                                className="bg-green-50 border-green-200"
                              />
                            </div>
                          )}
                        </TabsContent>
                      </Tabs>

                      <div className="flex gap-2">
                        <Button onClick={handleUpdateMeeting} disabled={isLoading} className="flex-1">
                          {isLoading ? 'Saving...' : 'Save Changes'}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setIsEditMode(false)}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Tabs defaultValue="overview" className="w-full">
                      <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="overview">📋 Overview</TabsTrigger>
                        <TabsTrigger value="discussion">💬 Discussion</TabsTrigger>
                        <TabsTrigger value="actions">✅ Actions</TabsTrigger>
                        <TabsTrigger value="ai">🤖 AI Notes</TabsTrigger>
                      </TabsList>

                      <TabsContent value="overview" className="space-y-4">
                        <div>
                          <h3 className="font-medium mb-2">👥 Attendees</h3>
                          <div className="flex flex-wrap gap-2">
                            {selectedMeeting.attendees.length > 0 ? (
                              selectedMeeting.attendees.map((attendee: string, index: number) => (
                                <Badge key={index} variant="secondary">{attendee}</Badge>
                              ))
                            ) : (
                              <p className="text-gray-500">No attendees listed</p>
                            )}
                          </div>
                        </div>

                        <Separator />

                        <div>
                          <h3 className="font-medium mb-2">📝 General Notes</h3>
                          <div className="bg-gray-50 p-4 rounded-lg">
                            {selectedMeeting.general_notes ? (
                              <p className="whitespace-pre-wrap">{selectedMeeting.general_notes}</p>
                            ) : (
                              <p className="text-gray-500">No general notes</p>
                            )}
                          </div>
                        </div>

                        {selectedMeeting.summary && (
                          <>
                            <Separator />
                            <div>
                              <h3 className="font-medium mb-2">📄 Summary</h3>
                              <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
                                <p className="whitespace-pre-wrap">{selectedMeeting.summary}</p>
                              </div>
                            </div>
                          </>
                        )}

                        {selectedMeeting.transcribed_text && (
                          <>
                            <Separator />
                            <div>
                              <h3 className="font-medium mb-2">🎤 Transcribed Audio</h3>
                              <div className="bg-purple-50 p-4 rounded-lg border-l-4 border-purple-400">
                                <p className="whitespace-pre-wrap text-sm">{selectedMeeting.transcribed_text}</p>
                              </div>
                            </div>
                          </>
                        )}
                      </TabsContent>

                      <TabsContent value="discussion" className="space-y-4">
                        <div>
                          <h3 className="font-medium mb-3">💬 Discussion Points</h3>
                          {selectedMeeting.discussion_points.length > 0 ? (
                            <div className="space-y-2">
                              {selectedMeeting.discussion_points.map((point: string, index: number) => (
                                <div key={index} className="bg-gray-50 p-3 rounded-lg">
                                  <p>• {point}</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-gray-500">No discussion points recorded</p>
                          )}
                        </div>
                      </TabsContent>

                      <TabsContent value="actions" className="space-y-4">
                        <div>
                          <h3 className="font-medium mb-3">✅ Action Items</h3>
                          {selectedMeeting.action_items.length > 0 ? (
                            <div className="space-y-2">
                              {selectedMeeting.action_items.map((item: string, index: number) => (
                                <div key={index} className="bg-yellow-50 p-3 rounded-lg border-l-4 border-yellow-400">
                                  <p>✅ {item}</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-gray-500">No action items identified</p>
                          )}
                        </div>
                      </TabsContent>

                      <TabsContent value="ai" className="space-y-4">
                        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-lg">
                          <h3 className="font-medium mb-3">🤖 AI Enhancement Options</h3>
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              onClick={() => handleAiEnhancement('grammar')}
                              disabled={aiProcessing}
                              variant="outline"
                              className="flex items-center gap-2"
                            >
                              📝 Fix Grammar
                            </Button>
                            <Button
                              onClick={() => handleAiEnhancement('summary')}
                              disabled={aiProcessing}
                              variant="outline"
                              className="flex items-center gap-2"
                            >
                              📄 Generate Summary
                            </Button>
                            <Button
                              onClick={() => handleAiEnhancement('action_items')}
                              disabled={aiProcessing}
                              variant="outline"
                              className="flex items-center gap-2"
                            >
                              ✅ Extract Actions
                            </Button>
                            <Button
                              onClick={() => handleAiEnhancement('full_enhancement')}
                              disabled={aiProcessing}
                              variant="outline"
                              className="flex items-center gap-2"
                            >
                              🚀 Full Enhancement
                            </Button>
                          </div>
                          {aiProcessing && (
                            <Badge variant="outline" className="mt-3 animate-pulse">
                              🤖 AI is processing your notes...
                            </Badge>
                          )}
                        </div>

                        {selectedMeeting.ai_enhanced_notes && (
                          <div>
                            <h3 className="font-medium mb-2">🤖 AI Enhanced Notes</h3>
                            <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-400">
                              <p className="whitespace-pre-wrap">{selectedMeeting.ai_enhanced_notes}</p>
                            </div>
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="h-96 flex items-center justify-center">
                <CardContent className="text-center">
                  <div className="text-6xl mb-4">📝</div>
                  <h3 className="text-xl font-semibold mb-2">Select a Meeting</h3>
                  <p className="text-gray-600">Choose a meeting from the list to view or edit its details</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
