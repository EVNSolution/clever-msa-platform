import { useEffect, type ReactNode } from 'react';

type FormModalProps = {
  children: ReactNode;
  isOpen: boolean;
  kicker: string;
  onClose: () => void;
  title: string;
};

export function FormModal({ children, isOpen, kicker, onClose, title }: FormModalProps) {
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <section
        aria-label={title}
        aria-modal="true"
        className="panel form-panel modal-panel"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="panel-header panel-header-inline">
          <div className="stack">
            <p className="panel-kicker">{kicker}</p>
            <h2>{title}</h2>
          </div>
          <button className="button ghost small" onClick={onClose} type="button">
            닫기
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
