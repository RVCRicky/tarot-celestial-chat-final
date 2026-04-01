'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import {
  READERS,
  topicFromText,
  recommendedReader,
  pricesForCountry,
  extractName,
  extractZodiac,
  isMainQuestion,
  isFollowup,
  estimateTypingMs,
  normalizeText
} from '../../lib/chatShared'

const CENTRAL_NAME = 'Clara'

function readerGreeting(name) {
  const reader = READERS.find((r) => r.name === name)
  return reader
    ? `Hola cielo, soy ${name}. Ya estoy contigo. ${reader.description} Antes de entrar del todo en tu consulta, dime tu signo y cuéntame con calma qué quieres mirar conmigo.`
    : `Hola cielo, soy ${name}. Ya estoy contigo. Antes de entrar del todo en tu consulta, dime tu signo y cuéntame con calma qué quieres mirar conmigo.`
}

function stripMarkdown(value) {
  return (value || '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/`/g, '')
    .replace(/#{1,6}\s?/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function includesAny(text, list) {
  return list.some((item) => text.includes(item))
}

function detectPackSelection(text) {
  const lower = normalizeText(text)

  if (
    includesAny(lower, [
      '10 preguntas',
      'diez preguntas',
      'pack 10',
      'paquete 10',
      'quiero 10',
      'el de 10',
      'la de 10'
    ])
  ) {
    return { id: 'pack_10', label: '10 preguntas' }
  }

  if (
    includesAny(lower, [
      '5 preguntas',
      'cinco preguntas',
      'pack 5',
      'paquete 5',
      'quiero 5',
      'el de 5',
      'la de 5'
    ])
  ) {
    return { id: 'pack_5', label: '5 preguntas' }
  }

  if (
    includesAny(lower, [
      '3 preguntas',
      'tres preguntas',
      'pack 3',
      'paquete 3',
      'quiero 3',
      'el de 3',
      'la de 3'
    ])
  ) {
    return { id: 'pack_3', label: '3 preguntas' }
  }

  return null
}

function buildControlledCentralReply({ text, chosenReader }) {
  const lower = normalizeText(text)

  const isLove = includesAny(lower, [
    'amor',
    'pareja',
    'relacion',
    'relación',
    'ex',
    'volver',
    'celos',
    'infidel',
    'tercera persona',
    'reconcili'
  ])

  const isWork = includesAny(lower, [
    'trabajo',
    'dinero',
    'econom',
    'laboral',
    'negocio',
    'empleo',
    'empresa',
    'jefe',
    'ascenso'
  ])

  const isEnergy = includesAny(lower, [
    'energia',
    'energía',
    'bloqueo',
    'espiritual',
    'camino',
    'mal de ojo',
    'limpieza',
    'vibra',
    'ansiedad',
    'agobio'
  ])

  const isFamily = includesAny(lower, [
    'familia',
    'madre',
    'padre',
    'hijo',
    'hija',
    'hermano',
    'hermana'
  ])

  const asksBest = includesAny(lower, [
    'cual es la mejor',
    'cuál es la mejor',
    'cual me recomiendas',
    'cuál me recomiendas',
    'quien me recomiendas',
    'quién me recomiendas',
    'cual es la que mas gusta',
    'cuál es la que más gusta'
  ])

  if (!chosenReader) {
    return 'Ahora mismo están todas ocupadas cielo... si quieres te aviso en cuanto se libere una.'
  }

  if (isLove) {
    return `Para lo que me estás diciendo de amor, la que más te encaja ahora mismo es ${chosenReader.name}. ${chosenReader.description} Lo noto bastante claro en tu caso. Si quieres, te paso con ella.`
  }

  if (isWork) {
    return `Para lo que me estás contando de trabajo y estabilidad, la que más te encaja ahora mismo es ${chosenReader.name}. ${chosenReader.description} Si quieres, te paso con ella.`
  }

  if (isEnergy) {
    return `Para lo que me estás contando de energía y bloqueo, la que mejor te puede mirar esto ahora mismo es ${chosenReader.name}. ${chosenReader.description} Si quieres, te paso con ella.`
  }

  if (isFamily) {
    return `Para este tema familiar, la que mejor te puede ayudar ahora mismo es ${chosenReader.name}. ${chosenReader.description} Si quieres, te paso con ella.`
  }

  if (asksBest) {
    return `De las que tengo libres ahora mismo, la que más te recomendaría es ${chosenReader.name}. ${chosenReader.description} Si quieres, te paso con ella.`
  }

  return `Mm... por lo que me estás diciendo, siento que la que mejor te puede ayudar ahora mismo es ${chosenReader.name}. ${chosenReader.description} Si quieres, te paso con ella.`
}

function shouldUseAIForCentral(text) {
  const lower = normalizeText(text)

  const fullyControlled = [
    'quien tienes',
    'quién tienes',
    'disponible',
    'disponibles',
    'cual me recomiendas',
    'cuál me recomiendas',
    'cual es la mejor',
    'cuál es la mejor',
    'amor',
    'pareja',
    'relacion',
    'relación',
    'ex',
    'volver',
    'trabajo',
    'dinero',
    'econom',
    'bloqueo',
    'energia',
    'energía',
    'precio',
    'credit',
    'pagar',
    'reserv',
    'cita'
  ]

  return !includesAny(lower, fullyControlled)
}

function isAffirmative(text) {
  const lower = normalizeText(text)
  return (
    includesAny(lower, [
      'si',
      'sí',
      'vale',
      'ok',
      'perfecto',
      'claro',
      'de acuerdo',
      'hazlo',
      'pasame',
      'pásame',
      'quiero hablar con ella',
      'quiero con ella',
      'dale',
      'adelante'
    ]) && !includesAny(lower, ['no', 'todavia no', 'todavía no', 'mejor no'])
  )
}

function isNegative(text) {
  const lower = normalizeText(text)
  return includesAny(lower, [
    'no',
    'mejor no',
    'espera',
    'todavia no',
    'todavía no',
    'aun no',
    'aún no'
  ])
}

function chooseReaderForTopic(topic, availableReaders, rawText = '') {
  const lower = normalizeText(rawText)

  const findPreferred = (names) =>
    availableReaders.find((r) => names.includes(r.name)) || null

  if (includesAny(lower, ['amor', 'pareja', 'ex', 'volver', 'reconcili', 'celos', 'infidel'])) {
    return (
      findPreferred(['Aurora', 'Candela', 'Violeta', 'Rocío', 'Sara', 'Alma']) ||
      availableReaders[0] ||
      null
    )
  }

  if (includesAny(lower, ['trabajo', 'dinero', 'econom', 'laboral', 'negocio', 'empleo'])) {
    return (
      findPreferred(['María', 'Estela', 'Noa', 'Nerea']) ||
      availableReaders[0] ||
      null
    )
  }

  if (includesAny(lower, ['energia', 'energía', 'espiritual', 'bloqueo', 'camino', 'ansiedad', 'agobio'])) {
    return (
      findPreferred(['Luna', 'Alma', 'Mara', 'Noa']) ||
      availableReaders[0] ||
      null
    )
  }

  if (includesAny(lower, ['familia', 'madre', 'padre', 'hijo', 'hija', 'hermano', 'hermana'])) {
    return (
      findPreferred(['María', 'Noa', 'Sara', 'Alma']) ||
      availableReaders[0] ||
      null
    )
  }

  const byTopicName = recommendedReader(topic, availableReaders)
  if (byTopicName) {
    const reader = availableReaders.find((r) => r.name === byTopicName)
    if (reader) return reader
  }

  return availableReaders[0] || null
}

export default function ChatPage() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [session, setSession] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [credits, setCredits] = useState(0)
  const [freeQuestionUsed, setFreeQuestionUsed] = useState(false)
  const [activeReader, setActiveReader] = useState(null)
  const [readers, setReaders] = useState([])
  const [mode, setMode] = useState('central')
  const [typing, setTyping] = useState('')
  const [reservationMode, setReservationMode] = useState(false)
  const [reservationReader, setReservationReader] = useState('')
  const [reservationDay, setReservationDay] = useState('')
  const [reservationTime, setReservationTime] = useState('')
  const [reservationNote, setReservationNote] = useState('')
  const [pendingTransfer, setPendingTransfer] = useState(null)
  const [priceQuoteOpen, setPriceQuoteOpen] = useState(false)
  const [memory, setMemory] = useState({
    topic: '',
    targetName: '',
    userSign: '',
    targetSign: '',
    readerStage: 'intro',
    lastReader: ''
  })
  const [knownMessageIds, setKnownMessageIds] = useState({})
  const scrollRef = useRef(null)
  const shouldStickRef = useRef(true)
  const timersRef = useRef([])
  const sessionRef = useRef(null)
  const activeReaderRef = useRef(null)
  const modeRef = useRef('central')
  const viewStartedAtRef = useRef(null)
  const unloadingRef = useRef(false)

  const onlineReaders = useMemo(() => readers.filter((r) => r.status !== 'Offline'), [readers])
  const offlineReaders = useMemo(() => readers.filter((r) => r.status === 'Offline'), [readers])

  useEffect(() => {
    activeReaderRef.current = activeReader
  }, [activeReader])

  useEffect(() => {
    modeRef.current = mode
  }, [mode])

  const queue = (fn, delay) => {
    const id = setTimeout(fn, delay)
    timersRef.current.push(id)
  }

  const resetVisibleConversation = () => {
    viewStartedAtRef.current = new Date().toISOString()
    setMessages([])
    setKnownMessageIds({})
  }

  const addLocalMessage = (message) => {
    setMessages((prev) => {
      const exists = prev.some(
        (m) =>
          m.id === message.id ||
          (m.text === message.text &&
            m.sender === message.sender &&
            m.sender_name === message.sender_name)
      )

      if (exists) return prev

      return [...prev, message]
    })
  }

  const replaceTempMessage = (tempId, savedMessage) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === tempId ? savedMessage : m))
    )
  }

  const persistMessage = async (sender, text, senderName = null) => {
    try {
      const currentSessionId = sessionRef.current?.id || session?.id
      if (!currentSessionId) return null

      const res = await fetch('/api/session/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: currentSessionId,
          sender,
          text,
          senderName
        })
      })

      const json = await res.json()
      return json.message || null
    } catch (e) {
      console.error('Error guardando mensaje', e)
      return null
    }
  }

  const addAndPersist = async (sender, text, senderName = null) => {
    const tempId = `temp-${crypto.randomUUID()}`
    const tempMessage = {
      id: tempId,
      sender,
      sender_name: senderName,
      text
    }

    addLocalMessage(tempMessage)

    const saved = await persistMessage(sender, text, senderName)

    if (saved) {
      replaceTempMessage(tempId, saved)
      setKnownMessageIds((prev) => ({ ...prev, [saved.id]: true }))
    }
  }

  const showTypingAndAnswer = async (sender, senderName, text, minDelay = 1500) => {
    const cleanText = stripMarkdown(text)

    const label = sender === 'reader'
      ? `${senderName || activeReaderRef.current || 'Tarotista'} está escribiendo...`
      : `${senderName || CENTRAL_NAME} está escribiendo...`

    setTyping(label)
    const total = estimateTypingMs(cleanText, minDelay, 34, minDelay, 10000)

    queue(() => setTyping(''), Math.floor(total * 0.45))
    queue(() => setTyping(label), Math.floor(total * 0.62))
    queue(async () => {
      setTyping('')
      await addAndPersist(sender, cleanText, senderName)
    }, total)
  }

  const fetchReaders = async () => {
    const res = await fetch('/api/readers/list')
    const json = await res.json()
    setReaders(json.readers || [])
    return json.readers || []
  }

  const fetchMessages = async (sessionId) => {
    const res = await fetch(`/api/session/messages?sessionId=${sessionId}`)
    const json = await res.json()
    const cutoff = viewStartedAtRef.current
    const incoming = (json.messages || []).filter((m) => {
      if (!cutoff) return true
      return !m.created_at || new Date(m.created_at).getTime() >= new Date(cutoff).getTime()
    })

    setMessages((prev) => {
      const prevIds = new Set(prev.map((m) => m.id).filter(Boolean))
      const merged = [...prev]
      incoming.forEach((m) => {
        if (!prevIds.has(m.id)) {
          merged.push(m)
        }
      })
      return merged
    })

    setKnownMessageIds((prev) => {
      const next = { ...prev }
      incoming.forEach((m) => { next[m.id] = true })
      return next
    })

    return incoming
  }

  const heartbeat = async (currentMode, currentReaderName) => {
    const currentSessionId = sessionRef.current?.id || session?.id
    if (!currentSessionId) return

    await fetch('/api/session/heartbeat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: currentSessionId,
        mode: currentMode,
        currentReaderName: currentReaderName || null
      })
    })
  }

  const refreshProfileCredits = async (profileId) => {
    if (!profileId) return
    const { data: freshProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profileId)
      .maybeSingle()

    if (freshProfile) {
      setProfile(freshProfile)
      setCredits(freshProfile.credits || 0)
      setFreeQuestionUsed(freshProfile.free_question_used || false)
    }
  }

  const beginCheckoutFlow = async (pack, readerName = '') => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('tc_checkout_pack', pack.id)
      window.localStorage.setItem('tc_checkout_label', pack.label)
      if (readerName) {
        window.localStorage.setItem('tc_resume_reader', readerName)
        window.localStorage.setItem('tc_last_reader', readerName)
      } else {
        window.localStorage.removeItem('tc_resume_reader')
      }
    }

    setPriceQuoteOpen(false)

    await showTypingAndAnswer(
      'central',
      CENTRAL_NAME,
      `Perfecto cielo, te preparo ahora mismo el cobro del paquete de ${pack.label}. Te abro la pasarela segura y, en cuanto quede confirmado, sigo contigo aquí dentro.`,
      1500
    )

    queue(() => {
      window.location.href = `/payment?pack=${encodeURIComponent(pack.id)}&auto=1`
    }, 1900)
  }

  useEffect(() => {
    const init = async () => {
      const { data: authData } = await supabase.auth.getUser()
      if (!authData.user) {
        window.location.href = '/auth/login'
        return
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('auth_user_id', authData.user.id)
        .maybeSingle()

      if (!profileData) {
        alert('Falta perfil. Regístrate de nuevo.')
        window.location.href = '/auth/register'
        return
      }

      setProfile(profileData)
      setCredits(profileData.credits || 0)
      setFreeQuestionUsed(profileData.free_question_used || false)

      const sessionRes = await fetch('/api/session/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: profileData.id })
      })
      const sessionJson = await sessionRes.json()
      setSession(sessionJson.session)
      sessionRef.current = sessionJson.session

      if (sessionJson.session?.mode === 'reader' && sessionJson.session?.current_reader_name) {
        setMode('reader')
        setActiveReader(sessionJson.session.current_reader_name)
        setMemory((prev) => ({
          ...prev,
          lastReader: sessionJson.session.current_reader_name
        }))
      }

      await fetchReaders()
      const existingMessages = await fetchMessages(sessionJson.session.id)

      const paymentSuccess = typeof window !== 'undefined' && (window.localStorage.getItem('tc_payment_success') === '1' || new URLSearchParams(window.location.search).get('paid') === '1')
      const resumeReader = typeof window !== 'undefined' ? window.localStorage.getItem('tc_resume_reader') || '' : ''

      if (paymentSuccess) {
        window.localStorage.removeItem('tc_payment_success')
        if (typeof window !== 'undefined' && window.location.search.includes('paid=1')) {
          window.history.replaceState({}, '', '/chat')
        }
        await refreshProfileCredits(profileData.id)
        resetVisibleConversation()

        if (resumeReader) {
          queue(async () => {
            await addAndPersist(
              'central',
              `Perfecto ${profileData.display_name}, ya veo el pago confirmado. Te paso ahora mismo con ${resumeReader}. Un momento, cielo.`,
              CENTRAL_NAME
            )
            await beginTransfer(resumeReader, { skipCentralMessage: true })
          }, 700)
        } else {
          queue(async () => {
            await addAndPersist(
              'central',
              `Vale cielo, ya veo el cobro confirmado y ya tienes tus créditos activos. Ahora dime con quién quieres utilizarlos y te paso con ella, o si prefieres te recomiendo yo la mejor para ti.`,
              CENTRAL_NAME
            )
          }, 700)
        }
      } else if (sessionJson.session && (!existingMessages || existingMessages.length === 0)) {
        const welcome = `Hola ${profileData.display_name}, bienvenida de nuevo a Tarot Celestial. Soy ${CENTRAL_NAME}, del central. ¿En qué te puedo ayudar hoy, cielo?`
        await addAndPersist('central', welcome, CENTRAL_NAME)
      }

      setLoading(false)
    }

    if (supabase) init()
    return () => timersRef.current.forEach(clearTimeout)
  }, [])

  useEffect(() => {
    if (!session?.id) return
    const messagesPoll = setInterval(() => fetchMessages(session.id), 3500)
    const readersPoll = setInterval(fetchReaders, 6000)
    const beat = setInterval(() => heartbeat(modeRef.current, activeReaderRef.current), 12000)

    return () => {
      clearInterval(messagesPoll)
      clearInterval(readersPoll)
      clearInterval(beat)
    }
  }, [session?.id])

  useEffect(() => {
    if (!session?.id) return

    const payload = () => JSON.stringify({
      sessionId: session.id,
      currentReaderName: activeReaderRef.current || null,
      mode: modeRef.current || 'central'
    })

    const onUnload = () => {
      if (unloadingRef.current) return
      unloadingRef.current = true
      try {
        navigator.sendBeacon('/api/session/close', payload())
      } catch {}
    }

    window.addEventListener('beforeunload', onUnload)
    window.addEventListener('pagehide', onUnload)

    return () => {
      window.removeEventListener('beforeunload', onUnload)
      window.removeEventListener('pagehide', onUnload)
    }
  }, [session?.id])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    if (shouldStickRef.current) {
      el.scrollTop = el.scrollHeight
    }
  }, [messages, typing])

  const onScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight
    shouldStickRef.current = distance < 80
  }

  const askAI = async (role, latestUserMessage, availableReadersList = []) => {
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          profileName: profile?.display_name || '',
          country: profile?.country || '',
          conversation: messages.slice(-12).map((m) => ({
            sender: m.sender || m.sender_name || 'system',
            text: m.text
          })),
          latestUserMessage,
          availableReaders: availableReadersList,
          memory: {
            ...memory,
            readerName: activeReaderRef.current,
            credits,
            freeQuestionUsed
          }
        })
      })

      const json = await res.json()
      if (!res.ok) return null

      return stripMarkdown(json.text || '')
    } catch {
      return null
    }
  }

  const chargeMainQuestion = async () => {
    if (!freeQuestionUsed) {
      await supabase.from('profiles').update({ free_question_used: true }).eq('id', profile.id)
      setFreeQuestionUsed(true)
      return true
    }

    if (credits <= 0) return false

    const newCredits = Math.max(credits - 1, 0)
    await supabase.from('profiles').update({ credits: newCredits }).eq('id', profile.id)
    setCredits(newCredits)
    return true
  }

  const beginTransfer = async (readerName, options = {}) => {
    const { skipCentralMessage = false } = options

    if (!skipCentralMessage) {
      await showTypingAndAnswer(
        'central',
        CENTRAL_NAME,
        `Vale cielo, te transfiero con ${readerName}. Un momento...`,
        1300
      )
    }

    queue(() => {
      setMode('connecting')
      setTyping('')
      setActiveReader(readerName)
      activeReaderRef.current = readerName
    }, skipCentralMessage ? 250 : 1200)

    const randomDelay = 2600 + Math.floor(Math.random() * 2600)

    queue(async () => {
      const currentSessionId = sessionRef.current?.id || session?.id

      const res = await fetch('/api/readers/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          readerName,
          profileId: profile.id,
          sessionId: currentSessionId
        })
      })
      const json = await res.json()

      if (!res.ok) {
        setMode('central')
        modeRef.current = 'central'
        setActiveReader(null)
        activeReaderRef.current = null
        await showTypingAndAnswer(
          'central',
          CENTRAL_NAME,
          `Cielo, justo ahora ${readerName} ha pasado a estar ocupada. Si quieres te recomiendo a otra de las que tengo libres en este momento.`,
          1400
        )
        await fetchReaders()
        return
      }

      resetVisibleConversation()
      setActiveReader(readerName)
      activeReaderRef.current = readerName
      setMode('reader')
      modeRef.current = 'reader'
      setPendingTransfer(null)
      setPriceQuoteOpen(false)
      setMemory((prev) => ({
        ...prev,
        readerStage: 'intro',
        lastReader: readerName,
        targetName: prev.targetName || '',
        targetSign: prev.targetSign || ''
      }))
      await fetchReaders()
      await heartbeat('reader', readerName)

      setTyping(`${readerName} está escribiendo...`)
      queue(async () => {
        setTyping('')
        await addAndPersist('reader', readerGreeting(readerName), readerName)
      }, 1800)
    }, (skipCentralMessage ? 250 : 1200) + randomDelay)
  }

  const releaseReader = async (readerNameOverride = null) => {
    const readerName = readerNameOverride || activeReaderRef.current
    const currentSessionId = sessionRef.current?.id || session?.id
    if (!readerName || !currentSessionId) return

    await fetch('/api/readers/release', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ readerName, sessionId: currentSessionId })
    })

    await fetch('/api/session/heartbeat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: currentSessionId,
        mode: 'central',
        currentReaderName: null
      })
    })

    activeReaderRef.current = null
    modeRef.current = 'central'
    await fetchReaders()
  }

  const answerCentral = async (text) => {
    const lower = normalizeText(text)
    const available = readers.filter((r) => r.status === 'Libre')
    const topic = topicFromText(text)

    setMemory((prev) => ({
      ...prev,
      topic: topic !== 'general' ? topic : prev.topic
    }))

    const selectedPack = detectPackSelection(text)
    if (selectedPack && (priceQuoteOpen || lower.includes('preguntas') || lower.includes('pack') || lower.includes('paquete'))) {
      const readerForPayment = pendingTransfer || (memory.topic && chooseReaderForTopic(memory.topic, available, memory.topic)?.name) || ''
      await beginCheckoutFlow(selectedPack, readerForPayment)
      return
    }

    if (
      pendingTransfer &&
      includesAny(lower, [
        'como sabes',
        'cómo sabes',
        'por que ella',
        'por qué ella',
        'por que me la recomiendas',
        'por qué me la recomiendas',
        'que tiene ella',
        'qué tiene ella'
      ])
    ) {
      const chosen = readers.find((r) => r.name === pendingTransfer)
      if (chosen) {
        await showTypingAndAnswer(
          'central',
          CENTRAL_NAME,
          `Porque por lo que me has contado, tu energía encaja más con la forma de mirar de ${chosen.name}. ${chosen.description} No te la estoy diciendo al azar, cielo. Si quieres, te paso con ella.`,
          1500
        )
        return
      }
    }

    const directReader = readers.find((r) =>
      lower.includes(normalizeText(r.name))
    )

    if (directReader && directReader.status === 'Libre') {
      setPendingTransfer(directReader.name)
      await showTypingAndAnswer(
        'central',
        CENTRAL_NAME,
        `Claro cielo, te paso ahora mismo con ${directReader.name}. Dame un instante.`,
        1200
      )
      await beginTransfer(directReader.name, { skipCentralMessage: true })
      return
    }

    if (directReader && directReader.status !== 'Libre') {
      await showTypingAndAnswer(
        'central',
        CENTRAL_NAME,
        `Cielo... justo ahora ${directReader.name} está ocupada, pero si quieres te aviso en cuanto se libere o te paso con alguien muy parecida.`,
        1400
      )
      return
    }

    if (lower.includes('quien tienes') || lower.includes('quién tienes')) {
      if (!available.length) {
        await showTypingAndAnswer(
          'central',
          CENTRAL_NAME,
          'Ahora mismo están todas ocupadas cielo... si quieres te aviso en cuanto se libere una.',
          1400
        )
        return
      }

      const names = available.map((r) => r.name).join(', ')
      await showTypingAndAnswer(
        'central',
        CENTRAL_NAME,
        `Ahora mismo tengo a ${names} disponibles. Si me dices un poco qué tema quieres mirar, te recomiendo la mejor para ti.`,
        1400
      )
      return
    }

    if (pendingTransfer && isAffirmative(text)) {
      await beginTransfer(pendingTransfer)
      return
    }

    if (pendingTransfer && isNegative(text)) {
      setPendingTransfer(null)
      await showTypingAndAnswer(
        'central',
        CENTRAL_NAME,
        'Claro cielo, no pasa nada. Dime qué prefieres y lo vemos juntas.',
        1200
      )
      return
    }

    if (lower.includes('precio') || lower.includes('credit') || lower.includes('pagar')) {
      const p = pricesForCountry(profile?.country || '')
      setPriceQuoteOpen(true)
      await showTypingAndAnswer(
        'central',
        CENTRAL_NAME,
        `Claro cielo, ahora mismo tienes 3 preguntas por ${p.p3}, 5 preguntas por ${p.p5} y 10 preguntas por ${p.p10}. Tú me dices cuál quieres y te abro el cobro seguro.`,
        1400
      )
      return
    }

    if (lower.includes('reserv') || lower.includes('cita')) {
      setReservationMode(true)
      await showTypingAndAnswer(
        'central',
        CENTRAL_NAME,
        'Claro cielo, te preparo la reserva. Elige tarotista, día y hora y yo me encargo de dejártela cerrada.',
        1300
      )
      return
    }

    if (!available.length) {
      await showTypingAndAnswer(
        'central',
        CENTRAL_NAME,
        'Ahora mismo están todas en consulta cielo... pero en breve se libera alguna. Si quieres te aviso.',
        1400
      )
      return
    }

    const chosenReader = chooseReaderForTopic(topic, available, text)
    const baseReply = buildControlledCentralReply({
      text,
      chosenReader
    })

    let reply = baseReply

    if (shouldUseAIForCentral(text)) {
      const ai = await askAI('central', text, available)
      if (ai && ai.length > 40 && chosenReader?.name) {
        reply = `${ai}\n\nDe todas formas, sinceramente, para lo tuyo te recomiendo a ${chosenReader.name}. Si quieres, te paso con ella.`
      }
    }

    if (chosenReader?.name) {
      setPendingTransfer(chosenReader.name)
    }

    setPriceQuoteOpen(false)
    await showTypingAndAnswer('central', CENTRAL_NAME, reply, 1700)
  }

  const answerReader = async (text) => {
    const stage = memory.readerStage || 'intro'
    const z = extractZodiac(text)
    const personName = extractName(text)

    if (z) {
      if (!memory.userSign) {
        setMemory((prev) => ({ ...prev, userSign: z }))
      } else if (!memory.targetSign) {
        setMemory((prev) => ({ ...prev, targetSign: z }))
      }
    }

    if (personName && !memory.targetName) {
      setMemory((prev) => ({ ...prev, targetName: personName }))
    }

    if (stage === 'intro') {
      setMemory((prev) => ({ ...prev, readerStage: 'awaiting-main' }))
      const ai = await askAI('reader', text)
      await showTypingAndAnswer(
        'reader',
        activeReaderRef.current,
        ai || 'Claro cielo, ya te sigo mejor. Cuéntame ahora la pregunta principal que quieres que te mire conmigo y lo vemos despacio.',
        2200
      )
      return
    }

    if (stage === 'awaiting-main') {
      if (!isMainQuestion(text)) {
        await showTypingAndAnswer(
          'reader',
          activeReaderRef.current,
          'Te sigo leyendo, cielo. Dame un poquito más de detalle para poder ver exactamente lo que quieres consultar.',
          1800
        )
        return
      }

      const allowed = await chargeMainQuestion()
      if (!allowed) {
        await releaseReader()
        setMode('central')
        setActiveReader(null)
        resetVisibleConversation()
        await showTypingAndAnswer(
          'central',
          CENTRAL_NAME,
          'Cielo, para seguir con la consulta necesito activarte créditos. Si quieres, te explico ahora mismo los paquetes y te vuelvo a pasar con tu tarotista.',
          1500
        )
        return
      }

      setMemory((prev) => ({ ...prev, readerStage: 'awaiting-target-sign' }))
      const ai = await askAI('reader', text)
      await showTypingAndAnswer(
        'reader',
        activeReaderRef.current,
        ai || `Vamos a mirarlo, cielo. ¿Sabes el horóscopo de ${memory.targetName || 'esa persona'}?`,
        2600
      )
      return
    }

    if (stage === 'awaiting-target-sign') {
      setMemory((prev) => ({ ...prev, readerStage: 'awaiting-card' }))
      await showTypingAndAnswer(
        'reader',
        activeReaderRef.current,
        'Perfecto cielo, dime ahora un número del 1 al 22 y elige izquierda, derecha o centro.',
        1900
      )
      return
    }

    if (stage === 'awaiting-card') {
      setMemory((prev) => ({ ...prev, readerStage: 'answer-given' }))
      const ai = await askAI('reader', text)
      await showTypingAndAnswer(
        'reader',
        activeReaderRef.current,
        ai || `Estoy haciendo la tirada, cielo... Dame un instante. Por lo que veo, ${memory.targetName || 'esa persona'} sí quiere volver, pero hay orgullo, bloqueo y una energía que todavía no termina de moverse como debería. No veo esto cerrado del todo.`,
        5200
      )
      return
    }

    if (stage === 'answer-given') {
      if (isFollowup(text)) {
        setMemory((prev) => ({ ...prev, readerStage: 'followup-used' }))
        const ai = await askAI('reader', text)
        await showTypingAndAnswer(
          'reader',
          activeReaderRef.current,
          ai || 'No cielo, lo que me marca la energía es que el movimiento viene más desde él que desde ti. Pero si quieres que profundicemos un poco más, ya necesitaríamos créditos para seguir con la consulta.',
          3200
        )
        return
      }
    }

    if (stage === 'followup-used') {
      return
    }
  }

  const submitReservation = async () => {
    if (!reservationReader || !reservationDay || !reservationTime) {
      alert('Selecciona tarotista, día y hora')
      return
    }

    const reservedFor = new Date(`${reservationDay}T${reservationTime}:00`).toISOString()

    const res = await fetch('/api/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profileId: profile.id,
        readerName: reservationReader,
        reservedFor,
        notes: reservationNote,
        email: profile.email || '',
        displayName: profile.display_name || ''
      })
    })
    const json = await res.json()
    if (!res.ok) {
      alert(json.error || 'No se pudo crear la reserva')
      return
    }

    setReservationMode(false)
    setReservationReader('')
    setReservationDay('')
    setReservationTime('')
    setReservationNote('')
    await showTypingAndAnswer(
      'central',
      CENTRAL_NAME,
      `Perfecto cielo, te he dejado la reserva confirmada con ${reservationReader}. ${json.emailSent ? 'Además te llegará un email automático de confirmación.' : 'La reserva ya queda guardada en el sistema.'}`,
      1300
    )
  }

  const handleSend = async () => {
    if (!input.trim() || mode === 'connecting') return

    const text = input.trim()
    await addAndPersist('client', text, profile?.display_name || 'Clienta')
    setInput('')

    if (mode === 'central') {
      await answerCentral(text)
      return
    }

    if (mode === 'reader') {
      await answerReader(text)
      return
    }
  }

  const handleBackToCentral = async () => {
    const currentReader = activeReaderRef.current

    if (currentReader) {
      await releaseReader(currentReader)
    }

    setTyping('')
    setPendingTransfer(null)
    setPriceQuoteOpen(false)
    setActiveReader(null)
    activeReaderRef.current = null
    setMode('central')
    modeRef.current = 'central'
    resetVisibleConversation()
    setMemory((prev) => ({
      ...prev,
      readerStage: 'intro',
      targetName: '',
      targetSign: ''
    }))
    await fetchReaders()
    await showTypingAndAnswer(
      'central',
      CENTRAL_NAME,
      `Hola ${profile.display_name}, ya estoy otra vez contigo. Dime qué necesitas y te ayudo encantada.`,
      1200
    )
  }

  const handleLogout = async () => {
    const currentSessionId = sessionRef.current?.id || session?.id
    if (activeReaderRef.current) {
      await releaseReader()
    }
    if (currentSessionId) {
      await fetch('/api/session/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: currentSessionId,
          currentReaderName: activeReaderRef.current || null,
          mode: modeRef.current || 'central'
        })
      })
    }
    await supabase.auth.signOut()
    window.location.href = '/auth/login'
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f5ff' }}>
        <div style={{ color: '#5b2c83', fontSize: 18 }}>Cargando Tarot Celestial...</div>
      </div>
    )
  }

  return (
    <main style={{ height: '100vh', overflow: 'hidden', background: 'linear-gradient(135deg, #f8f5ff, #fff8ef)', padding: 20, boxSizing: 'border-box' }}>
      <div style={{ maxWidth: 1380, height: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src="/logo.png" alt="Tarot Celestial" style={{ width: 54, height: 54, objectFit: 'contain' }} />
            <div>
              <div style={{ color: '#5b2c83', fontWeight: 800, fontSize: 22 }}>Tarot Celestial</div>
              <div style={{ color: '#8a6a2f', fontSize: 14 }}>Siempre a tu lado</div>
            </div>
          </div>
          <button onClick={handleLogout} style={{ border: '1px solid #d8c082', background: '#fff', color: '#6f3ea8', borderRadius: 12, padding: '10px 14px', cursor: 'pointer', fontWeight: 600 }}>
            Cerrar sesión
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '280px minmax(0,1fr) 280px', gap: 18, flex: 1, minHeight: 0 }}>
          <aside style={{ background: '#fff', borderRadius: 22, padding: 18, boxShadow: '0 12px 30px rgba(88, 41, 125, 0.08)', border: '1px solid #efe1bc', overflowY: 'auto' }}>
            <h3 style={{ color: '#5b2c83', marginTop: 0 }}>Tarotistas en línea</h3>
            <div style={{ display: 'grid', gap: 10 }}>
              {onlineReaders.map((reader) => (
                <button
                  key={reader.name}
                  disabled={reader.status !== 'Libre'}
                  onClick={async () => {
                    if (reader.status !== 'Libre') return
                    setPendingTransfer(reader.name)
                    await showTypingAndAnswer(
                      'central',
                      CENTRAL_NAME,
                      `Mira cielo, ahora mismo tengo libre a ${reader.name}, que ${reader.description}. Si quieres, te paso con ${reader.name}.`,
                      1400
                    )
                  }}
                  style={{
                    padding: 12,
                    borderRadius: 14,
                    background: '#faf7ff',
                    border: '1px solid #ece1ff',
                    textAlign: 'left',
                    cursor: reader.status === 'Libre' ? 'pointer' : 'default'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <strong style={{ color: '#4a2468' }}>{reader.name}</strong>
                    <span style={{ color: reader.status === 'Libre' ? '#1f8b4c' : '#c17a00', fontSize: 12, fontWeight: 700 }}>
                      {reader.status}
                    </span>
                  </div>
                  <div style={{ color: '#7a6690', fontSize: 13, marginTop: 4 }}>{reader.specialty}</div>
                </button>
              ))}
            </div>

            <h3 style={{ color: '#5b2c83', marginTop: 22 }}>Tarotistas offline</h3>
            <div style={{ display: 'grid', gap: 10 }}>
              {offlineReaders.map((reader) => (
                <div key={reader.name} style={{ padding: 12, borderRadius: 14, background: '#fffaf1', border: '1px solid #f1e1b8' }}>
                  <strong style={{ color: '#6d5832' }}>{reader.name}</strong>
                  <div style={{ color: '#8c7a58', fontSize: 13, marginTop: 4 }}>{reader.specialty}</div>
                </div>
              ))}
            </div>
          </aside>

          <section style={{ background: '#fff', borderRadius: 22, boxShadow: '0 12px 30px rgba(88, 41, 125, 0.08)', border: '1px solid #efe1bc', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ padding: 18, borderBottom: '1px solid #f1e7cd', flexShrink: 0 }}>
              <div style={{ color: '#5b2c83', fontWeight: 800, fontSize: 20 }}>
                {mode === 'reader' ? activeReader : mode === 'connecting' ? `Conectando con ${activeReader}...` : `${CENTRAL_NAME} · Central Tarot Celestial`}
              </div>
              <div style={{ color: '#8a6a2f', fontSize: 14 }}>
                {profile?.display_name ? `Atendiendo a ${profile.display_name}${profile.country ? ` · ${profile.country}` : ''}` : 'Atención personalizada'}
              </div>
            </div>

            {reservationMode && (
              <div style={{ padding: 18, borderBottom: '1px solid #f1e7cd', background: '#fffaf1', flexShrink: 0 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <select value={reservationReader} onChange={(e) => setReservationReader(e.target.value)} style={{ padding: 12, borderRadius: 12, border: '1px solid #dccca4' }}>
                    <option value="">Tarotista</option>
                    {READERS.map((reader) => <option key={reader.name} value={reader.name}>{reader.name}</option>)}
                  </select>
                  <input type="date" value={reservationDay} onChange={(e) => setReservationDay(e.target.value)} style={{ padding: 12, borderRadius: 12, border: '1px solid #dccca4' }} />
                  <input type="time" value={reservationTime} onChange={(e) => setReservationTime(e.target.value)} style={{ padding: 12, borderRadius: 12, border: '1px solid #dccca4' }} />
                </div>
                <textarea value={reservationNote} onChange={(e) => setReservationNote(e.target.value)} placeholder="Notas opcionales para la reserva" style={{ width: '100%', minHeight: 80, padding: 12, borderRadius: 12, border: '1px solid #dccca4', boxSizing: 'border-box', marginBottom: 10 }} />
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={submitReservation} style={{ padding: '12px 16px', borderRadius: 12, border: 'none', background: '#6f3ea8', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>Confirmar reserva</button>
                  <button onClick={() => setReservationMode(false)} style={{ padding: '12px 16px', borderRadius: 12, border: '1px solid #dccca4', background: '#fff', color: '#6f3ea8', fontWeight: 800, cursor: 'pointer' }}>Cancelar</button>
                </div>
              </div>
            )}

            <div ref={scrollRef} onScroll={onScroll} style={{ flex: 1, minHeight: 0, padding: 18, overflowY: 'auto', display: 'flex', flexDirection: 'column',  gap: 10 }}>
              {mode === 'connecting' ? (
                <div style={{ textAlign: 'center', color: '#8a6a2f', fontWeight: 700, marginTop: 10 }}>
                  Conectando con {activeReader}, un momento...
                </div>
              ) : (
                messages.map((m, idx) => {
  const isClient = m.sender === 'client'
  const senderLabel = isClient
    ? ''
    : m.sender_name || (m.sender === 'central' ? CENTRAL_NAME : activeReader || 'Tarotista')

  return (
    <div
      key={m.id || idx}
      style={{
        display: 'flex',
        justifyContent: isClient ? 'flex-end' : 'flex-start',
        paddingLeft: isClient ? 40 : 0,
        paddingRight: isClient ? 0 : 40
      }}
    >
      <div
        style={{
          display: 'inline-block',
          maxWidth: '420px',
          width: 'fit-content',
          padding: '12px 14px',
          borderRadius: isClient ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          background: isClient ? '#6f3ea8' : '#faf6ff',
          color: isClient ? '#fff' : '#4b2a67',
          border: isClient ? 'none' : '1px solid #eadcf8',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          lineHeight: 1.5,
          fontSize: 15,
          boxSizing: 'border-box',
          boxShadow: '0 4px 10px rgba(0,0,0,0.04)'
        }}
      >
        {!isClient && (
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#8a6a2f',
              marginBottom: 5
            }}
          >
            {String(senderLabel).toUpperCase()}
          </div>
        )}

        {m.text}
      </div>
    </div>
  )
})
              )}

              {!!typing && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{ background: '#faf6ff', border: '1px solid #eadcf8', borderRadius: 16, padding: '10px 14px', color: '#7a6690', maxWidth: 'min(440px, 82%)', width: 'fit-content', whiteSpace: 'pre-wrap', wordBreak: 'break-word', boxSizing: 'border-box' }}>
                    {typing}
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: 18, borderTop: '1px solid #f1e7cd', display: 'flex', gap: 12, flexShrink: 0 }}>
              <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder={mode === 'reader' ? 'Escribe tu consulta...' : 'Escribe aquí tu mensaje...'} style={{ flex: 1, padding: '14px 16px', borderRadius: 16, border: '1px solid #dccca4', outline: 'none' }} />
              <button onClick={handleSend} style={{ padding: '14px 18px', borderRadius: 16, border: 'none', background: '#6f3ea8', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Enviar</button>
            </div>
          </section>

          <aside style={{ background: '#fff', borderRadius: 22, padding: 18, boxShadow: '0 12px 30px rgba(88, 41, 125, 0.08)', border: '1px solid #efe1bc', overflowY: 'auto' }}>
            <h3 style={{ color: '#5b2c83', marginTop: 0 }}>Tus créditos</h3>
            <div style={{ padding: 16, borderRadius: 16, background: '#fffaf1', border: '1px solid #f0dfb2', marginBottom: 14 }}>
              <div style={{ color: '#8a6a2f', fontSize: 13 }}>Saldo actual</div>
              <div style={{ color: '#5b2c83', fontSize: 30, fontWeight: 800, marginTop: 4 }}>{credits}</div>
              <div style={{ color: '#8c7a58', fontSize: 13 }}>{freeQuestionUsed ? 'La consulta gratis ya está usada' : 'Incluye tu primera consulta gratuita'}</div>
            </div>

            <a href="/payment" style={{ display: 'block', textAlign: 'center', width: '100%', padding: '14px 16px', borderRadius: 14, background: '#d6ad45', color: '#fff', fontWeight: 800, cursor: 'pointer', marginBottom: 10, textDecoration: 'none', boxSizing: 'border-box' }}>
              Comprar créditos
            </a>

            <button onClick={handleBackToCentral} style={{ width: '100%', padding: '14px 16px', borderRadius: 14, border: '1px solid #dccca4', background: '#fff', color: '#6f3ea8', fontWeight: 800, cursor: 'pointer', marginBottom: 10 }}>
              Volver con el central
            </button>

            <button onClick={() => setReservationMode(true)} style={{ width: '100%', padding: '14px 16px', borderRadius: 14, border: '1px solid #dccca4', background: '#fff', color: '#6f3ea8', fontWeight: 800, cursor: 'pointer', marginBottom: 10 }}>
              Reservar consulta
            </button>

            <div style={{ padding: 14, borderRadius: 16, background: '#faf7ff', border: '1px solid #ece1ff' }}>
              <div style={{ color: '#5b2c83', fontWeight: 700, marginBottom: 8 }}>Ofertas de hoy</div>
              <div style={{ color: '#7a6690', fontSize: 14, lineHeight: 1.6 }}>
                3 preguntas por 3€<br />
                5 preguntas por 4,50€<br />
                10 preguntas por 7€
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}
