import { useEffect, useRef, useState } from 'react'
import { Pause, Play, RotateCcw, Sun, ZoomIn } from 'lucide-react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import {
  apply,
  bodyToInertialMatrix,
  dateToJD,
  moonVectorJ2000,
  sunVectorJ2000,
  transpose,
} from '@/lib/astro'
import { fmtCoord, fmtPct } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Site, SiteMetrics } from '@/types'

type Theme = 'light' | 'dark'

type LiveState = {
  sites: Site[]
  metricsById: Map<string, SiteMetrics>
  selectedIds: string[]
  hoverId: string | null
  pinMode: boolean
  theme: Theme
  onHover: (id: string | null) => void
  onOpen: (id: string) => void
  onPickCoord?: (lat: number, lon: number) => void
}

type GlobeApi = {
  reset: () => void
  focusSites: () => void
  focusSite: (id: string) => void
  applyTheme: (theme: Theme) => void
  rebuildMarkers: (sites: Site[]) => void
}

type Marker = {
  site: Site
  group: THREE.Group
  dot: THREE.Sprite
  ring: THREE.Sprite
  halo: THREE.Sprite
  hit: THREE.Mesh
  world: THREE.Vector3
  dotPx: number
  ringPx: number
  haloPx: number
  ringAlpha: number
  haloAlpha: number
}

const MARKER_RADIUS = 1.012
const VIEW_FILL = 0.9

function latLonToDirection(lat: number, lon: number): THREE.Vector3 {
  const theta = THREE.MathUtils.degToRad(90 - lat)
  const lambda = THREE.MathUtils.degToRad(lon)
  const sinTheta = Math.sin(theta)
  return new THREE.Vector3(
    sinTheta * Math.cos(lambda),
    Math.cos(theta),
    -sinTheta * Math.sin(lambda),
  )
}

