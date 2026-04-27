import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { listCompanies, listFleets } from '../api/organization';
import type { HttpClient, SessionPayload } from '../api/http';
import type { Company, Fleet } from '../types';
import { getSettlementContextSelectorMode, type SettlementContextSelectorMode } from '../authScopes';
import { getFleetOptions } from '../pages/settlementAdminHelpers';

const EMPTY_ASSIGNED_FLEET_IDS: string[] = [];

type SettlementFlowContextValue = {
  companies: Company[];
  fleets: Fleet[];
  availableFleets: Fleet[];
  selectedCompanyId: string;
  selectedFleetId: string;
  selectorMode: SettlementContextSelectorMode;
  showCompanySelector: boolean;
  showFleetSelector: boolean;
  isLoading: boolean;
  errorMessage: string | null;
  setSelectedCompanyId: (companyId: string) => void;
  setSelectedFleetId: (fleetId: string) => void;
};

const SettlementFlowContext = createContext<SettlementFlowContextValue | null>(null);

type SettlementFlowProviderProps = {
  client: HttpClient;
  children: ReactNode;
  session?: SessionPayload;
};

export function SettlementFlowProvider({ client, children, session }: SettlementFlowProviderProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [fleets, setFleets] = useState<Fleet[]>([]);
  const [selectedCompanyId, setSelectedCompanyIdState] = useState('');
  const [selectedFleetId, setSelectedFleetIdState] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const selectorMode = getSettlementContextSelectorMode(session ?? { activeAccount: null } as SessionPayload);
  const assignedFleetIds = session?.activeAccount?.assignedFleetIds ?? EMPTY_ASSIGNED_FLEET_IDS;
  const defaultFleetId = session?.activeAccount?.defaultFleetId ?? null;
  const fixedCompanyId = session?.activeAccount?.companyId ?? '';
  const showCompanySelector = selectorMode === 'company_and_fleet';
  const showFleetSelector = selectorMode !== 'locked';

  useEffect(() => {
    let ignore = false;

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const [companyResponse, fleetResponse] = await Promise.all([
          showCompanySelector ? listCompanies(client) : Promise.resolve([]),
          listFleets(client),
        ]);

        if (ignore) {
          return;
        }

        setCompanies(companyResponse);
        setFleets(fleetResponse);
        setSelectedCompanyIdState((current) => {
          if (showCompanySelector) {
            return current || companyResponse[0]?.company_id || '';
          }
          if (fixedCompanyId) {
            return fixedCompanyId;
          }
          if (assignedFleetIds.length > 0) {
            return fleetResponse.find((fleet) => assignedFleetIds.includes(fleet.fleet_id))?.company_id ?? '';
          }
          return current || fleetResponse[0]?.company_id || '';
        });
        setSelectedFleetIdState((current) => {
          if (selectorMode === 'locked' && defaultFleetId) {
            return defaultFleetId;
          }
          if (current && fleetResponse.some((fleet) => fleet.fleet_id === current)) {
            return current;
          }
          if (assignedFleetIds.length > 0) {
            return assignedFleetIds.find((fleetId) =>
              fleetResponse.some((fleet) => fleet.fleet_id === fleetId),
            ) ?? '';
          }
          const nextCompanyId = showCompanySelector
            ? companyResponse[0]?.company_id ?? ''
            : fixedCompanyId || fleetResponse[0]?.company_id || '';
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
  }, [assignedFleetIds, client, defaultFleetId, fixedCompanyId, selectorMode, showCompanySelector]);

  const availableFleets = useMemo(
    () =>
      assignedFleetIds.length > 0
        ? fleets.filter((fleet) => assignedFleetIds.includes(fleet.fleet_id))
        : getFleetOptions(fleets, selectedCompanyId),
    [assignedFleetIds, fleets, selectedCompanyId],
  );

  useEffect(() => {
    if (selectorMode === 'locked') {
      if (defaultFleetId && selectedFleetId !== defaultFleetId) {
        setSelectedFleetIdState(defaultFleetId);
      }
      return;
    }

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
        selectorMode,
        showCompanySelector,
        showFleetSelector,
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
