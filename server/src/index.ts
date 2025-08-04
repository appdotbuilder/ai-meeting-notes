
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

import { 
  createMeetingInputSchema, 
  updateMeetingInputSchema, 
  aiEnhanceInputSchema 
} from './schema';
import { createMeeting } from './handlers/create_meeting';
import { getMeetings } from './handlers/get_meetings';
import { getMeetingById } from './handlers/get_meeting_by_id';
import { updateMeeting } from './handlers/update_meeting';
import { deleteMeeting } from './handlers/delete_meeting';
import { aiEnhanceNotes } from './handlers/ai_enhance_notes';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),
  
  // Meeting CRUD operations
  createMeeting: publicProcedure
    .input(createMeetingInputSchema)
    .mutation(({ input }) => createMeeting(input)),
    
  getMeetings: publicProcedure
    .query(() => getMeetings()),
    
  getMeetingById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getMeetingById(input.id)),
    
  updateMeeting: publicProcedure
    .input(updateMeetingInputSchema)
    .mutation(({ input }) => updateMeeting(input)),
    
  deleteMeeting: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteMeeting(input.id)),
    
  // AI enhancement functionality
  aiEnhanceNotes: publicProcedure
    .input(aiEnhanceInputSchema)
    .mutation(({ input }) => aiEnhanceNotes(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();