function makeDotTexture(): THREE.CanvasTexture {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const center = size / 2
    const fill = ctx.createRadialGradient(center - 5, center - 6, 1, center, center, 24)
    fill.addColorStop(0, 'rgba(255,255,255,1)')
    fill.addColorStop(0.65, 'rgba(255,255,255,1)')
    fill.addColorStop(0.9, 'rgba(255,255,255,0.88)')
    fill.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = fill
    ctx.beginPath()
    ctx.arc(center, center, 24, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = 'rgba(0,0,0,0.3)'
    ctx.lineWidth = 2.2
    ctx.beginPath()
    ctx.arc(center, center, 21.7, 0, Math.PI * 2)
    ctx.stroke()

    const glow = ctx.createRadialGradient(center - 6, center - 7, 0, center - 6, center - 7, 15)
    glow.addColorStop(0, 'rgba(255,255,255,0.9)')
    glow.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.globalCompositeOperation = 'source-atop'
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(center, center, 22, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalCompositeOperation = 'source-over'
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

function makeRingTexture(): THREE.CanvasTexture {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const center = size / 2
    ctx.strokeStyle = 'rgba(255,255,255,0.98)'
    ctx.lineWidth = 2.8
    ctx.shadowColor = 'rgba(255,255,255,0.75)'
    ctx.shadowBlur = 5
    ctx.beginPath()
    ctx.arc(center, center, 23.5, 0, Math.PI * 2)
    ctx.stroke()
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

function makeHaloTexture(): THREE.CanvasTexture {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const center = size / 2
    const glow = ctx.createRadialGradient(center, center, 1, center, center, 31)
    glow.addColorStop(0, 'rgba(255,255,255,0.9)')
    glow.addColorStop(0.22, 'rgba(255,255,255,0.42)')
    glow.addColorStop(0.55, 'rgba(255,255,255,0.1)')
    glow.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, size, size)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

function fitDistance(aspect: number, fov: number): number {
  const halfV = THREE.MathUtils.degToRad(fov) / 2
  const halfH = Math.atan(Math.tan(halfV) * aspect)
  const half = Math.min(halfV, halfH) * VIEW_FILL
  return THREE.MathUtils.clamp(1 / Math.sin(half), 2.2, 8.5)
}

function orientationForSites(sites: Site[]): THREE.Quaternion {
  const direction = new THREE.Vector3()
  for (const site of sites) direction.add(latLonToDirection(site.lat, site.lon))
  if (direction.lengthSq() < 1e-6) direction.set(0, -1, 0)
  direction.normalize()
  const target = new THREE.Vector3(0.045, 0.025, 1).normalize()
  return new THREE.Quaternion().setFromUnitVectors(direction, target)
}

export function MoonGlobe({
  sites,
  metricsById,
  selectedIds,
  hoverId,
  focusId,
  scenarioStartIso,
  pinMode = false,
  theme,
  onHover,
  onOpen,
  onPickCoord,
}: {
  sites: Site[]
  metricsById: Map<string, SiteMetrics>
  selectedIds: string[]
  hoverId: string | null
  focusId?: string | null
  scenarioStartIso?: string
  pinMode?: boolean
  theme: 'light' | 'dark'
  onHover: (id: string | null) => void
  onOpen: (id: string) => void
  onPickCoord?: (lat: number, lon: number) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const apiRef = useRef<GlobeApi | null>(null)
  const liveRef = useRef<LiveState>({
    sites,
    metricsById,
    selectedIds,
    hoverId,
    pinMode,
    theme,
    onHover,
    onOpen,
    onPickCoord,
  })
  const liveSunRef = useRef(false)
  const sunDirectionRef = useRef(new THREE.Vector3(0, 0, 1))
  const siteListRef = useRef(sites)
  const autoRotateRef = useRef(false)

  const [loading, setLoading] = useState(true)
  const [textureFailed, setTextureFailed] = useState(false)
  const [renderFailed, setRenderFailed] = useState(false)
  const [stageHoverId, setStageHoverId] = useState<string | null>(null)
  const [autoRotate, setAutoRotate] = useState(false)
  const [liveSun, setLiveSun] = useState(false)

  useEffect(() => {
    liveSunRef.current = liveSun
  }, [liveSun])

  useEffect(() => {
    try {
      const jd = dateToJD(new Date(scenarioStartIso ?? Date.now()))
      const rt = transpose(bodyToInertialMatrix(jd))
      const sun = apply(rt, sunVectorJ2000(jd))
      const moon = apply(rt, moonVectorJ2000(jd))
      sunDirectionRef.current
        .set(sun[0] - moon[0], sun[2] - moon[2], -(sun[1] - moon[1]))
        .normalize()
    } catch {
      sunDirectionRef.current.set(0.4, 0.2, 1).normalize()
    }
  }, [scenarioStartIso])

  useEffect(() => {
    liveRef.current = {
      sites,
      metricsById,
      selectedIds,
      hoverId,
      pinMode,
      theme,
      onHover,
      onOpen,
      onPickCoord,
    }
  })

  useEffect(() => {
    if (siteListRef.current === sites) return
    siteListRef.current = sites
    apiRef.current?.rebuildMarkers(sites)
  }, [sites])

  useEffect(() => {
    autoRotateRef.current = autoRotate
  }, [autoRotate])

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    let disposed = false
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      })
    } catch {
      setLoading(false)
      setRenderFailed(true)
      return
    }

    setLoading(true)
    setTextureFailed(false)

    renderer.setClearColor(0x000000, 0)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 0.96

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(38, 4 / 3, 0.1, 80)
    camera.position.set(0, 0, 3.7)

    const controls = new OrbitControls(camera, canvas)
    controls.enablePan = false
    controls.enableDamping = true
    controls.dampingFactor = 0.065
    controls.rotateSpeed = 0.7
    controls.zoomSpeed = 0.8
    controls.minDistance = 1.18
    controls.maxDistance = 9
    controls.minPolarAngle = 0.12
    controls.maxPolarAngle = Math.PI - 0.12
    controls.target.set(0, 0, 0)
    controls.update()

    let themeNow = liveRef.current.theme
    let hasInteracted = false

    const moonRoot = new THREE.Group()
    const spin = new THREE.Group()
    moonRoot.add(spin)
    scene.add(moonRoot)
    moonRoot.quaternion.copy(orientationForSites(liveRef.current.sites))

    const moonMaterial = new THREE.MeshStandardMaterial({
      color: themeNow === 'dark' ? 0x454a54 : 0xa5a099,
      roughness: 0.96,
      metalness: 0,
    })
    const moonGeometry = new THREE.SphereGeometry(1, 96, 64)
    const moon = new THREE.Mesh(moonGeometry, moonMaterial)
    spin.add(moon)

    const graticuleGeometries: THREE.BufferGeometry[] = []
    const graticuleMaterial = new THREE.LineBasicMaterial({
      color: themeNow === 'dark' ? 0x9ecbff : 0x446a99,
      transparent: true,
      opacity: themeNow === 'dark' ? 0.24 : 0.2,
      depthWrite: false,
    })
    for (const lat of [-80, -85, -88]) {
      const points: THREE.Vector3[] = []
      for (let lon = 0; lon <= 360; lon += 2) {
        points.push(latLonToDirection(lat, lon).multiplyScalar(1.003))
      }
      const geometry = new THREE.BufferGeometry().setFromPoints(points)
      graticuleGeometries.push(geometry)
      spin.add(new THREE.LineLoop(geometry, graticuleMaterial))
    }
    for (const lon of [0, 90, 180, 270]) {
      const points: THREE.Vector3[] = []
      for (let lat = -80; lat >= -90; lat -= 1) {
        points.push(latLonToDirection(lat, lon).multiplyScalar(1.003))
      }
      const geometry = new THREE.BufferGeometry().setFromPoints(points)
      graticuleGeometries.push(geometry)
      spin.add(new THREE.Line(geometry, graticuleMaterial))
    }

    const ambient = new THREE.AmbientLight(0xe8edff, 0.3)
    scene.add(ambient)
    const fill = new THREE.HemisphereLight(0xd3ddff, 0x171a21, 0.45)
    scene.add(fill)
    const sun = new THREE.DirectionalLight(0xfff2df, 2.2)
    scene.add(sun)
    scene.add(sun.target)

    const rimMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(0x91b4ff) },
        uOpacity: { value: themeNow === 'dark' ? 0.34 : 0 },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewDirection;
        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vNormal = normalize(normalMatrix * normal);
          vViewDirection = normalize(-mvPosition.xyz);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uOpacity;
        varying vec3 vNormal;
        varying vec3 vViewDirection;
        void main() {
          float rim = pow(1.0 - clamp(dot(normalize(vNormal), normalize(vViewDirection)), 0.0, 1.0), 3.0);
          gl_FragColor = vec4(uColor, rim * uOpacity);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true,
    })
    const rimGeometry = new THREE.SphereGeometry(1.004, 64, 48)
    const rim = new THREE.Mesh(rimGeometry, rimMaterial)
    rim.renderOrder = 1
    scene.add(rim)

    const starGeometry = new THREE.BufferGeometry()
    const starPositions = new Float32Array(240 * 3)
    for (let i = 0; i < 240; i++) {
      const radius = 14 + Math.random() * 18
      const theta = Math.random() * Math.PI * 2
      const z = Math.random() * 2 - 1
      const ring = Math.sqrt(1 - z * z)
      starPositions[i * 3] = radius * ring * Math.cos(theta)
      starPositions[i * 3 + 1] = radius * z
      starPositions[i * 3 + 2] = radius * ring * Math.sin(theta)
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3))
    const starMaterial = new THREE.PointsMaterial({
      color: 0xc4d2f2,
      size: 1.35,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      toneMapped: false,
    })
    const stars = new THREE.Points(starGeometry, starMaterial)
    stars.visible = themeNow === 'dark'
    stars.renderOrder = -1
    scene.add(stars)

    const dotTexture = makeDotTexture()
    const ringTexture = makeRingTexture()
    const haloTexture = makeHaloTexture()
    const hitGeometry = new THREE.SphereGeometry(1, 12, 8)
    const hitMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
      depthTest: false,
      colorWrite: false,
    })

    let markers: Marker[] = []
    let hitMeshes: THREE.Mesh[] = []
    const markerForHit = new Map<THREE.Object3D, Marker>()
    let hoveredId: string | null = null

    const applyHover = (id: string | null) => {
      if (hoveredId === id) return
      hoveredId = id
      setStageHoverId(id)
      liveRef.current.onHover(id)
    }

    const disposeMarkers = () => {
      for (const marker of markers) {
        spin.remove(marker.group)
        marker.dot.material.dispose()
        marker.ring.material.dispose()
        marker.halo.material.dispose()
        marker.group.clear()
      }
      markers = []
      hitMeshes = []
      markerForHit.clear()
    }

    const rebuildMarkers = (nextSites: Site[]) => {
      applyHover(null)
      disposeMarkers()
      moonRoot.quaternion.copy(orientationForSites(nextSites))

      for (const site of nextSites) {
        const position = latLonToDirection(site.lat, site.lon).multiplyScalar(MARKER_RADIUS)
        const group = new THREE.Group()
        group.position.copy(position)

        const dot = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: dotTexture,
            color: new THREE.Color(site.color),
            transparent: true,
            depthTest: true,
            depthWrite: false,
            toneMapped: false,
          }),
        )
        const ring = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: ringTexture,
            color: 0xffffff,
            transparent: true,
            depthTest: true,
            depthWrite: false,
            toneMapped: false,
          }),
        )
        const halo = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: haloTexture,
            color: new THREE.Color(site.color),
            transparent: true,
            depthTest: true,
            depthWrite: false,
            toneMapped: false,
          }),
        )
        const hit = new THREE.Mesh(hitGeometry, hitMaterial)
        hit.scale.setScalar(0.04)
        ring.visible = false
        halo.visible = false

        group.add(halo, ring, dot, hit)
        spin.add(group)

        const marker: Marker = {
          site,
          group,
          dot,
          ring,
          halo,
          hit,
          world: position.clone(),
          dotPx: 12,
          ringPx: 0,
          haloPx: 0,
          ringAlpha: 0,
          haloAlpha: 0,
        }
        markers.push(marker)
        hitMeshes.push(hit)
        markerForHit.set(hit, marker)
      }
    }
    rebuildMarkers(liveRef.current.sites)

    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2(2, 2)
    const cameraDir = new THREE.Vector3()
    const markerNormal = new THREE.Vector3()
    const projected = new THREE.Vector3()
    let pointerInside = false
    let dragging = false

    const pickMarker = (): Marker | null => {
      if (!pointerInside) return null
      scene.updateMatrixWorld(true)
      raycaster.setFromCamera(pointer, camera)
      const markerHits = raycaster.intersectObjects(hitMeshes, false)
      if (markerHits.length === 0) return null
      const moonHits = raycaster.intersectObject(moon, false)
      const moonDistance = moonHits.length > 0 ? moonHits[0].distance : Number.POSITIVE_INFINITY
      cameraDir.copy(camera.position).normalize()
      const horizon = 1 / camera.position.length()
      const halfWidth = container.clientWidth / 2
      const halfHeight = container.clientHeight / 2
      let closest: Marker | null = null
      let closestDistance = Number.POSITIVE_INFINITY

      for (const hit of markerHits) {
        // Markers sit just above the surface, so on the near side their hit
        // distance is slightly larger than the Moon intersection. Only reject
        // hits that are clearly behind the globe.
        if (hit.distance > moonDistance + 0.06) continue
        const marker = markerForHit.get(hit.object)
        if (!marker) continue
        markerNormal.copy(marker.world).normalize()
        if (markerNormal.dot(cameraDir) <= horizon + 0.003) continue
        projected.copy(marker.world).project(camera)
        const dx = (projected.x - pointer.x) * halfWidth
        const dy = (projected.y - pointer.y) * halfHeight
        const distance = dx * dx + dy * dy
        if (distance < closestDistance) {
          closest = marker
          closestDistance = distance
        }
      }
      return closest
    }

    let moonTexture: THREE.Texture | null = null
    const textureLoader = new THREE.TextureLoader()
    textureLoader.load(
      `${import.meta.env.BASE_URL}data/moon-2k.jpg`,
      (texture) => {
        if (disposed) {
          texture.dispose()
          return
        }
        texture.colorSpace = THREE.SRGBColorSpace
        texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
        texture.wrapS = THREE.RepeatWrapping
        texture.needsUpdate = true
        moonTexture = texture
        moonMaterial.map = texture
        moonMaterial.color.set(0xffffff)
        moonMaterial.needsUpdate = true
        setLoading(false)
      },
      undefined,
      () => {
        if (disposed) return
        setLoading(false)
        setTextureFailed(true)
        moonMaterial.color.set(themeNow === 'dark' ? 0x454a54 : 0xa5a099)
      },
    )

    const applyTheme = (nextTheme: Theme) => {
      themeNow = nextTheme
      stars.visible = nextTheme === 'dark'
      rim.visible = nextTheme === 'dark'
      const opacity = rimMaterial.uniforms.uOpacity
      if (opacity) opacity.value = nextTheme === 'dark' ? 0.34 : 0
      graticuleMaterial.color.set(nextTheme === 'dark' ? 0x9ecbff : 0x446a99)
      graticuleMaterial.opacity = nextTheme === 'dark' ? 0.24 : 0.2
      if (!moonMaterial.map) {
        moonMaterial.color.set(nextTheme === 'dark' ? 0x454a54 : 0xa5a099)
      }
    }
    applyTheme(themeNow)

    const spherical = new THREE.Spherical()
    let resetTween: { from: THREE.Vector3; to: THREE.Vector3; start: number } | null = null

    const reset = () => {
      hasInteracted = false
      resetTween = {
        from: camera.position.clone(),
        to: new THREE.Vector3(0, 0, fitDistance(camera.aspect, camera.fov)),
        start: performance.now(),
      }
      controls.target.set(0, 0, 0)
    }

    const focusSites = () => {
      hasInteracted = true
      resetTween = {
        from: camera.position.clone(),
        to: new THREE.Vector3(
          0,
          0,
          Math.max(controls.minDistance, fitDistance(camera.aspect, camera.fov) * 0.46),
        ),
        start: performance.now(),
      }
      controls.target.set(0, 0, 0)
    }

    const focusSite = (id: string) => {
      const marker = markers.find((item) => item.site.id === id)
      if (!marker) return
      hasInteracted = true
      const target = marker.group.getWorldPosition(new THREE.Vector3()).normalize().multiplyScalar(1.3)
      resetTween = {
        from: camera.position.clone(),
        to: target,
        start: performance.now(),
      }
      controls.target.set(0, 0, 0)
    }

    apiRef.current = { reset, focusSites, focusSite, applyTheme, rebuildMarkers }

    const resize = () => {
      const width = container.clientWidth
      const height = container.clientHeight
      if (width === 0 || height === 0) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      if (renderer.domElement.width !== Math.round(width * dpr) || renderer.domElement.height !== Math.round(height * dpr)) {
        renderer.setPixelRatio(dpr)
        renderer.setSize(width, height, false)
      }
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      if (!hasInteracted) {
        camera.position.set(0, 0, fitDistance(camera.aspect, camera.fov))
        controls.update()
      }
    }

    const observer = new ResizeObserver(resize)
    observer.observe(container)
    window.addEventListener('resize', resize)
    resize()

    const updatePointer = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return
      pointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      )
    }

    let dragStartX = 0
    let dragStartY = 0
    let dragMoved = false
    let pointerDown = false

    const onPointerDown = (event: PointerEvent) => {
      hasInteracted = true
      if (event.button !== 0 && event.pointerType === 'mouse') return
      pointerDown = true
      dragMoved = false
      dragging = true
      dragStartX = event.clientX
      dragStartY = event.clientY
      resetTween = null
      updatePointer(event)
      canvas.focus({ preventScroll: true })
    }

    const onPointerMove = (event: PointerEvent) => {
      pointerInside = true
      updatePointer(event)
      if (!pointerDown) return
      if (Math.hypot(event.clientX - dragStartX, event.clientY - dragStartY) > 5) {
        dragMoved = true
      }
    }

    const onPointerUp = (event: PointerEvent) => {
      if (!pointerDown) return
      pointerDown = false
      dragging = false
      updatePointer(event)
      if (dragMoved) return
      const onPickCoord = liveRef.current.onPickCoord
      const pinRequested = (liveRef.current.pinMode || event.shiftKey) && Boolean(onPickCoord)
      if (pinRequested && onPickCoord) {
        scene.updateMatrixWorld(true)
        raycaster.setFromCamera(pointer, camera)
        const hit = raycaster.intersectObject(moon, false)[0]
        if (hit) {
          const local = spin.worldToLocal(hit.point.clone()).normalize()
          const lat = (Math.asin(Math.max(-1, Math.min(1, local.y))) * 180) / Math.PI
          const lon = (Math.atan2(-local.z, local.x) * 180) / Math.PI
          if (lat <= -80.15) {
            onPickCoord(lat, lon)
            return
          }
        }
      }
      const marker = pickMarker()
      if (marker) liveRef.current.onOpen(marker.site.id)
    }

    const onPointerCancel = () => {
      pointerDown = false
      dragging = false
    }

    const onPointerEnter = () => {
      pointerInside = true
    }

    const onPointerLeave = () => {
      pointerInside = false
      pointer.set(2, 2)
      applyHover(null)
    }

    const onWheel = () => {
      hasInteracted = true
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const step = THREE.MathUtils.degToRad(6)
      spherical.setFromVector3(camera.position)
      let handled = true

      switch (event.key) {
        case 'ArrowLeft':
          spherical.theta -= step
          break
        case 'ArrowRight':
          spherical.theta += step
          break
        case 'ArrowUp':
          spherical.phi = Math.max(0.15, spherical.phi - step)
          break
        case 'ArrowDown':
          spherical.phi = Math.min(Math.PI - 0.15, spherical.phi + step)
          break
        case '+':
        case '=':
          spherical.radius = Math.max(controls.minDistance, spherical.radius * 0.9)
          break
        case '-':
        case '_':
          spherical.radius = Math.min(controls.maxDistance, spherical.radius * 1.1)
          break
        case 'r':
        case 'R':
        case 'Home':
          reset()
          return
        default:
          handled = false
      }

      if (!handled) return
      event.preventDefault()
      hasInteracted = true
      camera.position.setFromSpherical(spherical)
      controls.update()
    }

    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerup', onPointerUp)
    canvas.addEventListener('pointercancel', onPointerCancel)
    canvas.addEventListener('pointerenter', onPointerEnter)
    canvas.addEventListener('pointerleave', onPointerLeave)
    canvas.addEventListener('wheel', onWheel, { passive: true })
    canvas.addEventListener('keydown', onKeyDown)

    const timer = new THREE.Timer()
    let spinVelocity = 0
    let cursor = ''
    let raf = 0
    const selectedSet = new Set<string>()
    const lightOffset = new THREE.Vector3()
    const tooltipProjection = new THREE.Vector3()

    const setCursor = (next: string) => {
      if (next === cursor) return
      cursor = next
      canvas.style.cursor = next
    }

    const animate = () => {
      raf = requestAnimationFrame(animate)
      timer.update()
      const delta = Math.min(timer.getDelta(), 0.05)

      if (resetTween) {
        const progress = Math.min(1, (performance.now() - resetTween.start) / 620)
        const eased = 1 - Math.pow(1 - progress, 3)
        camera.position.lerpVectors(resetTween.from, resetTween.to, eased)
        if (progress >= 1) resetTween = null
      }

      controls.update()

      const externalHover = liveRef.current.hoverId
      const canSpin =
        autoRotateRef.current &&
        !dragging &&
        !hoveredId &&
        !externalHover &&
        !resetTween
      const targetVelocity = canSpin ? 0.045 : 0
      spinVelocity += (targetVelocity - spinVelocity) * Math.min(1, delta * 4)
      spin.rotation.y += spinVelocity * delta

      if (liveSunRef.current) {
        sun.position
          .copy(sunDirectionRef.current)
          .applyQuaternion(moonRoot.quaternion)
          .multiplyScalar(5)
      } else {
        lightOffset.set(-2.4, 1.5, 1.8).applyQuaternion(camera.quaternion)
        sun.position.copy(camera.position).add(lightOffset)
      }

      scene.updateMatrixWorld(true)

      selectedSet.clear()
      for (const id of liveRef.current.selectedIds) selectedSet.add(id)

      const viewportHeight = Math.max(1, container.clientHeight)
      const tanHalfFov = Math.tan(THREE.MathUtils.degToRad(camera.fov) * 0.5)
      const ease = 1 - Math.exp(-delta * 15)

      for (const marker of markers) {
        const selected = selectedSet.has(marker.site.id)
        const highlighted = hoveredId === marker.site.id || externalHover === marker.site.id
        const selectedBoost = selected ? 1 : 0
        const hoverBoost = highlighted ? 1 : 0

        const targetDot = 12 + selectedBoost * 6 + hoverBoost * 4
        const targetRing = selected ? 29 + hoverBoost * 4 : 0
        const targetHalo = highlighted ? 62 : selected ? 38 : 0

        marker.dotPx += (targetDot - marker.dotPx) * ease
        marker.ringPx += (targetRing - marker.ringPx) * ease
        marker.haloPx += (targetHalo - marker.haloPx) * ease
        marker.ringAlpha += ((selected ? 0.95 : 0) - marker.ringAlpha) * ease
        marker.haloAlpha += ((highlighted ? 0.75 : selected ? 0.32 : 0) - marker.haloAlpha) * ease

        marker.group.getWorldPosition(marker.world)
        const distance = camera.position.distanceTo(marker.world)
        const worldPerPx = (2 * distance * tanHalfFov) / viewportHeight

        marker.dot.scale.setScalar(Math.max(0.0001, worldPerPx * marker.dotPx))
        marker.ring.scale.setScalar(Math.max(0.0001, worldPerPx * marker.ringPx))
        marker.halo.scale.setScalar(Math.max(0.0001, worldPerPx * marker.haloPx))
        marker.hit.scale.setScalar(Math.max(0.012, worldPerPx * 18))

        marker.ring.visible = marker.ringPx > 0.4
        marker.halo.visible = marker.haloPx > 0.8 && marker.haloAlpha > 0.01
        marker.ring.material.opacity = marker.ringAlpha
        marker.halo.material.opacity = marker.haloAlpha

        const order = highlighted ? 30 : selected ? 20 : 10
        marker.halo.renderOrder = order
        marker.ring.renderOrder = order + 1
        marker.dot.renderOrder = order + 2
      }

      scene.updateMatrixWorld(true)

      if (pointerInside) {
        const marker = pickMarker()
        applyHover(marker ? marker.site.id : null)
      } else {
        applyHover(null)
      }

      const tooltip = tooltipRef.current
      if (tooltip && hoveredId) {
        const marker = markers.find((item) => item.site.id === hoveredId)
        if (marker) {
          tooltipProjection.copy(marker.world).project(camera)
          const width = container.clientWidth
          const height = container.clientHeight
          const projectedX = (tooltipProjection.x * 0.5 + 0.5) * width
          const projectedY = (-tooltipProjection.y * 0.5 + 0.5) * height
          const tooltipWidth = tooltip.offsetWidth || 176
          const tooltipHeight = tooltip.offsetHeight || 92
          tooltip.style.left = `${THREE.MathUtils.clamp(
            projectedX,
            tooltipWidth / 2 + 8,
            Math.max(tooltipWidth / 2 + 8, width - tooltipWidth / 2 - 8),
          )}px`
          tooltip.style.top = `${THREE.MathUtils.clamp(
            projectedY - 18,
            tooltipHeight + 10,
            Math.max(tooltipHeight + 10, height - 10),
          )}px`
          tooltip.style.opacity = '1'
        }
      }

      setCursor(hoveredId ? 'pointer' : dragging ? 'grabbing' : 'grab')
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      observer.disconnect()
      window.removeEventListener('resize', resize)
      controls.dispose()
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('pointercancel', onPointerCancel)
      canvas.removeEventListener('pointerenter', onPointerEnter)
      canvas.removeEventListener('pointerleave', onPointerLeave)
      canvas.removeEventListener('wheel', onWheel)
      canvas.removeEventListener('keydown', onKeyDown)
      apiRef.current = null
      disposeMarkers()
      dotTexture.dispose()
      ringTexture.dispose()
      haloTexture.dispose()
      hitGeometry.dispose()
      hitMaterial.dispose()
      starGeometry.dispose()
      starMaterial.dispose()
      rimGeometry.dispose()
      rimMaterial.dispose()
      for (const geometry of graticuleGeometries) geometry.dispose()
      graticuleMaterial.dispose()
      moonGeometry.dispose()
      moonMaterial.dispose()
      moonTexture?.dispose()
      timer.dispose()
      renderer.dispose()
    }
  }, [])

  useEffect(() => {
    apiRef.current?.applyTheme(theme)
  }, [theme])

  useEffect(() => {
    if (focusId) apiRef.current?.focusSite(focusId)
  }, [focusId, sites])

  const dark = theme === 'dark'
  const hoveredSite = stageHoverId ? sites.find((site) => site.id === stageHoverId) : undefined
  const hoveredMetrics = hoveredSite ? metricsById.get(hoveredSite.id) : undefined
  const hoveredSelected = hoveredSite ? selectedIds.includes(hoveredSite.id) : false
  const focusedSite = focusId ? sites.find((site) => site.id === focusId) : undefined

  const controlButton = cn(
    'inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 font-mono text-[8.5px] font-medium tracking-[0.1em] uppercase transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-ring',
    dark ? 'text-white/60 hover:bg-white/10 hover:text-white' : 'text-foreground/55 hover:bg-black/[0.05] hover:text-foreground',
  )
  const activeControl = dark
    ? 'bg-white/15 text-white ring-1 ring-white/20'
    : 'bg-foreground/[0.08] text-foreground ring-1 ring-black/10'

  return (
    <div
      ref={containerRef}
      aria-busy={loading}
      className={cn(
        'relative isolate min-h-[420px] w-full overflow-hidden rounded-2xl border border-border shadow-[var(--shadow-card)]',
        dark ? 'text-white' : 'text-foreground',
      )}
      style={{
        aspectRatio: '1 / 1',
        background: dark
          ? 'radial-gradient(125% 105% at 50% 38%, #172030 0%, #0a0c12 47%, #050608 100%)'
          : 'radial-gradient(125% 105% at 50% 38%, #ffffff 0%, #f3f0ea 52%, #e5e0d6 100%)',
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 aspect-square h-[88%] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background: dark
            ? 'radial-gradient(circle, rgba(111,146,255,0.12) 0%, rgba(111,146,255,0.035) 46%, transparent 68%)'
            : 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 64%)',
        }}
      />

      <canvas
        ref={canvasRef}
        tabIndex={0}
        role="img"
        aria-label={`Interactive 3D Moon globe centered on the lunar south polar region with ${sites.length} sites. Drag to rotate, scroll or pinch to zoom; use the arrow keys to orbit and plus or minus to zoom.`}
        className="absolute inset-0 z-10 size-full touch-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-ring"
      />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[14] bg-[radial-gradient(120%_90%_at_50%_42%,transparent_58%,rgba(0,0,0,0.28)_100%)]"
      />
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-x-0 top-0 z-[15] h-24 bg-gradient-to-b to-transparent',
          dark ? 'from-[#050608]/70 via-[#050608]/15' : 'from-[#f3f0ea]/80 via-[#f3f0ea]/20',
        )}
      />
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-x-0 bottom-0 z-[15] h-20 bg-gradient-to-t to-transparent',
          dark ? 'from-[#050608]/65 via-[#050608]/12' : 'from-[#f3f0ea]/75 via-[#f3f0ea]/18',
        )}
      />

      <div className="pointer-events-none absolute left-4 top-4 z-20 select-none">
        <p
          className={cn(
            'flex items-center gap-2 font-mono text-[10px] font-medium uppercase tracking-[0.22em]',
            dark ? 'text-white/60' : 'text-foreground/55',
          )}
        >
          <span className="size-1.5 rounded-full bg-[var(--sun)]" aria-hidden />
          South pole view
        </p>
        <p
          className={cn(
            'tabular mt-1.5 font-mono text-[9px] tracking-[0.08em]',
            dark ? 'text-white/32' : 'text-foreground/35',
          )}
        >
          {sites.length} CURATED SITES · LOLA + LROC
        </p>
      </div>

      {/* Hairline corner ticks */}
      <div aria-hidden className="pointer-events-none absolute inset-3 z-20 hidden sm:block">
        <span className={cn('absolute left-0 top-0 size-3 border-l border-t', dark ? 'border-white/20' : 'border-black/15')} />
        <span className={cn('absolute right-0 top-0 size-3 border-r border-t', dark ? 'border-white/20' : 'border-black/15')} />
        <span className={cn('absolute bottom-0 left-0 size-3 border-b border-l', dark ? 'border-white/20' : 'border-black/15')} />
        <span className={cn('absolute bottom-0 right-0 size-3 border-b border-r', dark ? 'border-white/20' : 'border-black/15')} />
      </div>

      <div
        className={cn(
          'absolute right-3 top-3 z-20 flex items-center gap-0.5 rounded-full border p-1 shadow-[0_8px_28px_-12px_rgba(0,0,0,0.5)] backdrop-blur-md',
          dark ? 'border-white/10 bg-black/30' : 'border-black/[0.06] bg-white/60',
        )}
      >
        <button
          type="button"
          onClick={() => apiRef.current?.reset()}
          aria-label="Reset view to the south pole"
          title="Reset view"
          className={controlButton}
        >
          <RotateCcw className="size-3" />
          <span className="hidden sm:inline">Reset</span>
        </button>
        <span className={cn('h-4 w-px', dark ? 'bg-white/10' : 'bg-black/10')} />
        <button
          type="button"
          onClick={() => apiRef.current?.focusSites()}
          aria-label="Zoom in on the curated south-pole sites"
          title="Focus sites"
          className={controlButton}
        >
          <ZoomIn className="size-3" />
          <span className="hidden sm:inline">Focus</span>
        </button>
        <span className={cn('h-4 w-px', dark ? 'bg-white/10' : 'bg-black/10')} />
        <button
          type="button"
          onClick={() => setLiveSun((value) => !value)}
          aria-pressed={liveSun}
          aria-label="Toggle real solar illumination"
          title="Use the actual Sun direction for the scenario"
          className={cn(controlButton, liveSun ? activeControl : undefined)}
        >
          <Sun className="size-3" />
          <span className="hidden sm:inline">Live sun</span>
        </button>
        <span className={cn('h-4 w-px', dark ? 'bg-white/10' : 'bg-black/10')} />
        <button
          type="button"
          onClick={() => setAutoRotate((value) => !value)}
          aria-pressed={autoRotate}
          aria-label={autoRotate ? 'Pause auto-rotation' : 'Start auto-rotation'}
          title={autoRotate ? 'Pause auto-rotation' : 'Start auto-rotation'}
          className={cn(controlButton, autoRotate ? activeControl : undefined)}
        >
          {autoRotate ? <Pause className="size-3" /> : <Play className="size-3" />}
          <span className="hidden sm:inline">Auto</span>
        </button>
      </div>

      {focusedSite && (
        <div
          className={cn(
            'absolute bottom-11 left-4 z-20 flex items-center gap-2 rounded-full border py-1.5 pl-2.5 pr-1.5 shadow-lg backdrop-blur-md',
            dark ? 'border-white/12 bg-black/50 text-white' : 'border-black/8 bg-white/85 text-foreground',
          )}
        >
          <span
            className="size-2 shrink-0 rounded-full ring-1 ring-black/10 dark:ring-white/25"
            style={{ backgroundColor: focusedSite.color }}
          />
          <span className="max-w-[170px] truncate text-[10.5px] font-medium tracking-[-0.01em]">{focusedSite.shortName}</span>
          <span className={cn('font-mono text-[7.5px] uppercase tracking-[0.14em]', dark ? 'text-white/40' : 'text-foreground/45')}>
            Focused
          </span>
          <button
            type="button"
            onClick={() => onOpen(focusedSite.id)}
            className={cn(
              'rounded-full px-2 py-0.5 text-[9px] font-medium underline-offset-2 transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-ring motion-reduce:transition-none',
              dark ? 'bg-white/10 text-white/75 hover:text-white' : 'bg-foreground/[0.06] text-foreground/70 hover:text-foreground',
            )}
          >
            Open
          </button>
        </div>
      )}

      <div
        className={cn(
          'pointer-events-none absolute bottom-3 left-4 z-20 select-none font-mono text-[9px] tracking-[0.06em]',
          dark ? 'text-white/40' : 'text-foreground/45',
        )}
      >
        Drag to rotate · scroll to zoom
      </div>
      <div
        className={cn(
          'pointer-events-none absolute bottom-3 right-4 z-20 hidden select-none font-mono text-[8px] tracking-[0.08em] sm:block',
          dark ? 'text-white/30' : 'text-foreground/35',
        )}
      >
        NASA SVS · CGI MOON KIT · 2K
      </div>

      {loading && !renderFailed && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none absolute inset-0 z-20 grid place-items-center"
        >
          <div
            className={cn(
              'flex items-center gap-2.5 rounded-full border px-3.5 py-2 font-mono text-[9px] tracking-[0.12em] uppercase backdrop-blur-md',
              dark
                ? 'border-white/10 bg-black/40 text-white/65'
                : 'border-black/[0.06] bg-white/75 text-foreground/60',
            )}
          >
            <span
              className={cn(
                'size-3 animate-spin rounded-full border motion-reduce:animate-none',
                dark ? 'border-white/20 border-t-white/80' : 'border-black/15 border-t-foreground/70',
              )}
            />
            Loading lunar basemap
          </div>
        </div>
      )}

      {textureFailed && !renderFailed && (
        <div className="pointer-events-none absolute inset-x-0 bottom-12 z-20 flex justify-center px-4">
          <div
            className={cn(
              'flex items-center gap-2 rounded-full border px-2.5 py-1 font-mono text-[8px] tracking-[0.08em] uppercase backdrop-blur-md',
              dark
                ? 'border-white/10 bg-black/45 text-white/60'
                : 'border-black/[0.06] bg-white/80 text-foreground/60',
            )}
          >
            <span className="size-1.5 rounded-full bg-[var(--sun)]" aria-hidden />
            Basemap unavailable · schematic globe
          </div>
        </div>
      )}

      {renderFailed && (
        <div className="absolute inset-0 z-20 grid place-items-center px-6 text-center">
          <div className="max-w-xs rounded-2xl border border-border bg-card/80 p-5 backdrop-blur">
            <p className="text-[12.5px] font-semibold tracking-[-0.01em]">3D view unavailable</p>
            <p className={cn('mt-1.5 text-[10.5px] leading-relaxed', dark ? 'text-white/55' : 'text-foreground/60')}>
              This browser could not create a WebGL context. Site data is still available in the list.
            </p>
          </div>
        </div>
      )}

      {hoveredSite && (
        <div
          ref={tooltipRef}
          aria-hidden
          style={{ opacity: 0 }}
          className="pointer-events-none absolute z-30 w-52 -translate-x-1/2 -translate-y-full rounded-2xl border border-white/12 bg-[#0b0d12]/94 p-3 text-white shadow-[0_20px_60px_-16px_rgba(0,0,0,0.7)] backdrop-blur-md transition-opacity duration-150 motion-reduce:transition-none"
        >
          <div className="flex items-center gap-1.5">
            <span
              className={cn('size-2 shrink-0 rounded-full ring-1 ring-white/30', hoveredSelected && 'ring-2 ring-white/80')}
              style={{ backgroundColor: hoveredSite.color }}
            />
            <span className="truncate text-[11.5px] font-semibold tracking-[-0.01em]">
              {hoveredSite.shortName}
            </span>
          </div>
          <div className="tabular mt-0.5 font-mono text-[8px] tracking-[0.08em] text-white/45">
            {fmtCoord(hoveredSite.lat, hoveredSite.lon)}
          </div>
          <div className="tabular mt-2 grid grid-cols-2 gap-2 border-t border-white/10 pt-2">
            <div>
              <div className="font-mono text-[8px] uppercase tracking-[0.14em] text-white/35">
                Sunlight
              </div>
              <div className="mt-0.5 font-mono text-[12px] text-[#c98212]">
                {fmtPct(hoveredMetrics?.sunlightPct ?? Number.NaN)}
              </div>
            </div>
            <div>
              <div className="font-mono text-[8px] uppercase tracking-[0.14em] text-white/35">
                Earth vis.
              </div>
              <div className="mt-0.5 font-mono text-[12px] text-[#4f8fd8]">
                {fmtPct(hoveredMetrics?.earthPct ?? Number.NaN)}
              </div>
            </div>
          </div>
          <div className="mt-2 font-mono text-[8px] uppercase tracking-[0.16em] text-white/30">
            Click to open analysis
          </div>
        </div>
      )}
    </div>
  )
}
