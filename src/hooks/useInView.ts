import { useState, useEffect, useRef } from 'react'
import type { RefObject } from 'react'

export function useInView<T extends Element>(options?: IntersectionObserverInit): [RefObject<T | null>, boolean] {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    if (!ref.current) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      options
    )
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [ref, options])

  return [ref, inView]
}
