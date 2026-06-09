import { useEffect, useRef, useState } from 'react'
import { X, Camera } from 'lucide-react'

interface Props {
  open: boolean
  onScan: (barcode: string) => void
  onClose: () => void
}

// Dynamically import @zxing/browser to avoid bloating the main bundle
async function startDecoder(
  videoEl: HTMLVideoElement,
  onResult: (text: string) => void,
  onError: (msg: string) => void
): Promise<() => void> {
  try {
    const { BrowserMultiFormatReader } = await import('@zxing/browser')
    const reader = new BrowserMultiFormatReader()
    const controls = await reader.decodeFromVideoDevice(undefined, videoEl, (result, err) => {
      if (result) {
        onResult(result.getText())
      } else if (err && err.name !== 'NotFoundException') {
        onError(err.message)
      }
    })
    return () => controls.stop()
  } catch (e) {
    onError(e instanceof Error ? e.message : 'Camera error')
    return () => { /* noop */ }
  }
}

export default function BarcodeScanner({ open, onScan, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const stopRef = useRef<() => void>(() => { /* noop */ })
  const [status, setStatus] = useState<'starting' | 'scanning' | 'error'>('starting')
  const [errorMsg, setErrorMsg] = useState('')
  const [scanned, setScanned] = useState(false)
  const [manualBarcode, setManualBarcode] = useState('')
  const [showManual, setShowManual] = useState(false)

  useEffect(() => {
    if (!open || !videoRef.current) return
    setStatus('starting')
    setScanned(false)
    setErrorMsg('')
    let stopped = false

    startDecoder(
      videoRef.current,
      (text) => {
        if (stopped || scanned) return
        stopped = true
        setScanned(true)
        stopRef.current()
        if (navigator.vibrate) navigator.vibrate(60)
        onScan(text)
      },
      (msg) => {
        if (stopped) return
        setStatus('error')
        setErrorMsg(msg.includes('Permission') || msg.includes('permission') ? 'Camera permission denied.' : msg)
      }
    ).then(stop => {
      stopRef.current = stop
      if (!stopped) setStatus('scanning')
    })

    return () => {
      stopped = true
      stopRef.current()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!open) return null

  return (
    <div style={overlay}>
      <div style={container}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid rgb(var(--color-border))' }}>
          <span style={{ fontWeight: 700, fontSize: 16 }}>Scan Barcode</span>
          <button className="icon-btn" onClick={onClose}><X size={20} /></button>
        </div>

        {status !== 'error' && (
          <div style={{ position: 'relative', background: '#000' }}>
            <video ref={videoRef} style={{ width: '100%', maxHeight: 300, display: 'block', objectFit: 'cover' }} muted playsInline />
            {/* scanning crosshair */}
            <div style={crosshair} />
            {status === 'starting' && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14 }}>
                <Camera size={20} style={{ marginRight: 8 }} /> Starting camera…
              </div>
            )}
          </div>
        )}

        {status === 'error' && (
          <div style={{ padding: 24, textAlign: 'center' }}>
            <p style={{ color: '#ef4444', fontSize: 14, marginBottom: 16 }}>{errorMsg || 'Camera error.'}</p>
          </div>
        )}

        <div style={{ padding: 16 }}>
          {status === 'scanning' && (
            <p style={{ margin: '0 0 16px', fontSize: 13, color: 'rgb(var(--color-text-muted))', textAlign: 'center' }}>
              Point camera at a product barcode
            </p>
          )}

          {!showManual ? (
            <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => setShowManual(true)}>
              Enter barcode manually
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="input"
                style={{ flex: 1 }}
                placeholder="e.g. 4006040143315"
                value={manualBarcode}
                onChange={e => setManualBarcode(e.target.value)}
                inputMode="numeric"
                autoFocus
              />
              <button
                className="btn btn-primary"
                disabled={!manualBarcode.trim()}
                onClick={() => { if (manualBarcode.trim()) { stopRef.current(); onScan(manualBarcode.trim()) } }}
              >
                Go
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const overlay: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 200,
  background: 'rgba(0,0,0,0.7)',
  display: 'flex',
  alignItems: 'flex-end',
}

const container: React.CSSProperties = {
  width: '100%',
  background: 'rgb(var(--color-bg))',
  borderRadius: '20px 20px 0 0',
  overflow: 'hidden',
  paddingBottom: 'env(safe-area-inset-bottom, 0px)',
}

const crosshair: React.CSSProperties = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 200,
  height: 80,
  border: '2px solid rgb(var(--color-accent))',
  borderRadius: 8,
  boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)',
}
