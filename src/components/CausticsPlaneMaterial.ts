import { shaderMaterial } from '@react-three/drei'
import * as THREE from 'three'

import planeFragmentShader from '@/shaders/plane-fragment.glsl'
import planeVertexShader from '@/shaders/plane-vertex.glsl'

const vertexShader = planeVertexShader

const fragmentShader = planeFragmentShader

const CausticsPlaneMaterial = shaderMaterial(
  {
    uLight: { value: new THREE.Vector3(0, 0, 0) },
    uTexture: { value: null },
    uAberration: { value: 0.02 },
  } as any,
  vertexShader,
  fragmentShader,
)

export default CausticsPlaneMaterial
