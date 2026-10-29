import { useState, type FormEvent } from 'react'
import { errorMessage, runSearch, type JobProgress } from '../api'
import { pretty } from '../constants'

type Props = {
  onDone: (searchId: number) => void   // App tells us what to do when the search is finished
}

const STATUSES = ['RECRUITING', 'NOT_YET_RECRUITING', 'ACTIVE_NOT_RECRUITING', 'COMPLETED', 'TERMINATED']

// One-click examples so a first-time visitor can see the app working right away
const EXAMPLES = [
  { condition: 'obesity', drug: 'semaglutide' },
  { condition: 'obesity', drug: 'tirzepatide' },
  { condition: 'asthma', drug: 'dupilumab' },
  { condition: 'breast cancer', drug: '' },
]

const inputClass = 'block w-full rounded border border-slate-300 px-3 py-2 text-slate-900'

export default function SearchPanel({ onDone }: Props) {
  const [condition, setCondition] = useState('')
  const [drug, setDrug] = useState('')
  const [status, setStatus] = useState('')
  const [progress, setProgress] = useState<JobProgress | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function search(cond: string, drg: string, stat: string) {
    if (!cond.trim() && !drg.trim()) {
      setError('Please type a condition or a drug (or both).')
      return
    }

    setError('')
    setProgress(null)
    setBusy(true)

    try {
      const searchId = await runSearch(cond, drg, stat, setProgress)
      onDone(searchId)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()   // stop the browser from reloading the page
    search(condition, drug, status)
  }

  function tryExample(example: { condition: string; drug: string }) {
    setCondition(example.condition)
    setDrug(example.drug)
    setStatus('')
    search(example.condition, example.drug, '')
  }

  const percent = progress?.goal ? Math.round((progress.fetched / progress.goal) * 100) : 0

  return (
    <form onSubmit={handleSubmit} className="rounded-lg bg-white p-4 shadow">
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-48 flex-1 text-sm text-slate-600">
          Condition or disease
          <input
            className={inputClass}
            placeholder="e.g. obesity"
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
          />
        </label>
        <label className="min-w-48 flex-1 text-sm text-slate-600">
          Drug or treatment
          <input
            className={inputClass}
            placeholder="e.g. semaglutide"
            value={drug}
            onChange={(e) => setDrug(e.target.value)}
          />
        </label>
        <label className="text-sm text-slate-600">
          Trial status
          <select
            className={inputClass}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Any status</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{pretty(s)}</option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={busy}
          className="rounded bg-blue-600 px-5 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {busy ? 'Searching…' : 'Search'}
        </button>
      </div>

      {!busy && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-slate-500">Try:</span>
          {EXAMPLES.map((ex) => (
            <button
              key={`${ex.condition}-${ex.drug}`}
              type="button"
              onClick={() => tryExample(ex)}
              className="rounded-full bg-slate-100 px-3 py-1 text-slate-700 hover:bg-blue-50 hover:text-blue-700"
            >
              {ex.drug ? `${ex.condition} + ${ex.drug}` : ex.condition}
            </button>
          ))}
        </div>
      )}

      {busy && (
        <div className="mt-4">
          <div className="h-2 w-full rounded bg-slate-200">
            <div className="h-2 rounded bg-blue-600 transition-all" style={{ width: `${percent}%` }} />
          </div>
          <p className="mt-1 text-sm text-slate-600">
            {progress
              ? `Downloading from ClinicalTrials.gov: ${progress.fetched} of ${progress.goal ?? '…'} trials (${percent}%)`
              : 'Starting search… (searches you have run before load instantly)'}
          </p>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </form>
  )
}
