import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { cn } from '@/lib/utils'

/**
 * Lightweight auto-rotating 3D Moon for the landing hero. Same NASA LROC
 * texture as the explorer globe, real directional lighting with a true
 * day/night terminator, tilted so the south pole tips toward the viewer.
 * Decorative - no controls, no markers.
 */
export function HeroMoonGlobe({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    } catch {
      setFailed(true)
      return
    }

    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    renderer.setClearColor(0x000000, 0)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 0.92

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50)
    camera.position.set(0, 0.1, 4.2)

    const tilt = new THREE.Group()
    tilt.rotation.x = -0.42
    tilt.rotation.z = 0.08
    scene.add(tilt)
    const spin = new THREE.Group()
    spin.rotation.y = 2.4
    tilt.add(spin)

    const material = new THREE.MeshStandardMaterial({
      color: 0xb9bcc2,
      roughness: 0.96,
      metalness: 0,
    })
    const geometry = new THREE.SphereGeometry(1, 96, 64)
    const moon = new THREE.Mesh(geometry, material)
    spin.add(moon)

    scene.add(new THREE.AmbientLight(0xdfe8ff, 0.2))
    const fill = new THREE.HemisphereLight(0xcfd9f2, 0x0a0c12, 0.4)
    scene.add(fill)
    const sun = new THREE.DirectionalLight(0xfff1dc, 2.3)
    sun.position.set(-2.2, 1.0, 2.6)
    scene.add(sun)
    const rim = new THREE.DirectionalLight(0x8ab8ff, 0.9)
    rim.position.set(2.4, -0.6, -1.8)
    scene.add(rim)

    let texture: THREE.Texture | null = null
    let disposed = false
    new THREE.TextureLoader().load(
      `${import.meta.env.BASE_URL}data/moon-2k.jpg`,
      (loaded) => {
        if (disposed) {
          loaded.dispose()
          return
        }
        loaded.colorSpace = THREE.SRGBColorSpace
        loaded.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
        texture = loaded
        material.map = loaded
        material.color.set(0xffffff)
        material.needsUpdate = true
      },
      undefined,
      () => {
        if (!disposed) {
          material.color.set(0x9aa0a8)
        }
      },
    )

    const resize = () => {
      const size = container.clientWidth
      if (size === 0) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      renderer.setPixelRatio(dpr)
      renderer.setSize(size, size, false)
      camera.aspect = 1
      camera.updateProjectionMatrix()
    }
    const observer = new ResizeObserver(resize)
    observer.observe(container)
    resize()

    let visible = true
    const visibility = new IntersectionObserver(
      ([entry]) => {
        visible = Boolean(entry?.isIntersecting)
      },
      { threshold: 0.02 },
    )
    visibility.observe(container)

    const clock = new THREE.Clock()
    let raf = 0
    const animate = () => {
      raf = window.requestAnimationFrame(animate)
      const delta = Math.min(clock.getDelta(), 0.05)
      if (!reduced && visible && !document.hidden) {
        spin.rotation.y += delta * 0.07
      }
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      disposed = true
      window.cancelAnimationFrame(raf)
      observer.disconnect()
      visibility.disconnect()
      geometry.dispose()
      material.dispose()
      texture?.dispose()
      renderer.dispose()
    }
  }, [])

  return (
    <div ref={containerRef} className={cn('relative aspect-square w-full', className)}>
      {!failed ? (
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="absolute inset-0 block size-full"
        />
      ) : (
        <img
          src={`${import.meta.env.BASE_URL}data/hero-moon.webp`}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 size-full rounded-full object-cover"
        />
      )}
    </div>
  )
}
