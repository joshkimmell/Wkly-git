// Assisted by watsonx Code Assistant 

import { Accomplishment } from "@components/GoalCard";


export const groupAccomplishmentsByCategory = (accomplishments: Accomplishment[]): Record<string, Accomplishment[]> => {
  const groupedAccomplishments: Record<string, Accomplishment[]> = {};

  accomplishments.forEach((accomplishment) => {
    if (!groupedAccomplishments[accomplishment.category]) {
      groupedAccomplishments[accomplishment.category] = [];
    }
    groupedAccomplishments[accomplishment.category].push(accomplishment);
  });

  return groupedAccomplishments;
};
