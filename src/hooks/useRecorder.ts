import { useCallback, useRef, useState } from 'react'
import {
  computeSpectralCentroid,
  computeSpectralFlatness,
  computeRms,
  detectPitch,
  computeOddEvenRatio,
  computeSubharmonicRatio,
} from '../analysis/dsp'
import { toCentsDeviation, computeAttackTime, filterVoiced } from '../analysis/summarize'
import type { RecorderStatus, TakeMetrics } from '../types'

const MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
const HOP_MS = 25
const FFT_SIZE = 2048

interface Series {
  centroidOverTime: number[]
  spectralFlatnessOverTime: number[]
  rms: number[]
  pitchHz: (number | null)[]
  oddEvenRatio: (number | null)[]
  subharmonicRatio: (number | null)[]
  timestamps: number[]
}

function pickMimeType(): string {
  return MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type)) || ''
}

function emptySeries(): Series {
  return {
    centroidOverTime: [],
    spectralFlatnessOverTime: [],
    rms: [],
    pitchHz: [],
    oddEvenRatio: [],
    subharmonicRatio: [],
    timestamps: [],
  }
}

export interface UseRecorderResult {
  status: RecorderStatus
  error: string | null
  audioURL: string | null
  metrics: TakeMetrics | null
  start: () => Promise<void>
  stop: () => void
  reset: () => void
}

export function useRecorder(): UseRecorderResult {
  const [status, setStatus] = useState<RecorderStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [audioURL, setAudioURL] = useState<string | null>(null)
  const [metrics, setMetrics] = useState<TakeMetrics | null>(null)

  const streamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const audioContextRef = useRef<AudioContext | null>(null)
  const sampleIntervalRef = useRef<number | null>(null)
  const startTimeRef = useRef(0)
  const seriesRef = useRef<Series>(emptySeries())

  const stopSampling = useCallback(() => {
    if (sampleIntervalRef.current !== null) {
      clearInterval(sampleIntervalRef.current)
      sampleIntervalRef.current = null
    }
  }, [])

  const start = useCallback(async () => {
    setError(null)
    setMetrics(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mimeType = pickMimeType()
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      chunksRef.current = []

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType })
        setAudioURL((prevURL) => {
          if (prevURL) URL.revokeObjectURL(prevURL)
          return URL.createObjectURL(blob)
        })
        streamRef.current?.getTracks().forEach((track) => track.stop())
        streamRef.current = null

        const series = seriesRef.current
        const pitchStability = toCentsDeviation(series.pitchHz, series.timestamps)
        const oddEvenRatio = filterVoiced(series.oddEvenRatio, series.timestamps)
        const subharmonicRatio = filterVoiced(series.subharmonicRatio, series.timestamps)
        setMetrics({
          centroidOverTime: series.centroidOverTime,
          pitchStabilityCents: pitchStability.cents,
          attackTimeMs: computeAttackTime(series.rms, series.timestamps),
          spectralFlatnessOverTime: series.spectralFlatnessOverTime,
          frameTimestamps: series.timestamps,
          pitchTimestamps: pitchStability.timestamps,
          oddEvenRatioOverTime: oddEvenRatio.values,
          oddEvenRatioTimestamps: oddEvenRatio.timestamps,
          subharmonicRatioOverTime: subharmonicRatio.values,
          subharmonicRatioTimestamps: subharmonicRatio.timestamps,
        })
        setStatus('done')
      }

      // Analysis is sampled live off the mic stream while recording (rather
      // than decoded back out of the MediaRecorder blob afterward) so we can
      // read frames straight off an AnalyserNode as CLAUDE.md specifies.
      // smoothingTimeConstant is zeroed so each read is an independent frame
      // instead of a blend with prior frames (the browser default is meant
      // for smooth visualizations, not per-frame analysis).
      const audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = FFT_SIZE
      analyser.smoothingTimeConstant = 0
      source.connect(analyser)
      audioContextRef.current = audioContext

      const freqData = new Float32Array(analyser.frequencyBinCount)
      const timeData = new Float32Array(analyser.fftSize)
      seriesRef.current = emptySeries()
      startTimeRef.current = performance.now()

      sampleIntervalRef.current = setInterval(() => {
        analyser.getFloatFrequencyData(freqData)
        analyser.getFloatTimeDomainData(timeData)

        const series = seriesRef.current
        const pitchHz = detectPitch(timeData, audioContext.sampleRate)
        series.centroidOverTime.push(computeSpectralCentroid(freqData, audioContext.sampleRate))
        series.spectralFlatnessOverTime.push(computeSpectralFlatness(freqData))
        series.rms.push(computeRms(timeData))
        series.pitchHz.push(pitchHz)
        series.oddEvenRatio.push(
          pitchHz != null ? computeOddEvenRatio(freqData, audioContext.sampleRate, pitchHz) : null,
        )
        series.subharmonicRatio.push(
          pitchHz != null ? computeSubharmonicRatio(freqData, audioContext.sampleRate, pitchHz) : null,
        )
        series.timestamps.push(performance.now() - startTimeRef.current)
      }, HOP_MS)

      mediaRecorderRef.current = recorder
      recorder.start()
      setStatus('recording')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not access microphone')
      setStatus('idle')
    }
  }, [])

  const stop = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      setStatus('processing')
      stopSampling()
      audioContextRef.current?.close()
      audioContextRef.current = null
      mediaRecorderRef.current.stop()
    }
  }, [stopSampling])

  const reset = useCallback(() => {
    setAudioURL((prevURL) => {
      if (prevURL) URL.revokeObjectURL(prevURL)
      return null
    })
    setMetrics(null)
    setError(null)
    setStatus('idle')
  }, [])

  return { status, error, audioURL, metrics, start, stop, reset }
}
