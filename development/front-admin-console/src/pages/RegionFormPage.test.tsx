import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RegionFormPage } from './RegionFormPage';

const apiMocks = vi.hoisted(() => ({
  createRegion: vi.fn(),
  getRegionByCode: vi.fn(),
  updateRegion: vi.fn(),
}));

const navigateMock = vi.hoisted(() => vi.fn());

vi.mock('../api/regions', () => ({
  createRegion: apiMocks.createRegion,
  getRegionByCode: apiMocks.getRegionByCode,
  updateRegion: apiMocks.updateRegion,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

describe('RegionFormPage', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    apiMocks.createRegion.mockReset();
    apiMocks.getRegionByCode.mockReset();
    apiMocks.updateRegion.mockReset();
  });

  it('creates a region and returns to the detail route', async () => {
    apiMocks.createRegion.mockResolvedValue({
      region_id: '10000000-0000-0000-0000-000000000011',
      region_code: 'SEOUL-A',
      name: '서울 A 권역',
      status: 'active',
      difficulty_level: 'high',
      polygon_geojson: { type: 'Polygon', coordinates: [[[127.0, 37.5], [127.1, 37.5], [127.1, 37.6], [127.0, 37.5]]] },
      description: '강남권',
      display_order: 1,
      created_at: '2026-04-01T00:00:00Z',
      updated_at: '2026-04-01T00:00:00Z',
    });

    render(
      <MemoryRouter initialEntries={['/regions/new']}>
        <Routes>
          <Route path="/regions/new" element={<RegionFormPage client={{ request: vi.fn() }} mode="create" />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText('권역 코드'), { target: { value: 'SEOUL-A' } });
    fireEvent.change(screen.getByLabelText('권역 이름'), { target: { value: '서울 A 권역' } });
    fireEvent.change(screen.getByLabelText('상태'), { target: { value: 'active' } });
    fireEvent.change(screen.getByLabelText('난이도'), { target: { value: 'high' } });
    fireEvent.change(screen.getByLabelText('설명'), { target: { value: '강남권' } });
    fireEvent.change(screen.getByLabelText('정렬 순서'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('폴리곤 JSON'), {
      target: { value: '{"type":"Polygon","coordinates":[[[127.0,37.5],[127.1,37.5],[127.1,37.6],[127.0,37.5]]]}' },
    });
    fireEvent.click(screen.getByRole('button', { name: '권역 생성' }));

    await waitFor(() => {
      expect(apiMocks.createRegion).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          region_code: 'SEOUL-A',
          name: '서울 A 권역',
          status: 'active',
          difficulty_level: 'high',
        }),
      );
    });
    expect(navigateMock).toHaveBeenCalledWith('/regions/SEOUL-A');
  });

  it('loads an existing region and saves edits back to the detail route', async () => {
    apiMocks.getRegionByCode.mockResolvedValue({
      region_id: '10000000-0000-0000-0000-000000000011',
      region_code: 'SEOUL-A',
      name: '서울 A 권역',
      status: 'active',
      difficulty_level: 'high',
      polygon_geojson: { type: 'Polygon', coordinates: [[[127.0, 37.5], [127.1, 37.5], [127.1, 37.6], [127.0, 37.5]]] },
      description: '강남권',
      display_order: 1,
      created_at: '2026-04-01T00:00:00Z',
      updated_at: '2026-04-01T00:00:00Z',
    });
    apiMocks.updateRegion.mockResolvedValue({
      region_id: '10000000-0000-0000-0000-000000000011',
      region_code: 'SEOUL-A',
      name: '서울 A 권역 수정',
      status: 'active',
      difficulty_level: 'medium',
      polygon_geojson: { type: 'Polygon', coordinates: [[[127.0, 37.5], [127.1, 37.5], [127.1, 37.6], [127.0, 37.5]]] },
      description: '수정됨',
      display_order: 1,
      created_at: '2026-04-01T00:00:00Z',
      updated_at: '2026-04-02T00:00:00Z',
    });

    render(
      <MemoryRouter initialEntries={['/regions/SEOUL-A/edit']}>
        <Routes>
          <Route path="/regions/:regionRef/edit" element={<RegionFormPage client={{ request: vi.fn() }} mode="edit" />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByDisplayValue('서울 A 권역')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('권역 이름'), { target: { value: '서울 A 권역 수정' } });
    fireEvent.change(screen.getByLabelText('난이도'), { target: { value: 'medium' } });
    fireEvent.change(screen.getByLabelText('설명'), { target: { value: '수정됨' } });
    fireEvent.click(screen.getByRole('button', { name: '권역 수정' }));

    await waitFor(() => {
      expect(apiMocks.updateRegion).toHaveBeenCalledWith(
        expect.anything(),
        '10000000-0000-0000-0000-000000000011',
        expect.objectContaining({
          name: '서울 A 권역 수정',
          difficulty_level: 'medium',
        }),
      );
    });
    expect(navigateMock).toHaveBeenCalledWith('/regions/SEOUL-A');
  });
});
