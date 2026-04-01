import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { listCompanies, listFleets } from '../api/organization';
import type { HttpClient } from '../api/http';
import type { Company, Fleet } from '../types';
import { getFleetOptions } from '../pages/settlementAdminHelpers';

type SettlementFlowContextValue = {
  companies: Company[];
  fleets: Fleet[];
  availableFleets: Fleet[];
  selectedCompanyId: string;
  selectedFleetId: string;
  isLoading: boolean;
  errorMessage: string | null;
  setSelectedCompanyId: (companyId: string) => void;
  setSelectedFleetId: (fleetId: string) => void;
};

const SettlementFlowContext = createContext<SettlementFlowContextValue | null>(null);

type SettlementFlowProviderProps = {
  client: HttpClient;
  children: ReactNode;
};

export function SettlementFlowProvider({ client, children }: SettlementFlowProviderProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [fleets, setFleets] = useState<Fleet[]>([]);
  const [selectedCompanyId, setSelectedCompanyIdState] = useState('');
  const [selectedFleetId, setSelectedFleetIdState] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const [companyResponse, fleetResponse] = await Promise.all([
          listCompanies(client),
          listFleets(client),
        ]);

        if (ignore) {
          return;
        }

        setCompanies(companyResponse);
        setFleets(fleetResponse);
        setSelectedCompanyIdState((current) => current || companyResponse[0]?.company_id || '');
        setSelectedFleetIdState((current) => {
          if (current && fleetResponse.some((fleet) => fleet.fleet_id === current)) {
            return current;
          }
          const nextCompanyId = companyResponse[0]?.company_id ?? '';
          return getFleetOptions(fleetResponse, nextCompanyId)[0]?.fleet_id ?? '';
        });
      } catch (error) {
        if (!ignore) {
          setErrorMessage(error instanceof Error ? error.message : '회사/플릿 문맥을 불러올 수 없습니다.');
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void load();
    return () => {
      ignore = true;
    };
  }, [client]);

  const availableFleets = getFleetOptions(fleets, selectedCompanyId);

  useEffect(() => {
    if (!selectedCompanyId) {
      if (selectedFleetId) {
        setSelectedFleetIdState('');
      }
      return;
    }

    if (!availableFleets.some((fleet) => fleet.fleet_id === selectedFleetId)) {
      setSelectedFleetIdState(availableFleets[0]?.fleet_id ?? '');
    }
  }, [availableFleets, selectedCompanyId, selectedFleetId]);

  function setSelectedCompanyId(companyId: string) {
    setSelectedCompanyIdState(companyId);
  }

  function setSelectedFleetId(fleetId: string) {
    setSelectedFleetIdState(fleetId);
  }

  return (
    <SettlementFlowContext.Provider
      value={{
        companies,
        fleets,
        availableFleets,
        selectedCompanyId,
        selectedFleetId,
        isLoading,
        errorMessage,
        setSelectedCompanyId,
        setSelectedFleetId,
      }}
    >
      {children}
    </SettlementFlowContext.Provider>
  );
}

export function useSettlementFlow() {
  const context = useContext(SettlementFlowContext);
  if (!context) {
    throw new Error('SettlementFlowContext is required inside settlement pages.');
  }
  return context;
}
