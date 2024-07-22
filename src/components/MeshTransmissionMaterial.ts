import * as THREE from 'three'
import React from 'react'
import { useRef, useState, forwardRef, createElement } from 'react'
import { extend, useFrame } from '@react-three/fiber'
import { useFBO, MeshDiscardMaterial } from '@react-three/drei'

import transmissionBaseVertex from '@/shaders/transmission-base-vertex.glsl'
import transmissionReplaceVertex from '@/shaders/transmission-replace-vertex.glsl'

import transmissionHeadFragment from '@/shaders/trasnmission-head-fragment.glsl'
import transmissionParsFragment from '@/shaders/transmission-pars-fragment.glsl'
import transmissionFragment from '@/shaders/transmission-fragment.glsl'

import { Object3DNode } from '@react-three/fiber'

declare module '@react-three/fiber' {
  interface ThreeElements {
    meshTransmissionMaterial: Object3DNode<
      MeshTransmissionMaterialImpl,
      typeof MeshTransmissionMaterialImpl
    >
  }
}

interface ExtendedShader extends THREE.Shader {
  defines: { [key: string]: any }
}

class MeshTransmissionMaterialImpl extends THREE.MeshPhysicalMaterial {
  private uniforms: {
    chromaticAberration: { value: number }
    transmission: { value: number }
    _transmission: { value: number }
    transmissionMap: { value: THREE.Texture | null }
    roughness: { value: number }
    thickness: { value: number }
    thicknessMap: { value: THREE.Texture | null }
    attenuationDistance: { value: number }
    attenuationColor: { value: THREE.Color }
    anisotropicBlur: { value: number }
    time: { value: number }
    distortion: { value: number }
    distortionScale: { value: number }
    temporalDistortion: { value: number }
    buffer: { value: THREE.Texture | null }
    uDisplace: { value: boolean }
    uFrequency: { value: number }
    uAmplitude: { value: number }
  }

  public time: number = 0

  public buffer: THREE.Texture | null = null

  private anisotropy = 0

  constructor(samples = 6, transmissionSampler = false) {
    super()

    this.uniforms = {
      chromaticAberration: { value: 0.05 },
      // Transmission must always be 0, unless transmissionSampler is being used
      transmission: { value: 0 },
      // Instead a workaround is used, see below for reasons why
      _transmission: { value: 1 },
      transmissionMap: { value: null },
      // Roughness is 1 in THREE.MeshPhysicalMaterial but it makes little sense in a transmission material
      roughness: { value: 0 },
      thickness: { value: 0 },
      thicknessMap: { value: null },
      attenuationDistance: { value: Infinity },
      attenuationColor: { value: new THREE.Color('white') },
      anisotropicBlur: { value: 0.1 },
      time: { value: 0 },
      distortion: { value: 0.0 },
      distortionScale: { value: 0.5 },
      temporalDistortion: { value: 0.0 },
      buffer: { value: null },
      uDisplace: { value: true },
      uFrequency: { value: 0.5 },
      uAmplitude: { value: 0.25 },
    }

    this.onBeforeCompile = (shader: ExtendedShader) => {
      shader.uniforms = {
        ...shader.uniforms,
        ...this.uniforms,
      }

      // Fix for r153-r156 anisotropy chunks
      // https://github.com/mrdoob/three.js/pull/26716
      if (this.anisotropy > 0) shader.defines.USE_ANISOTROPY = ''

      // If the transmission sampler is active inject a flag
      if (transmissionSampler) shader.defines.USE_SAMPLER = ''
      // Otherwise we do use use .transmission and must therefore force USE_TRANSMISSION
      // because threejs won't inject it for us
      else shader.defines.USE_TRANSMISSION = ''

      // Head
      shader.fragmentShader = transmissionHeadFragment + shader.fragmentShader

      // Remove transmission
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <transmission_pars_fragment>',
        transmissionParsFragment,
      )

      // Add refraction
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <transmission_fragment>',
        transmissionFragment,
      )

      shader.vertexShader = transmissionBaseVertex + shader.vertexShader

