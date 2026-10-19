// Proposal follow-up is independent of the existing sales pipeline.
export const proposalStatuses = [
  ["TODO", "Təklif göndərilməlidir"],
  ["DRAFT", "Təklif hazırlanır"],
  ["SENT", "Təklif göndərildi"],
  ["WAITING", "Cavab gözlənilir"],
  ["INTERESTED", "Maraq göstərdi"],
  ["MEETING", "Görüş təyin edildi"],
  ["ACCEPTED", "Təklif qəbul edildi"],
  ["DECLINED", "İmtina etdi"],
  ["RESPONDED", "Cavab alındı"],
  ["REVISED", "Təklif yeniləndi"],
] as const;
export const proposalLabel = (status: string | null) =>
  proposalStatuses.find((x) => x[0] === status)?.[1] ||
  status ||
  "Təyin edilməyib";
