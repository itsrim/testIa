import { Event, Conversation, GroupMember } from '@/types/messaging';

export function verifyAndRepairData(
  events: Event[],
  conversations: Conversation[],
  membersByConversation: Record<string, GroupMember[]>
): {
  repairedEvents: Event[];
  repairedMembersByConversation: Record<string, GroupMember[]>;
} {
  // Clone structures to avoid mutating state directly
  const repairedEvents = events.map((e) => ({ ...e }));
  const repairedMembersByConversation: Record<string, GroupMember[]> = {};

  for (const [cid, members] of Object.entries(membersByConversation)) {
    repairedMembersByConversation[cid] = [...members];
  }

  for (const event of repairedEvents) {
    // 1. Vérification des dates (format basique)
    const t = new Date(event.dateKey).getTime();
    if (Number.isNaN(t)) {
      // Si la date est invalide, on force la date du jour
      event.dateKey = new Date().toISOString().slice(0, 10);
    }

    // 2. Vérification du nombre maximum de participants
    if (event.participantCount > event.participantMax) {
      event.participantCount = event.participantMax;

      const convMembers = repairedMembersByConversation[event.conversationId];
      if (convMembers && convMembers.length > event.participantMax) {
        // Retire les derniers membres inscrits (on garde les premiers, ex: index 0 = organisateur)
        repairedMembersByConversation[event.conversationId] = convMembers.slice(
          0,
          event.participantMax
        );
      }
    }
  }

  return {
    repairedEvents,
    repairedMembersByConversation,
  };
}
