export interface User {
  id: string;
  name: string;
  whyAnchor: string;
  whyAnchorImageUri?: string;
  profileImageUri?: string;
  dreamBoardImageUri?: string;
  currentPhase: 1 | 2 | 3 | 4 | 5 | 6;
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}