      shader.vertexShader = shader.vertexShader.replace(
        '#include <clipping_planes_vertex>',
        transmissionReplaceVertex,
      )
    }

    Object.keys(this.uniforms).forEach((name) =>
      Object.defineProperty(this, name as keyof typeof this.uniforms, {
        get: () => this.uniforms[name as keyof typeof this.uniforms].value,
        set: (v) =>
          (this.uniforms[name as keyof typeof this.uniforms].value = v),
      }),
    )
    // Object.entries(this.uniforms).forEach(([name, uniform]) =>
    //   Object.defineProperty(this, name, {
    //     get: () => uniform.value,
    //     set: (v) => (uniform.value = v),
    //   }),
    // )
  }
}

interface MeshTransmissionMaterialProps {
  buffer?: THREE.Texture
  transmissionSampler?: boolean
  backside?: boolean
  side?: THREE.Side
  transmission?: number
  thickness?: number
  backsideThickness?: number
  samples?: number
  resolution: number
  backsideResolution?: number
  background?: THREE.Color | THREE.Texture
  anisotropy?: number
  anisotropicBlur?: number
  uDisplace?: boolean
  uFrequency?: number
  uAmplitude?: number
}

extend({ MeshTransmissionMaterial: MeshTransmissionMaterialImpl })

export const MeshTransmissionMaterial = forwardRef(
  (
    {
      buffer,
      transmissionSampler = false,
      backside = false,
      side = THREE.FrontSide,
      transmission = 1,
      thickness = 0,
      backsideThickness = 0,
      samples = 10,
      resolution,
      backsideResolution,
      background,
      anisotropy,
      anisotropicBlur,
      uDisplace,
      uFrequency,
      uAmplitude,
      ...props
    }: MeshTransmissionMaterialProps,
    fref,
  ) => {
    const ref = useRef<MeshTransmissionMaterialImpl>(null)

    const [discardMaterial] = useState(() => createElement(MeshDiscardMaterial))

    const fboBack = useFBO(backsideResolution || resolution)
    const fboMain = useFBO(resolution)

    let oldBg
    let oldTone
    let parent

    useFrame((state) => {
      if (ref.current) {
        ref.current.time = state.clock.getElapsedTime()
        // Render only if the buffer matches the built-in and no transmission sampler is set
        if (ref.current.buffer === fboMain.texture && !transmissionSampler) {
          parent = (ref.current as any).__r3f.parent
          if (parent) {
            // Save defaults
            oldTone = state.gl.toneMapping
            oldBg = state.scene.background

            // Switch off tonemapping lest it double tone maps
            // Save the current background and set the HDR as the new BG
            // Use discardmaterial, the parent will be invisible, but it's shadows will still be cast
            state.gl.toneMapping = THREE.NoToneMapping
            if (background) state.scene.background = background
            parent.material = discardMaterial

            if (backside) {
              // Render into the backside buffer
              state.gl.setRenderTarget(fboBack)
              state.gl.render(state.scene, state.camera)
              // And now prepare the material for the main render using the backside buffer
              parent.material = ref.current

              parent.material.buffer = fboBack.texture
              parent.material.thickness = backsideThickness
              parent.material.side = THREE.BackSide
            }

            // Render into the main buffer
            state.gl.setRenderTarget(fboMain)
            state.gl.render(state.scene, state.camera)

            parent.material = ref.current
            parent.material.thickness = thickness
            parent.material.side = side
            parent.material.buffer = fboMain.texture

            // Set old state back
            state.scene.background = oldBg
            state.gl.setRenderTarget(null)
            state.gl.toneMapping = oldTone
          }
        }
      }
    })

    // Forward ref
    React.useImperativeHandle(fref, () => ref.current, [])

    return (
      <meshTransmissionMaterial
        // Samples must re-compile the shader so we memoize it
        args={[samples, transmissionSampler]}
        ref={ref}
        {...props}
        buffer={buffer || fboMain.texture}
        // @ts-ignore
        _transmission={transmission}
        // In order for this to not incur extra cost "transmission" must be set to 0 and treated as a reserved prop.
        // This is because THREE.WebGLRenderer will check for transmission > 0 and execute extra renders.
        // The exception is when transmissionSampler is set, in which case we are using three's built in sampler.
        anisotropicBlur={anisotropicBlur ?? anisotropy}
        transmission={transmissionSampler ? transmission : 0}
        thickness={thickness}
        side={side}
      />
    )
  },
)

MeshTransmissionMaterial.displayName = 'MeshTransmissionMaterial'
