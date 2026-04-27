import { PageLayout } from '../components/PageLayout';
import type { TopNotificationTone } from '../components/TopNotificationBar';

type TopNotificationPreviewPageProps = {
  onShowNotice: (message: string, tone: TopNotificationTone) => void;
};

export function TopNotificationPreviewPage({ onShowNotice }: TopNotificationPreviewPageProps) {
  return (
    <PageLayout
      subtitle="로컬 환경에서만 상단 알림 템플릿의 색상과 애니메이션을 확인하는 숨김 경로입니다."
      title="상단 알림 미리보기"
    >
      <div className="stack large-gap">
        <section className="panel stack">
          <p className="panel-kicker">알림 톤</p>
          <h2>일반 로그와 오류 이동 로그를 바로 확인할 수 있습니다.</h2>
          <p className="hero-copy">
            시스템 관리자 계정으로도 연녹색 일반 알림과 붉은색 오류 알림을 각각 눌러서 확인할 수 있습니다.
          </p>
          <div className="button-row">
            <button
              className="button secondary"
              onClick={() => onShowNotice('정상 흐름 로그 예시입니다. 상단 알림 템플릿을 확인하세요.', 'success')}
              type="button"
            >
              일반 알림 미리보기
            </button>
            <button
              className="button danger"
              onClick={() => onShowNotice('오류로 인해 허용된 화면으로 이동했습니다. 상단 알림 템플릿을 확인하세요.', 'error')}
              type="button"
            >
              오류 알림 미리보기
            </button>
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
