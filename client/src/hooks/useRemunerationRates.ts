import { useQuery } from '@tanstack/react-query'
import { remunerationRatesService } from '../services/remunerationRatesService'

export const remunerationRatesKeys = {
  all: ['remunerationRates'] as const,
}

export function useRemunerationRates() {
  return useQuery({
    queryKey: remunerationRatesKeys.all,
    queryFn: () => remunerationRatesService.getRates(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
}

