import { useQuery } from "@tanstack/react-query";
import { getWalletPageData } from "@/api/wallet";

export function useWalletPageData() {
  return useQuery({
    queryKey: ["wallet-page"],
    queryFn: getWalletPageData,
  });
}
