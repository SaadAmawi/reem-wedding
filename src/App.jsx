import { useEffect, useRef, useState } from 'react'
import './App.css'

const WEDDING_DATE = new Date(2026, 7, 22, 20, 0, 0) // Aug 22 2026, 8 PM

const toArabic = (n) =>
  String(n).padStart(2, '0').replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d])

const getTimeLeft = () => {
  const diff = WEDDING_DATE - Date.now()
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 }
  return {
    days:    Math.floor(diff / 86400000),
    hours:   Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000)  / 60000),
    seconds: Math.floor((diff % 60000)    / 1000),
  }
}

const introVideo      = '/Assets/Videos/Intro-Video.mp4'
const firstFrameImage = '/Assets/Images/intro-first-frame.jpg'
const flowerGif       = '/Assets/Images/flower.webp'
const bismillahImage  = '/Assets/Images/Bismillah.png'
const coupleNamesImage = '/Assets/Images/CoupleNames.png'
const paperImage      = '/Assets/Images/paper.png'
const treeImage       = '/Assets/Images/tree.png'
const hallImage       = '/Assets/Images/hall.png'

function App() {
  const videoRef = useRef(null)
  const isStartingRef = useRef(false)
  const durationRef = useRef(0)
  const finishTimerRef = useRef(null)
  const [hasStarted, setHasStarted] = useState(false)
  const [coverDone, setCoverDone] = useState(false)
  const [isFinished, setIsFinished] = useState(false)
  const [overlayGone, setOverlayGone] = useState(false)
  const [timeLeft, setTimeLeft] = useState(getTimeLeft)

  useEffect(() => {
    const id = setInterval(() => setTimeLeft(getTimeLeft()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!isFinished) return
    const reveal = (el) => el.classList.add('is-visible')
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) {
          reveal(e.target)
          observer.unobserve(e.target)
        }
      }),
      { threshold: 0.15 }
    )
    const els = document.querySelectorAll('[data-fade]')
    els.forEach((el) => observer.observe(el))

    // Safety net: IntersectionObserver intermittently fails to deliver the
    // initial callback on iOS Safari. Since every visible piece of the hero
    // starts at opacity:0, that failure leaves a blank page. If nothing has
    // been revealed shortly after the intro finishes, assume the observer is
    // dead and force everything visible so the invitation never stays blank.
    const fallback = setTimeout(() => {
      if (!document.querySelector('[data-fade].is-visible')) {
        els.forEach(reveal)
      }
    }, 1200)

    return () => {
      observer.disconnect()
      clearTimeout(fallback)
    }
  }, [isFinished])

  // Fallback: iOS Safari sometimes drops transitionend on fixed elements.
  // Force overlayGone after the transition duration so the overlay is cleaned up.
  useEffect(() => {
    if (!isFinished) return
    const id = setTimeout(() => setOverlayGone(true), 900)
    return () => clearTimeout(id)
  }, [isFinished])

  // Once finished, stop the video so iOS releases its compositing layer.
  // A still-playing/decoding fixed <video> is the main trigger for the
  // stale-paint "white box" left behind after the overlay is removed.
  useEffect(() => {
    if (!isFinished) return
    if (finishTimerRef.current) clearTimeout(finishTimerRef.current)
    const v = videoRef.current
    if (v) {
      try { v.pause() } catch { /* ignore */ }
    }
  }, [isFinished])

  // After the overlay is removed from the DOM, iOS Safari can leave a stale
  // paint of the old fixed video layer (the "white box" the content scrolls
  // behind). Force a repaint/recomposite so the content shows immediately
  // without the user having to scroll.
  useEffect(() => {
    if (!overlayGone) return
    const forceRepaint = () => {
      const el = document.querySelector('.invitation')
      if (el) {
        el.style.transform = 'translateZ(0)'
        // Read back layout to flush the change, then clear it next frame.
        void el.offsetHeight
        requestAnimationFrame(() => { el.style.transform = '' })
      }
      // A 1px scroll nudge reliably forces iOS to recomposite.
      window.scrollBy(0, 1)
      window.scrollBy(0, -1)
    }
    requestAnimationFrame(forceRepaint)
  }, [overlayGone])

  const startIntro = async () => {
    if (hasStarted || isFinished || isStartingRef.current || !videoRef.current) return
    isStartingRef.current = true
    setHasStarted(true)
    try {
      // Ensure muted is set on the element itself — React's `muted` prop is
      // not always reflected to the DOM, and iOS requires it for inline play.
      videoRef.current.muted = true
      await videoRef.current.play()
      // Guaranteed finish: iOS Safari can drop BOTH `ended` and `timeupdate`,
      // which would leave the intro overlay stuck on screen forever. Schedule a
      // hard finish based on the clip's duration (the media events fire first
      // in the normal case, and setIsFinished is idempotent).
      if (finishTimerRef.current) clearTimeout(finishTimerRef.current)
      const ms = (durationRef.current || 12) * 1000 + 1200
      finishTimerRef.current = setTimeout(() => setIsFinished(true), ms)
    } catch {
      setHasStarted(false)
    } finally {
      isStartingRef.current = false
    }
  }

  return (
    <>
      <main
        className={`invitation${isFinished ? ' invitation--visible' : ''}`}
        aria-label="دعوة زفاف"
      >
        {/* Real DOM element for the background so z-index is unambiguous */}
        <div className="invitation__bg" aria-hidden="true" />

        <section className="hero" aria-label="رسالة ترحيبية">
          <img
            key={overlayGone ? 'flower-playing' : 'flower-waiting'}
            className="hero__flower"
            src={flowerGif}
            alt=""
            aria-hidden="true"
          />
          <img
            className="hero__bismillah"
            src={bismillahImage}
            alt="بسم الله الرحمن الرحيم"
            data-fade
            style={{ transitionDelay: '0.4s' }}
          />
          <div className="hero__message" dir="rtl" lang="ar">
            <p className="hero__line hero__line--1" data-fade style={{ transitionDelay: '1.6s' }}>إلى من لامست قلوبهم شغاف قلوبنا</p>
            <p className="hero__line hero__line--2" data-fade style={{ transitionDelay: '2.8s' }}>اليوم نقاسمكم سرورنا و جميل شعورنا</p>
            <p className="hero__line hero__line--3" data-fade style={{ transitionDelay: '4s'   }}>صحبة العمر، أحباء الروح، بكل الحب</p>
          </div>
        </section>

        <section className="families" dir="rtl" lang="ar" aria-label="دعوة الأسر">
          <div className="families__text">
            <p className="families__honor"  data-fade style={{ transitionDelay: '0s' }}>تتشرف</p>
            <p className="families__name"   data-fade style={{ transitionDelay: '0.25s' }}>عائلة السيد/ أحمد حمزة الشمالي</p>
            <p className="families__and"    data-fade style={{ transitionDelay: '0.45s' }}>و</p>
            <p className="families__name"   data-fade style={{ transitionDelay: '0.65s' }}>عائلة السيد/ شهاب سالم الحبيلي</p>
            <p className="families__invite" data-fade style={{ transitionDelay: '0.85s' }}>بدعوتكم لحضور حفل زفاف نجليهما</p>
          </div>
          <img
            className="families__couple-img"
            src={coupleNamesImage}
            alt="شهاب و ريم"
            data-fade
            style={{ transitionDelay: '1.2s' }}
          />
        </section>

        <section className="venue" aria-label="تفاصيل الحفل">
          <div className="venue__paper">
            <img className="venue__paper-img" src={paperImage} alt="" aria-hidden="true" />
            <div className="venue__countdown" dir="rtl" lang="ar" aria-live="off">
              {[
                { value: timeLeft.days,    label: 'يوم'   },
                { value: timeLeft.hours,   label: 'ساعة'  },
                { value: timeLeft.minutes, label: 'دقيقة' },
                { value: timeLeft.seconds, label: 'ثانية' },
              ].map(({ value, label }) => (
                <div className="venue__countdown-unit" key={label}>
                  <span className="venue__countdown-number">{toArabic(value)}</span>
                  <span className="venue__countdown-label">{label}</span>
                </div>
              ))}
            </div>
          </div>
          <img className="venue__tree" src={treeImage} alt="" aria-hidden="true" />

          <div className="venue__content">
            <p className="venue__blessing" dir="rtl" lang="ar" data-fade>
              و ذلك بمشيئة الله تعالى
            </p>
            <div className="venue__details" data-fade style={{ transitionDelay: '0.35s' }}>
              <div className="venue__detail">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.8" aria-hidden="true">
                  <path d="M12 21s-8-6.5-8-12a8 8 0 1 1 16 0c0 5.5-8 12-8 12z"/>
                  <circle cx="12" cy="9" r="2.5"/>
                </svg>
                <span>Al lesaili halls</span>
              </div>
              <div className="venue__detail">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.8" aria-hidden="true">
                  <rect x="3" y="4" width="18" height="18" rx="2"/>
                  <line x1="3" y1="9" x2="21" y2="9"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8"  y1="14" x2="8"  y2="14" strokeLinecap="round" strokeWidth="2"/>
                  <line x1="12" y1="14" x2="12" y2="14" strokeLinecap="round" strokeWidth="2"/>
                  <line x1="16" y1="14" x2="16" y2="14" strokeLinecap="round" strokeWidth="2"/>
                  <line x1="8"  y1="18" x2="8"  y2="18" strokeLinecap="round" strokeWidth="2"/>
                  <line x1="12" y1="18" x2="12" y2="18" strokeLinecap="round" strokeWidth="2"/>
                </svg>
                <span>22.8.2026</span>
              </div>
              <div className="venue__detail">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.8" aria-hidden="true">
                  <circle cx="12" cy="12" r="9"/>
                  <polyline points="12,7 12,12 15.5,14.5"/>
                </svg>
                <span>08:00 – 12:00 pm</span>
              </div>
            </div>
          </div>

          <img
            className="venue__hall"
            src={hallImage}
            alt="قاعة الليسيلي"
            data-fade
            style={{ transitionDelay: '0s' }}
          />
        </section>
      </main>

      {!overlayGone && (
        <div
          className={`intro${isFinished ? ' intro--fading' : ''}`}
          role="button"
          tabIndex={0}
          onClick={startIntro}
          onPointerUp={startIntro}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              startIntro()
            }
          }}
          onTransitionEnd={(e) => {
            // Guard against events that bubble up from child elements (e.g. the cover image).
            // Only remove the overlay when the overlay's OWN opacity transition completes.
            if (e.propertyName === 'opacity' && e.target === e.currentTarget) {
              setOverlayGone(true)
            }
          }}
          aria-label="تشغيل فيديو دعوة الزفاف"
        >
          <video
            ref={videoRef}
            className="intro__video"
            src={introVideo}
            preload="auto"
            onLoadedMetadata={(e) => {
              durationRef.current = e.currentTarget.duration || 0
              if (videoRef.current) videoRef.current.currentTime = 0.001
            }}
            playsInline
            muted
            disablePictureInPicture
            controls={false}
            onEnded={() => setIsFinished(true)}
            onTimeUpdate={(e) => {
              // Fallback for iOS Safari, where the `ended` event is frequently
              // dropped for inline videos. Treat "reached the last frame" as
              // finished. setIsFinished is idempotent, so onEnded firing too
              // is harmless.
              const v = e.currentTarget
              if (v.duration && v.currentTime >= v.duration - 0.25) {
                setIsFinished(true)
              }
            }}
          />
          {!coverDone && (
            <img
              className={`intro__cover${hasStarted ? ' intro__cover--hidden' : ''}`}
              src={firstFrameImage}
              alt=""
              aria-hidden="true"
              onTransitionEnd={() => setCoverDone(true)}
            />
          )}
        </div>
      )}
    </>
  )
}

export default App
