import { useQuery } from "@tanstack/react-query";
import { getProfilePageData } from "@/api/profile";

export function useProfilePageData() {
  return useQuery({
    queryKey: ["profile-page"],
    queryFn: getProfilePageData,
  });
}
