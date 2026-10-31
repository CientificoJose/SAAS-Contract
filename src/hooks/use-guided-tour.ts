'use client';

import { useCallback } from 'react';
import { startProposalCreatorTour, startContractsDashboardTour } from '@/lib/tours/guided-tours';

export function useGuidedTour() {
  const startCreatorTour = useCallback(() => {
    startProposalCreatorTour();
  }, []);

  const startDashboardTour = useCallback(() => {
    startContractsDashboardTour();
  }, []);

  return {
    startCreatorTour,
    startDashboardTour
  };
}
