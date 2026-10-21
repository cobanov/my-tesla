export function readChanges(buffer: string): { changes: number; rest: string } {
  const blocks = buffer.replace(/\r\n?/g, "\n").split("\n\n");
  const rest = blocks.pop() ?? "";
  const changes = blocks.filter((block) =>
    block.split("\n").some((line) => line.trim() === "event: change"),
  ).length;
  return { changes, rest };
}
