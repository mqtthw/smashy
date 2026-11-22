// Turns a database error from saving a post into a message for people.
// The database's own messages for its rules are already written for people (its codes P0001 and
// P0429 mark them), so they're passed on; anything else gets a generic message.
export function postErrorMessage(message: string, code?: string): string {
  if (/contact info/i.test(message)) return "Sharing or asking for contact info isn't allowed here.";
  if (/^New accounts can post/.test(message)) return message;
  if (/too fast/i.test(message)) return "You're posting too fast. Wait a minute and try again.";
  if (/^Post not found/.test(message)) return "That post isn't available anymore.";
  if (code === "P0001" || code === "P0429") return message;
  return "Couldn't post that. Please try again.";
}
