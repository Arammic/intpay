import { useQuery } from "@tanstack/react-query";
import { getCardsPageData } from "@/api/cards";

export function useCardsPageData() {
  return useQuery({
    queryKey: ["cards-page"],
    queryFn: getCardsPageData,
  });
}
