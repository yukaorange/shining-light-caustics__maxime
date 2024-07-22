import {
  OrbitControls,
  Environment,
  MeshTransmissionMaterial,
  SpotLight,
  useFBO,
  meshBounds,
} from '@react-three/drei'

import NormalMaterial from './NormalMaterial'

import * as THREE from 'three'
import { useControls } from 'leva'

import { forwardRef, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'

import { FullScreenQuad } from 'three-stdlib'

import CausticsComputeMaterial from './CausticsComputeMaterial'
import CausticsPlaneMaterial from './CausticsPlaneMaterial'

import { Logger } from 'sass'

const config = {
  backsideThickness: 0.3,
  thickness: 25,
  samples: 6,
  transmission: 0.9,
  clearcoat: 1,
  clearcoatRoughness: 0.5,
  chromaticAberration: 1.5,
  anisotropy: 0.2,
  roughness: 0,
  distortion: 0,
  distortionScale: 0.09,
  temporalDistortion: 0,
  ior: 1.5,
  color: '#ffffff',
}

const SphereGeometry = forwardRef<THREE.Mesh, JSX.IntrinsicElements['mesh']>(
  (props, ref) => {
    return (
      <mesh ref={ref} scale={2} position={[0, 6.5, 0]}>
        <sphereGeometry />
        <MeshTransmissionMaterial backside {...config} />
      </mesh>
    )
  },
)

const TorusGeometry = forwardRef<THREE.Mesh, JSX.IntrinsicElements['mesh']>(
  (props, ref) => {
    return (
      <mesh ref={ref} scale={0.3} position={[0, 6.5, 0]}>
        <torusKnotGeometry args={[10, 3, 600, 160]} />
        <MeshTransmissionMaterial backside {...config} />
      </mesh>
    )
  },
)

export const Caustics = (): JSX.Element => {
  const mesh = useRef<THREE.Mesh>(null)
  const causticsPlane = useRef<THREE.Mesh>(null)
  const spotlightRef = useRef<THREE.SpotLight>(null)

  const {
    light,
    intensity,
    chromaticAberration,
    rotate,

    geometry,
  } = useControls({
    light: {
      value: { x: -10, y: 13, z: -10 },
    },
    geometry: {
      value: 'Torus',
      options: ['Sphere', 'Torus'],
    },
    intensity: {
      value: 1.5,
      step: 0.01,
      min: 0,
      max: 10.0,
    },
    chromaticAberration: {
      value: 0.16,
      step: 0.001,
      min: 0,
      max: 0.4,
    },
    rotate: {
      value: true,
    },
  })

  const TargetMesh = useMemo(() => {
    switch (geometry) {
      case 'sphere':
        return SphereGeometry
      case 'torus':
        return TorusGeometry
      default:
        return TorusGeometry
    }
  }, [geometry])

  const normalRenderTarget = useFBO(2000, 2000, {})

  const [normalCamera] = useState(() => {
    return new THREE.PerspectiveCamera(65, 1, 0.1, 1000)
  })

  const [normalMaterial] = useState(() => {
    return new NormalMaterial()
  })

  const causticsComputeRenderTarget = useFBO(2000, 2000, {})

  const [causticsComputedMaterial] = useState(() => {
    return new CausticsComputeMaterial()
  })

  const [causticQuad] = useState(() => {
    return new FullScreenQuad(causticsComputedMaterial)
  })

  const [causticsPlaneMaterial] = useState(() => {
    return new CausticsPlaneMaterial()
  })

  causticsPlaneMaterial.transparent = true
  causticsPlaneMaterial.blending = THREE.CustomBlending
  causticsPlaneMaterial.blendSrc = THREE.OneFactor
  causticsPlaneMaterial.blendDst = THREE.SrcAlphaFactor

  useFrame((state) => {
    const { gl, clock, camera } = state

    camera.lookAt(0, 0, 0)

    if (mesh.current) {
      const bounds = new THREE.Box3().setFromObject(mesh.current, true)

      let boundsVertices = [] as THREE.Vector3[]

      boundsVertices.push(
        new THREE.Vector3(bounds.min.x, bounds.min.y, bounds.min.z),
      )
      boundsVertices.push(
        new THREE.Vector3(bounds.min.x, bounds.min.y, bounds.max.z),
      )
      boundsVertices.push(
        new THREE.Vector3(bounds.min.x, bounds.max.y, bounds.min.z),
      )
      boundsVertices.push(
        new THREE.Vector3(bounds.min.x, bounds.max.y, bounds.max.z),
      )
      boundsVertices.push(
        new THREE.Vector3(bounds.max.x, bounds.min.y, bounds.min.z),
      )

      boundsVertices.push(
        new THREE.Vector3(bounds.max.x, bounds.min.y, bounds.max.z),
      )
      boundsVertices.push(
        new THREE.Vector3(bounds.max.x, bounds.max.y, bounds.min.z),
      )
      boundsVertices.push(
        new THREE.Vector3(bounds.max.x, bounds.max.y, bounds.max.z),
      )

      const lightDir = new THREE.Vector3(light.x, light.y, light.z).normalize()

      normalCamera.position.set(light.x, light.y, light.z)

      // Calculates the projected coordinates of the vertices onto the plane. perpendicular to the light direction
      const projectedCoordinates = boundsVertices.map((vertex) => {
        const newX = vertex.x + lightDir.x * (-vertex.y / lightDir.y)
        const newY = vertex.y + lightDir.y * (-vertex.y / lightDir.y)
        const newZ = vertex.z + lightDir.z * (-vertex.y / lightDir.y)

        return new THREE.Vector3(newX, newY, newZ)
      })

      // Calculates the combined spatial coordinates of the projected vertices and divides by the number of vertices to get the center position
      const centerPos = projectedCoordinates
        .reduce((a, b) => a.add(b), new THREE.Vector3(0, 0, 0))
        .divideScalar(projectedCoordinates.length)

      // Calculates the scale of the caustic plane based on the distance of thefurthest vertex from the center (using euclidean distance)
      const scale = projectedCoordinates
        .map((p) =>
          Math.sqrt(
            Math.pow(p.x - centerPos.x, 2) + Math.pow(p.z - centerPos.z, 2),
          ),
        )
        .reduce((a, b) => Math.max(a, b), 0)

      // The scale of the plane is multiplied by this correction factor to avoid the caustics pattern to be cut / overflow the bounds of the plane
      // my normal projection or my math must be a bit off, so I'm trying to be very conservative here
      const scaleCorrection = 1.75

      causticsPlane.current?.scale.set(
        scale * scaleCorrection,
        scale * scaleCorrection,
        scale * scaleCorrection,
      )

      causticsPlane.current?.position.set(centerPos.x, centerPos.y, centerPos.z)

      if (rotate) {
        mesh.current.rotation.x += 0.005
        mesh.current.rotation.y += 0.005
      }

      normalCamera.position.set(light.x, light.y, light.z)

      normalCamera.lookAt(
        bounds.getCenter(new THREE.Vector3(0, 0, 0)).x,
        bounds.getCenter(new THREE.Vector3(0, 0, 0)).y,
        bounds.getCenter(new THREE.Vector3(0, 0, 0)).z,
      )

      normalCamera.up = new THREE.Vector3(0, 1, 0)

      const originalMaterial = mesh.current.material

      mesh.current.material = normalMaterial
      mesh.current.material.side = THREE.BackSide

      gl.setRenderTarget(normalRenderTarget)
      gl.render(mesh.current, normalCamera)

      mesh.current.material = originalMaterial

      causticQuad.material = causticsComputedMaterial

      const causticsMaterial = causticQuad.material as THREE.ShaderMaterial
      causticsMaterial.uniforms.uTexture.value = normalRenderTarget.texture
      causticsMaterial.uniforms.uLight.value = light
      causticsMaterial.uniforms.uIntensity.value = intensity

      gl.setRenderTarget(causticsComputeRenderTarget)
      causticQuad.render(gl) //to create the caustics texture

      if (causticsPlane.current) {
        causticsPlane.current.material = causticsPlaneMaterial

        const planeMaterial = causticsPlane.current
          .material as THREE.ShaderMaterial

        planeMaterial.uniforms.uTexture.value =
          causticsComputeRenderTarget.texture

        planeMaterial.uniforms.uAberration.value = chromaticAberration
      }

      gl.setRenderTarget(null)
    }
  })

  return (
    <>
      <TargetMesh ref={mesh} />

      <mesh ref={causticsPlane} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry />
      </mesh>
      <mesh
        receiveShadow
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.2, -0.2]}
      >
        <planeGeometry args={[50, 50]} />
        <meshPhongMaterial
          transparent
          blending={THREE.CustomBlending}
          blendSrc={THREE.OneFactor}
          blendDst={THREE.SrcAlphaFactor}
        />
      </mesh>
    </>
  )
}
