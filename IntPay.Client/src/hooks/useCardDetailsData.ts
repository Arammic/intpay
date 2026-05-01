import { useQuery } from "@tanstack/react-query";
import { getCardDetailsData } from "@/api/cardDetails";
import { useCurrentUserContext } from "@/lib/currentUserContext";

export function useCardDetailsData(cardId?: string) {
  const { userId } = useCurrentUserContext();
  return useQuery({
    queryKey: ["card-details", cardId, userId],
    queryFn: () => getCardDetailsData(cardId ?? "", userId),
    enabled: Boolean(cardId),
  });
}
