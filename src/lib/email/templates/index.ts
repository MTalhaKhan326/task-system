import { renderAssigned, type AssignedData } from "./assigned";
import { renderUpdated, type UpdatedData } from "./updated";
import { renderReassigned, type ReassignedData } from "./reassigned";
import { renderDeleted, type DeletedData } from "./deleted";
import { renderStatusChanged, type StatusChangedData } from "./status-changed";
import { renderComment, type CommentData } from "./comment";
import { renderInvited, type InvitedData } from "./invited";

export type EventType =
  | "assigned"
  | "updated"
  | "reassigned"
  | "deleted"
  | "status_changed"
  | "comment"
  | "invited";

export type EventData = {
  assigned: AssignedData;
  updated: UpdatedData;
  reassigned: ReassignedData;
  deleted: DeletedData;
  status_changed: StatusChangedData;
  comment: CommentData;
  invited: InvitedData;
};

export type RenderedEmail = { subject: string; html: string };

export function renderTemplate<T extends EventType>(
  eventType: T,
  actorName: string,
  data: EventData[T]
): RenderedEmail {
  switch (eventType) {
    case "assigned":
      return renderAssigned(actorName, data as EventData["assigned"]);
    case "updated":
      return renderUpdated(actorName, data as EventData["updated"]);
    case "reassigned":
      return renderReassigned(actorName, data as EventData["reassigned"]);
    case "deleted":
      return renderDeleted(actorName, data as EventData["deleted"]);
    case "status_changed":
      return renderStatusChanged(actorName, data as EventData["status_changed"]);
    case "comment":
      return renderComment(actorName, data as EventData["comment"]);
    case "invited":
      return renderInvited(actorName, data as EventData["invited"]);
    default: {
      const exhaustive: never = eventType;
      throw new Error(`Unhandled event type: ${exhaustive}`);
    }
  }
}
