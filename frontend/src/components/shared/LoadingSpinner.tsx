export default function LoadingSpinner({ text = 'Laden...' }: { text?: string }) {
  return (
    <div className="loading">
      <div className="spinner" />
      {text}
    </div>
  )
}
