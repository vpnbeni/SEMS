import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Calendar, ChevronRight, CheckCircle2, ArrowRight, Loader2, Copy } from 'lucide-react'
import { useAvailableSessions, useCreateSession, useCarryForward } from '../hooks/useSessions'
import { useAcademicSession } from '../contexts/AcademicSessionContext'
import toast from 'react-hot-toast'

const SessionSelector: React.FC = () => {
  const navigate = useNavigate()
  const { hasSession, setSession } = useAcademicSession()
  const { data, isLoading, error } = useAvailableSessions()
  const createSession = useCreateSession()
  const carryForward = useCarryForward()

  const [selectedLabel, setSelectedLabel] = useState<string | null>(null)
  const [showCarryForward, setShowCarryForward] = useState(false)
  const [sourceLabel, setSourceLabel] = useState<string | null>(null)
  const [entering, setEntering] = useState(false)

  const sessions = data?.data || []
  const currentLabel = data?.meta?.currentLabel || ''

  useEffect(() => {
    if (hasSession) {
      navigate('/dashboard', { replace: true })
    }
  }, [hasSession, navigate])

  const handleSelectSession = (label: string) => {
    setSelectedLabel(label)
    setShowCarryForward(false)
    setSourceLabel(null)
  }

  const handleEnterSession = async () => {
    if (!selectedLabel) return

    setEntering(true)
    try {
      // Ensure session exists in DB
      await createSession.mutateAsync(selectedLabel)

      // If carry forward was requested, do it
      if (showCarryForward && sourceLabel) {
        await carryForward.mutateAsync({
          targetLabel: selectedLabel,
          sourceLabel,
        })
        toast.success(`Data carried forward from ${sourceLabel}`)
      }

      // Set session in context (updates localStorage + invalidates React Query)
      setSession(selectedLabel)
      navigate('/dashboard', { replace: true })
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to enter session')
    } finally {
      setEntering(false)
    }
  }

  // Sessions that have data (for carry-forward source selection)
  const existingSessions = sessions.filter((s) => s.exists && s.label !== selectedLabel)

  return (
    <div className="min-h-screen w-full flex bg-[#050505] text-white selection:bg-primary-500/30">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-2/5 relative overflow-hidden bg-gradient-to-br from-gray-900 to-black border-r border-white/5">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-600/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary-600/10 rounded-full blur-[120px]" />
        </div>

        <div className="relative z-10 w-full flex flex-col justify-between p-12">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3"
          >
            <div className="p-2 bg-primary-500 rounded-xl shadow-lg shadow-primary-500/20">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">Cntr</span>
          </motion.div>

          <div className="space-y-8">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h1 className="text-4xl font-bold leading-tight mb-4">
                Select Your{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-secondary-400">
                  Academic Session
                </span>
              </h1>
              <p className="text-gray-400 text-lg max-w-md">
                Choose the academic session you want to work with. All your examination data, candidates, and records are organized by session.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-3 text-gray-400 text-sm">
                <Calendar className="w-5 h-5 text-primary-400" />
                <span>Indian academic year: April to March</span>
              </div>
              <div className="flex items-center gap-3 text-gray-400 text-sm">
                <Copy className="w-5 h-5 text-primary-400" />
                <span>Carry forward teachers, rooms & subjects to new sessions</span>
              </div>
              <div className="flex items-center gap-3 text-gray-400 text-sm">
                <CheckCircle2 className="w-5 h-5 text-primary-400" />
                <span>Switch between sessions anytime from the dashboard</span>
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-sm text-gray-600"
          >
            Current calendar session: <span className="text-gray-400 font-medium">{currentLabel}</span>
          </motion.div>
        </div>
      </div>

      {/* Right Panel: Session Cards */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 relative overflow-hidden">
        <div className="lg:hidden absolute top-0 left-0 w-full h-full -z-10">
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-primary-500/10 rounded-full blur-[80px]" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-secondary-500/10 rounded-full blur-[80px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg"
        >
          {/* Mobile header */}
          <div className="lg:hidden text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-primary-500 rounded-2xl">
                <BookOpen className="w-8 h-8 text-white" />
              </div>
            </div>
            <h2 className="text-2xl font-bold">Select Academic Session</h2>
          </div>

          <div className="text-center mb-8 hidden lg:block">
            <h2 className="text-2xl font-bold mb-2">Choose a Session</h2>
            <p className="text-gray-400 text-sm">
              Select the academic year you want to access
            </p>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
              <p className="mt-4 text-gray-400">Loading sessions...</p>
            </div>
          ) : error ? (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm text-center">
              Failed to load sessions. Please try again.
            </div>
          ) : (
            <>
              {/* Session Cards */}
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                <AnimatePresence>
                  {sessions.map((session, idx) => (
                    <motion.button
                      key={session.label}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      onClick={() => handleSelectSession(session.label)}
                      className={`w-full text-left rounded-2xl border p-4 transition-all duration-200 group ${
                        selectedLabel === session.label
                          ? 'border-primary-500/50 bg-primary-500/10 ring-1 ring-primary-500/30'
                          : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${
                              session.isCurrent
                                ? 'bg-primary-500/20 text-primary-400'
                                : 'bg-white/10 text-gray-400'
                            }`}
                          >
                            {session.startYear.toString().slice(-2)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-white">{session.label}</span>
                              {session.isCurrent && (
                                <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-300 border border-primary-500/30">
                                  Current
                                </span>
                              )}
                              {session.exists && (
                                <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  Has Data
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">
                              Apr {session.startYear} — Mar {session.endYear}
                            </p>
                          </div>
                        </div>

                        <div className={`transition-all ${selectedLabel === session.label ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}>
                          {selectedLabel === session.label ? (
                            <CheckCircle2 className="w-5 h-5 text-primary-400" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-gray-500" />
                          )}
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </AnimatePresence>
              </div>

              {/* Carry Forward Option */}
              {selectedLabel && existingSessions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-4"
                >
                  <button
                    onClick={() => setShowCarryForward(!showCarryForward)}
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                    <span>{showCarryForward ? 'Hide' : 'Carry forward data from another session?'}</span>
                  </button>

                  {showCarryForward && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-3 space-y-2"
                    >
                      <p className="text-xs text-gray-500">
                        Copy teachers, rooms, subjects, and centre details from:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {existingSessions.map((s) => (
                          <button
                            key={s.label}
                            onClick={() => setSourceLabel(sourceLabel === s.label ? null : s.label)}
                            className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                              sourceLabel === s.label
                                ? 'border-primary-500/50 bg-primary-500/10 text-primary-300'
                                : 'border-white/10 bg-white/[0.03] text-gray-400 hover:bg-white/[0.06]'
                            }`}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {/* Enter Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleEnterSession}
                disabled={!selectedLabel || entering}
                className={`mt-6 w-full font-semibold py-3.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 group ${
                  selectedLabel
                    ? 'bg-primary-600 hover:bg-primary-500 text-white shadow-primary-500/25'
                    : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                }`}
              >
                {entering ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Setting up session...
                  </>
                ) : (
                  <>
                    Enter Session {selectedLabel || ''}
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </motion.button>
            </>
          )}

          <p className="text-center mt-8 text-xs text-gray-600">
            You can switch sessions later from the sidebar.
          </p>
        </motion.div>

        <style dangerouslySetInnerHTML={{
          __html: `
          .custom-scrollbar::-webkit-scrollbar {
            width: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(255,255,255,0.1);
            border-radius: 2px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(255,255,255,0.2);
          }
        `}} />
      </div>
    </div>
  )
}

export default SessionSelector
