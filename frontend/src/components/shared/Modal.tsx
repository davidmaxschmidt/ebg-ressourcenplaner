import type { ReactNode } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
}

export default function Modal({ open, onClose, title, children, footer }: ModalProps) {
  if (!open) return null

  return (
    <div className="modal-bg" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <div className="modal-h">
          <span>{title}</span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text)', fontSize: 18, cursor: 'pointer' }}
          >
            &times;
          </button>
        </div>
        <div className="modal-b">
          {children}
        </div>
        {footer && (
          <div className="modal-f">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
