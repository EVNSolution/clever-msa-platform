import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { createRegion, getRegionByCode, updateRegion } from '../api/regions';
import { getErrorMessage, type HttpClient } from '../api/http';
import { getRegionRouteRef } from '../routeRefs';

type RegionFormPageProps = {
  client: HttpClient;
  mode: 'create' | 'edit';
};

function stringifyPolygon(value: Record<string, unknown>) {
  return JSON.stringify(value, null, 2);
}

export function RegionFormPage({ client, mode }: RegionFormPageProps) {
  const navigate = useNavigate();
  const { regionRef } = useParams();
  const isEdit = mode === 'edit';
  const [regionId, setRegionId] = useState<string | null>(null);
  const [regionCode, setRegionCode] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState<'draft' | 'active' | 'inactive'>('draft');
  const [difficultyLevel, setDifficultyLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [description, setDescription] = useState('');
  const [displayOrder, setDisplayOrder] = useState('0');
  const [polygonJson, setPolygonJson] = useState('{\n  "type": "Polygon",\n  "coordinates": []\n}');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(isEdit);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isEdit || !regionRef) {
      setIsLoading(false);
      return;
    }

    const selectedRegionRef = regionRef;
    let ignore = false;

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const region = await getRegionByCode(client, selectedRegionRef);
        if (ignore) {
          return;
        }
        setRegionId(region.region_id);
        setRegionCode(region.region_code);
        setName(region.name);
        setStatus(region.status);
        setDifficultyLevel(region.difficulty_level);
        setDescription(region.description);
        setDisplayOrder(String(region.display_order));
        setPolygonJson(stringifyPolygon(region.polygon_geojson));
      } catch (error) {
        if (!ignore) {
          setErrorMessage(getErrorMessage(error));
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
  }, [client, isEdit, regionRef]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const polygonGeoJson = JSON.parse(polygonJson) as Record<string, unknown>;
      const payload = {
        region_code: regionCode,
        name,
        status,
        difficulty_level: difficultyLevel,
        polygon_geojson: polygonGeoJson,
        description,
        display_order: Number(displayOrder || 0),
      } as const;
      const saved = isEdit && regionId
        ? await updateRegion(client, regionId, payload)
        : await createRegion(client, payload);
      navigate(`/regions/${getRegionRouteRef(saved)}`);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, '권역을 저장할 수 없습니다.'));
    } finally {
      setIsSaving(false);
    }
  }

  const cancelHref = isEdit && regionRef ? `/regions/${regionRef}` : '/regions';

  return (
    <section className="panel form-panel">
      <div className="panel-header">
        <p className="panel-kicker">권역 입력</p>
        <h2>{isEdit ? '권역 수정' : '권역 생성'}</h2>
      </div>
      {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
      {isLoading ? (
        <p className="empty-state">권역 입력 화면을 준비하는 중입니다...</p>
      ) : (
        <form className="form-stack" onSubmit={handleSubmit}>
          <label className="field">
            <span>권역 코드</span>
            <input aria-label="권역 코드" onChange={(event) => setRegionCode(event.target.value)} value={regionCode} />
          </label>
          <label className="field">
            <span>권역 이름</span>
            <input aria-label="권역 이름" onChange={(event) => setName(event.target.value)} value={name} />
          </label>
          <label className="field">
            <span>상태</span>
            <select aria-label="상태" onChange={(event) => setStatus(event.target.value as typeof status)} value={status}>
              <option value="draft">draft</option>
              <option value="active">active</option>
              <option value="inactive">inactive</option>
            </select>
          </label>
          <label className="field">
            <span>난이도</span>
            <select
              aria-label="난이도"
              onChange={(event) => setDifficultyLevel(event.target.value as typeof difficultyLevel)}
              value={difficultyLevel}
            >
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
            </select>
          </label>
          <label className="field">
            <span>설명</span>
            <textarea aria-label="설명" onChange={(event) => setDescription(event.target.value)} rows={4} value={description} />
          </label>
          <label className="field">
            <span>정렬 순서</span>
            <input
              aria-label="정렬 순서"
              min="0"
              onChange={(event) => setDisplayOrder(event.target.value)}
              step="1"
              type="number"
              value={displayOrder}
            />
          </label>
          <label className="field">
            <span>폴리곤 JSON</span>
            <textarea
              aria-label="폴리곤 JSON"
              onChange={(event) => setPolygonJson(event.target.value)}
              rows={8}
              value={polygonJson}
            />
          </label>
          <div className="form-actions">
            <button className="button primary" disabled={isSaving} type="submit">
              {isSaving ? '저장 중...' : isEdit ? '권역 수정' : '권역 생성'}
            </button>
            <Link className="button ghost" to={cancelHref}>
              취소
            </Link>
          </div>
        </form>
      )}
    </section>
  );
}
