import { useQuery } from "@tanstack/react-query";
import { getCardsByUserGrouped } from "@/api/cardsByUser";
import { useCurrentUserContext } from "@/lib/currentUserContext";

export function useCardsByUser() {
  const { userId } = useCurrentUserContext();
  return useQuery({
    queryKey: ["cards-by-user", userId],
    queryFn: () => getCardsByUserGrouped(userId),
  });
}
